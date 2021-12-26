/**
 * Handles network commands received from the AP server.
 * Each method name should be the same as the `cmd`.
 */
class GameInstance {
  /** Instance Variables */
  gameName = 'Super Metroid';

  // Has DeathLink been enabled?
  deathLinkEnabled = null;

  // Item tracking
  itemsReceived = [];

  gameCompleted = false;

  constructor() {
    // Maybe do something here
  }

  /**
   * Authenticate with the AP server
   * @returns {Promise<void>}
   */
  authenticate = async () => {
    // Build tags used in authentication below
    const tags = ['Super Nintendo Client'];
    if (await this.isDeathLinkEnabled()) { tags.push('DeathLink'); }

    // Authenticate with the server
    const romName = await readFromAddress(romData.ROMNAME_START, romData.ROMNAME_SIZE);
    const connectionData = {
      cmd: 'Connect',
      game: this.gameName,
      name: btoa(new TextDecoder().decode(romName)), // Base64 encoded rom name
      uuid: getClientId(),
      tags: tags,
      password: serverPassword,
      version: ARCHIPELAGO_PROTOCOL_VERSION,
    };
    serverSocket.send(JSON.stringify([connectionData]));
  };

  /**
   * Received after the client first establishes a connection with the WebSocket server hosted by AP.
   * This is typically used to indicate the server is ready to process an authentication message.
   * @param command
   * @returns {Promise<void>}
   * @constructor
   */
  RoomInfo = async (command) => {};

  /**
   * Received when the client has successfully authenticated with the AP server. This is used to indicate
   * the client is ready to begin the client logic loop
   * @param command
   * @returns {Promise<void>}
   * @constructor
   */
  Connected = async (command) => {};

  /**
   * Received when the client's authentication is refused by the AP server.
   * @param command
   * @returns {Promise<void>}
   * @constructor
   */
  ConnectionRefused = async (command) => {};

  /**
   * Received when the client is notified that items should be granted to the player
   * @param command
   * @returns {Promise<void>}
   * @constructor
   */
  ReceivedItems = async (command) => {
    // Save received items in the array of items to be sent to the SNES, if they have not been sent already
    command.items.forEach((item) => {
      // Items from locations with id 0 or lower are special cases, and should always be allowed
      if (item.location <= 0) { return this.itemsReceived.push(item); }

      // Do not receive items which were found by the local player, as they already have them
      if (this.itemsReceived.find((ir) =>
        ir.item === item.item && ir.location === item.location && ir.player === item.player
      )) { return; }

      this.itemsReceived.push(item);
    });
  };

  /**
   * Handle location scout confirmations
   * @param command
   * @returns {Promise<void>}
   * @constructor
   */
  LocationInfo = async (command) => {};

  /**
   * Received when the server sends an update to the room information.
   * @param command
   * @returns {Promise<void>}
   * @constructor
   */
  RoomUpdate = async (command) => {};

  /**
   * Received when the server intends to print a message to the client.
   * @param command
   * @returns {Promise<void>}
   * @constructor
   */
  Print = async (command) => {};

  /**
   * Received when the server intends to print a formatted message to the client.
   * @param command
   * @returns {Promise<void>}
   * @constructor
   */
  PrintJSON = async (command) => {};

  /**
   * Received when the server delivers an updated DataPackage.
   * @param command
   * @returns {Promise<void>}
   * @constructor
   */
  DataPackage = async (command) => {};

  /**
   * Received for a variety of reasons.
   * @param command
   * @returns {Promise<void>}
   * @constructor
   */
  Bounced = async (command) => {};

