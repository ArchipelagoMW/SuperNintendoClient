// noinspection JSBitwiseOperatorUsage

let itemsReceived = [];
const maxReconnectAttempts = 10;

// Track reconnection attempts.
let preventReconnect = false;
let reconnectAttempts = 0;
let reconnectTimeout = null;

// Control variable for the SNES watcher. Contains an interval (see MDN: setInterval)
let snesInterval = null;
let snesIntervalComplete = true;
let lastBounce = 0;

// Location Ids provided by the server
let checkedLocations = [];
let missingLocations = [];

// Data about remote items
const scoutedLocations = {};

let gameCompleted = false;
const CLIENT_STATUS = {
  CLIENT_UNKNOWN: 0,
  CLIENT_READY: 10,
  CLIENT_PLAYING: 20,
  CLIENT_GOAL: 30,
};

// Has DeathLink been enabled?
let deathLinkEnabled = null;
let lastForcedDeath = new Date().getTime(); // Tracks the last time a death was send or received over the network
let playerIsDead = false;
let playerIsStillDead = false;

window.addEventListener('load', () => {
  // Handle server address change
  document.getElementById('server-address').addEventListener('keydown', async (event) => {
    if (event.key !== 'Enter') { return; }

    // If the input value is empty, do not attempt to reconnect
    if (!event.target.value) {
      preventReconnect = true;
      lastServerAddress = null;

      // If the socket is open, close it
      if (serverSocket && serverSocket.readyState === WebSocket.OPEN) {
        serverSocket.close();
        serverSocket = null;
      }

      // If the user did not specify a server address, do not attempt to connect
      return;
    }

    // User specified a server. Attempt to connect
    preventReconnect = false;
    connectToServer(event.target.value);
  });
});

