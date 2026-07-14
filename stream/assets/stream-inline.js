    const MAX_SLOTS = 4;
    const DROPDOWN_REFRESH_COOLDOWN_MS = 15000;
    const TWITCH_FOLLOW_SYNC_INTERVAL_MS = 120000;
    const YOUTUBE_LIVE_CACHE_TTL_MS = 120000;
    const YOUTUBE_SUBS_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
    const YOUTUBE_ERROR_COOLDOWN_MS = 60000;
    const TWITCH_TAB_RESUME_MIN_HIDDEN_MS = 2500;
    const TWITCH_RESUME_DEBOUNCE_MS = 250;
    const TWITCH_RESUME_RETRY_DELAY_MS = 1800;
    const TWITCH_RESUME_RELOAD_COOLDOWN_MS = 7000;
    const TWITCH_AUTOPLAY_RETRY_INTERVAL_MS = 2000;

    let lastDropdownRefreshAt = 0;
    let dropdownRefreshInFlight = false;
    let twitchFollowsSyncInFlight = false;
    let youtubeSubsInFlight = null;
    let youtubeLiveInFlight = null;
    let youtubeRetryAfter = 0;
    let lastHiddenAt = 0;
    let streamTheaterMode = false;

    // slots[i] is either null (empty) or a plain object describing the
    // stream loaded into tile i:
    //   { platform: 'twitch'|'youtube', id, label,
    //     twitchEmbed, twitchPlayer, unmuteHandler, lastEmbedLoadAt, resumeTimer }
    let slots = [null, null, null, null];
    let focusedSlot = 0;
    // How many tile slots the "Streams" menu currently shows (1-4).
    let desiredSlotCount = 1;
    // Slot indices in display order. The first `desiredSlotCount` of them are
    // on screen; the rest are hidden but keep their embeds mounted. Shrinking
    // the layout demotes slots to the back of this list rather than destroying
    // them, so a stream that's already playing survives a 2 -> 1 -> 2 trip.
    // Tiles are reordered with the CSS `order` property, never by moving DOM
    // nodes — re-parenting an iframe would reload it.
    let slotOrder = [0, 1, 2, 3];

    function isSlotVisible(slotIndex) {
      return slotOrder.indexOf(slotIndex) < desiredSlotCount;
    }

    function getVisibleSlotIndices() {
      return slotOrder.slice(0, desiredSlotCount);
    }

    function updateTheaterModeButton() {
      const toggleBtn = document.getElementById('toggleTheaterBtn');
      if (toggleBtn) {
        toggleBtn.textContent = streamTheaterMode ? 'Default View' : 'Theater Mode';
      }
    }

    function setStreamTheaterMode(nextValue) {
      streamTheaterMode = Boolean(nextValue);
      document.body.classList.toggle('stream-theater-mode', streamTheaterMode);
      document.documentElement.classList.toggle('stream-theater-mode', streamTheaterMode);
      updateTheaterModeButton();
      // The resize this triggers can leave embedded Twitch players paused.
      scheduleTwitchResumeAll('theatermode');
    }

    function toggleStreamTheaterMode() {
      setStreamTheaterMode(!streamTheaterMode);
    }

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && streamTheaterMode) {
        setStreamTheaterMode(false);
      }
    });

    function normalizeTwitchChannel(value) {
      const raw = (value || '').trim();
      if (!raw) return '';

      let channel = raw;
      if (channel.includes('twitch.tv/')) {
        channel = channel.split('twitch.tv/').pop().split('/')[0];
      }

      channel = channel.split('?')[0].split('#')[0].trim().replace(/^@+/, '').toLowerCase();
      channel = channel.replace(/[^a-z0-9_]/g, '');
      return channel;
    }

    function getTwitchParentHosts() {
      const hostname = window.location.hostname.trim().toLowerCase();
      if (!hostname) return [];

      const hosts = new Set([hostname]);
      hosts.add('pl0xuee.github.io');
      const parts = hostname.split('.');
      if (parts.length > 2) {
        hosts.add(parts.slice(-2).join('.'));
      }
      if (!hostname.startsWith('www.')) {
        hosts.add(`www.${hostname}`);
      }

      return Array.from(hosts);
    }

    let twitchEmbedScriptPromise = null;

    function loadTwitchEmbedScript() {
      if (window.Twitch?.Embed) {
        return Promise.resolve();
      }

      if (!twitchEmbedScriptPromise) {
        twitchEmbedScriptPromise = new Promise((resolve, reject) => {
          const existing = document.querySelector('script[data-twitch-embed-script]');
          if (existing) {
            existing.addEventListener('load', () => resolve(), { once: true });
            existing.addEventListener('error', () => reject(new Error('Failed to load Twitch embed script')), { once: true });
            return;
          }

          const script = document.createElement('script');
          script.src = 'https://embed.twitch.tv/embed/v1.js';
          script.async = true;
          script.dataset.twitchEmbedScript = 'true';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load Twitch embed script'));
          document.head.appendChild(script);
        });
      }

      return twitchEmbedScriptPromise;
    }

    function clearSlotUnmuteHandler(slot) {
      if (!slot || !slot.unmuteHandler) return;
      document.removeEventListener('click', slot.unmuteHandler, true);
      document.removeEventListener('keydown', slot.unmuteHandler, true);
      slot.unmuteHandler = null;
    }

    // Browsers won't start audio+video playback without a direct user
    // gesture on the media itself, and our "Load"/dropdown click doesn't
    // count for a cross-origin embed. So: arm a one-time listener that
    // unmutes the player on the user's very next click/keypress anywhere on
    // the page — unmuting an already-playing video is allowed even without a
    // fresh gesture, unlike starting playback unmuted. Only ever fires for
    // whichever slot is focused at the moment the interaction happens.
    function armUnmuteOnNextInteraction(twitchPlayer, channel, slotIndex) {
      const slot = slots[slotIndex];
      if (!slot) return;
      clearSlotUnmuteHandler(slot);

      const handler = () => {
        clearSlotUnmuteHandler(slot);
        if (focusedSlot !== slotIndex) return;
        if (slots[slotIndex] !== slot) return;
        if (slot.platform !== 'twitch' || slot.id !== channel) return;
        if (slot.twitchPlayer !== twitchPlayer) return;
        try { twitchPlayer.setMuted(false); } catch (_) {}
      };

      slot.unmuteHandler = handler;
      document.addEventListener('click', handler, true);
      document.addEventListener('keydown', handler, true);
    }

    // Twitch's embed appears to check its container's size once at mount and
    // cache the verdict — if our layout hasn't actually resolved the
    // container to its final box yet at that instant, every later retry just
    // replays the same cached "too small" block instead of re-measuring. So:
    // don't construct the embed until the container is confirmed full-sized.
    function waitForElementSize(el, minWidth, minHeight, timeoutMs = 3000) {
      return new Promise((resolve) => {
        const fits = () => {
          const rect = el.getBoundingClientRect();
          return rect.width >= minWidth && rect.height >= minHeight;
        };

        if (fits()) {
          resolve();
          return;
        }

        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          observer.disconnect();
          resolve();
        };

        const observer = new ResizeObserver(() => {
          if (fits()) finish();
        });
        observer.observe(el);
        window.setTimeout(finish, timeoutMs);
      });
    }

    // The embed's own isPaused() only reports true for the "Idle" playback
    // state — a stream stuck on "Ready" (loaded, autoplay blocked, never
    // started) reads as "not paused" even though nothing is playing. Read
    // the real state instead so retry logic isn't fooled by that.
    function isTwitchPlaybackActive(twitchPlayer) {
      try {
        const state = twitchPlayer.getPlayerState && twitchPlayer.getPlayerState();
        const playback = state && state.playback;
        return playback === 'Buffering' || playback === 'Playing';
      } catch (_) {
        return false;
      }
    }

    function beginTwitchPlayback(twitchPlayer, channel, slotIndex) {
      // Muted autoplay IS reliably allowed by browsers, so start there...
      try {
        twitchPlayer.setMuted(true);
        twitchPlayer.play();
      } catch (_) {}

      if (slotIndex === focusedSlot) {
        // Unmuting an already-playing video doesn't require a fresh gesture
        // the way starting playback unmuted does — try immediately, and
        // also arm a next-interaction fallback for stricter browsers.
        try { twitchPlayer.setMuted(false); } catch (_) {}
        armUnmuteOnNextInteraction(twitchPlayer, channel, slotIndex);
      }

      // Guard against a stubborn autoplay block (extension, browser quirk,
      // slow-to-init player) by re-nudging playback a few times. Keeps
      // background (unfocused) tiles muted, but still playing.
      let retries = 0;
      const retryTimer = window.setInterval(() => {
        const slot = slots[slotIndex];
        const stillCurrent = slot && slot.platform === 'twitch' && slot.id === channel && slot.twitchPlayer === twitchPlayer;
        if (!stillCurrent || retries >= 5) {
          window.clearInterval(retryTimer);
          return;
        }
        // A tile parked by a layout shrink is paused on purpose — don't fight it.
        if (!isSlotVisible(slotIndex)) {
          window.clearInterval(retryTimer);
          return;
        }
        retries += 1;
        if (isTwitchPlaybackActive(twitchPlayer)) {
          window.clearInterval(retryTimer);
        } else {
          try {
            twitchPlayer.setMuted(slotIndex !== focusedSlot);
            twitchPlayer.play();
          } catch (_) {}
        }
      }, TWITCH_AUTOPLAY_RETRY_INTERVAL_MS);
    }

    function teardownSlot(slotIndex) {
      const slot = slots[slotIndex];
      if (slot) {
        if (slot.resumeTimer) window.clearTimeout(slot.resumeTimer);
        clearSlotUnmuteHandler(slot);
      }
      const body = document.getElementById(`streamTileBody${slotIndex}`);
      if (body) body.innerHTML = '';
    }

    function loadTwitchEmbedInSlot(slotIndex, channel, options = {}) {
      const { keepInputText = false } = options;
      const cleanChannel = normalizeTwitchChannel(channel);
      if (!cleanChannel) return;

      if (!window.location.hostname || window.location.protocol === 'file:') {
        alert('Twitch embed requires running this page on http(s) with a valid host.');
        return;
      }

      const parentHosts = getTwitchParentHosts();
      if (!parentHosts.length) {
        alert('Twitch embed requires running this page on http(s) with a valid host.');
        return;
      }

      const body = document.getElementById(`streamTileBody${slotIndex}`);
      if (!body) return;

      teardownSlot(slotIndex);

      const newSlot = {
        platform: 'twitch',
        id: cleanChannel,
        label: cleanChannel,
        twitchEmbed: null,
        twitchPlayer: null,
        unmuteHandler: null,
        lastEmbedLoadAt: Date.now(),
        resumeTimer: null,
      };
      slots[slotIndex] = newSlot;

      // Twitch's embed silently refuses to autoplay below ~400x300px
      // ("style visibility" / autoplay requirements error) — keep headroom.
      body.innerHTML = `<div id="twitch-player-${slotIndex}" style="width:100%;height:100%;min-width:400px;min-height:300px;visibility:visible;display:block"></div>`;

      renderGrid();
      if (slotIndex === focusedSlot) {
        updateChatForFocusedSlot();
        if (!keepInputText) syncStreamUrlInputToFocused();
      }

      window.requestAnimationFrame(() => {
        if (slots[slotIndex] !== newSlot) return;
        const targetEl = document.getElementById(`twitch-player-${slotIndex}`);
        if (!targetEl) return;

        Promise.all([loadTwitchEmbedScript(), waitForElementSize(targetEl, 400, 300)])
          .then(() => {
            if (slots[slotIndex] !== newSlot) return;

            const embed = new Twitch.Embed(`twitch-player-${slotIndex}`, {
              width: '100%',
              height: '100%',
              channel: cleanChannel,
              layout: 'video',
              autoplay: true,
              muted: true,
              parent: parentHosts
            });
            newSlot.twitchEmbed = embed;

            embed.addEventListener(Twitch.Embed.VIDEO_READY, () => {
              if (slots[slotIndex] !== newSlot) return;
              const twitchPlayer = embed.getPlayer();
              if (!twitchPlayer) return;
              newSlot.twitchPlayer = twitchPlayer;
              beginTwitchPlayback(twitchPlayer, cleanChannel, slotIndex);
            });

            // Twitch's SDK fires this specifically when the browser (or its
            // own min-size check) blocks autoplay — react immediately
            // instead of waiting on a poll.
            embed.addEventListener(Twitch.Embed.PLAYBACK_BLOCKED, () => {
              if (slots[slotIndex] !== newSlot) return;
              const twitchPlayer = embed.getPlayer();
              if (!twitchPlayer) return;
              newSlot.twitchPlayer = twitchPlayer;
              try {
                twitchPlayer.setMuted(true);
                twitchPlayer.play();
              } catch (_) {}
              if (slotIndex === focusedSlot) armUnmuteOnNextInteraction(twitchPlayer, cleanChannel, slotIndex);
            });
          })
          .catch((error) => {
            console.error(error);
            if (slots[slotIndex] === newSlot) {
              body.innerHTML = '<div class="stream-list-empty">Unable to load Twitch embed.</div>';
            }
          });
      });
    }

    function canResumeTwitch(slotIndex, minHiddenMs = 0) {
      if (document.visibilityState !== 'visible') return false;
      // A slot demoted out of the layout is meant to stay paused — don't let
      // the resume machinery wake it up (or, worse, reload its embed).
      if (!isSlotVisible(slotIndex)) return false;
      const slot = slots[slotIndex];
      if (!slot || slot.platform !== 'twitch' || !slot.id) return false;
      if (minHiddenMs && Date.now() - lastHiddenAt < minHiddenMs) return false;
      return true;
    }

    function reloadTwitchEmbedIfDue(slotIndex) {
      const slot = slots[slotIndex];
      if (!slot) return;
      if (Date.now() - (slot.lastEmbedLoadAt || 0) < TWITCH_RESUME_RELOAD_COOLDOWN_MS) return;
      loadTwitchEmbedInSlot(slotIndex, slot.id, { keepInputText: true });
    }

    function attemptTwitchResume(slotIndex, reason) {
      // Only require the tab to have been hidden a while when the trigger IS a
      // tab-visibility change. Theater-mode toggles are an explicit user action,
      // not a background return, so they shouldn't be gated on lastHiddenAt.
      const minHiddenMs = reason === 'visibilitychange' ? TWITCH_TAB_RESUME_MIN_HIDDEN_MS : 0;
      if (!canResumeTwitch(slotIndex, minHiddenMs)) return;

      const slot = slots[slotIndex];
      const channelId = slot.id;
      const player = slot.twitchPlayer;

      // If we still hold a live player reference, just nudge playback in place —
      // no need to tear down and rebuild the iframe (and chat) for a simple unpause.
      if (player && typeof player.getPlayerState === 'function') {
        if (isTwitchPlaybackActive(player)) return;

        // Just nudge play() — don't force mute here, so a stream the user
        // already unmuted stays unmuted across a resume.
        try {
          player.play();
        } catch (_) {}

        window.setTimeout(() => {
          const current = slots[slotIndex];
          if (!current || current.platform !== 'twitch' || current.id !== channelId) return;
          if (document.visibilityState !== 'visible') return;
          const stillInactive = !current.twitchPlayer || !isTwitchPlaybackActive(current.twitchPlayer);
          if (stillInactive) reloadTwitchEmbedIfDue(slotIndex);
        }, TWITCH_RESUME_RETRY_DELAY_MS);
        return;
      }

      reloadTwitchEmbedIfDue(slotIndex);
    }

    function scheduleTwitchResume(slotIndex, reason, delayMs = TWITCH_RESUME_DEBOUNCE_MS) {
      const slot = slots[slotIndex];
      if (!slot) return;
      if (slot.resumeTimer) {
        window.clearTimeout(slot.resumeTimer);
      }

      slot.resumeTimer = window.setTimeout(() => {
        slot.resumeTimer = null;
        attemptTwitchResume(slotIndex, reason);
      }, delayMs);
    }

    function scheduleTwitchResumeAll(reason) {
      for (let i = 0; i < MAX_SLOTS; i++) {
        if (!isSlotVisible(i)) continue;
        if (slots[i] && slots[i].platform === 'twitch') scheduleTwitchResume(i, reason);
      }
    }

    function ytCommand(iframe, func, args = []) {
      try {
        iframe?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args }), '*');
      } catch (_) {}
    }

    function getYoutubeIframeForSlot(slotIndex) {
      const body = document.getElementById(`streamTileBody${slotIndex}`);
      return body ? body.querySelector('iframe.stream-yt-player') : null;
    }

    function ytMuteSlot(slotIndex) {
      const iframe = getYoutubeIframeForSlot(slotIndex);
      if (iframe) ytCommand(iframe, 'mute');
    }

    function ytUnmuteSlot(slotIndex) {
      const iframe = getYoutubeIframeForSlot(slotIndex);
      if (iframe) {
        ytCommand(iframe, 'unMute');
        ytCommand(iframe, 'playVideo');
      }
    }

    function mountYoutubeIframe(slotIndex, src) {
      const body = document.getElementById(`streamTileBody${slotIndex}`);
      if (!body) return null;
      body.innerHTML = '';
      const iframe = document.createElement('iframe');
      iframe.className = 'stream-yt-player';
      iframe.src = src;
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
      iframe.setAttribute('allowfullscreen', '');
      body.appendChild(iframe);

      // YouTube always starts muted for reliable autoplay (see mount below);
      // if this slot is the focused one, unmute it via the postMessage API
      // once the player has had a moment to attach its message listener.
      iframe.addEventListener('load', () => {
        if (slotIndex !== focusedSlot) return;
        ytUnmuteSlot(slotIndex);
        window.setTimeout(() => {
          if (slotIndex === focusedSlot) ytUnmuteSlot(slotIndex);
        }, 800);
      });

      return iframe;
    }

    // --- Grid rendering / focus / chat -----------------------------------

    function syncStreamUrlInputToFocused() {
      const inputElement = document.getElementById('streamUrl');
      if (!inputElement) return;
      const slot = slots[focusedSlot];
      if (slot) {
        inputElement.dataset.lastInput = slot.id;
        inputElement.value = 'You are Watching: ' + slot.label;
      } else {
        inputElement.dataset.lastInput = '';
        inputElement.value = '';
      }
    }

    function updateChatForFocusedSlot() {
      const chat = document.getElementById('chat');
      if (!chat) return;
      const slot = slots[focusedSlot];
      chat.innerHTML = '';

      if (!slot) {
        const empty = document.createElement('div');
        empty.className = 'stream-list-empty';
        empty.textContent = 'Focus a stream to see its chat';
        chat.appendChild(empty);
        return;
      }

      const iframe = document.createElement('iframe');
      if (slot.platform === 'twitch') {
        iframe.src = `https://www.twitch.tv/embed/${encodeURIComponent(slot.id)}/chat?parent=${window.location.hostname}&darkpopout`;
      } else {
        iframe.src = `https://www.youtube.com/live_chat?v=${encodeURIComponent(slot.id)}&embed_domain=${window.location.hostname}&dark_theme=1`;
      }
      chat.appendChild(iframe);
    }

    function updateLayoutMenuUI() {
      document.querySelectorAll('.stream-layout-btn').forEach((btn) => {
        btn.classList.toggle('is-active', Number(btn.dataset.count) === desiredSlotCount);
      });
    }

    function renderGrid() {
      const grid = document.getElementById('streamGrid');
      if (grid) grid.dataset.count = String(desiredSlotCount);

      for (let i = 0; i < MAX_SLOTS; i++) {
        const tile = document.getElementById(`streamTile${i}`);
        if (!tile) continue;
        const slot = slots[i];
        const position = slotOrder.indexOf(i);
        const visible = position < desiredSlotCount;
        const isEmpty = visible && !slot;

        tile.classList.toggle('is-visible', visible);
        tile.classList.toggle('is-empty', isEmpty);
        tile.classList.toggle('is-focused', visible && focusedSlot === i);
        tile.style.order = String(position);

        if (slot) {
          tile.dataset.platform = slot.platform;
          const label = tile.querySelector('.stream-tile-label');
          if (label) label.textContent = slot.label;
        } else {
          delete tile.dataset.platform;
        }
      }

      updateLayoutMenuUI();
    }

    function setFocusedSlot(index) {
      if (index < 0 || index >= MAX_SLOTS || !isSlotVisible(index)) return;
      if (index === focusedSlot) return;

      const prevSlot = slots[focusedSlot];
      if (prevSlot) {
        if (prevSlot.platform === 'twitch' && prevSlot.twitchPlayer) {
          try { prevSlot.twitchPlayer.setMuted(true); } catch (_) {}
        } else if (prevSlot.platform === 'youtube') {
          ytMuteSlot(focusedSlot);
        }
      }

      focusedSlot = index;

      const nextSlot = slots[focusedSlot];
      if (nextSlot) {
        if (nextSlot.platform === 'twitch' && nextSlot.twitchPlayer) {
          try { nextSlot.twitchPlayer.setMuted(false); } catch (_) {}
        } else if (nextSlot.platform === 'youtube') {
          ytUnmuteSlot(focusedSlot);
        }
      }

      renderGrid();
      updateChatForFocusedSlot();
      syncStreamUrlInputToFocused();
      if (!nextSlot) {
        const inputElement = document.getElementById('streamUrl');
        if (inputElement) inputElement.focus();
      }
    }

    function closeSlot(index) {
      if (!slots[index]) return;
      teardownSlot(index);
      slots[index] = null;

      if (focusedSlot === index) {
        const nextFilled = getVisibleSlotIndices().find(i => slots[i]);
        focusedSlot = nextFilled !== undefined ? nextFilled : index;
        updateChatForFocusedSlot();
        syncStreamUrlInputToFocused();
      }

      renderGrid();
    }

    // Park a slot that just dropped out of the layout: silence it and stop the
    // stream, but leave the embed mounted so bringing it back is a play() call
    // rather than a rebuild.
    function parkSlot(slotIndex) {
      const slot = slots[slotIndex];
      if (!slot) return;

      if (slot.platform === 'twitch') {
        if (slot.resumeTimer) {
          window.clearTimeout(slot.resumeTimer);
          slot.resumeTimer = null;
        }
        clearSlotUnmuteHandler(slot);
        const player = slot.twitchPlayer;
        if (player) {
          try { player.setMuted(true); } catch (_) {}
          try { player.pause(); } catch (_) {}
        }
      } else if (slot.platform === 'youtube') {
        ytMuteSlot(slotIndex);
        const iframe = getYoutubeIframeForSlot(slotIndex);
        if (iframe) ytCommand(iframe, 'pauseVideo');
      }
    }

    // Bring a parked slot back on screen. Only the focused tile gets audio;
    // the rest resume muted, same as any background tile.
    function unparkSlot(slotIndex) {
      const slot = slots[slotIndex];
      if (!slot) return;

      if (slot.platform === 'twitch') {
        const player = slot.twitchPlayer;
        if (player) {
          try { player.setMuted(slotIndex !== focusedSlot); } catch (_) {}
          try { player.play(); } catch (_) {}
        }
        // Backstop: if the player doesn't come back from the pause, the resume
        // path retries and only then falls back to reloading the embed.
        scheduleTwitchResume(slotIndex, 'layout');
      } else if (slot.platform === 'youtube') {
        const iframe = getYoutubeIframeForSlot(slotIndex);
        if (iframe) ytCommand(iframe, 'playVideo');
        if (slotIndex === focusedSlot) ytUnmuteSlot(slotIndex);
        else ytMuteSlot(slotIndex);
      }
    }

    function setDesiredSlotCount(n) {
      n = Math.max(1, Math.min(MAX_SLOTS, Math.round(n) || 1));
      const previousCount = desiredSlotCount;
      if (n === previousCount) {
        renderGrid();
        return;
      }

      const previouslyVisible = getVisibleSlotIndices();
      const previousFocus = focusedSlot;
      desiredSlotCount = n;

      if (n < previousCount) {
        // Decide which tiles lose their spot: empty ones go first, then
        // unfocused streams. The focused stream is never demoted. Tiles that
        // stay keep their relative positions so the layout doesn't shuffle.
        const demotionRank = (slotIndex) => {
          if (slotIndex === focusedSlot) return 0;
          return slots[slotIndex] ? 1 : 2;
        };
        const ranked = previouslyVisible
          .map((slotIndex, position) => ({ slotIndex, position }))
          .sort((a, b) => (demotionRank(a.slotIndex) - demotionRank(b.slotIndex)) || (a.position - b.position));

        const kept = ranked.slice(0, n)
          .sort((a, b) => a.position - b.position)
          .map(entry => entry.slotIndex);
        const demoted = ranked.slice(n).map(entry => entry.slotIndex);

        slotOrder = kept.concat(demoted, slotOrder.slice(previousCount));
        demoted.forEach(parkSlot);
      }

      if (!isSlotVisible(focusedSlot)) {
        const visible = getVisibleSlotIndices();
        const nextFilled = visible.find(i => slots[i]);
        focusedSlot = nextFilled !== undefined ? nextFilled : visible[0];
      }

      renderGrid();

      if (focusedSlot !== previousFocus) {
        updateChatForFocusedSlot();
        syncStreamUrlInputToFocused();
      }

      // Growing brings parked tiles back — restart them now that they have a box.
      if (n > previousCount) {
        slotOrder.slice(previousCount, n).forEach(unparkSlot);
      }
    }

    function loadIntoSlot(slotIndex, rawInput) {
      const input = (rawInput || '').trim();
      if (!input) return;

      const sanitizeYoutubeId = (value) => String(value || '').trim().replace(/[^A-Za-z0-9_-]/g, '');

      if (input.includes('youtube.com') || input.includes('youtu.be') || input.includes('@')) {
        if (input.includes('@')) {
          const handle = sanitizeYoutubeId(input.split('@').pop().split('/')[0]);
          if (!handle) return;
          teardownSlot(slotIndex);
          slots[slotIndex] = { platform: 'youtube', id: handle, label: handle };
          mountYoutubeIframe(slotIndex, `https://www.youtube.com/embed/live_stream?channel=${encodeURIComponent(handle)}&autoplay=1&mute=1&origin=${window.location.origin}&enablejsapi=1`);
          renderGrid();
          if (slotIndex === focusedSlot) {
            updateChatForFocusedSlot();
            syncStreamUrlInputToFocused();
          }
          return;
        }

        let videoId = '';
        if (input.includes('v=')) {
          videoId = input.split('v=')[1].split('&')[0];
        } else if (input.includes('youtu.be/')) {
          videoId = input.split('youtu.be/')[1].split('?')[0];
        } else if (input.includes('/embed/')) {
          videoId = input.split('/embed/')[1].split('?')[0];
        } else {
          videoId = input.split('/').pop();
        }

        videoId = sanitizeYoutubeId(videoId);
        if (!videoId) return;

        teardownSlot(slotIndex);
        slots[slotIndex] = { platform: 'youtube', id: videoId, label: videoId };
        mountYoutubeIframe(slotIndex, `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?autoplay=1&mute=1&origin=${window.location.origin}&enablejsapi=1`);
        renderGrid();
        if (slotIndex === focusedSlot) {
          updateChatForFocusedSlot();
          syncStreamUrlInputToFocused();
        }
        return;
      }

      const channel = input.includes('twitch.tv/') ? input.split('twitch.tv/').pop().split('/')[0] : input;
      loadTwitchEmbedInSlot(slotIndex, channel);
    }

    function setDropdownOpen(dropdown, isOpen) {
      if (!dropdown) return;
      if (isOpen) {
        dropdown.classList.remove('force-closed');
      }
      dropdown.classList.toggle('is-open', isOpen);

      const trigger = dropdown.querySelector('.dropbtn');
      if (trigger) {
        trigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      }
    }

    function closeStreamerDropdownImmediately() {
      const dropdown = document.querySelector('.dropdown');
      if (!dropdown) return;

      dropdown.classList.add('force-closed');
      setDropdownOpen(dropdown, false);

      const trigger = dropdown.querySelector('.dropbtn');
      if (trigger) trigger.blur();

      if (document.activeElement && typeof document.activeElement.blur === 'function') {
        document.activeElement.blur();
      }
    }

    function getLastTwitchFollowSyncAt() {
      const raw = Number(localStorage.getItem('twitchFollowedLastSyncedAt') || '0');
      return Number.isFinite(raw) ? raw : 0;
    }

    function shouldSyncTwitchFollows(now = Date.now()) {
      const token = localStorage.getItem('twitchToken');
      if (!token) return false;
      return now - getLastTwitchFollowSyncAt() >= TWITCH_FOLLOW_SYNC_INTERVAL_MS;
    }

    async function refreshListOnDropdownHover() {
      const now = Date.now();
      if (dropdownRefreshInFlight) return;
      if (now - lastDropdownRefreshAt < DROPDOWN_REFRESH_COOLDOWN_MS) return;

      dropdownRefreshInFlight = true;
      try {
        if (shouldSyncTwitchFollows(now)) {
          await fetchTwitchFollows({ skipRender: true });
        }
        await renderList();
        lastDropdownRefreshAt = Date.now();
      } finally {
        dropdownRefreshInFlight = false;
      }
    }

    window.loadStream = function() {
      const inputElement = document.getElementById('streamUrl');
      const input = inputElement.value.trim();
      if (!input) return;
      loadIntoSlot(focusedSlot, input);
    };

    window.toggleChat = function() {
      const chat = document.getElementById('chat');
      chat.style.display = (chat.style.display === 'none') ? 'block' : 'none';
    };

    window.loadStreamDirect = function(url) {
      const input = (url || '').trim();
      if (!input) return;
      document.getElementById('streamUrl').value = url;
      loadIntoSlot(focusedSlot, input);
    };

    function formatViewerCount(n) {
      if (!Number.isFinite(n) || n < 0) return '0';
      if (n >= 1000000) return `${(n / 1000000).toFixed(n >= 10000000 ? 0 : 1)}M`;
      if (n >= 1000) return `${(n / 1000).toFixed(n >= 100000 ? 0 : 1)}K`;
      return `${Math.round(n)}`;
    }

    function getOAuthRedirect(provider = 'twitch') {
      const configuredRedirect = provider === 'youtube'
        ? window.YOUTUBE_REDIRECT_URI
        : window.TWITCH_REDIRECT_URI;

      if (typeof configuredRedirect === 'string' && configuredRedirect.trim()) {
        try {
          const parsed = new URL(configuredRedirect.trim());
          return parsed.origin + parsed.pathname;
        } catch (_) {
          // Ignore invalid configured URL and fall back to current page URL.
        }
      }

      const currentUrl = new URL(window.location.href);
      currentUrl.hash = '';
      currentUrl.search = '';
      const isLoopback =
        currentUrl.hostname === 'localhost' ||
        currentUrl.hostname === '127.0.0.1' ||
        currentUrl.hostname === '::1';

      if (!isLoopback && currentUrl.protocol !== 'https:') {
        currentUrl.protocol = 'https:';
      }

      // Canonicalize loopback host so Twitch redirect URI checks are stable in local dev.
      if (currentUrl.hostname === '127.0.0.1' || currentUrl.hostname === '::1') {
        currentUrl.hostname = 'localhost';
      }

      return currentUrl.origin + currentUrl.pathname;
    }

    function makeOAuthState(provider) {
      const nonce = Math.random().toString(36).slice(2);
      return `${provider}-${Date.now()}-${nonce}`;
    }

    async function mapWithConcurrency(items, worker, limit = 8) {
      const results = [];
      let index = 0;

      async function runner() {
        while (index < items.length) {
          const currentIndex = index++;
          results[currentIndex] = await worker(items[currentIndex], currentIndex);
        }
      }

      const workers = Array.from({ length: Math.min(limit, items.length) }, () => runner());
      await Promise.all(workers);
      return results;
    }

    function getCachedJson(key) {
      try {
        return JSON.parse(localStorage.getItem(key) || 'null');
      } catch (_) {
        return null;
      }
    }

    function setCachedJson(key, value) {
      localStorage.setItem(key, JSON.stringify(value));
    }

    function setYouTubeScanStatus(text) {
      const el = document.getElementById('youtubeScanStatus');
      if (!el) return;
      el.textContent = text || '';
    }

    function getManualStreamers() {
      const saved = getCachedJson('myStreamers');
      return Array.isArray(saved) ? saved : [];
    }

    function normalizeTwitchChannelInput(value) {
      const raw = (value || '').trim();
      if (!raw) return null;

      let channel = raw;
      if (channel.includes('twitch.tv/')) {
        channel = channel.split('twitch.tv/').pop().split('/')[0];
      }

      channel = channel.trim().replace(/^@+/, '').toLowerCase();
      channel = channel.replace(/[^a-z0-9_]/g, '');
      if (!channel) return null;

      return { name: channel, url: channel };
    }

    async function ytApi(path, token) {
      const resp = await fetch(`https://www.googleapis.com/youtube/v3/${path}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      let errorPayload = null;
      if (!resp.ok) {
        try {
          errorPayload = await resp.json();
        } catch (_) {
          errorPayload = null;
        }
      }

      if (resp.status === 401) {
        youtubeLogout();
        throw new Error('YouTube auth expired');
      }

      if (resp.status === 403) {
        const reason = errorPayload?.error?.errors?.[0]?.reason || 'forbidden';
        const message = errorPayload?.error?.message || 'YouTube API access denied';

        // Only force logout on true token/scope auth failures.
        if (reason === 'authError' || reason === 'insufficientPermissions') {
          youtubeLogout();
          throw new Error(`YouTube auth error (${reason}): ${message}`);
        }

        throw new Error(`YouTube API 403 (${reason}): ${message}`);
      }

      if (!resp.ok) {
        throw new Error(`YouTube API error ${resp.status}`);
      }
      return await resp.json();
    }

    async function getYouTubeSubscriptions() {
      const token = localStorage.getItem('youtubeToken');
      if (!token) return [];

      if (Date.now() < youtubeRetryAfter) {
        throw new Error('YouTube cooldown active');
      }

      if (youtubeSubsInFlight) return await youtubeSubsInFlight;

      youtubeSubsInFlight = (async () => {
        const cached = getCachedJson('youtubeSubscriptionsCache');
        if (cached && Array.isArray(cached.items) && Date.now() - cached.updatedAt < YOUTUBE_SUBS_CACHE_TTL_MS) {
          return cached.items;
        }

        let items = [];
        let pageToken = '';
        do {
          const data = await ytApi(`subscriptions?part=snippet&mine=true&maxResults=50${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`, token);
          const pageItems = (data.items || []).map(s => ({
            name: s.snippet?.title || 'YouTube Channel',
            channelId: s.snippet?.resourceId?.channelId || '',
            platform: 'youtube'
          })).filter(i => i.channelId);
          items = items.concat(pageItems);
          pageToken = data.nextPageToken || '';
        } while (pageToken);

        setCachedJson('youtubeSubscriptionsCache', { updatedAt: Date.now(), items });
        return items;
      })();

      try {
        return await youtubeSubsInFlight;
      } finally {
        youtubeSubsInFlight = null;
      }
    }

    async function fetchYouTubeLiveStreams() {
      const token = localStorage.getItem('youtubeToken');
      if (!token) return [];

      if (Date.now() < youtubeRetryAfter) {
        setYouTubeScanStatus('YouTube temporarily paused after error. Retrying soon...');
        return [];
      }

      if (youtubeLiveInFlight) return await youtubeLiveInFlight;

      youtubeLiveInFlight = (async () => {
        const liveCache = getCachedJson('youtubeLiveCache');
        if (liveCache && Array.isArray(liveCache.items) && Date.now() - liveCache.updatedAt < YOUTUBE_LIVE_CACHE_TTL_MS) {
          setYouTubeScanStatus('');
          return liveCache.items;
        }

        setYouTubeScanStatus('Scanning subscribed YouTube channels...');
        let completedSuccessfully = false;
        let clearStatusOnSuccess = true;
        try {
          const subscriptions = await getYouTubeSubscriptions();
          const subsById = new Map(subscriptions.map(s => [s.channelId, s.name]));

          const candidateIds = new Set();

          // Phase 1: pull recent items from the user's home activity feed.
          let homePageToken = '';
          for (let i = 0; i < 6; i++) {
            const data = await ytApi(`activities?part=snippet,contentDetails&home=true&maxResults=50${homePageToken ? `&pageToken=${encodeURIComponent(homePageToken)}` : ''}`, token);
            (data.items || []).forEach((item) => {
              const vid = item?.contentDetails?.upload?.videoId;
              if (vid) candidateIds.add(vid);
            });
            homePageToken = data.nextPageToken || '';
            if (!homePageToken) break;
          }

          // Phase 2 fallback: if home feed is sparse, sample channel activity directly.
          if (candidateIds.size < 30 && subscriptions.length > 0) {
            const channelsToScan = subscriptions.slice(0, 180);
            setYouTubeScanStatus('Scanning subscribed YouTube channels...');
            const recentByChannel = await mapWithConcurrency(channelsToScan, async (sub) => {
              try {
                const data = await ytApi(`activities?part=snippet,contentDetails&channelId=${encodeURIComponent(sub.channelId)}&maxResults=10`, token);
                const videoIds = (data.items || [])
                  .map(item => item?.contentDetails?.upload?.videoId)
                  .filter(Boolean)
                  .slice(0, 5);

                if (videoIds.length === 0) return null;
                return { channelId: sub.channelId, videoIds };
              } catch (_) {
                return null;
              }
            }, 8);

            recentByChannel.filter(Boolean).forEach(entry => {
              entry.videoIds.forEach(id => candidateIds.add(id));
            });

            if (candidateIds.size === 0) {
              clearStatusOnSuccess = false;
              setYouTubeScanStatus('No recent YouTube uploads found to check right now.');
            }
          }

          const uniqueVideoIds = Array.from(candidateIds);

          const liveByChannel = new Map();
          for (let i = 0; i < uniqueVideoIds.length; i += 50) {
            const batchIds = uniqueVideoIds.slice(i, i + 50);
            try {
              const data = await ytApi(`videos?part=snippet,liveStreamingDetails&id=${encodeURIComponent(batchIds.join(','))}`, token);
              (data.items || []).forEach((video) => {
                const snippet = video.snippet || {};
                const live = video.liveStreamingDetails || {};

                const isLive =
                  snippet.liveBroadcastContent === 'live' ||
                  (live.actualStartTime && !live.actualEndTime) ||
                  live.concurrentViewers !== undefined;

                if (!isLive) return;

                const channelId = snippet.channelId;
                if (!channelId || liveByChannel.has(channelId)) return;

                // Keep only channels the user is subscribed to.
                if (!subsById.has(channelId)) return;

                liveByChannel.set(channelId, {
                  name: snippet.channelTitle || subsById.get(channelId) || 'YouTube Channel',
                  url: `https://www.youtube.com/watch?v=${video.id}`,
                  videoId: video.id,
                  platform: 'youtube',
                  isOnline: true,
                  viewers: Number(live.concurrentViewers) || 0
                });
              });
            } catch (_) {}
          }

          const liveItems = Array.from(liveByChannel.values());

          if (liveItems.length === 0) {
            clearStatusOnSuccess = false;
            setYouTubeScanStatus('No live YouTube streams found right now.');
          }

          setCachedJson('youtubeLiveCache', { updatedAt: Date.now(), items: liveItems });
          completedSuccessfully = true;
          return liveItems;
        } catch (e) {
          const errorMsg = String(e.message || '');
          console.error('YouTube live fetch error', e);
          youtubeRetryAfter = Date.now() + YOUTUBE_ERROR_COOLDOWN_MS;
          if (errorMsg.includes('insufficientPermissions')) {
            setYouTubeScanStatus('YouTube scope missing. Disconnect + reconnect YouTube.');
          } else if (errorMsg.includes('accessNotConfigured') || errorMsg.includes('serviceDisabled')) {
            setYouTubeScanStatus('Enable YouTube Data API v3 in Google Cloud.');
          } else if (errorMsg.includes('quotaExceeded') || errorMsg.includes('dailyLimitExceeded')) {
            setYouTubeScanStatus('YouTube API quota exceeded. Try later.');
          } else if (errorMsg.includes('cooldown')) {
            setYouTubeScanStatus('YouTube temporarily paused after error. Retrying soon...');
          } else if (errorMsg.includes('auth expired') || errorMsg.includes('401')) {
            setYouTubeScanStatus('YouTube session expired. Disconnect + reconnect YouTube.');
          } else if (errorMsg.includes('403')) {
            setYouTubeScanStatus('YouTube API access denied. Check OAuth scopes & API config.');
          } else if (errorMsg.includes('network') || errorMsg.includes('fetch')) {
            setYouTubeScanStatus('Network error contacting YouTube. Try again in a moment.');
          } else {
            setYouTubeScanStatus('YouTube scan failed: ' + errorMsg.slice(0, 50) + '. Try reconnecting.');
          }
          return [];
        } finally {
          if (completedSuccessfully && clearStatusOnSuccess) {
            setYouTubeScanStatus('');
          }
        }
      })();

      try {
        return await youtubeLiveInFlight;
      } finally {
        youtubeLiveInFlight = null;
      }
    }

    async function renderList() {
      const manual   = getManualStreamers();
        const followed = JSON.parse(localStorage.getItem('twitchFollowed')) || [];
        const youtubeLive = await fetchYouTubeLiveStreams();

        // Merge manual + followed, dedupe by lowercase url/login
        const seen = new Set();
        const combined = [];
        for (const item of [...manual, ...followed]) {
            const key = item.url.toLowerCase();
            if (!seen.has(key)) { seen.add(key); combined.push(item); }
        }

        // Batch status check via Helix if token available, else fall back to decapi
        const token    = localStorage.getItem('twitchToken');
        const clientId = window.TWITCH_CLIENT_ID;
        const onlineSet = new Set();
        const viewersByLogin = new Map();

        if (token && clientId && clientId !== 'YOUR_TWITCH_CLIENT_ID') {
            const twitchItems = combined.filter(i => !i.url.includes('youtube'));
            for (let i = 0; i < twitchItems.length; i += 100) {
                const batch = twitchItems.slice(i, i + 100);
                const query = batch.map(b => `user_login=${encodeURIComponent(b.url)}`).join('&');
                try {
                    const resp = await fetch(`https://api.twitch.tv/helix/streams?${query}`, {
                        headers: { 'Client-Id': clientId, 'Authorization': `Bearer ${token}` }
                    });
                    if (resp.ok) {
                        const data = await resp.json();
                      data.data.forEach(s => {
                        const login = s.user_login.toLowerCase();
                        onlineSet.add(login);
                        viewersByLogin.set(login, Number(s.viewer_count) || 0);
                      });
                    } else if (resp.status === 401) {
                        twitchLogout();
                    }
                } catch(e) {}
            }
        } else {
            const statuses = await Promise.all(combined.map(item => getTwitchStatus(item.url)));
            statuses.forEach((s, i) => { if (s) onlineSet.add(combined[i].url.toLowerCase()); });
        }

        const withStatus = combined.map(item => {
          const login = item.url.toLowerCase();
          return {
            ...item,
            platform: 'twitch',
            isOnline: onlineSet.has(login),
            viewers: viewersByLogin.get(login) || 0
          };
        });
        const liveOnly = withStatus.filter(item => item.isOnline).concat(youtubeLive);

        const liveDedup = new Map();
        liveOnly.forEach(item => {
          const key = `${item.platform}:${item.url.toLowerCase()}`;
          if (!liveDedup.has(key)) liveDedup.set(key, item);
        });

        const liveRows = Array.from(liveDedup.values());
        const twitchRows = liveRows.filter(r => r.platform === 'twitch');
        const youtubeRows = liveRows.filter(r => r.platform === 'youtube');

        const sortByViewers = (a, b) => {
          if (b.viewers !== a.viewers) return b.viewers - a.viewers;
          return a.name.localeCompare(b.name);
        };
        twitchRows.sort(sortByViewers);
        youtubeRows.sort(sortByViewers);

        const container = document.getElementById('listItems');
        container.innerHTML = '';

        if (liveRows.length === 0) {
          const hasConnectedTwitch = !!localStorage.getItem('twitchToken');
          const emptyMessage = hasConnectedTwitch
            ? 'No one is live right now'
            : 'No live channels yet. Add a streamer or connect Twitch.';
          const emptyEl = document.createElement('div');
          emptyEl.className = 'stream-list-empty';
          emptyEl.textContent = emptyMessage;
          container.appendChild(emptyEl);
        } else {
          const makeRow = (item) => {
            const row = document.createElement('div');
            row.className = 'stream-live-row';

            const link = document.createElement('a');
            link.href = '#';
            link.className = 'stream-open-link';
            link.dataset.streamUrl = item.url;

            const label = document.createElement('span');
            label.className = 'stream-live-label';

            const nameText = document.createTextNode(`${item.name} `);
            const viewersEl = document.createElement('span');
            viewersEl.className = 'stream-live-viewers';
            viewersEl.textContent = `(${formatViewerCount(item.viewers)})`;
            label.appendChild(nameText);
            label.appendChild(viewersEl);
            link.appendChild(label);

            link.addEventListener('click', (event) => {
              event.preventDefault();
              closeStreamerDropdownImmediately();
              if (item.url) loadStreamDirect(item.url);
            });

            row.appendChild(link);

            const isManual = item.platform === 'twitch' && manual.some(m => m.url.toLowerCase() === item.url.toLowerCase());
            if (isManual) {
              const removeBtn = document.createElement('button');
              removeBtn.type = 'button';
              removeBtn.className = 'stream-remove-btn';
              removeBtn.textContent = '×';
              removeBtn.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                removeStreamer(item.name);
              });
              row.appendChild(removeBtn);
            }

            return row;
          };

          const makeSection = (title, titleClassName, rows) => {
            const section = document.createElement('div');
            section.className = 'stream-live-section';

            const heading = document.createElement('div');
            heading.className = `stream-live-section-title ${titleClassName}`;
            heading.textContent = title;
            section.appendChild(heading);

            if (!rows.length) {
              const empty = document.createElement('div');
              empty.className = 'stream-live-empty';
              empty.textContent = 'No live channels';
              section.appendChild(empty);
              return section;
            }

            rows.forEach((row) => {
              section.appendChild(makeRow(row));
            });
            return section;
          };

          const grid = document.createElement('div');
          grid.className = 'stream-live-grid';
          grid.appendChild(makeSection('Twitch Live', 'stream-live-title-twitch', twitchRows));
          grid.appendChild(makeSection('YouTube Live', 'stream-live-title-youtube', youtubeRows));
          container.appendChild(grid);
        }

        updateConnectButtons();
    }

    async function getTwitchStatus(url) {
        if (url.includes('youtube')) return false;
        const channel = url.includes('twitch.tv/') ? url.split('twitch.tv/').pop().split('/')[0] : url;
        try {
            const response = await fetch(`https://decapi.me/twitch/uptime/${channel}`);
            const text = await response.text();
            return !text.includes("offline") && !text.includes("not found");
        } catch (e) {
            return false;
        }
    }

    // --- Twitch OAuth ---
    function twitchLogin() {
        const clientId = window.TWITCH_CLIENT_ID;
        if (!clientId || clientId === 'YOUR_TWITCH_CLIENT_ID') {
        const redirect = getOAuthRedirect('twitch');
        alert('Set your TWITCH_CLIENT_ID in assets/js/config.js first.\n\nRegister a free app at: https://dev.twitch.tv/console/apps\n\nAlso ensure this exact OAuth Redirect URL is in your Twitch app settings:\n' + redirect);
            return;
        }
      const state = makeOAuthState('tw');
      localStorage.setItem('twitchOAuthState', state);
      const redirect = getOAuthRedirect('twitch');
      window.location.href = `https://id.twitch.tv/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirect)}&response_type=token&scope=user:read:follows&state=${encodeURIComponent(state)}`;
    }

    function twitchLogout() {
        localStorage.removeItem('twitchToken');
        localStorage.removeItem('twitchFollowed');
      localStorage.removeItem('twitchFollowedLastSyncedAt');
        renderList();
    }

    function youtubeLogin() {
      const clientId = window.YOUTUBE_CLIENT_ID;
      if (!clientId || clientId === 'YOUR_YOUTUBE_CLIENT_ID') {
        alert('Set your YOUTUBE_CLIENT_ID in assets/js/config.js first.\n\nCreate an OAuth client ID at: https://console.cloud.google.com/');
        return;
      }
      const state = makeOAuthState('yt');
      localStorage.setItem('youtubeOAuthState', state);
      const redirect = getOAuthRedirect('youtube');
      const scope = 'https://www.googleapis.com/auth/youtube.readonly';
      window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirect)}&response_type=token&scope=${encodeURIComponent(scope)}&include_granted_scopes=true&state=${encodeURIComponent(state)}`;
    }

    function youtubeLogout() {
      localStorage.removeItem('youtubeToken');
      localStorage.removeItem('youtubeSubscriptionsCache');
      localStorage.removeItem('youtubeLiveCache');
      renderList();
    }

    function updateConnectButtons() {
      const twitchBtn = document.getElementById('twitchConnectBtn');
      const youtubeBtn = document.getElementById('youtubeConnectBtn');

      if (twitchBtn) {
        const twitchToken = localStorage.getItem('twitchToken');
        if (twitchToken) {
          twitchBtn.textContent = 'Disconnect Twitch';
          twitchBtn.onclick = (e) => { e.preventDefault(); twitchLogout(); };
          twitchBtn.style.color = 'rgba(200,210,255,0.4)';
        } else {
          twitchBtn.textContent = '+ Connect Twitch';
          twitchBtn.onclick = (e) => { e.preventDefault(); twitchLogin(); };
          twitchBtn.style.color = '#a970ff';
        }
      }

      if (youtubeBtn) {
        const youtubeToken = localStorage.getItem('youtubeToken');
        if (youtubeToken) {
          youtubeBtn.textContent = 'Disconnect YouTube';
          youtubeBtn.onclick = (e) => { e.preventDefault(); youtubeLogout(); };
          youtubeBtn.style.color = 'rgba(200,210,255,0.4)';
        } else {
          youtubeBtn.textContent = '+ Connect YouTube';
          youtubeBtn.onclick = (e) => { e.preventDefault(); youtubeLogin(); };
          youtubeBtn.style.color = '#ff6a4a';
        }
      }
    }

    async function fetchTwitchFollows(options = {}) {
      const { skipRender = false } = options;
      if (twitchFollowsSyncInFlight) return;

        const token    = localStorage.getItem('twitchToken');
        const clientId = window.TWITCH_CLIENT_ID;
        if (!token || !clientId || clientId === 'YOUR_TWITCH_CLIENT_ID') return;

      twitchFollowsSyncInFlight = true;
        try {
            const userResp = await fetch('https://api.twitch.tv/helix/users', {
                headers: { 'Client-Id': clientId, 'Authorization': `Bearer ${token}` }
            });
            if (!userResp.ok) { twitchLogout(); return; }
            const userData = await userResp.json();
            const userId = userData.data[0].id;

            let follows = [], cursor = '';
            do {
                const url = `https://api.twitch.tv/helix/channels/followed?user_id=${userId}&first=100${cursor ? '&after=' + cursor : ''}`;
                const resp = await fetch(url, {
                    headers: { 'Client-Id': clientId, 'Authorization': `Bearer ${token}` }
                });
                if (!resp.ok) break;
                const data = await resp.json();
                follows = follows.concat(data.data);
                cursor = data.pagination?.cursor || '';
            } while (cursor);

            localStorage.setItem('twitchFollowed', JSON.stringify(
                follows.map(f => ({ name: f.broadcaster_name, url: f.broadcaster_login }))
            ));
      localStorage.setItem('twitchFollowedLastSyncedAt', String(Date.now()));
      if (!skipRender) {
        renderList();
      }
        } catch (e) {
            console.error('Twitch follow fetch error', e);
    } finally {
      twitchFollowsSyncInFlight = false;
        }
    }

        async function fetchYouTubeSubscriptions() {
          const token = localStorage.getItem('youtubeToken');
          if (!token) return;
          try {
            await getYouTubeSubscriptions();
            // Force next live refresh to include YouTube after connect
            localStorage.removeItem('youtubeLiveCache');
            renderList();
          } catch (e) {
            const errorMsg = String(e.message || '');
            console.error('YouTube subscriptions fetch error', e);
            if (errorMsg.includes('insufficientPermissions')) {
              setYouTubeScanStatus('YouTube scope missing. Disconnect + reconnect YouTube.');
            } else if (errorMsg.includes('accessNotConfigured') || errorMsg.includes('serviceDisabled')) {
              setYouTubeScanStatus('Enable YouTube Data API v3 in Google Cloud.');
            } else if (errorMsg.includes('401') || errorMsg.includes('auth expired')) {
              setYouTubeScanStatus('YouTube session expired. Disconnect + reconnect YouTube.');
            } else if (errorMsg.includes('403')) {
              setYouTubeScanStatus('YouTube API access denied. Check OAuth scopes & API config.');
            } else {
              setYouTubeScanStatus('Unable to read subscriptions. Check OAuth/API setup.');
            }
          }
        }

        // Handle OAuth redirect — runs immediately, but defers provider fetch until module sets client IDs
    (function handleOAuthCallback() {
        const hash = window.location.hash;
        if (hash.includes('access_token=')) {
            const params = new URLSearchParams(hash.slice(1));
            const token = params.get('access_token');
            const state = params.get('state') || '';
            if (token) {
              const twitchState = localStorage.getItem('twitchOAuthState') || '';
              const youtubeState = localStorage.getItem('youtubeOAuthState') || '';
              const isValidTwitchState = Boolean(state && twitchState && state === twitchState);
              const isValidYouTubeState = Boolean(state && youtubeState && state === youtubeState);

              if (isValidTwitchState) {
                localStorage.setItem('twitchToken', token);
                window._twitchJustConnected = true;
                localStorage.removeItem('twitchOAuthState');
              } else if (isValidYouTubeState) {
                localStorage.setItem('youtubeToken', token);
                window._youtubeJustConnected = true;
                localStorage.removeItem('youtubeOAuthState');
              }

                history.replaceState(null, '', window.location.pathname);
            }
        }
    })();

    window.removeStreamer = function(name) {
        let list = getManualStreamers();
        list = list.filter(item => item.name !== name);
        localStorage.setItem('myStreamers', JSON.stringify(list));
        renderList();
    };

    window.addStreamer = function() {
      const input = window.prompt('Enter a Twitch channel name or Twitch URL:');
      const normalized = normalizeTwitchChannelInput(input);
      if (!normalized) return;

      const list = getManualStreamers();
      const exists = list.some(item => item.url.toLowerCase() === normalized.url);
      if (exists) {
        renderList();
        return;
      }

      list.push(normalized);
      localStorage.setItem('myStreamers', JSON.stringify(list));
      renderList();
    };

    document.getElementById('streamUrl').addEventListener('focus', function() {
      if (this.dataset.lastInput) this.value = this.dataset.lastInput;
    });

    document.addEventListener('visibilitychange', function() {
      if (document.visibilityState === 'hidden') {
        lastHiddenAt = Date.now();
        return;
      }
      scheduleTwitchResumeAll('visibilitychange');
    });

    window.addEventListener('pageshow', function(event) {
      if (!event.persisted) return;
      scheduleTwitchResumeAll('pageshow');
    });

    const streamGrid = document.getElementById('streamGrid');
    if (streamGrid) {
      streamGrid.addEventListener('click', (event) => {
        const closeBtn = event.target.closest('.stream-tile-close');
        if (closeBtn) {
          event.preventDefault();
          event.stopPropagation();
          closeSlot(Number(closeBtn.dataset.slot));
          return;
        }

        const tile = event.target.closest('.stream-tile');
        if (!tile || !tile.classList.contains('is-visible')) return;
        setFocusedSlot(Number(tile.dataset.slot));
      });
    }

    document.querySelectorAll('.stream-layout-btn').forEach((btn) => {
      btn.addEventListener('click', () => setDesiredSlotCount(Number(btn.dataset.count)));
    });

    const streamerDropdown = document.querySelector('.dropdown');
    if (streamerDropdown) {
      const dropdownTrigger = streamerDropdown.querySelector('.dropbtn');
      let closeDropdownTimer = null;

      const clearDropdownCloseTimer = () => {
        if (!closeDropdownTimer) return;
        clearTimeout(closeDropdownTimer);
        closeDropdownTimer = null;
      };

      const scheduleDropdownClose = (delayMs = 140) => {
        clearDropdownCloseTimer();
        closeDropdownTimer = window.setTimeout(() => {
          closeDropdownTimer = null;
          setDropdownOpen(streamerDropdown, false);
        }, delayMs);
      };

      streamerDropdown.addEventListener('mouseenter', () => {
        clearDropdownCloseTimer();
        setDropdownOpen(streamerDropdown, true);
        refreshListOnDropdownHover();
      });

      streamerDropdown.addEventListener('mouseleave', () => {
        scheduleDropdownClose();
      });

      streamerDropdown.addEventListener('focusin', () => {
        clearDropdownCloseTimer();
        setDropdownOpen(streamerDropdown, true);
      });

      streamerDropdown.addEventListener('focusout', (event) => {
        if (streamerDropdown.contains(event.relatedTarget)) return;
        scheduleDropdownClose(0);
      });

      if (dropdownTrigger) {
        dropdownTrigger.setAttribute('aria-expanded', 'false');
        dropdownTrigger.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          clearDropdownCloseTimer();
          setDropdownOpen(streamerDropdown, true);
          refreshListOnDropdownHover();
        });
      }

      document.addEventListener('click', (event) => {
        if (streamerDropdown.contains(event.target)) return;
        clearDropdownCloseTimer();
        setDropdownOpen(streamerDropdown, false);
      });
    }

    const addStreamerBtn = document.getElementById('addStreamerBtn');
    if (addStreamerBtn) {
      addStreamerBtn.onclick = (e) => {
        e.preventDefault();
        addStreamer();
      };
    }

    const streamUrlInput = document.getElementById('streamUrl');
    if (streamUrlInput) {
      streamUrlInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') loadStream();
      });
    }

    const loadStreamBtn = document.getElementById('loadStreamBtn');
    if (loadStreamBtn) {
      loadStreamBtn.addEventListener('click', () => loadStream());
    }

    const toggleChatBtn = document.getElementById('toggleChatBtn');
    if (toggleChatBtn) {
      toggleChatBtn.addEventListener('click', () => toggleChat());
    }

    const toggleTheaterBtn = document.getElementById('toggleTheaterBtn');
    if (toggleTheaterBtn) {
      toggleTheaterBtn.addEventListener('click', () => toggleStreamTheaterMode());
    }

    const streamTheaterExitBtn = document.getElementById('streamTheaterExitBtn');
    if (streamTheaterExitBtn) {
      streamTheaterExitBtn.addEventListener('click', () => {
        if (streamTheaterMode) toggleStreamTheaterMode();
      });
    }

    renderGrid();
    updateChatForFocusedSlot();

    window.onload = async function() {
      updateTheaterModeButton();
      if (shouldSyncTwitchFollows()) {
        await fetchTwitchFollows({ skipRender: true });
      }
      await renderList();
      lastDropdownRefreshAt = Date.now();
    };

    window.fetchTwitchFollows = fetchTwitchFollows;
    window.fetchYouTubeSubscriptions = fetchYouTubeSubscriptions;
