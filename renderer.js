// Tab Management
let tabs = [];
let activeTabId = null;
let tabIdCounter = 0;

// Bookmarks
let bookmarks = JSON.parse(localStorage.getItem('bookmarks') || '[]');

// DOM Elements
const tabsContainer = document.getElementById('tabsContainer');
const webviewsContainer = document.getElementById('webviewsContainer');
const newTabBtn = document.getElementById('newTabBtn');
const urlInput = document.getElementById('urlInput');
const backBtn = document.getElementById('backBtn');
const forwardBtn = document.getElementById('forwardBtn');
const reloadBtn = document.getElementById('reloadBtn');
const homeBtn = document.getElementById('homeBtn');
const menuBtn = document.getElementById('menuBtn');
const settingsDropdown = document.getElementById('settingsDropdown');
const protectionToggle = document.getElementById('protectionToggle');
const loadingBar = document.getElementById('loadingBar');
const urlIcon = document.getElementById('urlIcon');
const newTabPageTemplate = document.getElementById('newTabPageTemplate');
const bookmarkBtn = document.getElementById('bookmarkBtn');
const bookmarksBtn = document.getElementById('bookmarksBtn');
const bookmarksPanel = document.getElementById('bookmarksPanel');
const bookmarksList = document.getElementById('bookmarksList');

let isProtected = true;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  isProtected = await window.ghostAPI.getProtectionStatus();
  updateProtectionUI(isProtected);
  createNewTab('https://app.slack.com');
});

// Window Controls - using native macOS traffic lights

// Menu Toggle
menuBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  settingsDropdown.classList.toggle('open');
  bookmarksPanel.classList.remove('open');
});

document.addEventListener('click', (e) => {
  if (!settingsDropdown.contains(e.target) && e.target !== menuBtn) {
    settingsDropdown.classList.remove('open');
  }
});

// Protection Toggle
protectionToggle.addEventListener('click', () => {
  isProtected = !isProtected;
  window.ghostAPI.toggleProtection(isProtected);
  updateProtectionUI(isProtected);
});

window.ghostAPI.onProtectionStatus((status) => {
  isProtected = status;
  updateProtectionUI(status);
});

function updateProtectionUI(enabled) {
  if (enabled) {
    protectionToggle.classList.add('active');
  } else {
    protectionToggle.classList.remove('active');
  }
}

// Tab Functions
function createNewTab(url = null) {
  const tabId = ++tabIdCounter;
  
  const tab = {
    id: tabId,
    title: 'New Tab',
    url: url || '',
    favicon: null,
    isNewTabPage: !url
  };
  
  tabs.push(tab);
  
  // Create tab element
  const tabEl = document.createElement('div');
  tabEl.className = 'tab';
  tabEl.dataset.tabId = tabId;
  tabEl.innerHTML = `
    <div class="tab-favicon">
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
      </svg>
    </div>
    <span class="tab-title">New Tab</span>
    <button class="tab-close">
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
      </svg>
    </button>
  `;
  
  tabEl.addEventListener('click', (e) => {
    if (!e.target.closest('.tab-close')) {
      switchToTab(tabId);
    }
  });
  
  tabEl.querySelector('.tab-close').addEventListener('click', (e) => {
    e.stopPropagation();
    closeTab(tabId);
  });
  
  tabsContainer.appendChild(tabEl);
  
  // Create webview
  const webview = document.createElement('webview');
  webview.id = `webview-${tabId}`;
  webview.setAttribute('allowpopups', '');
  webview.setAttribute('useragent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');
  webview.setAttribute('partition', 'persist:browser');
  webview.style.display = 'none';
  
  // Inject Chrome spoofing when DOM is ready
  webview.addEventListener('dom-ready', () => {
    webview.executeJavaScript(`
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      window.chrome = {
        runtime: { connect: () => {}, sendMessage: () => {}, onMessage: { addListener: () => {}, removeListener: () => {} } },
        csi: () => {}, loadTimes: () => {},
        app: { isInstalled: false, getDetails: () => null, getIsInstalled: () => false, runningState: () => 'cannot_run' },
      };
      Object.defineProperty(navigator, 'vendor', { get: () => 'Google Inc.' });
      Object.defineProperty(navigator, 'plugins', {
        get: () => {
          const p = [
            { name: 'Chrome PDF Plugin', description: 'PDF', filename: 'internal-pdf-viewer', length: 1 },
            { name: 'Chrome PDF Viewer', description: '', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', length: 1 },
          ];
          p.refresh = () => {};
          return p;
        },
      });
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    `).catch(() => {});
  });
  
  // Webview events
  webview.addEventListener('did-start-loading', () => {
    if (activeTabId === tabId) {
      loadingBar.classList.add('loading');
      loadingBar.classList.remove('complete');
    }
  });
  
  webview.addEventListener('did-stop-loading', () => {
    if (activeTabId === tabId) {
      loadingBar.classList.remove('loading');
      loadingBar.classList.add('complete');
      updateNavButtons();
    }
  });
  
  webview.addEventListener('did-navigate', (e) => {
    const t = tabs.find(t => t.id === tabId);
    if (t) {
      t.url = e.url;
      t.isNewTabPage = false;
    }
    if (activeTabId === tabId) {
      urlInput.value = e.url;
      updateUrlIcon(e.url);
      updateNavButtons();
      updateBookmarkButton();
    }
  });
  
  webview.addEventListener('did-navigate-in-page', (e) => {
    const t = tabs.find(t => t.id === tabId);
    if (t) t.url = e.url;
    if (activeTabId === tabId) {
      urlInput.value = e.url;
      updateUrlIcon(e.url);
      updateNavButtons();
      updateBookmarkButton();
    }
  });
  
  webview.addEventListener('page-title-updated', (e) => {
    const t = tabs.find(t => t.id === tabId);
    if (t) t.title = e.title;
    updateTabUI(tabId);
    if (activeTabId === tabId) {
      document.title = e.title;
    }
  });
  
  webview.addEventListener('page-favicon-updated', (e) => {
    if (e.favicons && e.favicons.length > 0) {
      const t = tabs.find(t => t.id === tabId);
      if (t) t.favicon = e.favicons[0];
      updateTabUI(tabId);
    }
  });
  
  // Handle new window requests (OAuth popups, etc.)
  webview.addEventListener('new-window', (e) => {
    e.preventDefault();
    const url = e.url;
    
    // Check if it's an OAuth callback that should stay in the app
    if (url.includes('slack.com')) {
      // Navigate in the current tab for Slack URLs
      navigateInTab(tabId, url);
    } else {
      // Open external links in new tab
      createNewTab(url);
    }
  });
  
  webviewsContainer.appendChild(webview);
  
  // Switch to new tab
  switchToTab(tabId);
  
  // Navigate if URL provided
  if (url) {
    navigateInTab(tabId, url);
  }
  
  return tabId;
}

