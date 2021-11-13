const path = require('path');
const childProcess = require('child_process');
const games = require('./games/games.json');

if (process.platform === 'win32') {
  // Determine executable path
  const exePath = path.join(process.env.LOCALAPPDATA, 'SuperNintendoClient', 'SuperNintendoClient.exe');

  // Create the registry keys
  childProcess.execSync(`reg add HKCU\\SOFTWARE\\Classes\\archipelago.super-nintendo-client.v1 /ve /d "Archipelago Binary Patch" /f`);
  childProcess.execSync(`reg add HKCU\\SOFTWARE\\Classes\\archipelago.super-nintendo-client.v1\\shell\\open\\command /ve /d \""${exePath}" "%1"\" /f`);

  // Set icon and default program for each game
  Object.keys(games).forEach((game) => {
    games[game].extensions.forEach((ext) => {
      childProcess.execSync(`reg add HKCU\\SOFTWARE\\Classes\\${ext} /ve /d archipelago.super-nintendo-client.v1 /f`);
      // childProcess.execSync(`reg add HKCR\\${ext} /ve /d archipelago.super-nintendo-client.v1 /f`);
      // childProcess.execSync(`reg add HKCR\\${ext}\\DefaultIcon /ve /d "${path.join(__dirname, 'games', game, 'icon.ico')},1" /f`)
    });
  });
}