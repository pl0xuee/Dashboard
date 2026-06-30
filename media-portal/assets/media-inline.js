    async function checkServerStatus() {
        const statusEl = document.getElementById('server-status');
      const probeUrl = 'http://192.168.1.212:8096/web/favicon.ico';

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
    checkServerStatus();
