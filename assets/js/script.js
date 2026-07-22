function getYouTubeEmbedUrl(videoId) {
  if (!videoId) return null;

  const params = new URLSearchParams({
    rel: '0',
    modestbranding: '1',
    autoplay: '1',
    controls: '1',
    mute: '1',
    playsinline: '1'
  });

  if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
    params.set('origin', window.location.origin);
  } else {
    return null;
  }

  return `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?${params.toString()}`;
}

function getTwitchEmbedUrl({ channel, videoId }) {
  const parentHost = window.location.hostname;
  if (!parentHost || window.location.protocol === 'file:') {
    return null;
  }

  const params = new URLSearchParams({
    parent: parentHost,
    autoplay: 'true',
    muted: 'true'
  });
  if (videoId) {
    params.set('video', `v${videoId}`);
  } else if (channel) {
    params.set('channel', channel);
  }
  return `https://player.twitch.tv/?${params.toString()}`;
}

function parseMediaSource(value) {
  const cleaned = value.trim();
  if (!cleaned) return null;

  const plainYoutubeId = cleaned.match(/^[A-Za-z0-9_-]{11}$/);
  if (plainYoutubeId) {
    return { type: 'youtube', id: cleaned };
  }

  let urlString = cleaned;
  if (!/^https?:\/\//i.test(urlString)) {
    urlString = `https://${urlString}`;
  }

  try {
    const url = new URL(urlString);
    const hostname = url.hostname.toLowerCase();

    if (hostname.endsWith('youtu.be')) {
      const id = url.pathname.replace(/^\/+/, '');
      if (id) return { type: 'youtube', id };
    }

    if (hostname.includes('tv.youtube.com')) {
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts[0] === 'watch' && parts[1]) {
        return { type: 'youtube_tv', id: parts[1] };
      }
    }

    if (hostname.includes('youtube.com') || hostname.includes('youtube-nocookie.com')) {
      if (url.pathname.startsWith('/watch')) {
        const id = url.searchParams.get('v');
        if (id) return { type: 'youtube', id };
      }
      if (url.pathname.startsWith('/live/')) {
        const id = url.pathname.split('/')[2];
        if (id) return { type: 'youtube', id };
      }
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts[0] === 'embed' && parts[1]) {
        return { type: 'youtube', id: parts[1] };
      }
      if (parts[0] === 'shorts' && parts[1]) {
        return { type: 'youtube', id: parts[1] };
      }
      if (parts[0] === 'v' && parts[1]) {
        return { type: 'youtube', id: parts[1] };
      }
    }

    if (hostname === 'clips.twitch.tv') {
      const clipSlug = url.pathname.replace(/^\/+/, '');
      if (clipSlug) return { type: 'twitch', channel: null, videoId: clipSlug };
    }

    if (hostname.includes('twitch.tv')) {
      const pathParts = url.pathname.replace(/^\/+/, '').split('/');
      if (pathParts[0] === 'videos' && pathParts[1]) {
        return { type: 'twitch', videoId: pathParts[1] };
      }
      if (pathParts[0]) {
        return { type: 'twitch', channel: pathParts[0].toLowerCase() };
      }
    }
  } catch (error) {
    return null;
  }

  return null;
}

function registerAppServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  if (!window.isSecureContext) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('Service worker registration failed:', error);
    });
  });
}

function isStandaloneMode() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function enableStandaloneSameWindowLinks() {
  if (!isStandaloneMode()) return;

  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href]');
    if (!link) return;
    if (link.target !== '_blank') return;

    const href = link.getAttribute('href');
    if (!href || href.startsWith('#')) return;

    let url;
    try {
      url = new URL(href, window.location.href);
    } catch (_) {
      return;
    }

    if (!/^https?:$/i.test(url.protocol)) return;

    event.preventDefault();
    window.location.assign(url.href);
  });
}

function hardenNewTabTargets(root = document) {
  const elements = root.querySelectorAll('a[target="_blank"], form[target="_blank"]');
  elements.forEach((element) => {
    const rel = (element.getAttribute('rel') || '')
      .split(/\s+/)
      .filter(Boolean);
    if (!rel.includes('noopener')) rel.push('noopener');
    if (!rel.includes('noreferrer')) rel.push('noreferrer');
    element.setAttribute('rel', rel.join(' '));
  });
}

registerAppServiceWorker();
enableStandaloneSameWindowLinks();
if (document.readyState === 'loading') {
  // Wrapped, not passed by reference: the listener is handed an Event, which
  // would arrive as this function's `root` parameter and shadow `document`.
  document.addEventListener('DOMContentLoaded', () => hardenNewTabTargets());
} else {
  hardenNewTabTargets();
}

