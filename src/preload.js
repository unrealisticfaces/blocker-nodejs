const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    onBlockedExecution: (callback) => ipcRenderer.on('blocked-execution', callback),
    startBlocking: () => ipcRenderer.invoke('start-blocking'),
    stopBlocking: () => ipcRenderer.invoke('stop-blocking'),
    addKeyword: (keyword) => ipcRenderer.invoke('addKeyword', keyword)
});

contextBridge.exposeInMainWorld('ipcRenderer', {
    send: (channel, data) => ipcRenderer.send(channel, data),
    on: (channel, func) => ipcRenderer.on(channel, (event, ...args) => func(...args))
});