(() => {
  const statusEl = document.getElementById('server-status');
  if (!statusEl) return;

  const noteEl = document.getElementById('server-status-note');
  const lampEl = document.getElementById('media-lamp');
  const stampEl = document.getElementById('media-asof');
  const recheckBtn = document.getElementById('media-recheck');

  const jellyfinUrl = 'http://192.168.1.212:8096/health';
  const CHECK_TIMEOUT_MS = 5000;

  // One word for the lamp, one sentence for the person reading it. The sentence is
  // the difference between a state and an instruction: "Offline" on its own does not
  // say whether to go power the server on or connect the VPN first.
  const STATUS = {
    checking: { label: 'Checking', note: 'Asking the server whether it is up.' },
    online: { label: 'Online', note: 'The server answered. Open Jellyfin to start watching.' },
    offline: { label: 'Offline', note: 'No answer on the home network. Check the server is powered on, or connect the VPN if you are away.' },
    unknown: { label: 'Unknown', note: 'This page cannot check a plain-http address over HTTPS. Open Jellyfin to see for yourself.' }
  };

  function renderStatus(state) {
    const entry = STATUS[state] || STATUS.unknown;

    statusEl.textContent = entry.label;
    statusEl.className = `media-status-value ${state}`;
    if (noteEl) noteEl.textContent = entry.note;
    if (lampEl) lampEl.dataset.state = state;
  }

  // Same rule as every panel on the home page: a reading that could be seconds or
  // hours old looks identical unless it says when it was taken. The re-check control
  // is what makes carrying that timestamp worth anything.
  function stampCheck(checkedAt) {
    if (!stampEl) return;

    if (!Number.isFinite(checkedAt)) {
      stampEl.textContent = '';
      return;
    }

    stampEl.textContent = `As of ${new Date(checkedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }

  // A browser on HTTPS will not open a plain-http connection at all: the request is
  // blocked as mixed content before it reaches the network, and the rejection is
  // indistinguishable here from a server that is genuinely down. Reporting "Offline"
  // for it meant the deployed site claimed the server was down at all times,
  // including while it was serving.
  //
  // The deployed site is HTTPS, so this is the normal case rather than an edge one:
  // the check cannot run at all, and every control built around it has to say so
  // rather than sit there looking live. The launch button still works — navigating
  // to http:// is not subject to the mixed-content rule.
  const canCheck = !(window.location.protocol === 'https:' && jellyfinUrl.startsWith('http://'));

  async function checkServerStatus() {
    renderStatus('checking');
    stampCheck(NaN);
    if (recheckBtn) recheckBtn.disabled = true;

    try {
      if (!canCheck) {
        renderStatus('unknown');
        return;
      }

      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);

      try {
        // The response is intentionally opaque: reachability is all this client-side
        // check needs, and Jellyfin does not need to enable CORS for this to work.
        await fetch(jellyfinUrl, {
          method: 'GET',
          mode: 'no-cors',
          cache: 'no-store',
          signal: controller.signal
        });
        renderStatus('online');
      } catch (_) {
        renderStatus('offline');
      } finally {
        window.clearTimeout(timeoutId);
      }

      stampCheck(Date.now());
    } finally {
      if (recheckBtn) recheckBtn.disabled = !canCheck;
    }
  }

  if (recheckBtn) {
    recheckBtn.addEventListener('click', checkServerStatus);
    // Re-running a check that cannot run is not a check, so the control is
    // removed rather than left enabled and inert.
    if (!canCheck) recheckBtn.remove();
  }

  checkServerStatus();
})();
