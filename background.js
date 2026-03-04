chrome.webRequest.onAuthRequired.addListener(
  (details) => {
    return new Promise((resolve) => {
      chrome.storage.local.get(['proxyConfig'], (res) => {
        if (res.proxyConfig && res.proxyConfig.user) {
          resolve({
            authCredentials: {
              username: res.proxyConfig.user,
              password: res.proxyConfig.pass
            }
          });
        } else {
          resolve({});
        }
      });
    });
  },
  { urls: ["<all_urls>"] },
  ["asyncBlocking"]
);