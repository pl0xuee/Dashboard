    const JELLYFIN_URL_KEY = 'jellyfinServerUrl';
    const JELLYFIN_DEFAULT_URL = 'http://192.168.1.212:8096';

    function getJellyfinUrl() {
      const stored = localStorage.getItem(JELLYFIN_URL_KEY);
      return (stored && stored.trim()) ? stored.trim().replace(/\/$/, '') : JELLYFIN_DEFAULT_URL;
    }

    function applyJellyfinUrl(url) {
      const launchBtn = document.getElementById('jellyfin-launch-btn');
      if (launchBtn) launchBtn.href = url;
      const input = document.getElementById('jellyfin-url-input');
      if (input) input.value = url;
    }

    async function checkServerStatus() {
        const statusEl = document.getElementById('server-status');
      const probeUrl = `${getJellyfinUrl()}/web/favicon.ico`;

      await new Promise((resolve) => {
        const image = new Image();
        const timeoutId = setTimeout(() => {
          image.onload = null;
          image.onerror = null;
          resolve(false);
        }, 5000);

        image.onload = () => {
          clearTimeout(timeoutId);
          resolve(true);
        };

        image.onerror = () => {
          clearTimeout(timeoutId);
          resolve(false);
        };

        image.src = `${probeUrl}?t=${Date.now()}`;
      }).then((isOnline) => {
        statusEl.textContent = '';

        const dot = document.createElement('span');
        dot.className = `media-status-dot ${isOnline ? 'online' : 'offline'}`;
        dot.setAttribute('aria-hidden', 'true');

        const text = document.createTextNode(isOnline ? 'Online' : 'Offline');

        statusEl.appendChild(dot);
        statusEl.appendChild(text);
      });
    }

    applyJellyfinUrl(getJellyfinUrl());

    const saveBtn = document.getElementById('jellyfin-save-btn');
    const saveMsg = document.getElementById('jellyfin-save-msg');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        const input = document.getElementById('jellyfin-url-input');
        const val = input ? input.value.trim().replace(/\/$/, '') : '';
        if (!val) {
          if (saveMsg) { saveMsg.textContent = 'Please enter a valid URL.'; saveMsg.className = 'media-config-msg error'; }
          return;
        }
        try { new URL(val); } catch (_) {
          if (saveMsg) { saveMsg.textContent = 'Invalid URL format.'; saveMsg.className = 'media-config-msg error'; }
          return;
        }
        localStorage.setItem(JELLYFIN_URL_KEY, val);
        applyJellyfinUrl(val);
        if (saveMsg) { saveMsg.textContent = 'Saved! Re-checking status…'; saveMsg.className = 'media-config-msg success'; }
        checkServerStatus();
        setTimeout(() => { if (saveMsg) saveMsg.textContent = ''; }, 4000);
      });
    }

    checkServerStatus();
