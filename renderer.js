// DOM Elements
const webview = document.getElementById('webview');
const urlInput = document.getElementById('urlInput');
const searchInput = document.getElementById('searchInput');
const backBtn = document.getElementById('backBtn');
const forwardBtn = document.getElementById('forwardBtn');
const reloadBtn = document.getElementById('reloadBtn');
const homeBtn = document.getElementById('homeBtn');
const closeBtn = document.getElementById('closeBtn');
const minimizeBtn = document.getElementById('minimizeBtn');
const maximizeBtn = document.getElementById('maximizeBtn');
const menuBtn = document.getElementById('menuBtn');
const settingsDropdown = document.getElementById('settingsDropdown');
const protectionToggle = document.getElementById('protectionToggle');
const loadingBar = document.getElementById('loadingBar');
const newTabPage = document.getElementById('newTabPage');
const urlIcon = document.getElementById('urlIcon');
const shortcuts = document.querySelectorAll('.shortcut');
const tabTitle = document.getElementById('tabTitle');
const tabFavicon = document.getElementById('tabFavicon');
const searchBox = document.getElementById('searchBox');

let isProtected = true;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  isProtected = await window.ghostAPI.getProtectionStatus();
  updateProtectionUI(isProtected);
  updateNavButtons();
});

// Window Controls
closeBtn.addEventListener('click', () => window.ghostAPI.close());
minimizeBtn.addEventListener('click', () => window.ghostAPI.minimize());
maximizeBtn.addEventListener('click', () => window.ghostAPI.maximize());

// Menu Toggle
menuBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  settingsDropdown.classList.toggle('open');
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

// URL Navigation
function navigateTo(url) {
  if (!/^https?:\/\//i.test(url)) {
    if (/^[\w-]+(\.[\w-]+)+/.test(url)) {
      url = 'https://' + url;
    } else {
      url = 'https://www.google.com/search?q=' + encodeURIComponent(url);
    }
  }
  
  urlInput.value = url;
  webview.src = url;
  webview.style.display = 'flex';
  newTabPage.classList.add('hidden');
}

urlInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    navigateTo(urlInput.value.trim());
  }
});

// Search box on new tab page
searchInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    navigateTo(searchInput.value.trim());
  }
});

searchInput.addEventListener('focus', () => {
  searchBox.style.boxShadow = '0 1px 6px rgba(32, 33, 36, 0.28)';
});

searchInput.addEventListener('blur', () => {
  searchBox.style.boxShadow = '';
});

// Shortcuts
shortcuts.forEach(shortcut => {
  shortcut.addEventListener('click', () => {
    const url = shortcut.dataset.url;
    navigateTo(url);
  });
});

// Navigation Buttons
backBtn.addEventListener('click', () => {
  if (webview.canGoBack()) {
    webview.goBack();
  }
});

forwardBtn.addEventListener('click', () => {
  if (webview.canGoForward()) {
    webview.goForward();
  }
});

reloadBtn.addEventListener('click', () => {
  if (webview.style.display !== 'none') {
    webview.reload();
  }
});

homeBtn.addEventListener('click', () => {
  webview.style.display = 'none';
  newTabPage.classList.remove('hidden');
  urlInput.value = '';
  tabTitle.textContent = 'New Tab';
  document.title = 'New Tab';
  resetTabFavicon();
  updateNavButtons();
});

// Webview Events
webview.addEventListener('did-start-loading', () => {
  loadingBar.classList.add('loading');
  loadingBar.classList.remove('complete');
});

webview.addEventListener('did-stop-loading', () => {
  loadingBar.classList.remove('loading');
  loadingBar.classList.add('complete');
  updateNavButtons();
});

webview.addEventListener('did-navigate', (e) => {
  urlInput.value = e.url;
  updateUrlIcon(e.url);
  updateNavButtons();
});

webview.addEventListener('did-navigate-in-page', (e) => {
  urlInput.value = e.url;
  updateUrlIcon(e.url);
  updateNavButtons();
});

webview.addEventListener('page-title-updated', (e) => {
  document.title = e.title;
  tabTitle.textContent = e.title;
});

webview.addEventListener('page-favicon-updated', (e) => {
  if (e.favicons && e.favicons.length > 0) {
    tabFavicon.innerHTML = `<img src="${e.favicons[0]}" style="width:16px;height:16px;border-radius:2px;">`;
  }
});

webview.addEventListener('did-fail-load', (e) => {
  if (e.errorCode !== -3) {
    loadingBar.classList.remove('loading');
    loadingBar.classList.add('complete');
  }
});

function resetTabFavicon() {
  tabFavicon.innerHTML = `
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
    </svg>
  `;
}

// Update URL icon for secure/insecure
function updateUrlIcon(url) {
  if (url.startsWith('https://')) {
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

// Update navigation button states
function updateNavButtons() {
  if (webview.style.display === 'none') {
    backBtn.disabled = true;
    forwardBtn.disabled = true;
  } else {
    backBtn.disabled = !webview.canGoBack();
    forwardBtn.disabled = !webview.canGoForward();
  }
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'l') {
    e.preventDefault();
    urlInput.focus();
    urlInput.select();
  }
  
  if ((e.metaKey || e.ctrlKey) && e.key === 'r') {
    e.preventDefault();
    if (webview.style.display !== 'none') {
      webview.reload();
    }
  }
  
  if (e.key === 'Escape') {
    settingsDropdown.classList.remove('open');
  }
  
  if (e.altKey && e.key === 'ArrowLeft') {
    e.preventDefault();
    if (webview.canGoBack()) {
      webview.goBack();
    }
  }
  
  if (e.altKey && e.key === 'ArrowRight') {
    e.preventDefault();
    if (webview.canGoForward()) {
      webview.goForward();
    }
  }
});

// Focus search on new tab
if (newTabPage && !newTabPage.classList.contains('hidden')) {
  searchInput.focus();
}
