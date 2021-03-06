const romData = {
  ROM_START: 0x000000,
  WRAM_START: 0xF50000,
  WRAM_SIZE: 0x20000,
  SRAM_START: 0xE00000,

  ROMNAME_START: 0x1C4F00,
  ROMNAME_SIZE: 0x15,

  INGAME_MODES: [0x07, 0x09, 0x0b],
  ENDGAME_MODES: [0x26, 0x27],
  DEATH_MODES: [0x15, 0x17, 0x18, 0x19, 0x1A],

  LOCATIONS_START_ID: 82000,
  ITEMS_START_ID: 83000,
};

romData.DEATH_LINK_ACTIVE_ADDR = romData.ROM_START + 0x277F04; // 1 byte

romData.RECV_PROGRESS_ADDR = romData.SRAM_START + 0x2000; // 2 bytes
romData.RECV_ITEM_ADDR = romData.SAVEDATA_START + 0x4D2; // 1 byte
romData.RECV_ITEM_PLAYER_ADDR = romData.SAVEDATA_START + 0x4D3; // 1 byte

romData.SAVEDATA_START = romData.WRAM_START + 0xF000;
romData.SAVEDATA_SIZE = 0x500;