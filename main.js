const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');
const lzma = require('lzma-native');
const yaml = require('js-yaml');
const bsdiff = require('bsdiff-node');
const childProcess = require('child_process');
const md5 = require('md5');
const SNI = require('./SNI');
const games = require("./games/games.json");
const Registry = require("winreg");

// Main process and window management
let gamePromptWindow = null;
let mainWindow = null;
let preserveProcess = false;

// Control variable for SNI to prevent multiple rapid launches
let lastSNILaunchAttempt = 0;

// Determine user's config file path based on OS
const configDir = (process.platform === 'win32') ?
  path.join(process.env.APPDATA, 'super-nintendo-client-info') : // Windows
  path.join(os.homedir(), '.super-nintendo-client-info'); // Mac + Linux
if (!fs.existsSync(configDir)) { fs.mkdirSync(configDir, { recursive: true }); }
const configPath = path.join(configDir, 'super-nintendo-client.config.json');

// Determine user's log directory based on OS
const logDir = (process.platform === 'win32') ?
  path.join(process.env.APPDATA, 'super-nintendo-client-info', 'logs') : // Windows
  path.join(os.homedir(), '.super-nintendo-client-info', 'logs'); // Mac + Linux
if (!fs.existsSync(logDir)) { fs.mkdirSync(logDir, { recursive: true }); }

// Catch and log any uncaught errors that occur in the main process
process.on('uncaughtException', (error) => {
  const uncaughtLogFile = createLogFile();
  fs.writeSync(uncaughtLogFile, `[${new Date().toLocaleString()}] ${JSON.stringify(error)}\n`);
  fs.closeSync(uncaughtLogFile);
});

// Function to create a log file
const createLogFile = () => {
  return fs.openSync(path.join(logDir, `${new Date().getTime()}.txt`), 'w');
}

// Create log file for this run
const logFile = createLogFile();

// Function to launch SNI if it is not running
const launchSNI = () => {
  // If an attempt was made to launch SNI within the past three seconds, do nothing
  if (new Date().getTime() < (lastSNILaunchAttempt + 3000)) { return; }

  // Analyze the process list and launch SNI if necessary
  lastSNILaunchAttempt = new Date().getTime();
  const exec = require('child_process').exec;
  let cmd = null;
  let sniBinary = null;
  switch(process.platform){
    case 'win32':
      cmd = 'tasklist';
      sniBinary = 'sni.exe';
      break;
    case 'linux':
      cmd = 'ps -A';
      sniBinary = 'sni-linux';
      break;
    case 'darwin':
      cmd = 'ps -ax';
      sniBinary = 'sni-darwin';
      break;
    default:
      return;
  }

  exec(cmd, (err, stdout, stderr) => {
    if (stdout.toLowerCase().indexOf(sniBinary) === -1) {
      childProcess.spawn(path.join(__dirname, 'sni', sniBinary), { detached: true });
    }
  });
};

// Perform certain actions during the install process
if (require('electron-squirrel-startup')) {
  if (process.platform === 'win32') {
    // Determine executable path
    const Registry = require('winreg');
    const exePath = path.join(process.env.LOCALAPPDATA, 'SuperNintendoClient', 'SuperNintendoClient.exe');

    // Set file type description
    const descriptionKey = new Registry({
      hive: Registry.HKCU,
      key: '\\Software\\Classes\\archipelago.super-nintendo-client.v1',
    });
    descriptionKey.set(Registry.DEFAULT_VALUE, Registry.REG_SZ, 'Archipelago Binary Patch',
      (error) => fs.writeSync(logFile, `[${new Date().toLocaleString()}] ${error}\n`));

    const iconKey = new Registry({
      hive: Registry.HKCU,
      key: '\\Software\\Classes\\archipelago.super-nintendo-client.v1\\DefaultIcon',
    });
    iconKey.set(Registry.DEFAULT_VALUE, Registry.REG_SZ, `${exePath},0`, (error) => console.error(error));

    // Set the shell command arguments used when launching this program by executing a file
    const commandKey = new Registry({
      hive: Registry.HKCU,
      key: '\\Software\\Classes\\archipelago.super-nintendo-client.v1\\shell\\open\\command'
    });
    commandKey.set(Registry.DEFAULT_VALUE, Registry.REG_SZ, `"${exePath}" "%1"`,
      (error) => fs.writeSync(logFile, `[${new Date().toLocaleString()}] ${error}\n`));

    // Set icon and default program for each game
    const games = require('games/games.json');
    Object.keys(games).forEach((game) => {
      games[game].extensions.forEach((ext) => {
        // Set patch file to launch with SuperNintendoClient
        const extensionKey = new Registry({
          hive: Registry.HKCU,
          key: `\\Software\\Classes\\${ext}`,
        });
        extensionKey.set(Registry.DEFAULT_VALUE, Registry.REG_SZ, 'archipelago.super-nintendo-client.v1',
          (error) => fs.writeSync(logFile, `[${new Date().toLocaleString()}] ${error}\n`));

        // Create file extension in HKEY_CLASSES_ROOT
        const hkcrExtensionKey = new Registry({
          hive: Registry.HKCR,
          key: `\\${ext}`,
        });
        hkcrExtensionKey.set(Registry.DEFAULT_VALUE, Registry.REG_SZ, `Archipelago Patch File for ${game}`,
          (error) => fs.writeSync(logFile, `[${new Date().toLocaleString()}] ${error}\n`));

        const hkcrIconKey = new Registry({
          hive: Registry.HKCR,
          key: `\\${ext}\\DefaultIcon`,
        });
        hkcrIconKey.set(Registry.DEFAULT_VALUE, Registry.REG_SZ, path.join(__dirname, 'games', game, 'icon.ico'),
          (error) => fs.writeSync(logFile, `[${new Date().toLocaleString()}] ${error}\n`));
      });
    });

  }

  // Do not launch the client during the install process
  return app.quit();
}

