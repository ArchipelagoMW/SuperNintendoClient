const path = require('path');

module.exports = {
  packagerConfig: {
    name: "SuperNintendoClient",
    icon: path.join(__dirname, "icon.ico"),
    prune: true,
  },
  makers: [
    {
      name: "@electron-forge/maker-squirrel",
      config: {
        authors: "Archipelago",
        copyright: `${new Date().getFullYear()} Chris Wilson`,
        description: "The Archipelago client for The Legend of Zelda: A Link to the Past",
        iconUrl: path.join(__dirname, 'icon.ico'),
        setupExe: "SNC-Setup.exe",
        setupIcon: path.join(__dirname, 'icon.ico'),
        name: "SuperNintendoClient"
      }
    },
    {
      name: "@electron-forge/maker-zip",
    },
  ],
};