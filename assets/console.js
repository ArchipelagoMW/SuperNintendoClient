let cachedCommands = [];
const maxCachedCommands = 10;
const maxConsoleMessages = 500;
let commandCursor = 0;

window.addEventListener('load', () => {
  const commandInput = document.getElementById('console-input');
  commandInput.addEventListener('keydown', (event) => {
    // Only perform events on desired keys
    const allowedKeys = ['ArrowUp', 'ArrowDown'];
    if (allowedKeys.indexOf(event.key) === -1) { return; }

    switch (event.key) {
      case 'ArrowUp':
        if (cachedCommands.length === 0 || commandCursor === maxCachedCommands) { return; }
        if (commandCursor < maxCachedCommands && commandCursor < cachedCommands.length) { commandCursor++; }
        commandInput.value = commandCursor ? cachedCommands[cachedCommands.length - commandCursor] : '';
        return;

      case 'ArrowDown':
        if (cachedCommands.length === 0 || commandCursor === 0) { return; }
        if (commandCursor > 0) { commandCursor--; }
        commandInput.value = commandCursor ? cachedCommands[cachedCommands.length - commandCursor] : '';
        return;

      default:
        return;
    }
  });

  commandInput.addEventListener('keyup', (event) => {
    // Ignore non-enter keyup events and empty commands
    if (event.key !== 'Enter' || !event.target.value) { return; }

    // Ignore events related to the keydown listener
    if (event.key === 'Up' || event.key === 'Down') { return; }

    // Detect slash commands and perform their actions
    if (event.target.value[0] === '/') {
      const commandParts = event.target.value.split(' ');
      switch (commandParts[0]) {
        case '/connect':
          if (snesDevice === null) {
            appendConsoleMessage('A SNES device must be connected before a server connection can be established.');
            return;
          }

          commandParts.shift();
          const address = commandParts[0];
          const password = commandParts[1] || null;
          document.getElementById('server-address').value = address;
          connectToServer(address, password);
          break;

        case '/fontsize':
          if (commandParts.length < 2) {
            appendConsoleMessage('You must specify a font size like: /fontsize 16');
          }
          setFontSize(parseInt(commandParts[1]));
          break;

        case '/launcher':
          appendConsoleMessage('Opening dialog for launcher choice...');
          window.ipc.send('setLauncher');
          break;

        case '/locations':
          if (checkedLocations.length === 0) {
            appendConsoleMessage('No locations have been checked yet.');
            break;
          }

          // Build a flat map of locations
          let locationFlatMap = {};
          Object.values(locationsById).forEach((locationMap) => {
            locationFlatMap = Object.assign(locationFlatMap, locationMap);
          });

          // Print all checked locations to console
          appendConsoleMessage('The following locations have been checked:');
          checkedLocations.forEach((locationId) => {
            appendConsoleMessage(locationFlatMap[locationId].name);
          });
          break;

        case '/pause':
        case '/malmo': // For the memes
          receiveItems ? disableReceivingItems() : enableReceivingItems();
          break;

        case '/shield':
        case '/farrak': // A little something just for me
          receiveShields ? disableReceivingShields() : enableReceivingShields();
          break;

        case '/sync':
          serverSync();
          break;

        // This command is not in alphabetical order because it's convenient to have it last
        case '/help':
          appendConsoleMessage('Available commands:');
          appendConsoleMessage('/connect [server] [password] - Connect to an AP server with an optional password');
          appendConsoleMessage('/fontsize [size] - Change the size of the font. 16 is default');
          appendConsoleMessage('/launcher - Choose an emulator to launch ROMs with instead of the system default');
          appendConsoleMessage('/locations - Print a list of all locations which have been checked');
          appendConsoleMessage('/pause - Pause or resume receiving items from other players');
          appendConsoleMessage('/shield - Replace shields received from other players with the "Nothing" item');
          appendConsoleMessage('/sync - Force the client to synchronize with the AP server');
          appendConsoleMessage('/help - Print this message');
          break;

        default:
          appendConsoleMessage('Unknown command.');
          break;
      }

      // Cache the command, empty the command input, reset the command cursor
      cacheCommand(event.target.value);
      commandInput.value = '';
      commandCursor = 0;
      return;
    }

    // Send command to server
    sendMessageToServer(event.target.value);
    cacheCommand(event.target.value);

    // Clear the input box
    commandInput.value = '';
  });

  const consoleWindow = document.getElementById('console-output-wrapper');
  consoleWindow.addEventListener('scroll', (evt) => {
    autoScrollPaused = (consoleWindow.scrollTop + consoleWindow.offsetHeight) < consoleWindow.scrollHeight;
  });
});

const appendConsoleMessage = (message) => {
  const monitor = document.getElementById('console-output-wrapper');
  // Do not exceed the maximum number of displayed console messages
  while (monitor.children.length >= maxConsoleMessages) {
    monitor.removeChild(monitor.firstChild);
  }

  // Append message div to monitor
  const messageDiv = document.createElement('div');
  messageDiv.classList.add('console-output');
  messageDiv.innerText = message;
  monitor.appendChild(messageDiv);
  if (!autoScrollPaused) { messageDiv.scrollIntoView(false); }
};

const appendFormattedConsoleMessage = (messageParts) => {
  const monitor = document.getElementById('console-output-wrapper');
  // Do not exceed the maximum number of displayed console messages
  while (monitor.children.length >= maxConsoleMessages) {
    monitor.removeChild(monitor.firstChild);
  }

  // Create the message div
  const messageDiv = document.createElement('div');
  messageDiv.classList.add('console-output');

  // Create the spans to populate the message div
  for (const part of messageParts) {
    const span = document.createElement('span');
    if (part.hasOwnProperty('type')) {
      switch(part.type){
        case 'player_id':
          const playerIsClient = parseInt(part.text, 10) === playerSlot;
          if (playerIsClient) { span.style.fontWeight = 'bold'; }
          span.style.color = playerIsClient ? '#ffa565' : '#52b44c';
          span.innerText = players[parseInt(part.text, 10) - 1].alias;
          break;
        case 'item_id':
          span.style.color = '#fc5252';
          span.innerText = itemsById[part.text];
          break;
        case 'location_id':
          span.style.color = '#5ea2c1';
          span.innerText = locationMap[Number(part.text)];
          break;
        default:
          span.innerText = part.text;
      }
    } else {
      span.innerText = part.text;
    }
    messageDiv.appendChild(span);
  }

  // Append the message div to the monitor
  monitor.appendChild(messageDiv);
  if (!autoScrollPaused) { messageDiv.scrollIntoView(false); }
};

const cacheCommand = (command) => {
  // Limit stored command count to five
  while (cachedCommands.length > maxCachedCommands) { cachedCommands.shift(); }

  // Store the command
  cachedCommands.push(command);
};

// Allow yourself to receive shields. Why would you do this?
enableReceivingShields = () => {
  appendConsoleMessage('You are now able to receive shields.');
  receiveShields = true;
};

// Disable receiving shields, like a true gamer
disableReceivingShields = () => {
  appendConsoleMessage('You will no longer receive shields.');
  receiveShields = false;
};