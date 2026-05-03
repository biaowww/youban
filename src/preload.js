const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('gameAPI', {
  getGameList: ()       => ipcRenderer.invoke('get-game-list'),
  getGameData: (gameId) => ipcRenderer.invoke('get-game-data', gameId),
  platform: process.platform,
});
