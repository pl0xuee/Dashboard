// Subscription feed — the newest uploads from every channel you subscribe to.
//
// Split in two on purpose, because the two halves need different credentials:
//
//   Which channels you subscribe to is private, so it needs OAuth. That happens
//   once. The channel list is kept locally and the token is thrown away the
//   moment the import finishes — nothing here holds a live Google session.
//
//   What those channels have uploaded is public, but Google still wants a key
//   naming the caller — and a key in a static page is a key anyone can copy. So
//   this half goes through a Cloudflare Worker that holds the key as a secret
//   and exposes only the two reads below. Nothing here ever sees it.
//
// The alternative was asking for a Google sign-in on every visit, because the
// implicit flow this site uses issues no refresh token and Google's access
// tokens last about an hour.
import { YOUTUBE_CLIENT_ID, YOUTUBE_PROXY_URL, YOUTUBE_SUBS_REDIRECT_URI } from '../../assets/js/config.js';

(() => {
  const SUBS_KEY = 'ccSubsChannels:v1';
  const VIDEOS_KEY = 'ccSubsVideos:v1';
  const OAUTH_STATE_KEY = 'ccSubsOAuthState';
  const VIDEO_CACHE_TTL_MS = 30 * 60 * 1000;
  const REQUEST_TIMEOUT_MS = 12000;
  const MAX_CARDS = 60;
  // Per channel. Enough that a channel posting a burst still lands in the merged
  // list in order, small enough that 100 subscriptions stay inside one refresh.
  const PER_CHANNEL = 4;
  // A Short is <=60s. Duration is the only signal the API gives cheaply — the
  // vertical aspect ratio is not in the response — so this catches the odd short
  // non-Short too. Losing a 50-second clip is the better error.
  const SHORT_MAX_SECONDS = 60;

  const el = (id) => document.getElementById(id);
  const gridEl = el('subs-grid');
  if (!gridEl) return;

  const asofEl = el('subs-asof');
  const scopeEl = el('subs-scope');
  const stateEl = el('subs-state');
  const stateTitleEl = el('subs-state-title');
  const stateNoteEl = el('subs-state-note');
  const stateActionsEl = el('subs-state-actions');
  const refreshBtn = el('subs-refresh');
  const resyncBtn = el('subs-resync');
  const disconnectBtn = el('subs-disconnect');
  const playerEl = el('subs-player');
  const playerFrameEl = el('subs-player-frame');
  const playerTitleEl = el('subs-player-title');
  const playerChannelEl = el('subs-player-channel');
  const playerOpenEl = el('subs-player-open');
  const playerCloseEl = el('subs-player-close');
  const playerTheaterEl = el('subs-player-theater');
  const playerTheaterExitEl = el('subs-theater-exit');
  const playerSlotEl = el('subs-player-slot');
  const playerExpandEl = el('subs-player-expand');

  let channels = readJson(SUBS_KEY) || [];
  let videos = [];
  let fetchedAt = null;
  let busy = false;

  /* ---------------- storage ---------------- */

  function readJson(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function writeJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (_) {
      /* quota or private mode — the feed still works, it just re-fetches */
    }
  }

  /* ---------------- formatting ---------------- */

  function relativeTime(iso) {
    const then = Date.parse(iso);
    if (!Number.isFinite(then)) return '';
    const seconds = Math.round((then - Date.now()) / 1000);
    const units = [['year', 31536000], ['month', 2592000], ['week', 604800],
                   ['day', 86400], ['hour', 3600], ['minute', 60]];
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    for (const [unit, secs] of units) {
      if (Math.abs(seconds) >= secs) return rtf.format(Math.round(seconds / secs), unit);
    }
    return rtf.format(seconds, 'second');
  }

  // PT1H2M10S -> 3730. Returns NaN for anything unparseable so the caller can
  // tell "no duration" apart from "zero seconds".
  function parseIsoDuration(value) {
    const m = /^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(String(value || ''));
    if (!m) return NaN;
    return (Number(m[1] || 0) * 86400) + (Number(m[2] || 0) * 3600) +
           (Number(m[3] || 0) * 60) + Number(m[4] || 0);
  }

  function formatDuration(seconds) {
    if (!Number.isFinite(seconds) || seconds <= 0) return '';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const pad = (n) => String(n).padStart(2, '0');
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
  }

  function stampTime(ms) {
    return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  /* ---------------- panel state ---------------- */

  // One place decides what the panel says, so the scope line, the stamp and the
  // controls can never disagree about whether there is a feed.
  function renderChrome() {
    const connected = channels.length > 0;

    if (!connected) {
      scopeEl.textContent = 'Not connected';
    } else if (videos.length) {
      scopeEl.textContent = `${channels.length} channel${channels.length === 1 ? '' : 's'} · ${videos.length} video${videos.length === 1 ? '' : 's'} · Shorts and live hidden`;
    } else {
      scopeEl.textContent = `${channels.length} channel${channels.length === 1 ? '' : 's'}`;
    }

    asofEl.textContent = Number.isFinite(fetchedAt) ? `As of ${stampTime(fetchedAt)}` : '';

    refreshBtn.hidden = !connected;
    resyncBtn.hidden = !connected;
    disconnectBtn.hidden = !connected;
    refreshBtn.disabled = busy;
    resyncBtn.disabled = busy;
  }

  function showState(title, note, actions = []) {
    stateTitleEl.textContent = title;
    stateNoteEl.textContent = note;
    stateActionsEl.replaceChildren();
    actions.forEach(({ label, onClick, href }) => {
      if (href) {
        const link = document.createElement('a');
        link.className = 'home-button subs-state-btn';
        link.href = href;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = label;
        stateActionsEl.appendChild(link);
        return;
      }
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'home-button subs-state-btn';
      button.textContent = label;
      button.addEventListener('click', onClick);
      stateActionsEl.appendChild(button);
    });
    stateEl.hidden = false;
  }

  function clearState() {
    stateEl.hidden = true;
  }

  /* ---------------- YouTube API ---------------- */

  // Private reads. Straight to Google with the reader's own OAuth token — the
  // proxy is not in this path and never sees a token.
  const apiGet = (path, params) =>
    request(new URL(`https://www.googleapis.com/youtube/v3/${path}`), params);

  // Public reads. Through the Worker, which adds the key at its end. The
  // operation names are the Worker's, not Google's: /uploads and /videos.
  function proxyGet(operation, params) {
    if (!YOUTUBE_PROXY_URL) throw Object.assign(new Error('No proxy configured'), { noProxy: true });
    return request(new URL(`${String(YOUTUBE_PROXY_URL).replace(/\/+$/, '')}/${operation}`), params);
  }

  async function request(url, params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
    });

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let response;
    try {
      response = await fetch(url, { signal: controller.signal });
    } finally {
      window.clearTimeout(timeoutId);
    }

    if (response.ok) return response.json();

    // The reason matters more than the status: 403 is both "your key is not
    // allowed here" and "you are out of quota for the day", and those need
    // different things from the reader.
    let payload = null;
    try { payload = await response.json(); } catch (_) { /* not JSON */ }
    const reason = payload?.error?.errors?.[0]?.reason || '';
    const error = new Error(payload?.error?.message || `YouTube API error ${response.status}`);
    error.status = response.status;
    error.reason = reason;
    throw error;
  }

  /* ---------------- subscription import (OAuth) ---------------- */

  // Google sends the token back to whichever URI is asked for, so asking for the
  // production one from a local checkout would hand the result to the live site
  // and leave the tab you are testing in empty-handed. The configured value is
  // therefore only used when this page is actually being served from it; anywhere
  // else the redirect comes back here. Both origins have to be registered on the
  // OAuth client for their respective sign-ins to be accepted.
  function configuredRedirectOrigin() {
    const configured = String(YOUTUBE_SUBS_REDIRECT_URI || '').trim();
    if (!configured) return '';
    try {
      return new URL(configured).origin;
    } catch (_) {
      return '';
    }
  }

  function oauthRedirectUri() {
    const here = new URL(window.location.href);
    const configured = String(YOUTUBE_SUBS_REDIRECT_URI || '').trim();

    if (configured) {
      try {
        const parsed = new URL(configured);
        if (parsed.origin === here.origin) return parsed.origin + parsed.pathname;
      } catch (_) { /* misconfigured — fall through to this page */ }
    }

    // Never a query or a fragment: Google matches the registered URI exactly.
    return here.origin + here.pathname;
  }

  function startImport() {
    if (!YOUTUBE_CLIENT_ID) {
      showState(
        'No OAuth client configured',
        'Set YOUTUBE_CLIENT_ID in assets/js/config.js, then reload this page.'
      );
      return;
    }

    // Sending Google a redirect_uri it does not have on file produces a bare
    // "Error 400: redirect_uri_mismatch" page with no way back. Saying so here is
    // more use than letting the reader find that out from Google.
    const configuredOrigin = configuredRedirectOrigin();
    if (configuredOrigin && configuredOrigin !== window.location.origin) {
      showState(
        'Sign-in only works on the deployed site',
        `This copy is being served from ${window.location.origin}, but the Google sign-in is registered against ${configuredOrigin}. Open the page there to connect — the subscription list is stored per browser, so connecting there does not carry over to here.`,
        [{ label: 'Open the deployed page ↗', href: `${configuredOrigin}/media-portal/` }]
      );
      return;
    }

    const state = `subs_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    try {
      sessionStorage.setItem(OAUTH_STATE_KEY, state);
    } catch (_) {
      showState('Cannot start sign-in', 'This browser is blocking session storage, which the sign-in needs to verify the response it gets back.');
      return;
    }

    const auth = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    auth.searchParams.set('client_id', YOUTUBE_CLIENT_ID);
    auth.searchParams.set('redirect_uri', oauthRedirectUri());
    auth.searchParams.set('response_type', 'token');
    auth.searchParams.set('scope', 'https://www.googleapis.com/auth/youtube.readonly');
    auth.searchParams.set('state', state);
    // Read-only, one-shot: there is nothing to keep signed in afterwards.
    auth.searchParams.set('include_granted_scopes', 'false');
    window.location.href = auth.toString();
  }

  // Returns the token from the redirect fragment, or null. Consumes the fragment
  // either way so a reload cannot replay it and the token never sits in history.
  // Returns {token} on success, {error} when Google refused, or null when this
  // was an ordinary page load. Refusals matter as much as grants: an account that
  // is not on the OAuth client's test-user list is turned away by Google, not by
  // this page, and without reading the error back the reader would be left with a
  // panel that just said "Not connected" after being sent away and returned.
  function takeTokenFromUrl() {
    const hash = window.location.hash || '';
    if (!hash.includes('access_token=') && !hash.includes('error=')) return null;

    const params = new URLSearchParams(hash.slice(1));
    const token = params.get('access_token');
    const error = params.get('error');
    const returned = params.get('state') || '';
    let expected = '';
    try {
      expected = sessionStorage.getItem(OAUTH_STATE_KEY) || '';
      sessionStorage.removeItem(OAUTH_STATE_KEY);
    } catch (_) { /* nothing to compare against */ }

    // Consume the fragment either way, so a reload cannot replay a token and a
    // failed attempt does not keep reporting itself.
    history.replaceState(null, '', window.location.pathname);

    if (error) return { error };
    // An unmatched state means this response was not asked for by this tab.
    if (!token || !returned || !expected || returned !== expected) return null;
    return { token };
  }

  // Google's error codes are terse and the reason a person is blocked is almost
  // never the one they would guess, so each is spelled out.
  function showAuthError(code) {
    const messages = {
      access_denied: ['Sign-in was declined',
        'Either you dismissed Google’s consent screen, or this Google account is not on the app’s test-user list. An app still in Testing only lets accounts its owner has added sign in.'],
      admin_policy_enforced: ['Blocked by a Workspace policy',
        'The Google Workspace administrator for this account does not allow it to grant YouTube access to third-party apps. A personal Google account will work.'],
      org_internal: ['Account outside this app’s organisation',
        'This OAuth client only accepts accounts from the organisation that owns it.']
    };
    const [title, note] = messages[code] || ['Sign-in failed', `Google returned “${code}”.`];
    showState(title, note, [{ label: 'Try again', onClick: startImport }]);
  }

  async function importSubscriptions(token) {
    const collected = [];
    let pageToken = '';

    do {
      const data = await apiGet('subscriptions', {
        part: 'snippet',
        mine: 'true',
        maxResults: '50',
        pageToken,
        access_token: token
      });
      (data.items || []).forEach((item) => {
        const channelId = item?.snippet?.resourceId?.channelId;
        if (!channelId) return;
        collected.push({ id: channelId, title: item?.snippet?.title || 'Channel' });
      });
      pageToken = data.nextPageToken || '';
      scopeEl.textContent = `Importing subscriptions… ${collected.length} found`;
    } while (pageToken);

    // Same channel can appear twice across pages if subscriptions change mid-walk.
    const seen = new Set();
    return collected.filter((c) => (seen.has(c.id) ? false : seen.add(c.id)));
  }

  /* ---------------- video fetch (API key) ---------------- */

  // Every channel's uploads live in a playlist whose id is the channel id with
  // its UC prefix swapped for UU. Using it directly saves a channels.list call
  // per channel, which on 80 subscriptions is 80 requests and 80 quota units.
  const uploadsPlaylistId = (channelId) =>
    /^UC/.test(channelId) ? `UU${channelId.slice(2)}` : '';

  async function fetchChannelUploads(channel) {
    const playlistId = uploadsPlaylistId(channel.id);
    if (!playlistId) return [];

    const data = await proxyGet('uploads', {
      playlistId,
      maxResults: String(PER_CHANNEL)
    });

    return (data.items || []).map((item) => ({
      id: item?.contentDetails?.videoId || '',
      title: item?.snippet?.title || 'Untitled',
      channelTitle: channel.title,
      channelId: channel.id,
      publishedAt: item?.contentDetails?.videoPublishedAt || item?.snippet?.publishedAt || '',
      thumb: item?.snippet?.thumbnails?.medium?.url || item?.snippet?.thumbnails?.default?.url || ''
    })).filter((v) => v.id);
  }

  // playlistItems carries no duration and no live flag, so the filtering the feed
  // promises can only happen here. 50 ids per call is the API's ceiling and one
  // quota unit, so this costs 2 calls for a 60-video feed rather than 60.
  async function hydrateDetails(list) {
    const byId = new Map(list.map((v) => [v.id, v]));
    const ids = [...byId.keys()];

    for (let i = 0; i < ids.length; i += 50) {
      const batch = ids.slice(i, i + 50);
      const data = await proxyGet('videos', {
        id: batch.join(',')
      });
      (data.items || []).forEach((item) => {
        const video = byId.get(item.id);
        if (!video) return;
        video.seconds = parseIsoDuration(item?.contentDetails?.duration);
        video.live = item?.snippet?.liveBroadcastContent || 'none';
        video.hasLiveDetails = Boolean(item?.liveStreamingDetails);
        video.hydrated = true;
      });
    }

    // A video the details pass never returned is deleted, private or region
    // blocked. Dropping it is right: it cannot be filtered or played.
    return list.filter((v) => v.hydrated);
  }

  function isWanted(video) {
    if (video.live === 'live' || video.live === 'upcoming') return false;
    // A finished stream keeps its liveStreamingDetails and is a normal video
    // afterwards, so only the in-progress states above are excluded by it.
    if (Number.isFinite(video.seconds) && video.seconds <= SHORT_MAX_SECONDS) return false;
    return true;
  }

  async function loadVideos({ force = false } = {}) {
    if (!channels.length) return;

    if (!YOUTUBE_PROXY_URL) {
      showState(
        'No proxy configured',
        'Uploads are public, but Google still wants a key naming who is asking, and this site does not carry one — it asks a Cloudflare Worker that holds the key instead. Deploy the Worker in worker/ and set YOUTUBE_PROXY_URL in assets/js/config.js.'
      );
      return;
    }

    const cached = readJson(VIDEOS_KEY);
    if (!force && cached && Array.isArray(cached.items) && Date.now() - cached.fetchedAt < VIDEO_CACHE_TTL_MS) {
      videos = cached.items;
      fetchedAt = cached.fetchedAt;
      clearState();
      renderChrome();
      renderGrid();
      return;
    }

    busy = true;
    renderChrome();
    clearState();
    if (!videos.length) gridEl.replaceChildren(loadingNote('Reading uploads…'));

    try {
      // One channel going dark thins the list rather than emptying it.
      const settled = await Promise.all(channels.map(async (channel) => {
        try {
          return await fetchChannelUploads(channel);
        } catch (err) {
          if (err.status === 403 || err.status === 429) throw err;
          return [];
        }
      }));

      let merged = settled.flat();
      if (!merged.length) throw new Error('No uploads came back from any subscribed channel.');

      merged.sort((a, b) => (Date.parse(b.publishedAt) || 0) - (Date.parse(a.publishedAt) || 0));
      // Hydrate more than the cap, because filtering is about to remove some.
      merged = await hydrateDetails(merged.slice(0, MAX_CARDS * 3));
      merged = merged.filter(isWanted).slice(0, MAX_CARDS);

      videos = merged;
      fetchedAt = Date.now();
      writeJson(VIDEOS_KEY, { fetchedAt, items: videos });
      clearState();
      renderGrid();
    } catch (err) {
      handleVideoError(err, cached);
    } finally {
      busy = false;
      renderChrome();
    }
  }

  // Serving a stale feed under its real timestamp beats an empty panel: the
  // stamp already says how old it is, which is the whole reason it is there.
  function handleVideoError(err, cached) {
    if (cached && Array.isArray(cached.items) && cached.items.length) {
      videos = cached.items;
      fetchedAt = cached.fetchedAt;
      renderGrid();
    } else {
      gridEl.replaceChildren();
    }

    if (err.reason === 'quotaExceeded' || err.reason === 'dailyLimitExceeded') {
      showState(
        'Daily API quota spent',
        'YouTube allows a fixed number of requests per day and today’s are used up. It resets at midnight Pacific. Anything below is the last feed that loaded.'
      );
      return;
    }

    if (err.status === 403) {
      showState(
        'Request refused',
        `The proxy or YouTube refused the request${err.reason ? ` (${err.reason})` : ''}. A 403 from the proxy means this origin is not in its allow-list; a 403 from YouTube means the key it holds was rejected.`
      );
      return;
    }

    if (err.status === 404) {
      showState(
        'Proxy did not recognise the request',
        'The Worker answers only the two operations this page needs. A 404 usually means YOUTUBE_PROXY_URL points at something else, or the deployed Worker is an older version.'
      );
      return;
    }

    showState('Could not load videos', err.message || 'The request to YouTube failed.');
  }

  /* ---------------- rendering ---------------- */

  function loadingNote(text) {
    const p = document.createElement('p');
    p.className = 'subs-note';
    p.textContent = text;
    return p;
  }

  function renderGrid() {
    gridEl.replaceChildren();
    if (!videos.length) return;

    const frag = document.createDocumentFragment();
    videos.forEach((video) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'subs-card';
      card.dataset.videoId = video.id;
      card.setAttribute('aria-label', `Play ${video.title} from ${video.channelTitle}`);

      const shot = document.createElement('span');
      shot.className = 'subs-card-shot';
      if (video.thumb) {
        const img = document.createElement('img');
        img.src = video.thumb;
        img.alt = '';
        img.loading = 'lazy';
        img.decoding = 'async';
        shot.appendChild(img);
      }
      const duration = formatDuration(video.seconds);
      if (duration) {
        const badge = document.createElement('span');
        badge.className = 'subs-card-duration';
        badge.textContent = duration;
        shot.appendChild(badge);
      }
      card.appendChild(shot);

      const title = document.createElement('span');
      title.className = 'subs-card-title';
      title.textContent = video.title;
      card.appendChild(title);

      const channel = document.createElement('span');
      channel.className = 'subs-card-channel';
      channel.textContent = video.channelTitle;
      card.appendChild(channel);

      const age = document.createElement('span');
      age.className = 'subs-card-age';
      age.textContent = relativeTime(video.publishedAt);
      card.appendChild(age);

      frag.appendChild(card);
    });
    gridEl.appendChild(frag);
  }

  /* ---------------- player ---------------- */

  function openPlayer(video) {
    // Rebuilt rather than reusing one iframe with a new src: pointing an existing
    // YouTube embed at another video leaves the previous one's state behind and
    // adds a history entry for every card you click.
    playerFrameEl.replaceChildren();
    const frame = document.createElement('iframe');
    // cc_load_policy=3 is undocumented but keeps YouTube from auto-enabling
    // captions from the viewer's account preference; 0 does not.
    frame.src = `https://www.youtube.com/embed/${encodeURIComponent(video.id)}?autoplay=1&rel=0&modestbranding=1&playsinline=1&cc_load_policy=3`;
    frame.title = video.title;
    frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    frame.allowFullscreen = true;
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    playerFrameEl.appendChild(frame);

    playerTitleEl.textContent = video.title;
    playerChannelEl.textContent = video.channelTitle;
    playerOpenEl.href = `https://www.youtube.com/watch?v=${encodeURIComponent(video.id)}`;
    playerEl.hidden = false;
    setPip(false);
    pipObserver.observe(playerSlotEl);

    gridEl.querySelectorAll('.subs-card.is-playing').forEach((c) => c.classList.remove('is-playing'));
    const card = gridEl.querySelector(`.subs-card[data-video-id="${CSS.escape(video.id)}"]`);
    if (card) card.classList.add('is-playing');

    // The whole page rather than the player. scrollIntoView pins the player's top
    // edge to the top of the viewport, which pushes the header off-screen — you
    // lose the nav and the panel legend the moment you start watching. The player
    // is already the first thing under the header, so going to the top of the
    // document puts it on screen with the chassis still around it.
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function closePlayer() {
    setTheater(false);
    setPip(false);
    // Emptying the frame is what stops playback; hiding the panel alone leaves
    // the audio running.
    pipObserver.unobserve(playerSlotEl);
    playerFrameEl.replaceChildren();
    playerEl.hidden = true;
    gridEl.querySelectorAll('.subs-card.is-playing').forEach((c) => c.classList.remove('is-playing'));
  }

  // A class on the body and nothing else. Touching the iframe — moving it in the
  // DOM or re-setting its src — would restart the video from zero on every toggle.
  function setTheater(on) {
    if (on) setPip(false);
    document.body.classList.toggle('subs-theater-mode', Boolean(on));
    playerTheaterEl.textContent = on ? 'Default View' : 'Theater Mode';
  }

  const inTheater = () => document.body.classList.contains('subs-theater-mode');

  // Corner player. Same rule as theater mode: a class on the body and nothing
  // else. Re-parenting the iframe to a floating container is the obvious way to
  // build this and the one that cannot work — moving an iframe in the DOM
  // reloads it, so the video would restart every time you scrolled past it.
  //
  // The slot keeps the vacated space. Freezing its height before the player goes
  // fixed is what stops the grid jumping up under the pointer mid-scroll.
  function setPip(on) {
    const next = Boolean(on);
    if (next === document.body.classList.contains('subs-pip')) return;

    if (next) {
      // getBoundingClientRect, not offsetHeight: the latter rounds to whole
      // pixels and the panel's real height is fractional, so freezing the
      // rounded value shifted everything below it by a pixel.
      playerSlotEl.style.height = `${playerSlotEl.getBoundingClientRect().height}px`;
      document.body.classList.add('subs-pip');
    } else {
      document.body.classList.remove('subs-pip');
      playerSlotEl.style.height = '';
    }
  }

  // Watches the slot rather than the player, because once the player is fixed it
  // is always on screen and would immediately undo the condition that put it
  // there. The slot stays in the flow and keeps telling the truth about where
  // the video belongs.
  const pipObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      // Theater mode owns the whole viewport; a corner player inside it is a
      // second copy of a control that is already full screen.
      if (playerEl.hidden || inTheater()) return;
      setPip(!entry.isIntersecting);
    });
  }, { threshold: 0 });

  /* ---------------- flows ---------------- */

  async function runImport(token) {
    busy = true;
    renderChrome();
    clearState();
    gridEl.replaceChildren(loadingNote('Reading your subscriptions…'));

    try {
      const imported = await importSubscriptions(token);
      if (!imported.length) {
        showState('No subscriptions found', 'That account is not subscribed to any channels, so there is nothing to build a feed from.');
        gridEl.replaceChildren();
        return;
      }
      channels = imported;
      writeJson(SUBS_KEY, channels);
      // The token has done its one job. Keeping it would mean holding a live
      // Google session for a page that never needs one again.
      await loadVideos({ force: true });
    } catch (err) {
      gridEl.replaceChildren();
      if (err.status === 401) {
        showState('Sign-in expired', 'Google’s response was no longer valid by the time it was used. Connecting again should work.',
          [{ label: 'Connect YouTube', onClick: startImport }]);
      } else {
        showState('Could not read subscriptions', err.message || 'The request to YouTube failed.',
          [{ label: 'Try again', onClick: startImport }]);
      }
    } finally {
      busy = false;
      renderChrome();
    }
  }

  function showDisconnected() {
    closePlayer();
    gridEl.replaceChildren();
    showState(
      'Not connected',
      'Sign in with Google once to import the list of channels you subscribe to. The list is stored in this browser only, and the sign-in is discarded straight after — the videos themselves are public and need no account.',
      [{ label: 'Connect YouTube', onClick: startImport }]
    );
  }

  function disconnect() {
    channels = [];
    videos = [];
    fetchedAt = null;
    try {
      localStorage.removeItem(SUBS_KEY);
      localStorage.removeItem(VIDEOS_KEY);
    } catch (_) { /* nothing stored */ }
    renderChrome();
    showDisconnected();
  }

  /* ---------------- wiring ---------------- */

  gridEl.addEventListener('click', (event) => {
    const card = event.target.closest('.subs-card');
    if (!card) return;
    const video = videos.find((v) => v.id === card.dataset.videoId);
    if (video) openPlayer(video);
  });

  playerCloseEl.addEventListener('click', closePlayer);
  playerTheaterEl.addEventListener('click', () => setTheater(!inTheater()));
  playerTheaterExitEl.addEventListener('click', () => setTheater(false));
  playerExpandEl.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (inTheater()) setTheater(false);
    else if (!playerEl.hidden) closePlayer();
  });

  refreshBtn.addEventListener('click', () => loadVideos({ force: true }));
  resyncBtn.addEventListener('click', startImport);
  disconnectBtn.addEventListener('click', disconnect);

  const authResult = takeTokenFromUrl();
  renderChrome();

  if (authResult && authResult.error) {
    gridEl.replaceChildren();
    showAuthError(authResult.error);
  } else if (authResult && authResult.token) {
    runImport(authResult.token);
  } else if (channels.length) {
    loadVideos();
  } else {
    showDisconnected();
  }
})();