function switchToTab(tabId) {
  activeTabId = tabId;
  const tab = tabs.find(t => t.id === tabId);
  
  // Update tab UI
  document.querySelectorAll('.tab').forEach(el => {
    el.classList.toggle('active', parseInt(el.dataset.tabId) === tabId);
  });
  
  // Update webview visibility
  document.querySelectorAll('#webviewsContainer webview').forEach(wv => {
    wv.classList.remove('active');
    wv.style.display = 'none';
  });
  
  const webview = document.getElementById(`webview-${tabId}`);
  
  // Show/hide new tab page
  if (tab && tab.isNewTabPage) {
    newTabPageTemplate.classList.add('active');
    if (webview) {
      webview.classList.remove('active');
      webview.style.display = 'none';
    }
    urlInput.value = '';
    document.title = 'New Tab';
    updateUrlIcon('');
    
    // Focus search input
    setTimeout(() => {
      const searchInput = newTabPageTemplate.querySelector('.search-input');
      if (searchInput) searchInput.focus();
    }, 100);
  } else {
    newTabPageTemplate.classList.remove('active');
    if (webview) {
      webview.classList.add('active');
      webview.style.display = 'flex';
    }
    if (tab) {
      urlInput.value = tab.url;
      document.title = tab.title;
      updateUrlIcon(tab.url);
    }
  }
  
  updateNavButtons();
  updateBookmarkButton();
}

function closeTab(tabId) {
  const index = tabs.findIndex(t => t.id === tabId);
  if (index === -1) return;
  
  // Remove tab
  tabs.splice(index, 1);
  
  // Remove tab element
  const tabEl = document.querySelector(`.tab[data-tab-id="${tabId}"]`);
  if (tabEl) tabEl.remove();
  
  // Remove webview
  const webview = document.getElementById(`webview-${tabId}`);
  if (webview) webview.remove();
  
  // If no tabs left, create new one
  if (tabs.length === 0) {
    createNewTab();
    return;
  }
  
  // Switch to another tab if this was active
  if (activeTabId === tabId) {
    const newIndex = Math.min(index, tabs.length - 1);
    switchToTab(tabs[newIndex].id);
  }
}

function updateTabUI(tabId) {
  const tab = tabs.find(t => t.id === tabId);
  const tabEl = document.querySelector(`.tab[data-tab-id="${tabId}"]`);
  
  if (!tab || !tabEl) return;
  
  const titleEl = tabEl.querySelector('.tab-title');
  const faviconEl = tabEl.querySelector('.tab-favicon');
  
  if (titleEl) titleEl.textContent = tab.title || 'New Tab';
  
  if (faviconEl) {
    if (tab.favicon) {
      faviconEl.innerHTML = `<img src="${tab.favicon}" alt="">`;
    } else {
      faviconEl.innerHTML = `
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
        </svg>
      `;
    }
  }
}