  /**
   * Run a single iteration of the client logic. Scan for location checks, send received items, etc.
   * @returns {Promise<unknown>}
   */
  runClientLogic = () => new Promise(async (resolve, reject) => {
    // Fetch the current game mode
    const gameMode = await readFromAddress(romData.WRAM_START + 0x0998, 1);

    // If the game has been completed
    if (gameMode && romData.ENDGAME_MODES.includes(gameMode[0])) {
      // Update the gameCompleted status in the client if it has not already been updated
      if (!this.gameCompleted) {
        if (serverSocket && serverSocket.readyState === WebSocket.OPEN) {
          serverSocket.send(JSON.stringify([{
            cmd: 'StatusUpdate',
            status: CLIENT_STATUS.CLIENT_GOAL,
          }]));
          this.gameCompleted = true;
        }
      }

      // Do not continue interacting with the ROM if the game is in an endgame state
      return resolve();
    }

    // The Super Metroid Randomizer ROM keeps an internal array containing locations which the player
    // has collected the item from. In this section, we scan that array beginning at the index of the last
    // known location the player checked.
    const checkArrayData = await readFromAddress(romData.RECV_PROGRESS_ADDR + 0x680, 4);
    const checkArrayIndex = checkArrayData[0] | (checkArrayData[1] << 8);
    const checkArrayLength = checkArrayData[2] | (checkArrayData[3] << 8);

    // Track any new location checks, and send them all in a single report later
    const newLocationChecks = [];

    // Fetch item information for each location check not yet acknowledged by the client and report it
    // to the AP server. Each item entry is eight bytes long.
    for (let index = checkArrayIndex; index < checkArrayLength; index++) {
      const itemAddressOffset = index * 8; // Each entry in the array is eight bytes long
      const itemData = await readFromAddress(romData.RECV_PROGRESS_ADDR + 0x700 + itemAddressOffset, 8);

      // worldId is only relevant to the ROM internally. It will contain 0 if the item is for the
      // local player, and 1 if the item is for someone else. It is used to determine which text
      // box the game displays for item pickup.
      // const worldId = itemData[0] | (itemData[1] << 8);

      // itemId is only relevant to the ROM internally. Its value maps to a Super Metroid item type
      // or a single value which is incremented each time the client receives an item. It is used to
      // determine the item type text printed in the text box for item pickup.
      // const itemId = itemData[2] | (itemData[3] << 8); // Only relevant to the ROM

      // itemIndex is the index of the relevant item in the ROM's internal array of checked locations
      const itemIndex = (itemData[4] | (itemData[5] << 8)) >> 3;

      // itemData[7] and itemData[8] are always empty bytes. They are reserved for future use.

      // Add the AP locationId to the array of new location checks to be sent to the AP server
      newLocationChecks.push(romData.LOCATIONS_START_ID + itemIndex);
    }

    // If new locations have been checked, send those checks to the AP server
    if (newLocationChecks.length > 0) {
      if (serverSocket && serverSocket.readyState === WebSocket.OPEN) {
        // TODO: Write this function
        this.sendLocationChecks(newLocationChecks);

        // Update the ROM with the index of the latest item which has been acknowledged by the client
        const indexUpdateData = new Uint8Array(2);
        indexUpdateData.set([
          (checkArrayIndex + newLocationChecks.length) & 0xFF,
          ((checkArrayIndex + newLocationChecks.length) >> 8) & 0xFF,
        ]);
        await writeToAddress(romData.RECV_PROGRESS_ADDR + 0x680, indexUpdateData);
      }
    }

    // If the client is currently accepting items, send those items to the ROM
    if (receiveItems) {
      const receivedItemData = await readFromAddress(romData.RECV_PROGRESS_ADDR + 0x600, 4);
      // const whatIsThis = receivedItemData[0] | (receivedItemData[1] << 8);
      const receivedItemCount = receivedItemData[2] | (receivedItemData[3] << 8);

      if (receivedItemCount < this.itemsReceived.length) {
        // Calculate itemId
        const itemId = this.itemsReceived[receivedItemCount].item - romData.ITEMS_START_ID;

        // In the ROM, "Archipelago" is prepended to the list of players, so it is the first entry in the array
        const playerId = this.itemsReceived[receivedItemCount].player === 0 ?
          0 : this.itemsReceived[receivedItemCount].player;

        // Send newly acquired item data to the ROM
        const itemPayload = new Uint8Array(4);
        itemPayload.set([
          playerId & 0xFF,
          (playerId >> 8) & 0xFF,
          itemId & 0xFF,
          (itemId >> 8) & 0xFF,
        ]);
        await writeToAddress(romData.RECV_PROGRESS_ADDR + (receivedItemCount * 4), itemPayload);

        const itemCountPayload = new Uint8Array(2);
        itemCountPayload.set([
          (receivedItemCount + 1) & 0xFF,
          ((receivedItemCount + 1) >> 8) & 0xFF,
        ]);
        await writeToAddress(romData.RECV_PROGRESS_ADDR + 0x602, itemCountPayload);
      }
    }

    return resolve();
  });

  /**
   * Append to the local list of location checks, and inform the AP server of new checks
   * @param locationIds
   */
  sendLocationChecks = (locationIds) => {
    serverSocket.send(JSON.stringify([{
      cmd: 'LocationChecks',
      locations: locationIds,
    }]));
  };

  /**
   * Handle the /locations command
   */
  handleLocationsCommand = () => {};

  /**
   * Returns the name of an item based on its ID
   * @param itemId
   */
  getItemById = (itemId) => apItemsById[itemId];

  /**
   * Returns the name of a location based on its ID
   * @param locationId
   */
  getLocationById = (locationId) => apLocationsById[locationId];

  /**
   * Determine if this ROM has DeathLink enabled
   * @returns {Promise<boolean>}
   */
  isDeathLinkEnabled = async () => {
    // If the state of DeathLink is already known, do no re-query the ROM
    if (this.deathLinkEnabled !== null) { return this.deathLinkEnabled; }

    // Determine if DeathLink is enabled
    const deathLinkFlag = await readFromAddress(romData.DEATH_LINK_ACTIVE_ADDR, 1);
    this.deathLinkEnabled = parseInt(deathLinkFlag[0], 10) === 1;
    return this.deathLinkEnabled;
  };

  /**
   * Kill the player
   * @returns {Promise<void>}
   */
  killPlayer = async () => {
    const killSamusData = new Uint8Array(2);
    killSamusData.set([0, 0]);
    await writeToAddress(romData.WRAM_START + 0x09C2, killSamusData);
  };

  /**
   * Determine if the player is currently dead
   * @returns {Promise<boolean>}
   */
  isPlayerDead = async () => {
    // Fetch the current game mode and determine if Samus is currently dead
    const gameMode = await readFromAddress(romData.WRAM_START + 0x0998, 1);
    return romData.DEATH_MODES.includes(gameMode[0]);
  };
}

// Notify the client the game logic has been loaded
gameLogicLoaded = true;