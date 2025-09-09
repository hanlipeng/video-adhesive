const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectFolder: () => ipcRenderer.invoke('dialog:openDirectory'),
  
  onUpdateProgress: (callback) => ipcRenderer.on('update-progress', callback),
  startProcess: (folders) => ipcRenderer.send('start-process', folders)
});