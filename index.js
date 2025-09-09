const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { Concatenator } = require('./concatenator');

let mainWindow;
let currentTask = null;

function createWindow () {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.on('close', (event) => {
    if (currentTask) {
      const choice = dialog.showMessageBoxSync(mainWindow, {
        type: 'question',
        buttons: ['取消任务并退出', '继续运行'],
        title: '确认',
        message: '任务正在进行中，你确定要退出吗？'
      });
      if (choice === 1) {
        event.preventDefault();
      } else {
        currentTask.cancel();
        currentTask = null;
      }
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

app.on('before-quit', () => {
  if (currentTask) {
    console.log('Before-quit: Cancelling active task...');
    currentTask.cancel();
  }
});

app.on('window-all-closed', () => {
    app.quit();
});

// --- IPC Handlers ---

ipcMain.handle('dialog:openDirectory', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  if (canceled) return;
  return filePaths[0];
});

ipcMain.on('task:start', (event, folders) => {
  if (currentTask) {
    console.error('A task is already running.');
    return;
  }

  currentTask = new Concatenator(folders);

  currentTask.on('jobs-generated', (jobs) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      event.sender.send('task:jobs-generated', jobs);
    }
  });

  currentTask.on('progress', (progressData) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      event.sender.send('task:progress', progressData);
    }
  });

  currentTask.on('status', (status) => {
    if (status === 'done' || status === 'cancelled') {
      currentTask = null;
    }
    if (mainWindow && !mainWindow.isDestroyed()) {
        event.sender.send('task:status', status);
    }
  });

  currentTask.on('error', (errorMessage) => {
    console.error('Task Error:', errorMessage);
    // Optionally send error to renderer to be displayed
  });

  currentTask.start();
});

ipcMain.on('task:cancel', () => {
  if (currentTask) {
    currentTask.cancel();
  }
});