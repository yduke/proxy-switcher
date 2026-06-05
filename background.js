// background.js - Service Worker for Proxy Switcher

const MODE_COLORS = {
  direct: '#00c87a',  // green
  system: '#5b9dff',  // blue
  custom: '#e8426e',  // red
};


function setIcon(mode) {
  const color = MODE_COLORS[mode] || MODE_COLORS.system;
  const sizes = [16, 48, 128];
  const imageData = {};

  for (const size of sizes) {
    const canvas = new OffscreenCanvas(size, size);
    const ctx = canvas.getContext('2d');
    const cx = size / 2;
    const cy = size / 2;
    const padding = size * 0.18;

    ctx.fillStyle = color;

    switch (mode) {
      case 'direct': {
        // Rounded square
        const s = size - padding * 2;
        const r = size * 0.12;
        ctx.beginPath();
        ctx.roundRect(padding, padding, s, s, r);
        ctx.fill();
        break;

      }
      case 'system': {
        // Filled circle
        const radius = (size - padding * 2) / 2;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'custom': {
        // Triangle pointing up
        const topY = padding;
        const bottomY = size - padding;
        const leftX = padding;
        const rightX = size - padding;
        ctx.beginPath();
        ctx.moveTo(cx, topY);
        ctx.lineTo(rightX, bottomY);
        ctx.lineTo(leftX, bottomY);
        ctx.closePath();
        ctx.fill();
        break;
      }
      default: {
        const radius = (size - padding * 2) / 2;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    imageData[size] = ctx.getImageData(0, 0, size, size);
  }

  chrome.action.setIcon({ imageData });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'setProxy') {
    applyProxy(message.mode, message.config)
      .then(() => {
        setIcon(message.mode);
        sendResponse({ success: true });
      })
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
  if (message.action === 'getProxyMode') {
    chrome.storage.local.get(['proxyMode'], (result) => {
      sendResponse({ mode: result.proxyMode || 'system' });
    });
    return true;
  }
});

// Restore correct icon when service worker wakes up
function restoreIcon() {
  chrome.storage.local.get(['proxyMode'], (result) => {
    setIcon(result.proxyMode || 'system');
  });
}
restoreIcon();

// Ensure icon is set immediately on browser startup
chrome.runtime.onStartup.addListener(restoreIcon);

async function applyProxy(mode, config) {
  return new Promise((resolve, reject) => {
    let proxyConfig;

    switch (mode) {
      case 'direct':
        proxyConfig = { mode: 'direct' };
        break;

      case 'system':
        proxyConfig = { mode: 'system' };
        break;

      case 'custom':
        if (!config || !config.httpHost || !config.httpPort) {
          reject(new Error('代理服务器配置不完整'));
          return;
        }

        const bypassList = config.bypass
          ? config.bypass.split(',').map(s => s.trim()).filter(Boolean)
          : ['localhost', '127.0.0.1'];

        const rules = {
          singleProxy: null,
          proxyForHttp: {
            scheme: 'http',
            host: config.httpHost,
            port: parseInt(config.httpPort)
          },
          proxyForHttps: {
            scheme: 'http',
            host: config.httpsHost || config.httpHost,
            port: parseInt(config.httpsPort || config.httpPort)
          },
          bypassList: bypassList
        };

        proxyConfig = {
          mode: 'fixed_servers',
          rules: rules
        };
        break;

      default:
        proxyConfig = { mode: 'system' };
    }

    chrome.proxy.settings.set(
      { value: proxyConfig, scope: 'regular' },
      () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          chrome.storage.local.set({ proxyMode: mode }, resolve);
        }
      }
    );
  });
}

// Handle proxy auth if credentials provided
chrome.webRequest?.onAuthRequired?.addListener(
  (details, callback) => {
    chrome.storage.local.get(['proxyConfig'], (result) => {
      const config = result.proxyConfig;
      if (config && config.username && config.password) {
        callback({
          authCredentials: {
            username: config.username,
            password: config.password
          }
        });
      } else {
        callback({});
      }
    });
  },
  { urls: ['<all_urls>'] },
  ['asyncBlocking']
);