function navigateInTab(tabId, url) {
  // Add protocol if missing
  if (!/^https?:\/\//i.test(url)) {
    if (/^[\w-]+(\.[\w-]+)+/.test(url)) {
      url = 'https://' + url;
    } else {
      url = 'https://www.google.com/search?q=' + encodeURIComponent(url);
    }
  }
  
  const tab = tabs.find(t => t.id === tabId);
  if (tab) {
    tab.url = url;
    tab.isNewTabPage = false;
  }
  
  const webview = document.getElementById(`webview-${tabId}`);
  if (webview) {
    webview.src = url;
  }
  
  // Update UI
  if (activeTabId === tabId) {
    newTabPageTemplate.classList.remove('active');
    if (webview) {
      webview.classList.add('active');
      webview.style.display = 'flex';
    }
    urlInput.value = url;
    updateUrlIcon(url);
  }
}

// New Tab Button
newTabBtn.addEventListener('click', () => {
  createNewTab();
});

// URL Input
urlInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && activeTabId) {
    navigateInTab(activeTabId, urlInput.value.trim());
  }
});

// Search input in new tab page
document.addEventListener('keypress', (e) => {
  if (e.target.classList.contains('search-input') && e.key === 'Enter' && activeTabId) {
    navigateInTab(activeTabId, e.target.value.trim());
  }
});

// Shortcuts
document.addEventListener('click', (e) => {
  const shortcut = e.target.closest('.shortcut');
  if (shortcut && activeTabId) {
    const url = shortcut.dataset.url;
    navigateInTab(activeTabId, url);
  }
});

// Navigation Buttons
backBtn.addEventListener('click', () => {
  if (activeTabId) {
    const webview = document.getElementById(`webview-${activeTabId}`);
    if (webview && webview.canGoBack()) {
      webview.goBack();
    }
  }
});

forwardBtn.addEventListener('click', () => {
  if (activeTabId) {
    const webview = document.getElementById(`webview-${activeTabId}`);
    if (webview && webview.canGoForward()) {
      webview.goForward();
    }
  }
});

reloadBtn.addEventListener('click', () => {
  if (activeTabId) {
    const tab = tabs.find(t => t.id === activeTabId);
    if (tab && !tab.isNewTabPage) {
      const webview = document.getElementById(`webview-${activeTabId}`);
      if (webview) webview.reload();
    }
  }
});

homeBtn.addEventListener('click', () => {
  if (activeTabId) {
    const tab = tabs.find(t => t.id === activeTabId);
    if (tab) {
      tab.isNewTabPage = true;
      tab.title = 'New Tab';
      tab.url = '';
      tab.favicon = null;
      updateTabUI(activeTabId);
      switchToTab(activeTabId);
    }
  }
});

// Update URL icon
function updateUrlIcon(url) {
  if (url && url.startsWith('https://')) {
    urlIcon.innerHTML = `
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
      </svg>
    `;
  } else {
    urlIcon.innerHTML = `
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
      </svg>
    `;
  }
}

// Update navigation buttons state
function updateNavButtons() {
  if (!activeTabId) {
    backBtn.disabled = true;
    forwardBtn.disabled = true;
    return;
  }
  
  const tab = tabs.find(t => t.id === activeTabId);
  if (tab && tab.isNewTabPage) {
    backBtn.disabled = true;
    forwardBtn.disabled = true;
    return;
  }
  
  const webview = document.getElementById(`webview-${activeTabId}`);
  if (webview) {
    backBtn.disabled = !webview.canGoBack();
    forwardBtn.disabled = !webview.canGoForward();
  } else {
    backBtn.disabled = true;
    forwardBtn.disabled = true;
  }
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // Cmd/Ctrl + T for new tab
  if ((e.metaKey || e.ctrlKey) && e.key === 't') {
    e.preventDefault();
    createNewTab();
  }
  
  // Cmd/Ctrl + W to close tab
  if ((e.metaKey || e.ctrlKey) && e.key === 'w') {
    e.preventDefault();
    if (activeTabId) {
      closeTab(activeTabId);
    }
  }
  
  // Cmd/Ctrl + L to focus URL bar
  if ((e.metaKey || e.ctrlKey) && e.key === 'l') {
    e.preventDefault();
    urlInput.focus();
    urlInput.select();
  }
  
  // Cmd/Ctrl + R to reload
  if ((e.metaKey || e.ctrlKey) && e.key === 'r') {
    e.preventDefault();
    if (activeTabId) {
      const tab = tabs.find(t => t.id === activeTabId);
      if (tab && !tab.isNewTabPage) {
        const webview = document.getElementById(`webview-${activeTabId}`);
        if (webview) webview.reload();
      }
    }
  }
  
  // Escape to close settings
  if (e.key === 'Escape') {
    settingsDropdown.classList.remove('open');
  }
  
  // Alt + Left/Right for navigation
  if (e.altKey && e.key === 'ArrowLeft') {
    e.preventDefault();
    if (activeTabId) {
      const webview = document.getElementById(`webview-${activeTabId}`);
      if (webview && webview.canGoBack()) {
        webview.goBack();
      }
    }
  }
  
  if (e.altKey && e.key === 'ArrowRight') {
    e.preventDefault();
    if (activeTabId) {
      const webview = document.getElementById(`webview-${activeTabId}`);
      if (webview && webview.canGoForward()) {
        webview.goForward();
      }
    }
  }
  
  // Cmd/Ctrl + 1-9 to switch tabs
  if ((e.metaKey || e.ctrlKey) && e.key >= '1' && e.key <= '9') {
    e.preventDefault();
    const index = parseInt(e.key) - 1;
    if (index < tabs.length) {
      switchToTab(tabs[index].id);
    }
  }
  
  // Cmd/Ctrl + D to bookmark
  if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
    e.preventDefault();
    toggleBookmark();
  }
});

