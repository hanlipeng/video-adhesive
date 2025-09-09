const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { runConcatenation } = require('./concatenator');

let mainWindow;
let ffmpegProcess = null; // Variable to hold the current FFmpeg process

function createWindow () {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// This is the exit hook
app.on('before-quit', (event) => {
  if (ffmpegProcess) {
    console.log('Attempting to kill FFmpeg process before quitting...');
    ffmpegProcess.kill();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// --- IPC Handlers ---

ipcMain.handle('dialog:openDirectory', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  if (canceled) {
    return;
  }
  return filePaths[0];
});

ipcMain.on('start-process', (event, folders) => {
  const log = (message) => event.sender.send('update-log', message);
  
  // Function to update the tracked process
  const setProcess = (proc) => {
    ffmpegProcess = proc;
  };

  runConcatenation(folders, log, setProcess);
});