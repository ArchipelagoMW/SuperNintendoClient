/*
Game Modes:
http://alttp.run/hacking/index.php?title=RAM:_Bank_0x7E:_Page_0x00
0x00 = Triforce / Zelda startup screens
0x01 = Game Select screen
0x02 = Copy Player Mode
0x03 = Erase Player Mode
0x04 = Name Player Mode
0x05 = Loading Game Mode
0x06 = Pre Dungeon Mode
0x07 = Dungeon Mode
0x08 = Pre Overworld Mode
0x09 = Overworld Mode
0x0A = Pre Overworld Mode (special overworld)
0x0B = Overworld Mode (special overworld)
0x0C = ???? I think we can declare this one unused, almost with complete certainty.
0x0D = Blank Screen
0x0E = Text Mode/Item Screen/Map
0x0F = Closing Spotlight
0x10 = Opening Spotlight
0x11 = Happens when you fall into a hole from the OW.
0x12 = Death Mode
0x13 = Boss Victory Mode (refills stats)
0x14 = History Mode
0x15 = Module for Magic Mirror
0x16 = Module for refilling stats after boss.
0x17 = Restart mode (save and quit)
0x18 = Ganon exits from Agahnim's body. Chase Mode.
0x19 = Triforce Room scene
0x1A = End sequence
0x1B = Screen to select where to start from (House, sanctuary, etc.)
*/

