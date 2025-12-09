const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset', // Native macOS traffic lights
    trafficLightPosition: { x: 12, y: 12 },
    backgroundColor: '#dee1e6',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true,
    },
  });

  // Content protection - invisible to screen capture
  mainWindow.setContentProtection(true);

  mainWindow.loadFile('index.html');

  // Window controls (for non-macOS)
  ipcMain.on('window-minimize', () => {
    mainWindow.minimize();
  });

  ipcMain.on('window-maximize', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });

  ipcMain.on('window-close', () => {
    mainWindow.close();
  });

  // Toggle content protection
  ipcMain.on('toggle-protection', (event, enabled) => {
    mainWindow.setContentProtection(enabled);
    event.reply('protection-status', enabled);
  });

  ipcMain.handle('get-protection-status', () => {
    return true;
  });
}

app.whenReady().then(() => {
  // Handle permission requests
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = ['media', 'geolocation', 'notifications', 'clipboard-read'];
    callback(allowedPermissions.includes(permission));
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('web-contents-created', (event, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    return { action: 'deny' };
  });
});
