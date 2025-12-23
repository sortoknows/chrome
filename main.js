const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');

// Set Chrome user agent at app level
const chromeUserAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
app.userAgentFallback = chromeUserAgent;

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 12, y: 12 },
    backgroundColor: '#dee1e6',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true,
      webSecurity: true,
    },
  });

  // Content protection - invisible to screen capture
  mainWindow.setContentProtection(true);

  mainWindow.loadFile('index.html');

  // Window controls
  ipcMain.on('window-minimize', () => mainWindow.minimize());
  ipcMain.on('window-maximize', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });
  ipcMain.on('window-close', () => mainWindow.close());

  // Toggle content protection
  ipcMain.on('toggle-protection', (event, enabled) => {
    mainWindow.setContentProtection(enabled);
    event.reply('protection-status', enabled);
  });

  ipcMain.handle('get-protection-status', () => true);
  
  // Provide webview preload path
  ipcMain.handle('get-webview-preload-path', () => {
    return path.join(__dirname, 'webview-preload.js');
  });
}

app.whenReady().then(() => {
  // Set user agent for all sessions
  session.defaultSession.setUserAgent(chromeUserAgent);
  
  // Configure webview partition session
  const webviewSession = session.fromPartition('persist:browser');
  webviewSession.setUserAgent(chromeUserAgent);
  
  // Intercept and modify headers for default session
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    details.requestHeaders['User-Agent'] = chromeUserAgent;
    delete details.requestHeaders['X-Electron-Version'];
    callback({ cancel: false, requestHeaders: details.requestHeaders });
  });
  
  // Intercept and modify headers for webview session
  webviewSession.webRequest.onBeforeSendHeaders((details, callback) => {
    details.requestHeaders['User-Agent'] = chromeUserAgent;
    delete details.requestHeaders['X-Electron-Version'];
    callback({ cancel: false, requestHeaders: details.requestHeaders });
  });

  // Handle permission requests for default session
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = ['media', 'geolocation', 'notifications', 'clipboard-read', 'clipboard-write'];
    callback(allowedPermissions.includes(permission));
  });
  
  // Handle permission requests for webview session
  webviewSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = ['media', 'geolocation', 'notifications', 'clipboard-read', 'clipboard-write'];
    callback(allowedPermissions.includes(permission));
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Set user agent for webview partitions
app.on('session-created', (sess) => {
  sess.setUserAgent(chromeUserAgent);
  sess.webRequest.onBeforeSendHeaders((details, callback) => {
    details.requestHeaders['User-Agent'] = chromeUserAgent;
    callback({ cancel: false, requestHeaders: details.requestHeaders });
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('web-contents-created', (event, contents) => {
  contents.setUserAgent(chromeUserAgent);
  
  // Inject Chrome spoofing script into webviews
  if (contents.getType() === 'webview') {
    contents.on('dom-ready', () => {
      contents.executeJavaScript(`
        // Override navigator.webdriver
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
        
        // Add chrome runtime object
        window.chrome = {
          runtime: {
            connect: () => {},
            sendMessage: () => {},
            onMessage: { addListener: () => {}, removeListener: () => {} },
          },
          csi: () => {},
          loadTimes: () => {},
          app: {
            isInstalled: false,
            getDetails: () => null,
            getIsInstalled: () => false,
            runningState: () => 'cannot_run',
          },
        };
        
        // Override navigator.vendor
        Object.defineProperty(navigator, 'vendor', { get: () => 'Google Inc.' });
        
        // Override navigator.plugins
        Object.defineProperty(navigator, 'plugins', {
          get: () => {
            const p = [
              { name: 'Chrome PDF Plugin', description: 'Portable Document Format', filename: 'internal-pdf-viewer', length: 1 },
              { name: 'Chrome PDF Viewer', description: '', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', length: 1 },
              { name: 'Native Client', description: '', filename: 'internal-nacl-plugin', length: 2 },
            ];
            p.refresh = () => {};
            return p;
          },
        });
        
        // Override navigator.languages  
        Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
        
        console.log('Chrome spoofing injected');
      `).catch(() => {});
    });
  }
  
  // Allow popups for OAuth flows (Google, Apple, etc.)
  contents.setWindowOpenHandler(({ url }) => {
    // OAuth and authentication URLs that should open in system browser
    const authDomains = [
      'accounts.google.com',
      'appleid.apple.com',
      'login.microsoftonline.com',
      'github.com/login',
      'slack.com/oauth',
    ];
    
    const isAuthUrl = authDomains.some(domain => url.includes(domain));
    
    if (isAuthUrl) {
      // Open OAuth in system browser for better compatibility
      require('electron').shell.openExternal(url);
      return { action: 'deny' };
    }
    
    // Allow Slack's internal popups to open
    if (url.includes('slack.com') || url.includes('slack-edge.com')) {
      return { action: 'allow' };
    }
    
    // Deny other popups
    return { action: 'deny' };
  });
});