const romData = {
  ROM_START: 0x000000,
  WRAM_START: 0xF50000,
  WRAM_SIZE: 0x20000,
  SRAM_START: 0xE00000,

  UNDERWORLD_LOCATIONS: {
    // "Location Name": [roomId, mask]
    "Blind's Hideout - Top": [0x11d, 0x10],
    "Blind's Hideout - Left": [0x11d, 0x20],
    "Blind's Hideout - Right": [0x11d, 0x40],
    "Blind's Hideout - Far Left": [0x11d, 0x80],
    "Blind's Hideout - Far Right": [0x11d, 0x100],
    'Secret Passage': [0x55, 0x10],
    'Waterfall Fairy - Left': [0x114, 0x10],
    'Waterfall Fairy - Right': [0x114, 0x20],
    "King's Tomb": [0x113, 0x10],
    'Floodgate Chest': [0x10b, 0x10],
    "Link's House": [0x104, 0x10],
    'Kakariko Tavern': [0x103, 0x10],
    'Chicken House': [0x108, 0x10],
    "Aginah's Cave": [0x10a, 0x10],
    "Sahasrahla's Hut - Left": [0x105, 0x10],
    "Sahasrahla's Hut - Middle": [0x105, 0x20],
    "Sahasrahla's Hut - Right": [0x105, 0x40],
    'Kakariko Well - Top': [0x2f, 0x10],
    'Kakariko Well - Left': [0x2f, 0x20],
    'Kakariko Well - Middle': [0x2f, 0x40],
    'Kakariko Well - Right': [0x2f, 0x80],
    'Kakariko Well - Bottom': [0x2f, 0x100],
    'Lost Woods Hideout': [0xe1, 0x200],
    'Lumberjack Tree': [0xe2, 0x200],
    'Cave 45': [0x11b, 0x400],
    'Graveyard Cave': [0x11b, 0x200],
    'Checkerboard Cave': [0x126, 0x200],
    'Mini Moldorm Cave - Far Left': [0x123, 0x10],
    'Mini Moldorm Cave - Left': [0x123, 0x20],
    'Mini Moldorm Cave - Right': [0x123, 0x40],
    'Mini Moldorm Cave - Far Right': [0x123, 0x80],
    'Mini Moldorm Cave - Generous Guy': [0x123, 0x400],
    'Ice Rod Cave': [0x120, 0x10],
    'Bonk Rock Cave': [0x124, 0x10],
    'Desert Palace - Big Chest': [0x73, 0x10],
    'Desert Palace - Torch': [0x73, 0x400],
    'Desert Palace - Map Chest': [0x74, 0x10],
    'Desert Palace - Compass Chest': [0x85, 0x10],
    'Desert Palace - Big Key Chest': [0x75, 0x10],
    'Desert Palace - Desert Tiles 1 Pot Key': [0x63, 0x400],
    'Desert Palace - Beamos Hall Pot Key': [0x53, 0x400],
    'Desert Palace - Desert Tiles 2 Pot Key': [0x43, 0x400],
    'Desert Palace - Boss': [0x33, 0x800],
    'Eastern Palace - Compass Chest': [0xa8, 0x10],
    'Eastern Palace - Big Chest': [0xa9, 0x10],
    'Eastern Palace - Dark Square Pot Key': [0xba, 0x400],
    'Eastern Palace - Dark Eyegore Key Drop': [0x99, 0x400],
    'Eastern Palace - Cannonball Chest': [0xb9, 0x10],
    'Eastern Palace - Big Key Chest': [0xb8, 0x10],
    'Eastern Palace - Map Chest': [0xaa, 0x10],
    'Eastern Palace - Boss': [0xc8, 0x800],
    'Hyrule Castle - Boomerang Chest': [0x71, 0x10],
    'Hyrule Castle - Boomerang Guard Key Drop': [0x71, 0x400],
    'Hyrule Castle - Map Chest': [0x72, 0x10],
    'Hyrule Castle - Map Guard Key Drop': [0x72, 0x400],
    "Hyrule Castle - Zelda's Chest": [0x80, 0x10],
    'Hyrule Castle - Big Key Drop': [0x80, 0x400],
    'Sewers - Dark Cross': [0x32, 0x10],
    'Hyrule Castle - Key Rat Key Drop': [0x21, 0x400],
    'Sewers - Secret Room - Left': [0x11, 0x10],
    'Sewers - Secret Room - Middle': [0x11, 0x20],
    'Sewers - Secret Room - Right': [0x11, 0x40],
    'Sanctuary': [0x12, 0x10],
    'Castle Tower - Room 03': [0xe0, 0x10],
    'Castle Tower - Dark Maze': [0xd0, 0x10],
    'Castle Tower - Dark Archer Key Drop': [0xc0, 0x400],
    'Castle Tower - Circle of Pots Key Drop': [0xb0, 0x400],
    'Spectacle Rock Cave': [0xea, 0x400],
    'Paradox Cave Lower - Far Left': [0xef, 0x10],
    'Paradox Cave Lower - Left': [0xef, 0x20],
    'Paradox Cave Lower - Right': [0xef, 0x40],
    'Paradox Cave Lower - Far Right': [0xef, 0x80],
    'Paradox Cave Lower - Middle': [0xef, 0x100],
    'Paradox Cave Upper - Left': [0xff, 0x10],
    'Paradox Cave Upper - Right': [0xff, 0x20],
    'Spiral Cave': [0xfe, 0x10],
    'Tower of Hera - Basement Cage': [0x87, 0x400],
    'Tower of Hera - Map Chest': [0x77, 0x10],
    'Tower of Hera - Big Key Chest': [0x87, 0x10],
    'Tower of Hera - Compass Chest': [0x27, 0x20],
    'Tower of Hera - Big Chest': [0x27, 0x10],
    'Tower of Hera - Boss': [0x7, 0x800],
    'Hype Cave - Top': [0x11e, 0x10],
    'Hype Cave - Middle Right': [0x11e, 0x20],
    'Hype Cave - Middle Left': [0x11e, 0x40],
    'Hype Cave - Bottom': [0x11e, 0x80],
    'Hype Cave - Generous Guy': [0x11e, 0x400],
    'Peg Cave': [0x127, 0x400],
    'Pyramid Fairy - Left': [0x116, 0x10],
    'Pyramid Fairy - Right': [0x116, 0x20],
    'Brewery': [0x106, 0x10],
    'C-Shaped House': [0x11c, 0x10],
    'Chest Game': [0x106, 0x400],
    'Mire Shed - Left': [0x10d, 0x10],
    'Mire Shed - Right': [0x10d, 0x20],
    'Superbunny Cave - Top': [0xf8, 0x10],
    'Superbunny Cave - Bottom': [0xf8, 0x20],
    'Spike Cave': [0x117, 0x10],
    'Hookshot Cave - Top Right': [0x3c, 0x10],
    'Hookshot Cave - Top Left': [0x3c, 0x20],
    'Hookshot Cave - Bottom Right': [0x3c, 0x80],
    'Hookshot Cave - Bottom Left': [0x3c, 0x40],
    'Mimic Cave': [0x10c, 0x10],
    'Swamp Palace - Entrance': [0x28, 0x10],
    'Swamp Palace - Map Chest': [0x37, 0x10],
    'Swamp Palace - Pot Row Pot Key': [0x38, 0x400],
    'Swamp Palace - Trench 1 Pot Key': [0x37, 0x400],
    'Swamp Palace - Hookshot Pot Key': [0x36, 0x400],
    'Swamp Palace - Big Chest': [0x36, 0x10],
    'Swamp Palace - Compass Chest': [0x46, 0x10],
    'Swamp Palace - Trench 2 Pot Key': [0x35, 0x400],
    'Swamp Palace - Big Key Chest': [0x35, 0x10],
    'Swamp Palace - West Chest': [0x34, 0x10],
    'Swamp Palace - Flooded Room - Left': [0x76, 0x10],
    'Swamp Palace - Flooded Room - Right': [0x76, 0x20],
    'Swamp Palace - Waterfall Room': [0x66, 0x10],
    'Swamp Palace - Waterway Pot Key': [0x16, 0x400],
    'Swamp Palace - Boss': [0x6, 0x800],
    "Thieves' Town - Big Key Chest": [0xdb, 0x20],
    "Thieves' Town - Map Chest": [0xdb, 0x10],
    "Thieves' Town - Compass Chest": [0xdc, 0x10],
    "Thieves' Town - Ambush Chest": [0xcb, 0x10],
    "Thieves' Town - Hallway Pot Key": [0xbc, 0x400],
    "Thieves' Town - Spike Switch Pot Key": [0xab, 0x400],
    "Thieves' Town - Attic": [0x65, 0x10],
    "Thieves' Town - Big Chest": [0x44, 0x10],
    "Thieves' Town - Blind's Cell": [0x45, 0x10],
    "Thieves' Town - Boss": [0xac, 0x800],
    'Skull Woods - Compass Chest': [0x67, 0x10],
    'Skull Woods - Map Chest': [0x58, 0x20],
    'Skull Woods - Big Chest': [0x58, 0x10],
    'Skull Woods - Pot Prison': [0x57, 0x20],
    'Skull Woods - Pinball Room': [0x68, 0x10],
    'Skull Woods - Big Key Chest': [0x57, 0x10],
    'Skull Woods - West Lobby Pot Key': [0x56, 0x400],
    'Skull Woods - Bridge Room': [0x59, 0x10],
    'Skull Woods - Spike Corner Key Drop': [0x39, 0x400],
    'Skull Woods - Boss': [0x29, 0x800],
    'Ice Palace - Jelly Key Drop': [0x0e, 0x400],
    'Ice Palace - Compass Chest': [0x2e, 0x10],
    'Ice Palace - Conveyor Key Drop': [0x3e, 0x400],
    'Ice Palace - Freezor Chest': [0x7e, 0x10],
    'Ice Palace - Big Chest': [0x9e, 0x10],
    'Ice Palace - Iced T Room': [0xae, 0x10],
    'Ice Palace - Many Pots Pot Key': [0x9f, 0x400],
    'Ice Palace - Spike Room': [0x5f, 0x10],
    'Ice Palace - Big Key Chest': [0x1f, 0x10],
    'Ice Palace - Hammer Block Key Drop': [0x3f, 0x400],
    'Ice Palace - Map Chest': [0x3f, 0x10],
    'Ice Palace - Boss': [0xde, 0x800],
    'Misery Mire - Big Chest': [0xc3, 0x10],
    'Misery Mire - Map Chest': [0xc3, 0x20],
    'Misery Mire - Main Lobby': [0xc2, 0x10],
    'Misery Mire - Bridge Chest': [0xa2, 0x10],
    'Misery Mire - Spikes Pot Key': [0xb3, 0x400],
    'Misery Mire - Spike Chest': [0xb3, 0x10],
    'Misery Mire - Fishbone Pot Key': [0xa1, 0x400],
    'Misery Mire - Conveyor Crystal Key Drop': [0xc1, 0x400],
    'Misery Mire - Compass Chest': [0xc1, 0x10],
    'Misery Mire - Big Key Chest': [0xd1, 0x10],
    'Misery Mire - Boss': [0x90, 0x800],
    'Turtle Rock - Compass Chest': [0xd6, 0x10],
    'Turtle Rock - Roller Room - Left': [0xb7, 0x10],
    'Turtle Rock - Roller Room - Right': [0xb7, 0x20],
    'Turtle Rock - Pokey 1 Key Drop': [0xb6, 0x400],
    'Turtle Rock - Chain Chomps': [0xb6, 0x10],
    'Turtle Rock - Pokey 2 Key Drop': [0x13, 0x400],
    'Turtle Rock - Big Key Chest': [0x14, 0x10],
    'Turtle Rock - Big Chest': [0x24, 0x10],
    'Turtle Rock - Crystaroller Room': [0x4, 0x10],
    'Turtle Rock - Eye Bridge - Bottom Left': [0xd5, 0x80],
    'Turtle Rock - Eye Bridge - Bottom Right': [0xd5, 0x40],
    'Turtle Rock - Eye Bridge - Top Left': [0xd5, 0x20],
    'Turtle Rock - Eye Bridge - Top Right': [0xd5, 0x10],
    'Turtle Rock - Boss': [0xa4, 0x800],
    'Palace of Darkness - Shooter Room': [0x9, 0x10],
    'Palace of Darkness - The Arena - Bridge': [0x2a, 0x20],
    'Palace of Darkness - Stalfos Basement': [0xa, 0x10],
    'Palace of Darkness - Big Key Chest': [0x3a, 0x10],
    'Palace of Darkness - The Arena - Ledge': [0x2a, 0x10],
    'Palace of Darkness - Map Chest': [0x2b, 0x10],
    'Palace of Darkness - Compass Chest': [0x1a, 0x20],
    'Palace of Darkness - Dark Basement - Left': [0x6a, 0x10],
    'Palace of Darkness - Dark Basement - Right': [0x6a, 0x20],
    'Palace of Darkness - Dark Maze - Top': [0x19, 0x10],
    'Palace of Darkness - Dark Maze - Bottom': [0x19, 0x20],
    'Palace of Darkness - Big Chest': [0x1a, 0x10],
    'Palace of Darkness - Harmless Hellway': [0x1a, 0x40],
    'Palace of Darkness - Boss': [0x5a, 0x800],
    'Ganons Tower - Conveyor Cross Pot Key': [0x8b, 0x400],
    "Ganons Tower - Bob's Torch": [0x8c, 0x400],
    'Ganons Tower - Hope Room - Left': [0x8c, 0x20],
    'Ganons Tower - Hope Room - Right': [0x8c, 0x40],
    'Ganons Tower - Tile Room': [0x8d, 0x10],
    'Ganons Tower - Compass Room - Top Left': [0x9d, 0x10],
    'Ganons Tower - Compass Room - Top Right': [0x9d, 0x20],
    'Ganons Tower - Compass Room - Bottom Left': [0x9d, 0x40],
    'Ganons Tower - Compass Room - Bottom Right': [0x9d, 0x80],
    'Ganons Tower - Conveyor Star Pits Pot Key': [0x7b, 0x400],
    'Ganons Tower - DMs Room - Top Left': [0x7b, 0x10],
    'Ganons Tower - DMs Room - Top Right': [0x7b, 0x20],
    'Ganons Tower - DMs Room - Bottom Left': [0x7b, 0x40],
    'Ganons Tower - DMs Room - Bottom Right': [0x7b, 0x80],
    'Ganons Tower - Map Chest': [0x8b, 0x10],
    'Ganons Tower - Double Switch Pot Key': [0x9b, 0x400],
    'Ganons Tower - Firesnake Room': [0x7d, 0x10],
    'Ganons Tower - Randomizer Room - Top Left': [0x7c, 0x10],
    'Ganons Tower - Randomizer Room - Top Right': [0x7c, 0x20],
    'Ganons Tower - Randomizer Room - Bottom Left': [0x7c, 0x40],
    'Ganons Tower - Randomizer Room - Bottom Right': [0x7c, 0x80],
    "Ganons Tower - Bob's Chest": [0x8c, 0x80],
    'Ganons Tower - Big Chest': [0x8c, 0x10],
    'Ganons Tower - Big Key Room - Left': [0x1c, 0x20],
    'Ganons Tower - Big Key Room - Right': [0x1c, 0x40],
    'Ganons Tower - Big Key Chest': [0x1c, 0x10],
    'Ganons Tower - Mini Helmasaur Room - Left': [0x3d, 0x10],
    'Ganons Tower - Mini Helmasaur Room - Right': [0x3d, 0x20],
    'Ganons Tower - Mini Helmasaur Key Drop': [0x3d, 0x400],
    'Ganons Tower - Pre-Moldorm Chest': [0x3d, 0x40],
    'Ganons Tower - Validation Chest': [0x4d, 0x10]
  },

  OVERWORLD_LOCATIONS: {
    'Flute Spot': 0x2a,
    'Sunken Treasure': 0x3b,
    "Zora's Ledge": 0x81,
    'Lake Hylia Island': 0x35,
    'Maze Race': 0x28,
    'Desert Ledge': 0x30,
    'Master Sword Pedestal': 0x80,
    'Spectacle Rock': 0x3,
    'Pyramid': 0x5b,
    'Digging Game': 0x68,
    'Bumper Cave Ledge': 0x4a,
    'Floating Island': 0x5
  },

  NPC_LOCATIONS: {
    'Mushroom': 0x1000,
    'King Zora': 0x2,
    'Sahasrahla': 0x10,
    'Blacksmith': 0x400,
    'Magic Bat': 0x8000,
    'Sick Kid': 0x4,
    'Library': 0x80,
    'Potion Shop': 0x2000,
    'Old Man': 0x1,
    'Ether Tablet': 0x100,
    'Catfish': 0x20,
    'Stumpy': 0x8,
    'Bombos Tablet': 0x200
  },

  MISC_LOCATIONS: {
    'Bottle Merchant': [0x3c9, 0x2],
    'Purple Chest': [0x3c9, 0x10],
    "Link's Uncle": [0x3c6, 0x1],
    'Hobo': [0x3c9, 0x1]
  },

  SHOP_TYPES: {
    Shop: 0,
    TakeAny: 1,
    UpgradeShop: 2
  },

  SHOP_INVENTORY_DEFAULTS: {
    lightWorld: [
      { name: 'Red Potion', cost: 150, limit: null },
      { name: 'Small Heart', cost: 10, limit: null },
      { name: 'Bombs (10)', cost: 50, limit: null },
    ],
    darkWorld: [
      { name: 'Red Potion', cost: 150, limit: null },
      { name: 'Blue Shield', cost: 50, limit: null },
      { name: 'Bombs (10)', cost: 50, limit: null },
    ],
    inverted: [
      { name: 'Blue Potion', cost: 160, limit: null },
      { name: 'Blue Shield', cost: 50, limit: null },
      { name: 'Bombs (10)', cost: 50, limit: null },
    ],
  },
};