const connectToServer = (address, password = null) => {
  if (serverSocket && serverSocket.readyState === WebSocket.OPEN) {
    serverSocket.close();
    serverSocket = null;
  }

  // If an empty string is passed as the address, do not attempt to connect
  if (!address) { return; }

  // This is a new connection attempt, no auth error has occurred yet
  serverAuthError = false;

  // If there are no SNES devices available, do nothing
  if (snesDevice === null) { return; }

  // Determine the server address
  let serverAddress = address;
  if (serverAddress.search(/^\/connect /) > -1) { serverAddress = serverAddress.substring(9); }
  if (serverAddress.search(/:\d+$/) === -1) { serverAddress = `${serverAddress}:${DEFAULT_SERVER_PORT}`;}

  // Store the password, if given
  serverPassword = password;

  // Attempt to connect to the server
  serverSocket = new WebSocket(`ws://${serverAddress}`);
  serverSocket.onopen = (event) => {
    // If a new server connection is established, that server will inform the client which items have been sent to
    // the ROM so far, if any. Clear the client's current list of received items to prevent the old list from
    // contaminating the new one, sometimes called "seed bleed".
    itemsReceived = [];
  };

  // Handle incoming messages
  serverSocket.onmessage = async (event) => {
    const commands = JSON.parse(event.data);
    for (let command of commands) {
      const serverStatus = document.getElementById('server-status');
      switch(command.cmd) {
        case 'RoomInfo':
          // Update sidebar with info from the server
          document.getElementById('server-version').innerText =
            `${command.version.major}.${command.version.minor}.${command.version.build}`;
          document.getElementById('forfeit-mode').innerText = permissionMap[command.permissions.forfeit];
          document.getElementById('remaining-mode').innerText = permissionMap[command.permissions.remaining];
          hintCost = Number(command.hint_cost);
          document.getElementById('points-per-check').innerText = command.location_check_points.toString();

          // Update the local data package cache if necessary
          if (!localStorage.getItem('dataPackageVersion') || !localStorage.getItem('dataPackage') ||
            command.datapackage_version !== localStorage.getItem('dataPackageVersion')) {
            requestDataPackage();
          } else {
            // Load the location and item maps into memory
            buildItemAndLocationData(JSON.parse(localStorage.getItem('dataPackage')));
          }

          // Authenticate with the server
          const romName = await readFromAddress(ROMNAME_START, ROMNAME_SIZE);
          const connectionData = {
            cmd: 'Connect',
            game: 'A Link to the Past',
            name: btoa(new TextDecoder().decode(romName)), // Base64 encoded rom name
            uuid: getClientId(),
            tags: ['Z3 Client', 'DeathLink'],
            password: serverPassword,
            version: ARCHIPELAGO_PROTOCOL_VERSION,
          };
          serverSocket.send(JSON.stringify([connectionData]));
          break;

        case 'Connected':
          // Save the last server that was successfully connected to
          lastServerAddress = address;

          // Reset reconnection info if necessary
          reconnectAttempts = 0;

          // Store the reported location check data from the server. They are arrays of locationIds
          checkedLocations = command.checked_locations;
          missingLocations = command.missing_locations;

          // In case the user replaced the ROM without disconnecting from the AP Server or SNI, treat every new
          // 'Connected' message as if it means a new ROM was discovered
          itemsReceived = [];

          // Set the hint cost text
          document.getElementById('hint-cost').innerText =
            (Math.round((hintCost / 100) * (checkedLocations.length + missingLocations.length))).toString();

          // Update header text
          serverStatus.classList.remove('disconnected');
          serverStatus.innerText = 'Connected';
          serverStatus.classList.add('connected');

          // Save the list of players provided by the server
          players = command.players;

          // Save information about the current player
          playerTeam = command.team;
          playerSlot = command.slot;

          // Create an array containing only shopIds
          const shopIds = Object.values(SHOPS).map((shop) => shop.locationId);

          // Determine if DeathLink is enabled
          const deathLinkFlag = await readFromAddress(DEATH_LINK_ACTIVE_ADDR, 1);
          deathLinkEnabled = parseInt(deathLinkFlag[0], 10) === 1;

          snesInterval = setInterval(async () => {
            try{
              // Prevent the interval from running concurrently with itself. If more than one iteration of this
              // function is active at any given time, it wil result in reading and writing areas of the SRAM out of
              // order, causing the item index store in the SRAM to be invalid
              if (!snesIntervalComplete) {
                return;
              }

              // The SNES interval is now in progress, don't start another one
              snesIntervalComplete = false;

              // Send a bounce packet once every five minutes or so
              const currentTime = new Date().getTime();
              if (currentTime > (lastBounce + 300000)){
                if (serverSocket && serverSocket.readyState === WebSocket.OPEN) {
                  lastBounce = currentTime;
                  serverSocket.send(JSON.stringify([{
                    cmd: 'Bounce',
                    slots: [playerSlot],
                    data: currentTime,
                  }]));
                }
              }

              // Fetch game mode
              const gameMode = await readFromAddress(WRAM_START + 0x10, 0x01);
              const modeValue = gameMode[0];
              // If game mode is unknown or not present, do not attempt to fetch or write data to the SNES
              if (!modeValue || (
                !INGAME_MODES.includes(modeValue) &&
                !ENDGAME_MODES.includes(modeValue) &&
                !DEATH_MODES.includes(modeValue)
              )) {
                snesIntervalComplete = true;
                return;
              }

              // Check if DeathLink is enabled and Link is dead
              if (deathLinkEnabled && playerIsDead) {
                // Determine if link is currently dead, and therefore if he is able to be killed
                if (!playerIsStillDead) { // Link is dead, and it just happened
                  // Keep track of Link's state to prevent sending multiple DeathLink signals per death
                  playerIsStillDead = true;

                  // Check if it has been at least ten seconds since the last DeathLink network signal
                  // was sent or received
                  if (new Date().getTime() > (lastForcedDeath + 10000)) {
                    if (serverSocket && serverSocket.readyState === WebSocket.OPEN) {
                      // Link just died, so ignore DeathLink signals for the next ten seconds
                      lastForcedDeath = new Date().getTime();
                      serverSocket.send(JSON.stringify([{
                        cmd: 'Bounce',
                        tags: ['DeathLink'],
                        data: {
                          time: Math.floor(lastForcedDeath / 1000), // Unix Timestamp
                          source: players.find((player) =>
                            (player.team === playerTeam) && (player.slot === playerSlot)).alias, // Local player alias
                        },
                      }]));
                    }

                    snesIntervalComplete = true;
                    return;
                  }
                }
              }

              // Determine if Link is currently dead
              playerIsDead = DEATH_MODES.includes(modeValue);
              if (!playerIsDead) { playerIsStillDead = false; }

              // Fetch game state and triforce information
              const gameOverScreenDisplayed = await readFromAddress(SAVEDATA_START + 0x443, 0x01);
              // If the game over screen is displayed, do not send or receive items
              if (gameOverScreenDisplayed[0] || ENDGAME_MODES.indexOf(modeValue) > -1) {
                // If this is the first time the game over screen is displayed, inform the server
                // the game is complete.
                if (serverSocket && serverSocket.readyState === WebSocket.OPEN && !gameCompleted) {
                  serverSocket.send(JSON.stringify([{
                    cmd: 'StatusUpdate',
                    status: CLIENT_STATUS.CLIENT_GOAL,
                  }]));

                  // Flag game as completed
                  gameCompleted = true;
                }
                snesIntervalComplete = true;
                return;
              }

              // Fetch information from the SNES about items it has received, and compare that against local data.
              // This fetch includes data about the room the player is currently inside of
              const receivedItems = await readFromAddress(RECEIVED_ITEMS_INDEX, 0x08);
              const romItemsReceived = receivedItems[0] | (receivedItems[1] << 8);
              const linkIsBusy = receivedItems[2];
              const roomId = receivedItems[4] | (receivedItems[5] << 8);
              const roomData = receivedItems[6];
              const scoutLocation = receivedItems[7];

              // If there are still items needing to be sent, and Link is able to receive an item,
              // send the item to the SNES
              if (receiveItems && (romItemsReceived < itemsReceived.length) && !linkIsBusy) {
                // Increment the counter of items sent to the ROM
                const indexData = new Uint8Array(2);
                indexData.set([
                  (romItemsReceived + 1) & 0xFF,
                  ((romItemsReceived + 1) >> 8) & 0xFF,
                ]);
                await writeToAddress(RECEIVED_ITEMS_INDEX, indexData);

                // If the user does not want to receive shields, send a Nothing item to the SNES instead
                let itemCode = itemsReceived[romItemsReceived].item;
                if (!receiveShields && shieldNames.indexOf(itemsById[itemsReceived[romItemsReceived].item]) > -1) {
                  const offendingPlayer = players.find((p) => itemsReceived[romItemsReceived].player === p.slot);
                  appendConsoleMessage(`${offendingPlayer ? offendingPlayer.alias : 'Someone'} tried to send you ` +
                    `a shield, but they were denied!`);
                  itemCode = 0x5A; // "Nothing" item
                }

                // Send the item to the SNES
                const itemData = new Uint8Array(1);
                itemData.set([itemCode])
                await writeToAddress(RECEIVED_ITEM_ADDRESS, itemData);

                // Tell the SNES the id of the player who sent the item
                const senderData = new Uint8Array(1);
                senderData.set([
                  // Because LttP can only hold 255 player names, if the sending player's ID is greater
                  // than 255, we always send 255. Player 255 is always written to the ROM as "Archipelago"
                  (playerSlot === itemsReceived[romItemsReceived].player) ? 0 : (
                    Math.min(itemsReceived[romItemsReceived].player, 255)
                  )
                ]);
                await writeToAddress(RECEIVED_ITEM_SENDER_ADDRESS, senderData);
              }

              // If the player's current location has a scout item (an item laying on the ground), we need to
              // send that item's ID to the server so it can tell us what that item is, then we need to update
              // the SNES with the item data. This is mostly useful for remote item games, which Z3 does not
              // yet implement, but may in the future.
              if (scoutLocation > 0){
                // If the scouted item is not in the list of scouted locations stored by the client, send
                // the scout data to the server
                if (!scoutedLocations.hasOwnProperty(scoutLocation)) {
                  serverSocket.send(JSON.stringify([{
                    cmd: 'LocationScouts',
                    locations: [scoutLocation],
                  }]));
                } else {
                  // If the scouted item is present in the list of scout locations stored by the client, we
                  // update the SNES with information about the item
                  const locationData = new Uint8Array(1);
                  locationData.set([scoutLocation]);
                  await writeToAddress(SCOUTREPLY_LOCATION_ADDR, locationData);

                  const scoutItemData = new Uint8Array(1);
                  scoutItemData.set([scoutedLocations[scoutLocation].item]);
                  await writeToAddress(SCOUTREPLY_ITEM_ADDR, scoutItemData);

                  const playerData = new Uint8Array(1);
                  playerData.set([scoutedLocations[scoutLocation].player]);
                  await writeToAddress(SCOUTREPLY_PLAYER_ADDR, playerData);
                }
              }

              // If the player is currently inside a shop
              if (shopIds.indexOf(roomId) > -1) {
                // Request shop data from every shop in the game
                const requestLength = (Object.keys(SHOPS).length * 3) + 5;
                const shopData = await readFromAddress(SHOP_ADDR, requestLength);
                // Update the purchase status of every item in every shop. This is important because
                // multiple shops can sell the same item, like a quiver when in retro mode
                const newChecks = [];
                for (let index = 0; index < requestLength; ++index) {
                  if (shopData[index] && checkedLocations.indexOf(SHOP_ID_START + index) === -1) {
                    newChecks.push(SHOP_ID_START + index)
                  }
                }
                if (newChecks.length > 0) { sendLocationChecks(newChecks); }
              }

              // TODO: Is this chunk of code necessary? All item locations are scanned below this block
              // If the current room is unknown, do nothing. This happens if no check has been made yet
              if (locationsByRoomId.hasOwnProperty(roomId)) {
                // If there are new checks in this room, send them to the server
                const newChecks = [];
                for (const location of locationsByRoomId['underworld'][roomId]) {
                  if (checkedLocations.indexOf(location.locationId) > -1) { continue; }
                  if (((roomData << 4) & location.mask) !== 0) {
                    newChecks.push(location.locationId);
                  }
                }
                sendLocationChecks(newChecks);
              }

              // In the below loops, the entire SNES data is pulled to see if any items have already
              // been obtained. The client must do this because it's possible for a player to begin
              // picking up items before they connect to the server. It must then continue to do this
              // because it's possible for a player to disconnect, pick up items, then reconnect

              // Look for any checked locations in the underworld, and send those to the server if they have
              // not been sent already. Also track the earliest unavailable data, as we will fetch it later
              let underworldBegin = 0x129;
              let underworldEnd = 0;
              const underworldMissing = [];
              for (const location of Object.values(locationsById['underworld'])) {
                if (checkedLocations.indexOf(location.locationId) > -1) { continue; }
                underworldMissing.push(location);
                underworldBegin = Math.min(underworldBegin, location.roomId);
                underworldEnd = Math.max(underworldEnd, location.roomId + 1);
              }
              // The data originally fetched may not cover all of the underworld items, so the client needs to
              // fetch the remaining items to see if they have been previously obtained
              if (underworldBegin < underworldEnd) {
                const uwResults = await readFromAddress(SAVEDATA_START + (underworldBegin * 2), (underworldEnd - underworldBegin) * 2);
                const newChecks = [];
                for (const location of underworldMissing) {
                  const dataOffset = (location.roomId - underworldBegin) * 2;
                  const roomData = uwResults[dataOffset] | (uwResults[dataOffset + 1] << 8);
                  if ((roomData & location.mask) !== 0) {
                    newChecks.push(location.locationId);
                  }
                }
                // Send new checks if there are any
                if (newChecks.length > 0) { sendLocationChecks(newChecks); }
              }

              // Look for any checked locations in the overworld, and send those to the server if they have
              // not been sent already. Also track the earliest unavailable data, as we will fetch it later
              let overworldBegin = 0x82;
              let overworldEnd = 0;
              const overworldMissing = [];
              for (const location of Object.values(locationsById['overworld'])) {
                if (checkedLocations.indexOf(location.locationId) > -1) { continue; }
                overworldMissing.push(location);
                overworldBegin = Math.min(overworldBegin, location.screenId);
                overworldEnd = Math.max(overworldEnd, location.screenId + 1);
              }
              // The data originally fetched may not cover all of the overworld items, so the client needs to
              // fetch the remaining items to see if they have been previously obtained
              if (overworldBegin < overworldEnd) {
                const owResults = await readFromAddress(SAVEDATA_START + 0x280 + overworldBegin, overworldEnd - overworldBegin);
                const newChecks = [];
                for (const location of overworldMissing) {
                  if ((owResults[location.screenId - overworldBegin] & 0x40) !== 0) {
                    newChecks.push(location.locationId);
                  }
                }
                // Send new checks if there are any
                if (newChecks.length > 0) { sendLocationChecks(newChecks); }
              }

              // If all NPC locations have not been checked, pull npc data
              let npcAllChecked = true;
              for (const location of Object.values(locationsById['npc'])) {
                if (checkedLocations.indexOf(location.locationId) === -1) {
                  npcAllChecked = false;
                  break;
                }
              }
              if (!npcAllChecked) {
                const npcResults = await readFromAddress(SAVEDATA_START + 0x410, 2);
                const npcValue = npcResults[0] | (npcResults[1] << 8);
                const newChecks = [];
                for (const location of Object.values(locationsById['npc'])) {
                  if (checkedLocations.indexOf(location.locationId) > -1) { continue; }
                  if ((npcValue & location.screenId) !== 0) {
                    newChecks.push(location.locationId);
                  }
                }
                // Send new checks if there are any
                if (newChecks.length > 0) { sendLocationChecks(newChecks); }
              }

              // If all misc locations have not been checked, pull misc data
              let miscAllChecked = true;
              for (const location of Object.values(locationsById['misc'])) {
                if (checkedLocations.indexOf(location.locationId) === -1) {
                  miscAllChecked = false;
                  break;
                }
              }
              if (!miscAllChecked) {
                const miscResults = await readFromAddress(SAVEDATA_START + 0x3c6, 4);
                const newChecks = [];
                for (const location of Object.values(locationsById['misc'])) {
                  // What the hell is this assert for? It's always true based on data from romData.js
                  // Anyway, it's preserved from the original client code, but not used here
                  // console.assert(0x3c6 <= location.roomId <= 0x3c9);
                  if (checkedLocations.indexOf(location.locationId) > -1) { continue; }
                  if ((miscResults[location.roomId - 0x3c6] & location.mask) !== 0) {
                    newChecks.push(location.locationId);
                  }
                }
                // Send new checks if there are any
                if (newChecks.length > 0) { sendLocationChecks(newChecks); }
              }

              // Keep on loopin'
              snesIntervalComplete = true;
            } catch (err) {
              await window.logging.writeToLog(err.message);

              appendConsoleMessage('There was a problem communicating with your SNES device. Please ensure it ' +
                'is powered on, the ROM is loaded, and it is connected to your computer.');

              // Do not send requests to the SNES device if the device is unavailable
              clearInterval(snesInterval);
              snesIntervalComplete = true;

              // Disconnect from the AP server
              if (serverSocket && serverSocket.readyState === WebSocket.OPEN) {
                serverSocket.close();
              }

              snesDevice = null;
              setTimeout(initializeSNIConnection, 5000);
              snesIntervalComplete = true;
            }
          });
          break;

        case 'ConnectionRefused':
          serverStatus.classList.remove('connected');
          serverStatus.innerText = 'Not Connected';
          serverStatus.classList.add('disconnected');
          if (serverSocket && serverSocket.readyState === WebSocket.OPEN) {
            if (command.errors.includes('InvalidPassword')) {
              appendConsoleMessage(serverPassword === null ?
                'A password is required to connect to the server. Please use /connect [server] [password]' :
                'The password you provided was rejected by the server.'
              );
            } else {
              appendConsoleMessage(`Error while connecting to AP server: ${command.errors.join(', ')}.`);
            }
            serverAuthError = true;
            serverSocket.close();
          }
          break;

        case 'ReceivedItems':
          // Save received items in the array of items to be sent to the SNES, if they have not been sent already
          command.items.forEach((item) => {
            // Items from locations with id 0 or lower are special cases, and should always be allowed
            if (item.location <= 0) { return itemsReceived.push(item); }

            if (itemsReceived.find((ir) =>
              ir.item === item.item && ir.location === item.location && ir.player === item.player
            )) { return; }
            itemsReceived.push(item);
          });
          break;

        case 'LocationInfo':
          // This packed is received as a confirmation from the server that a location has been scouted.
          // Once the server confirms a scout, it sends the confirmed data back to the client. Here, we
          // store the confirmed scouted locations in an object.
          command.locations.forEach((location) => {
            // location = [ item, location, player ]
            if (!scoutedLocations.hasOwnProperty(location.location)) {
              scoutedLocations[location.location] = {
                item: location[0],
                player: location[2],
              };
            }
          });
          break;

        case 'RoomUpdate':
          // Update sidebar with info from the server
          if (command.hasOwnProperty('version')) {
            document.getElementById('server-version').innerText =
              `${command.version.major}.${command.version.minor}.${command.version.build}`;
          }

          if (command.hasOwnProperty('forfeit_mode')) {
            document.getElementById('forfeit-mode').innerText =
              command.forfeit_mode[0].toUpperCase() + command.forfeit_mode.substring(1).toLowerCase();
          }

          if (command.hasOwnProperty('remaining_mode')) {
            document.getElementById('remaining-mode').innerText =
              command.remaining_mode[0].toUpperCase() + command.remaining_mode.substring(1).toLowerCase();
          }

          if (command.hasOwnProperty('hint_cost')) {
            hintCost = Number(command.hint_cost);
            document.getElementById('hint-cost').innerText =
              (Math.floor((hintCost / 100) * (checkedLocations.length + missingLocations.length))).toString();
          }

          if (command.hasOwnProperty('location_check_points')) {
            document.getElementById('points-per-check').innerText = command.location_check_points.toString();
          }

          if (command.hasOwnProperty('hint_points')) {
            document.getElementById('hint-points').innerText = command.hint_points.toString();
          }
          break;

        case 'Print':
          appendConsoleMessage(command.text);
          break;

        case 'PrintJSON':
          appendFormattedConsoleMessage(command.data);
          break;

        case 'DataPackage':
          // Save updated data package into localStorage
          if (command.data.version !== 0) { // Unless this is a custom package, denoted by version zero
            localStorage.setItem('dataPackageVersion', command.data.version);
            localStorage.setItem('dataPackage', JSON.stringify(command.data));
          }
          buildItemAndLocationData(command.data);
          break;

        case 'Bounced':
          // This command can be used for a variety of things. Currently, it is used for keep-alive and DeathLink.
          // keep-alive packets can be safely ignored

          // DeathLink handling
          if (command.tags.includes('DeathLink')) {
            // Has it been at least ten seconds since the last time Link was forcibly killed?
            if (deathLinkEnabled && (new Date().getTime() > (lastForcedDeath + 10000))) {
              // Notify the player of the DeathLink occurrence, and who is to blame
              appendConsoleMessage(`${command.data.source} has died, and took you with them.`)

              // Kill Link
              await killLink();
            }
          }
          break;

        default:
          // Unhandled events are ignored
          break;
      }
    }
  };

  serverSocket.onclose = (event) => {
    const serverStatus = document.getElementById('server-status');
    serverStatus.classList.remove('connected');
    serverStatus.innerText = 'Not Connected';
    serverStatus.classList.add('disconnected');

    // If the user cleared the server address, do nothing
    const serverAddress = document.getElementById('server-address').value;
    if (preventReconnect || !serverAddress) { return; }

    // If no SNES device is currently selected, do nothing
    if (snesDevice === null) { return; }

    // Do not allow simultaneous reconnection attempts
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }

    // Attempt to reconnect to the AP server
    reconnectTimeout = setTimeout(() => {
      // Do not attempt to reconnect if a server connection exists already. This can happen if a user attempts
      // to connect to a new server after connecting to a previous one
      if (serverSocket && serverSocket.readyState === WebSocket.OPEN) { return; }

      // If the socket was closed in response to an auth error, do not reconnect
      if (serverAuthError) { return; }

      // If reconnection is currently prohibited for any other reason, do not attempt to reconnect
      if (preventReconnect) { return; }

      // Do not exceed the limit of reconnection attempts
      if (++reconnectAttempts > maxReconnectAttempts) {
        appendConsoleMessage('Archipelago server connection lost. The connection closed unexpectedly. ' +
          'Please try to reconnect, or restart the client.');
        return;
      }

      appendConsoleMessage(`Connection to AP server lost. Attempting to reconnect ` +
        `(${reconnectAttempts} of ${maxReconnectAttempts})`);
      connectToServer(address, serverPassword);
    }, 5000);
  };

  serverSocket.onerror = (event) => {
    if (serverSocket && serverSocket.readyState === WebSocket.OPEN) {
      appendConsoleMessage('Archipelago server connection lost. The connection closed unexpectedly. ' +
        'Please try to reconnect, or restart the client.');
      serverSocket.close();
    }
  };
};

