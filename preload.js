const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectFolder: () => ipcRenderer.invoke('dialog:openDirectory'),
  onUpdateLog: (callback) => ipcRenderer.on('update-log', callback),
  startProcess: (folders) => ipcRenderer.send('start-process', folders)
});