romData.ROMNAME_START = romData.SRAM_START + 0x2000;
romData.ROMNAME_SIZE = 0x15;

romData.INGAME_MODES = [0x07, 0x09, 0x0b];
romData.ENDGAME_MODES = [0x19, 0x1a];
romData.DEATH_MODES = [0x12];

romData.SAVEDATA_START = romData.WRAM_START + 0xF000;
romData.SAVEDATA_SIZE = 0x500;

romData.DEATH_LINK_ACTIVE_ADDR = romData.ROMNAME_START + 0x15;

// Received items are sent to the client as an array when it connects to the server. This array is sent in the
// same order every time. To survive a client restart, the index of the last item sent to the SNES is stored
// in the ROM. This also allows the client to re-send items to the dirty cheaters who rewind their game.
romData.RECEIVED_ITEMS_INDEX = romData.SAVEDATA_START + 0x4D0; // 2 bytes

// Location to write data when sending an item to a player
romData.RECEIVED_ITEM_ADDRESS = romData.SAVEDATA_START + 0x4D2; // 1 byte

// ID of the player who sent the item, which allows "Received from Player" while playing
romData.RECEIVED_ITEM_SENDER_ADDRESS = romData.SAVEDATA_START + 0x4D3; // 1 byte

romData.ROOMID_ADDR = romData.SAVEDATA_START + 0x4D4; // 2 bytes
romData.ROOMDATA_ADDR = romData.SAVEDATA_START + 0x4D6; // 1 byte
romData.SCOUT_LOCATION_ADDR = romData.SAVEDATA_START + 0x4D7; // 1 byte
romData.SCOUTREPLY_LOCATION_ADDR = romData.SAVEDATA_START + 0x4D8; // 1 byte
romData.SCOUTREPLY_ITEM_ADDR = romData.SAVEDATA_START + 0x4D9; // 1 byte
romData.SCOUTREPLY_PLAYER_ADDR = romData.SAVEDATA_START + 0x4DA; // 1 byte
romData.SHOP_ADDR = romData.SAVEDATA_START + 0x302; // 2 bytes
romData.SHOP_ID_START = 0x400000;