const getClientId = () => {
  let clientId = localStorage.getItem('clientId');
  if (!clientId) {
    clientId = (Math.random() * 10000000000000000).toString();
    localStorage.setItem('clientId', clientId);
  }
  return clientId;
};

const sendMessageToServer = (message) => {
  if (serverSocket && serverSocket.readyState === WebSocket.OPEN) {
    serverSocket.send(JSON.stringify([{
      cmd: 'Say',
      text: message,
    }]));
  }
};

const serverSync = () => {
  if (serverSocket && serverSocket.readyState === WebSocket.OPEN) {
    serverSocket.send(JSON.stringify([{ cmd: 'Sync' }]));
  }
};

const requestDataPackage = () => {
  if (!serverSocket || serverSocket.readyState !== WebSocket.OPEN) { return; }
  serverSocket.send(JSON.stringify([{
    cmd: 'GetDataPackage',
  }]));
};

const sendLocationChecks = (locationIds) => {
  locationIds.forEach((id) => checkedLocations.push(id));
  serverSocket.send(JSON.stringify([{
    cmd: 'LocationChecks',
    locations: locationIds,
  }]));
};

// TODO: Build me!
const buildItemAndLocationData = (dataPackage) => {
  itemsById = {};
  const locationMap = {};
  Object.keys(dataPackage.games).forEach((gameName) => {
    Object.keys(dataPackage.games[gameName].item_name_to_id).forEach((itemName) => {
      itemsById[dataPackage.games[gameName].item_name_to_id[itemName]] = itemName;
    });

    Object.keys(dataPackage.games[gameName].location_name_to_id).forEach((locationName) => {
      locationMap[dataPackage.games[gameName].location_name_to_id[locationName]] = locationName;
    });
  });
  buildLocationData(locationMap);
};

