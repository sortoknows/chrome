const { contextBridge, ipcRenderer } = require('electron');

// Expose safe APIs to renderer process
contextBridge.exposeInMainWorld('ghostAPI', {
  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),

  // Content protection toggle
  toggleProtection: (enabled) => ipcRenderer.send('toggle-protection', enabled),
  onProtectionStatus: (callback) => ipcRenderer.on('protection-status', (event, status) => callback(status)),
  getProtectionStatus: () => ipcRenderer.invoke('get-protection-status'),
});

