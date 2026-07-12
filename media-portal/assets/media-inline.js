(() => {
  const statusEl = document.getElementById('server-status');
  if (!statusEl) return;

  const jellyfinUrl = 'http://192.168.1.212:8096/health';

  function renderStatus(isOnline) {
    statusEl.replaceChildren();
    const dot = document.createElement('span');
    dot.className = `media-status-dot ${isOnline ? 'online' : 'offline'}`;
    dot.setAttribute('aria-hidden', 'true');
    statusEl.append(dot, document.createTextNode(isOnline ? 'Online' : 'Offline'));
  }

  async function checkServerStatus() {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 5000);

    try {
      // The response is intentionally opaque: reachability is all this client-side
      // check needs, and Jellyfin does not need to enable CORS for this to work.
      await fetch(jellyfinUrl, {
        method: 'GET',
        mode: 'no-cors',
        cache: 'no-store',
        signal: controller.signal
      });
      renderStatus(true);
    } catch (_) {
      renderStatus(false);
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  checkServerStatus();
})();