/**
 * Build two global objects which are used to reference location data
 * @param locations An object of { locationId: locationName, ... }
 */
const buildLocationData = (locations) => {
  locationMap = locations;
  const locationIds = Object.keys(locations);
  const locationNames = Object.values(locations);

  Object.keys(UNDERWORLD_LOCATIONS).forEach((uwLocationName) => {
    locationsById['underworld'][locationIds[locationNames.indexOf(uwLocationName)]] = {
      name: uwLocationName,
      locationId: Number(locationIds[locationNames.indexOf(uwLocationName)]),
      roomId: UNDERWORLD_LOCATIONS[uwLocationName][0],
      mask: UNDERWORLD_LOCATIONS[uwLocationName][1],
    }

    if (!locationsByRoomId['underworld'].hasOwnProperty(UNDERWORLD_LOCATIONS[uwLocationName][0])) {
      locationsByRoomId['underworld'][UNDERWORLD_LOCATIONS[uwLocationName][0]] = [];
    }
    locationsByRoomId['underworld'][UNDERWORLD_LOCATIONS[uwLocationName][0]].push({
      name: uwLocationName,
      locationId: Number(locationIds[locationNames.indexOf(uwLocationName)]),
      roomId: UNDERWORLD_LOCATIONS[uwLocationName][0],
      mask: UNDERWORLD_LOCATIONS[uwLocationName][1],
    });
  });

  Object.keys(OVERWORLD_LOCATIONS).forEach((owLocationName) => {
    locationsById['overworld'][locationIds[locationNames.indexOf(owLocationName)]] = {
      name: owLocationName,
      locationId: Number(locationIds[locationNames.indexOf(owLocationName)]),
      screenId: OVERWORLD_LOCATIONS[owLocationName],
      mask: null,
    };

    if (!locationsByRoomId['overworld'].hasOwnProperty(OVERWORLD_LOCATIONS[owLocationName])) {
      locationsByRoomId['overworld'][OVERWORLD_LOCATIONS[owLocationName]] = [];
    }
    locationsByRoomId['overworld'][OVERWORLD_LOCATIONS[owLocationName]].push({
      name: owLocationName,
      locationId: Number(locationIds[locationNames.indexOf(owLocationName)]),
      screenId: OVERWORLD_LOCATIONS[owLocationName],
      mask: null,
    });
  });

  Object.keys(NPC_LOCATIONS).forEach((npcLocationName) => {
    locationsById['npc'][locationIds[locationNames.indexOf(npcLocationName)]] = {
      name: npcLocationName,
      locationId: Number(locationIds[locationNames.indexOf(npcLocationName)]),
      screenId: NPC_LOCATIONS[npcLocationName],
      mask: null,
    };

    if (!locationsByRoomId['npc'].hasOwnProperty(NPC_LOCATIONS[npcLocationName])) {
      locationsByRoomId['npc'][NPC_LOCATIONS[npcLocationName]] = [];
    }
    locationsByRoomId['npc'][NPC_LOCATIONS[npcLocationName]].push({
      name: npcLocationName,
      locationId: Number(locationIds[locationNames.indexOf(npcLocationName)]),
      screenId: NPC_LOCATIONS[npcLocationName],
      mask: null,
    });
  });

  Object.keys(MISC_LOCATIONS).forEach((miscLocationName) => {
    locationsById['misc'][locationIds[locationNames.indexOf(miscLocationName)]] = {
      name: miscLocationName,
      locationId: Number(locationIds[locationNames.indexOf(miscLocationName)]),
      roomId: MISC_LOCATIONS[miscLocationName][0],
      mask: MISC_LOCATIONS[miscLocationName][1],
    };

    if (!locationsByRoomId['misc'].hasOwnProperty(MISC_LOCATIONS[miscLocationName][0])) {
      locationsByRoomId['misc'][MISC_LOCATIONS[miscLocationName][0]] = [];
    }
    locationsByRoomId['misc'][MISC_LOCATIONS[miscLocationName][0]].push({
      name: miscLocationName,
      locationId: Number(locationIds[locationNames.indexOf(miscLocationName)]),
      roomId: MISC_LOCATIONS[miscLocationName][0],
      mask: MISC_LOCATIONS[miscLocationName][1],
    });
  });
};
