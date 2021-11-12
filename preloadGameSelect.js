const { contextBridge, ipcRenderer } = require('electron');

// General data exchange
contextBridge.exposeInMainWorld('dataExchange', {
  setGame: (game) => ipcRenderer.invoke('setGame', [game])
});

// Used for logging
contextBridge.exposeInMainWorld('logging', {
  writeToLog: (data) => ipcRenderer.invoke('writeToLog', data),
});