// Used to transfer server data from the main process to the renderer process
const sharedData = {};

const createGamePromptWindow = () => {
  // Prevent the process from closing if this would close the process's last window
  preserveProcess = true;

  // Close all open windows
  if (gamePromptWindow) { gamePromptWindow.close(); gamePromptWindow = null; }
  if (mainWindow) { mainWindow.close(); mainWindow = null; }

  gamePromptWindow = new BrowserWindow({
    width: 500,
    height: 225,
    autoHideMenuBar: true,
    resizable: false,
    webPreferences: {
      devTools: process.argv.includes('dev'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preloadGameSelect.js'),
    },
  });

  gamePromptWindow.loadFile('gameSelect.html').then(() => {
    // Allow the process to terminate if the user closes all windows
    preserveProcess = false;
  }).catch((error) => {
    preserveProcess = false;
    console.log(error);
    fs.writeSync(logFile, `[${new Date.toLocaleString()}] ${JSON.stringify(error)}`);
  });
};

const createMainWindow = () => {
  // Prevent the process from closing if this would close the process's last window
  preserveProcess = true;

  // Close all open windows
  if (gamePromptWindow) { gamePromptWindow.close(); gamePromptWindow = null; }
  if (mainWindow) { mainWindow.close(); mainWindow = null; }

  // Configure the new main window
  mainWindow = new BrowserWindow({
    width: 1280,
    minWidth: 400,
    height: 720,
    minHeight: 100,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preloadMainWindow.js'),
    },
  });

  // Display the main window
  mainWindow.loadFile('index.html').then(() => {
    // Allow the process to terminate if the user closes all windows
    preserveProcess = false;

    // Set window icon and title
    mainWindow.setIcon(`games/${game}/icon.ico`);
    mainWindow.setTitle(`Super Nintendo Client (${game})`);
  }).catch((error) => {
    preserveProcess = false;
    console.log(error);
    fs.writeSync(logFile, `[${new Date.toLocaleString()}] ${JSON.stringify(error)}`);
  });
};

// Used in general data exchange during IPC operations
let game = null;

