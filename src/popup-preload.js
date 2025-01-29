const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('popupAPI', {
    onBlockedMessage: (callback) => ipcRenderer.on('blocked-message', callback)
});
