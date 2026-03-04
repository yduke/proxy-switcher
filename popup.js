// popup.js

const settingsToggle = document.getElementById('settingsToggle');
const mainView = document.getElementById('mainView');
const settingsView = document.getElementById('settingsView');
const saveBtn = document.getElementById('saveBtn');
const toast = document.getElementById('toast');

let isSettingsOpen = false;
let currentMode = 'system';

// Toggle settings panel
settingsToggle.addEventListener('click', () => {
  isSettingsOpen = !isSettingsOpen;
  settingsToggle.classList.toggle('active', isSettingsOpen);

  if (isSettingsOpen) {
    mainView.style.display = 'none';
    settingsView.classList.add('visible');
  } else {
    mainView.style.display = 'flex';
    settingsView.classList.remove('visible');
  }
});

// Proxy mode buttons
document.querySelectorAll('.proxy-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const mode = btn.dataset.mode;
    setProxyMode(mode);
  });
});

function setProxyMode(mode) {
  chrome.storage.local.get(['proxyConfig'], (result) => {
    const config = result.proxyConfig || {};

    chrome.runtime.sendMessage(
      { action: 'setProxy', mode, config },
      (response) => {
        if (response && response.success) {
          currentMode = mode;
          updateActiveButton(mode);
          showToast(getModeLabel(mode) + ' 已启用', 'success');
        } else {
          const err = response?.error || '切换失败';
          showToast(err, 'error');
        }
      }
    );
  });
}

function getModeLabel(mode) {
  const labels = { direct: '无代理', system: '系统代理', custom: '自定义代理' };
  return labels[mode] || mode;
}

function updateActiveButton(mode) {
  document.querySelectorAll('.proxy-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
}

// Save settings
saveBtn.addEventListener('click', () => {
  const config = {
    httpHost: document.getElementById('httpHost').value.trim(),
    httpPort: document.getElementById('httpPort').value.trim(),
    httpsHost: document.getElementById('httpsHost').value.trim(),
    httpsPort: document.getElementById('httpsPort').value.trim(),
    username: document.getElementById('username').value.trim(),
    password: document.getElementById('password').value,
    bypass: document.getElementById('bypass').value.trim()
  };

  chrome.storage.local.set({ proxyConfig: config }, () => {
    showToast('设置已保存', 'success');
    // If currently in custom mode, re-apply
    if (currentMode === 'custom') {
      chrome.runtime.sendMessage({ action: 'setProxy', mode: 'custom', config });
    }
  });
});

// Toast helper
let toastTimer;
function showToast(msg, type = 'success') {
  toast.textContent = msg;
  toast.className = 'toast ' + type;
  clearTimeout(toastTimer);
  requestAnimationFrame(() => {
    toast.classList.add('show');
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2000);
  });
}

// Load saved state on open
function init() {
  chrome.storage.local.get(['proxyMode', 'proxyConfig'], (result) => {
    currentMode = result.proxyMode || 'system';
    updateActiveButton(currentMode);

    const config = result.proxyConfig || {};
    if (config.httpHost) document.getElementById('httpHost').value = config.httpHost;
    if (config.httpPort) document.getElementById('httpPort').value = config.httpPort;
    if (config.httpsHost) document.getElementById('httpsHost').value = config.httpsHost;
    if (config.httpsPort) document.getElementById('httpsPort').value = config.httpsPort;
    if (config.username) document.getElementById('username').value = config.username;
    if (config.password) document.getElementById('password').value = config.password;

    document.getElementById('bypass').value =
      config.bypass || 'localhost, 127.0.0.1, 192.168.*.*';
  });
}

init();