// Bookmark Functions
function saveBookmarks() {
  localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
}

function isBookmarked(url) {
  return bookmarks.some(b => b.url === url);
}

function toggleBookmark() {
  if (!activeTabId) return;
  
  const tab = tabs.find(t => t.id === activeTabId);
  if (!tab || tab.isNewTabPage || !tab.url) return;
  
  const existingIndex = bookmarks.findIndex(b => b.url === tab.url);
  
  if (existingIndex >= 0) {
    // Remove bookmark
    bookmarks.splice(existingIndex, 1);
  } else {
    // Add bookmark
    bookmarks.push({
      url: tab.url,
      title: tab.title || tab.url,
      favicon: tab.favicon,
      addedAt: Date.now()
    });
  }
  
  saveBookmarks();
  updateBookmarkButton();
  renderBookmarks();
}

function updateBookmarkButton() {
  if (!activeTabId) {
    bookmarkBtn.classList.remove('bookmarked');
    return;
  }
  
  const tab = tabs.find(t => t.id === activeTabId);
  if (!tab || tab.isNewTabPage || !tab.url) {
    bookmarkBtn.classList.remove('bookmarked');
    return;
  }
  
  if (isBookmarked(tab.url)) {
    bookmarkBtn.classList.add('bookmarked');
    bookmarkBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
    `;
  } else {
    bookmarkBtn.classList.remove('bookmarked');
    bookmarkBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
    `;
  }
}

function renderBookmarks() {
  if (bookmarks.length === 0) {
    bookmarksList.innerHTML = '<div class="bookmarks-empty">No bookmarks yet</div>';
    return;
  }
  
  bookmarksList.innerHTML = bookmarks.map((bookmark, index) => `
    <div class="bookmark-item" data-index="${index}" data-url="${bookmark.url}">
      <div class="bookmark-item-favicon">
        ${bookmark.favicon 
          ? `<img src="${bookmark.favicon}" alt="">` 
          : `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>`
        }
      </div>
      <div class="bookmark-item-info">
        <div class="bookmark-item-title">${bookmark.title}</div>
        <div class="bookmark-item-url">${bookmark.url}</div>
      </div>
      <button class="bookmark-item-delete" data-index="${index}" title="Remove">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </button>
    </div>
  `).join('');
}

function deleteBookmark(index) {
  bookmarks.splice(index, 1);
  saveBookmarks();
  updateBookmarkButton();
  renderBookmarks();
}

// Bookmark event listeners
bookmarkBtn.addEventListener('click', toggleBookmark);

bookmarksBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  bookmarksPanel.classList.toggle('open');
  settingsDropdown.classList.remove('open');
});

bookmarksList.addEventListener('click', (e) => {
  const deleteBtn = e.target.closest('.bookmark-item-delete');
  if (deleteBtn) {
    e.stopPropagation();
    const index = parseInt(deleteBtn.dataset.index);
    deleteBookmark(index);
    return;
  }
  
  const item = e.target.closest('.bookmark-item');
  if (item && activeTabId) {
    navigateInTab(activeTabId, item.dataset.url);
    bookmarksPanel.classList.remove('open');
  }
});

document.addEventListener('click', (e) => {
  if (!bookmarksPanel.contains(e.target) && e.target !== bookmarksBtn) {
    bookmarksPanel.classList.remove('open');
  }
});

// Initialize bookmarks
renderBookmarks();
