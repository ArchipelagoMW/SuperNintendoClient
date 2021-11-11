// Client version data
const CLIENT_VERSION = {
  state: 'Beta',
  major: 0,
  minor: 10,
  patch: 0,
};

const ARCHIPELAGO_PROTOCOL_VERSION = {
  major: 0,
  minor: 2,
  build: 0,
  class: 'Version',
};

const permissionMap = {
  0: 'Disabled',
  1: 'Enabled',
  2: 'Goal',
  6: 'Auto',
  7: 'Enabled + Auto',
};

// Item and location maps
let apItemsById = {};
let apItemsByName = {};
let apLocationsById = {};
let apLocationsByName = {};

// Data shared between main and renderer processes
let sharedData = {};

// The user has the option to pause receiving items
let receiveItems = true;

// Tracks if automatic scrolling is currently paused
let autoScrollPaused = false;

// Game-specific handler
let gameLogicLoaded = false;
let gameInstance = null;
