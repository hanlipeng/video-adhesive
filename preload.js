const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Methods
  selectFolder: () => ipcRenderer.invoke('dialog:openDirectory'),
  startTask: (folders) => ipcRenderer.send('task:start', folders),
  cancelTask: () => ipcRenderer.send('task:cancel'),

  // Listeners
  onJobsGenerated: (callback) => ipcRenderer.on('task:jobs-generated', callback),
  onProgress: (callback) => ipcRenderer.on('task:progress', callback),
  onStatus: (callback) => ipcRenderer.on('task:status', callback),
});