romData.SHOPS = {
  'Cave Shop (Dark Death Mountain)': {
    locationId: 0x0112,
    type: romData.SHOP_TYPES.Shop,
    shopkeeper: 0xC1,
    custom: true,
    locked: false,
    items: romData.SHOP_INVENTORY_DEFAULTS.lightWorld,
    sramOffset: 0,
  },
  'Red Shield Shop': {
    locationId: 0x0110,
    type: romData.SHOP_TYPES.Shop,
    shopkeeper: 0xC1,
    custom: true,
    locked: false,
    items: [
      {name: 'Red Shield', cost: 500, limit: null},
      {name: 'Bee', cost: 10, limit: null},
      {name: 'Arrows (10)', cost: 30, limit: null},
    ],
    sramOffset: 3,
  },
  'Dark Lake Hylia Shop': {
    locationId: 0x010F,
    type: romData.SHOP_TYPES.Shop,
    shopkeeper: 0xC1,
    custom: true,
    locked: false,
    items: romData.SHOP_INVENTORY_DEFAULTS.darkWorld,
    sramOffset: 6,
  },
  'Dark World Lumberjack Shop': {
    locationId: 0x010F,
    type: romData.SHOP_TYPES.Shop,
    shopkeeper: 0xC1,
    custom: true,
    locked: false,
    items: romData.SHOP_INVENTORY_DEFAULTS.darkWorld,
    sramOffset: 9,
  },
  'Village of Outcasts Shop': {
    locationId: 0x010F,
    type: romData.SHOP_TYPES.Shop,
    shopkeeper: 0xC1,
    custom: true,
    locked: false,
    items: romData.SHOP_INVENTORY_DEFAULTS.darkWorld,
    sramOffset: 12,
  },
  'Dark World Potion Shop': {
    locationId: 0x010F,
    type: romData.SHOP_TYPES.Shop,
    shopkeeper: 0xC1,
    custom: true,
    locked: false,
    items: romData.SHOP_INVENTORY_DEFAULTS.darkWorld,
    sramOffset: 15,
  },
  'Light World Death Mountain Shop': {
    locationId: 0x00FF,
    type: romData.SHOP_TYPES.Shop,
    shopkeeper: 0xA0,
    custom: true,
    locked: false,
    items: romData.SHOP_INVENTORY_DEFAULTS.lightWorld,
    sramOffset: 18,
  },
  'Kakariko Shop': {
    locationId: 0x011F,
    type: romData.SHOP_TYPES.Shop,
    shopkeeper: 0xA0,
    custom: true,
    locked: false,
    items: romData.SHOP_INVENTORY_DEFAULTS.lightWorld,
    sramOffset: 21,
  },
  'Cave Shop (Lake Hylia)': {
    locationId: 0x0112,
    type: romData.SHOP_TYPES.Shop,
    shopkeeper: 0xA0,
    custom: true,
    locked: false,
    items: romData.SHOP_INVENTORY_DEFAULTS.lightWorld,
    sramOffset: 24,
  },
  'Potion Shop': {
    locationId: 0x0109,
    type: romData.SHOP_TYPES.Shop,
    shopkeeper: 0xA0,
    custom: true,
    locked: true,
    items: [
      {name: 'Red Potion', cost: 120, limit: null},
      {name: 'Green Potion', cost: 60, limit: null},
      {name: 'Blue Potion', cost: 160, limit: null},
    ],
    sramOffset: 27,
  },
  'Capacity Upgrade': {
    locationId: 0x0115,
    type: romData.SHOP_TYPES.UpgradeShop,
    shopkeeper: 0x04,
    custom: true,
    locked: true,
    items: [
      {name: 'Bomb Upgrade (+5)', cost: 100, limit: 8},
      {name: 'Arrow Upgrade (+5)', cost: 100, limit: 8},
    ],
    sramOffset: 30,
  }
};

// Create an array containing only shopIds
romData.shopIds = Object.values(romData.SHOPS).map((shop) => shop.locationId)
