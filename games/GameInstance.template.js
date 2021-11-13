/**
 * Handles network commands received from the AP server.
 * Each method name should be the same as the `cmd`.
 */
class GameInstance {
  /** Instance Variables */

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

    // Authenticate with the server
    const romName = await readFromAddress(ROMNAME_START, ROMNAME_SIZE);
    const connectionData = {
      cmd: 'Connect',
      game: 'Game Name', // CHANGE ME
      name: 'Probably the ROM name', // CHANGE ME
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
  ReceivedItems = async (command) => {};

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
  runClientLogic = () => new Promise(async (resolve, reject) => {});

  /**
   * Handle the /locations command
   */
  handleLocationsCommand = () => {};

  /**
   * Returns the name of an item based on its ID
   * @param itemId
   */
  getItemById = (itemId) => apItemsById['Super Metroid'][itemId];

  /**
   * Returns the name of a location based on its ID
   * @param locationId
   */
  getLocationById = (locationId) => apLocationsById['Super Metroid'][locationId];
}

// Notify the client the game logic has been loaded
gameLogicLoaded = true;