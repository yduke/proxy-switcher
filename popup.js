const modes = ['direct', 'system', 'fixed'];
const settingsPanel = document.getElementById('settingsPanel');

// 默认绕过列表
const defaultBypass = "localhost, 127.0.0.1, 192.168.*.*";

// 初始化加载
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get(['proxyConfig', 'currentMode'], (res) => {
    if (res.proxyConfig) {
      document.getElementById('httpIp').value = res.proxyConfig.httpIp || '';
      document.getElementById('httpPort').value = res.proxyConfig.httpPort || '';
      document.getElementById('httpsIp').value = res.proxyConfig.httpsIp || '';
      document.getElementById('httpsPort').value = res.proxyConfig.httpsPort || '';
      document.getElementById('user').value = res.proxyConfig.user || '';
      document.getElementById('pass').value = res.proxyConfig.pass || '';
      document.getElementById('bypass').value = res.proxyConfig.bypass || defaultBypass;
    } else {
      document.getElementById('bypass').value = defaultBypass;
    }
    updateUI(res.currentMode || 'system');
  });
});

// 切换面板显示
document.getElementById('settingsBtn').onclick = () => {
  settingsPanel.classList.toggle('hidden');
};

// 模式切换
modes.forEach(mode => {
  document.getElementById(`mode_${mode}`).onclick = () => setProxyMode(mode);
});

// 保存配置
document.getElementById('saveBtn').onclick = () => {
  const config = {
    httpIp: document.getElementById('httpIp').value,
    httpPort: document.getElementById('httpPort').value,
    httpsIp: document.getElementById('httpsIp').value,
    httpsPort: document.getElementById('httpsPort').value,
    user: document.getElementById('user').value,
    pass: document.getElementById('pass').value,
    bypass: document.getElementById('bypass').value
  };
  chrome.storage.local.set({ proxyConfig: config }, () => {
    setProxyMode('fixed');
    settingsPanel.classList.add('hidden');
  });
};

function setProxyMode(mode) {
  let config = {};
  
  if (mode === 'direct') {
    config = { mode: "direct" };
  } else if (mode === 'system') {
    config = { mode: "system" };
  } else {
    chrome.storage.local.get(['proxyConfig'], (res) => {
      const p = res.proxyConfig;
      if (!p || !p.httpIp) {
        alert("请先设置自定义代理信息！");
        return;
      }
      config = {
        mode: "fixed_servers",
        rules: {
          proxyForHttp: { host: p.httpIp, port: parseInt(p.httpPort) },
          proxyForHttps: { host: p.httpsIp || p.httpIp, port: parseInt(p.httpsPort || p.httpPort) },
          bypassList: p.bypass.split(',').map(s => s.trim())
        }
      };
      applyProxy(config, mode);
    });
    return;
  }
  applyProxy(config, mode);
}

function applyProxy(config, mode) {
  chrome.proxy.settings.set({ value: config, scope: 'regular' }, () => {
    chrome.storage.local.set({ currentMode: mode });
    updateUI(mode);
  });
}

function updateUI(activeMode) {
  modes.forEach(m => {
    document.getElementById(`mode_${m}`).classList.toggle('active', m === activeMode);
  });
  const modeNames = { direct: '无代理', system: '系统代理', fixed: '自定义' };
  document.getElementById('status').innerText = `当前模式: ${modeNames[activeMode]}`;
}