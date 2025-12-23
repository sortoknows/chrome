// Webview preload script - Make it look like real Chrome

// Override navigator.webdriver (bot detection)
Object.defineProperty(navigator, 'webdriver', {
  get: () => false,
});

// Add chrome runtime object (key detection method)
window.chrome = {
  runtime: {
    connect: () => {},
    sendMessage: () => {},
    onMessage: {
      addListener: () => {},
      removeListener: () => {},
    },
  },
  csi: () => {},
  loadTimes: () => {},
};

// Override navigator.plugins to look like Chrome
Object.defineProperty(navigator, 'plugins', {
  get: () => {
    const plugins = [
      {
        name: 'Chrome PDF Plugin',
        description: 'Portable Document Format',
        filename: 'internal-pdf-viewer',
        length: 1,
      },
      {
        name: 'Chrome PDF Viewer',
        description: '',
        filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai',
        length: 1,
      },
      {
        name: 'Native Client',
        description: '',
        filename: 'internal-nacl-plugin',
        length: 2,
      },
    ];
    plugins.refresh = () => {};
    return plugins;
  },
});

// Override navigator.languages
Object.defineProperty(navigator, 'languages', {
  get: () => ['en-US', 'en'],
});

// Override navigator.vendor
Object.defineProperty(navigator, 'vendor', {
  get: () => 'Google Inc.',
});

// Override navigator.platform
Object.defineProperty(navigator, 'platform', {
  get: () => 'MacIntel',
});

// Override permissions query
const originalQuery = window.navigator.permissions?.query;
if (originalQuery) {
  window.navigator.permissions.query = (parameters) => {
    if (parameters.name === 'notifications') {
      return Promise.resolve({ state: Notification.permission });
    }
    return originalQuery(parameters);
  };
}

// Add missing Chrome functions
window.chrome.app = {
  isInstalled: false,
  getDetails: () => null,
  getIsInstalled: () => false,
  runningState: () => 'cannot_run',
};

// Override toString methods to hide modifications
const originalToString = Function.prototype.toString;
Function.prototype.toString = function() {
  if (this === window.navigator.permissions.query) {
    return 'function query() { [native code] }';
  }
  return originalToString.call(this);
};

console.log('Chrome spoofing loaded');