app.whenReady().then(async () => {
  // Create the local config file if it does not exist
  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, JSON.stringify({}));
  }

  // Load the config into memory
  const configData = fs.readFileSync(configPath).toString();
  const config = configData ? JSON.parse(configData) : {};

  // Detect which patch file was used to launch the client, if any
  let patchFilePath = null;
  for (let arg of process.argv) {
    // Ignore the Electron path arg in a dev environment
    if (arg === '.') { continue; }
    for (let gameName of Object.keys(games)) {
      for (let extension of games[gameName].extensions) {
        if (arg.endsWith(extension)) {
          patchFilePath = arg;
          game = gameName;
          break;
        }
      }
    }
  }

  // Perform a series of actions if the target game is known
  if (game) {
    // Create config object for this game if it doesn't exist
    if (!config.hasOwnProperty(game)) {
      config[game] = {
        baseRomPath: null,
        launcherPath: null,
      };
    }

    // Prompt for a base rom if the current base rom is unacceptable
    if (
      !config[game].hasOwnProperty('baseRomPath') || // Config data is missing
      !config[game].baseRomPath || // Config data is empty
      !fs.existsSync(config[game].baseRomPath) || // Local file does not exist
      !md5(fs.readFileSync(config[game].baseRomPath)) === config[game].md5Hash // Base rom fails hash check
    ) {
      config[game].baseRomPath = null;
      let newBaseRomPath = null;
      while (!config[game].baseRomPath) {
        newBaseRomPath = await dialog.showOpenDialog(null, {
          title: `Select base ROM for ${game}`,
          buttonLabel: 'Choose ROM',
          message: 'Choose a base ROM to be used when patching.',
        });

        // If the user cancels the base rom box or does not select a file
        if (newBaseRomPath.canceled || newBaseRomPath.filePaths.length === 0) {
          const skipPatching = await dialog.showMessageBox(null, {
            type: 'info',
            title: 'Base ROM Not Provided',
            message: 'If you do not provide a base ROM, the client will skip the patching process.',
            buttons: ['Choose ROM...', 'Skip Patching'],
          });

          // If the user clicked on "Skip Patching", don't prompt them anymore
          if (skipPatching) { break; }
        }

        // If the user selects a base rom which does not validate against the hash
        if (!md5(fs.readFileSync(newBaseRomPath.filePaths[0])) === config[game].md5Hash) {
          const skipBaseRom = await dialog.showMessageBox(null, {
            type: 'info',
            title: 'Invalid Base ROM Selected',
            message: 'The base ROM file you chose did not validate against the known hash. ' +
              'Please choose a different file.',
            buttons: ['Choose ROM...', 'Skip Patching'],
          });

          if (skipBaseRom) { break; }
        }

        // User selected a valid base ROM path
        config[game].baseRomPath = newBaseRomPath.filePaths[0];
        fs.writeFileSync(configPath, JSON.stringify(config));
      }
    }

    // If the user provided a base ROM and a patch file, patch the base ROM
    if (config[game].baseRomPath && patchFilePath && fs.existsSync(patchFilePath)) {
      const diffFilePath = path.join(__dirname, 'patch.bsdiff');
      const patchFileExt = patchFilePath.split('.').pop();
      const outputFilePath = path.join(path.dirname(patchFilePath),
        `${path.basename(patchFilePath).substr(0, path.basename(patchFilePath).length - patchFileExt.length)}.sfc`);
      const apbpBuffer = await lzma.decompress(fs.readFileSync(patchFilePath));
      const apbp = yaml.load(apbpBuffer);
      sharedData.apServerAddress = apbp.meta.server ? apbp.meta.server : null;
      fs.writeFileSync(diffFilePath, apbp.patch);
      await bsdiff.patch(config[game].baseRomPath, outputFilePath, diffFilePath);
      fs.rmSync(diffFilePath);

      // If a custom launcher is specified, attempt to launch the ROM file using the specified loader
      if (config[game].hasOwnProperty('launcherPath') && fs.existsSync(config[game].launcherPath)) {
        childProcess.spawn(config[game].launcherPath, [outputFilePath], { detached: true });
      } else if (process.platform === 'win32') {
        // If no custom launcher is specified, launch the rom with explorer on Windows
        childProcess.spawn('explorer', [outputFilePath], { detached: true });
      }
    }
  }

  // If no patch file is given, display a prompt for the user to choose their game
  if (!game) { createGamePromptWindow(); }
  // Otherwise, display the main window
  else { createMainWindow(); }

  app.on('activate', () => {
    console.log('activate');
  });

  // Special logic to determine what to do when all windows have closed
  app.on('window-all-closed', () => {
    // Close the process if we aren't holding it open for another pending window to be opened
    if (!preserveProcess) { app.quit(); }
  });

}).catch((error) => {
  // Write error to log
  fs.writeSync(logFile, `[${new Date().toLocaleString()}] ${JSON.stringify(error)}\n`);
});

// Launch SNI if it is not running
launchSNI();

// Interprocess communication with the renderer process, all are asynchronous events
ipcMain.on('requestSharedData', (event, args) => {
  event.sender.send('sharedData', sharedData);
});
// TODO: Update this function to accept a game argument
ipcMain.on('setLauncher', async (event, args) => {
  // Allow the user to specify a program to launch the ROM
  const config = JSON.parse(fs.readFileSync(configPath).toString());
  const launcherPath = await dialog.showOpenDialog({
    title: 'Locate ROM Launcher',
    buttonLabel: 'Select Launcher',
    message: 'Choose an executable to be used when launching the ROM',
  });
  if (!launcherPath.canceled && launcherPath.filePaths.length > 0) {
    config[game].launcherPath = launcherPath.filePaths[0];
    fs.writeFileSync(configPath, JSON.stringify(config));
  }
});

try{
  // Interprocess communication with the renderer process related to SNI, all are synchronous events
  const sni = new SNI();
  sni.setAddressSpace(SNI.supportedAddressSpaces.FXPAKPRO); // We support communicating with FXPak devices
  sni.setMemoryMap(SNI.supportedMemoryMaps.LOROM); // ALttP uses LOROM
  ipcMain.handle('launchSNI', launchSNI);
  ipcMain.handle('fetchDevices', sni.fetchDevices);
  ipcMain.handle('setDevice', (event, device) => sni.setDevice.apply(sni, [device]));
  ipcMain.handle('readFromAddress', (event, args) => sni.readFromAddress.apply(sni, args));
  ipcMain.handle('writeToAddress', (event, args) => sni.writeToAddress.apply(sni, args));

  // General data exchange
  ipcMain.handle('setGame', (event, args) => {
    game = args[0];
    createMainWindow();
  });
  ipcMain.handle('getGame', (event, args) => game);
  ipcMain.handle('changeGame', (event, args) => createGamePromptWindow());

  // Logging from chromium instance
  ipcMain.handle('writeToLog', (event, data) =>
    fs.writeSync(logFile, `[${new Date().toLocaleString()}] ${data}\n`));
}catch(error){
  console.log(error);
  fs.writeSync(logFile, `[${new Date().toLocaleString()}] ${JSON.stringify(error)}`);
}
