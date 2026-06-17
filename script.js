const tvTickerInputs = [
  document.getElementById('tvTicker0'),
  document.getElementById('tvTicker1'),
  document.getElementById('tvTicker2'),
  document.getElementById('tvTicker3')
];
// Removed unused statusText const
const defaultTvTickers = ['googl', 'spcx', 'AMEX:SPY', 'BTCUSD'];

function setStatus(message) {
  // Status bar removed
}

function normalizeTradingViewSymbol(symbol) {
  return symbol.trim().toUpperCase();
}
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

function createTradingViewWidget(index, symbol) {
  const container = document.getElementById(`tvWidget${index}`);
  if (!container) return;

  const media = parseMediaSource(symbol);
  container.innerHTML = ''; // Clear previous content

  if (media) {
    const iframe = document.createElement('iframe');
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = '0';

    if (media.type === 'youtube') {
      const youtubeSrc = getYouTubeEmbedUrl(media.id);
      if (youtubeSrc) {
        iframe.src = youtubeSrc;
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen';
        container.appendChild(iframe);
      }
    } else if (media.type === 'twitch') {
      const twitchSrc = getTwitchEmbedUrl(media);
      if (twitchSrc) {
        iframe.src = twitchSrc;
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen';
        container.appendChild(iframe);
      }
    } else if (media.type === 'youtube_tv') {
      iframe.src = `https://tv.youtube.com/watch/${media.id}`;
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen';
      container.appendChild(iframe);
    }
  } else {
    // Official TradingView Widget
  const widgetContainer = document.createElement('div');
  widgetContainer.className = 'tradingview-widget-container';
    widgetContainer.style.height = '100%';
    widgetContainer.style.width = '100%';
  container.appendChild(widgetContainer);

  const script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
  script.async = true;
  script.textContent = JSON.stringify({
    "autosize": true,
    "symbol": symbol || "NASDAQ:AAPL",
    "interval": "1",
      "timezone": Intl.DateTimeFormat().resolvedOptions().timeZone,
    "theme": "dark",
    "style": "1",
    "locale": "en",
    "allow_symbol_change": true,
    "calendar": true,
    "support_host": "https://www.tradingview.com"
  });
  widgetContainer.appendChild(script);
}
}

function renderDefaultTradingViewWidgets() {
  defaultTvTickers.forEach((symbol, index) => {
    if (tvTickerInputs[index]) {
      tvTickerInputs[index].value = '';
    }
    createTradingViewWidget(index, symbol);
  });
}

function initializeTradingViewPage() {
  const tradingviewGrid = document.getElementById('tradingviewGrid');
  if (tradingviewGrid) {
    tradingviewGrid.classList.add('show');
  }
  renderDefaultTradingViewWidgets();
  // Removed setStatus call

  const updatePanel = (index) => {
    const symbolInput = tvTickerInputs[index];
    const symbol = symbolInput ? symbolInput.value.trim() : '';

    // Check if the input is in "Loaded: " state and revert it if necessary
    const actualSymbol = symbol.startsWith("Loaded: ") ? symbolInput.dataset.lastInput : symbol;
    if (actualSymbol) {
      // Save current input to data attribute
      symbolInput.dataset.lastInput = actualSymbol;
      symbolInput.value = "You are Watching: " + actualSymbol;
      createTradingViewWidget(index, actualSymbol);
    }
  };

  // Add focus behavior to clear "You are Watching: " text
  tvTickerInputs.forEach((input, index) => {
    if (input) {
      input.addEventListener('focus', function() {
        if (this.dataset.lastInput) {
          this.value = this.dataset.lastInput;
        }
      });

      input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          updatePanel(index);
        }
      });
    }
  });

  document.querySelectorAll('.tv-panel-header button').forEach((button) => {
    button.addEventListener('click', () => {
      const panelIndex = Number(button.dataset.panel);
      // Fixed the identification: Checking by title attribute is safer
      if (button.getAttribute('title') === 'Search YouTube/Twitch') {
        const symbolInput = tvTickerInputs[panelIndex];
        const query = symbolInput ? symbolInput.value.trim() : '';
        if (query) {
          const searchUrl = `https://search.brave.com/search?q=${encodeURIComponent(query)}`;
          window.open(searchUrl, '_blank');
        }
      } else {
      updatePanel(panelIndex);
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', initializeTradingViewPage);

