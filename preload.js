const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectFolder: () => ipcRenderer.invoke('dialog:openDirectory'),
  generateJobs: (folders) => ipcRenderer.invoke('jobs:generate', folders),
  runJobs: (folders, jobs) => ipcRenderer.send('jobs:run', { folders, jobs }),
  onUpdateSpecificProgress: (callback) => ipcRenderer.on('update-specific-progress', callback)
});
