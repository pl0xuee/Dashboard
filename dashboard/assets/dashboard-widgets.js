if (!window.__dashboardWidgetsInitialized) {
  window.__dashboardWidgetsInitialized = true;

  const defaultTvTickers = ['GOOGL', 'SPCX', 'SPY', 'BTCUSD'];
  const PACIFIC_TIME_ZONE = 'America/Los_Angeles';
  const CHART_WINDOW_SECONDS = 24 * 60 * 60;
  const CHART_HISTORY_RANGE = '2d';
  const CHART_REFRESH_MS = 5 * 1000;
  const DEFAULT_PANEL_STAGGER_MS = 260;
  const INITIAL_YAHOO_REQUEST_SPACING_MS = 1000;
  const YAHOO_REQUEST_SPACING_MS = 2400;
  const CHART_CACHE_TTL_MS = 15 * 60 * 1000;
  const CHART_CACHE_KEY_PREFIX = 'dashboardChartCache:v2:';
  const YAHOO_SYMBOL_MAP = {
    BTCUSD: 'BTC-USD',
    ETHUSD: 'ETH-USD',
    SOLUSD: 'SOL-USD'
  };
  let yahooRequestQueue = Promise.resolve();
  let yahooLastRequestAt = 0;
  let dashboardTheaterMode = false;
  let dashboardTheaterScope = 'all';
  let dashboardTheaterPanelIndex = null;
  let dashboardTheaterMenuPanelIndex = null;
  const dashboardChartsByPanel = new Map();
  let dashboardResizeRaf = 0;

  function getDashboardPanels() {
    return Array.from(document.querySelectorAll('.tv-panel'));
  }

  function clearDashboardTheaterPanelTargets() {
    getDashboardPanels().forEach((panel) => panel.classList.remove('dashboard-theater-target'));
  }

  function applyDashboardTheaterPanelTarget() {
    clearDashboardTheaterPanelTargets();
    if (!dashboardTheaterMode || dashboardTheaterScope !== 'panel' || !Number.isInteger(dashboardTheaterPanelIndex)) {
      return;
    }

    const targetPanel = getDashboardPanels()[dashboardTheaterPanelIndex];
    if (targetPanel) {
      targetPanel.classList.add('dashboard-theater-target');
    }
  }

  function closeDashboardTheaterMenu() {
    const menu = document.getElementById('dashboardTheaterMenu');
    if (!menu) return;
    menu.hidden = true;
    menu.style.top = '';
    menu.style.left = '';
    dashboardTheaterMenuPanelIndex = null;
  }

  function openDashboardTheaterMenu(anchorButton, panelIndex) {
    const menu = document.getElementById('dashboardTheaterMenu');
    if (!menu || !anchorButton) return;

    dashboardTheaterMenuPanelIndex = panelIndex;
    menu.hidden = false;

    const rect = anchorButton.getBoundingClientRect();
    const menuWidth = 170;
    const viewportPadding = 10;
    const unclampedLeft = rect.right - menuWidth;
    const left = Math.max(viewportPadding, Math.min(unclampedLeft, window.innerWidth - menuWidth - viewportPadding));
    menu.style.top = `${Math.round(rect.bottom + 8)}px`;
    menu.style.left = `${Math.round(left)}px`;
  }

  function unregisterDashboardChart(index) {
    const existing = dashboardChartsByPanel.get(index);
    if (existing && existing.chart && typeof existing.chart.remove === 'function') {
      existing.chart.remove();
    }
    dashboardChartsByPanel.delete(index);
  }

  function resizeDashboardChartsNow() {
    dashboardChartsByPanel.forEach(({ chart, chartDiv }) => {
      if (!chart || !chartDiv || !chartDiv.isConnected) return;

      const width = Math.floor(chartDiv.clientWidth);
      const height = Math.floor(chartDiv.clientHeight);
      if (width <= 0 || height <= 0) return;

      if (typeof chart.resize === 'function') {
        chart.resize(width, height);
      } else {
        chart.applyOptions({ width, height });
      }
    });
  }

  function scheduleDashboardChartsResize() {
    if (dashboardResizeRaf) {
      cancelAnimationFrame(dashboardResizeRaf);
    }

    dashboardResizeRaf = requestAnimationFrame(() => {
      dashboardResizeRaf = 0;
      resizeDashboardChartsNow();
    });
  }

  function updateDashboardTheaterModeButton() {
    const theaterButtons = document.querySelectorAll('.dashboard-theater-toggle-btn');
    theaterButtons.forEach((button) => {
      const buttonPanelIndex = Number(button.dataset.panel);
      const isTargetedPanel = dashboardTheaterMode
        && dashboardTheaterScope === 'panel'
        && buttonPanelIndex === dashboardTheaterPanelIndex;
      const isAllMode = dashboardTheaterMode && dashboardTheaterScope === 'all';

      button.textContent = isTargetedPanel || isAllMode ? 'Default View' : 'Theater Mode';
      button.setAttribute('aria-pressed', isTargetedPanel || isAllMode ? 'true' : 'false');
    });
  }

  function setDashboardTheaterMode(nextValue, scope = 'all', panelIndex = null) {
    dashboardTheaterMode = Boolean(nextValue);
    dashboardTheaterScope = scope === 'panel' ? 'panel' : 'all';
    dashboardTheaterPanelIndex = dashboardTheaterScope === 'panel' ? Number(panelIndex) : null;

    document.body.classList.toggle('dashboard-theater-mode', dashboardTheaterMode);
    document.documentElement.classList.toggle('dashboard-theater-mode', dashboardTheaterMode);
    document.body.classList.toggle('dashboard-theater-scope-all', dashboardTheaterMode && dashboardTheaterScope === 'all');
    document.body.classList.toggle('dashboard-theater-scope-panel', dashboardTheaterMode && dashboardTheaterScope === 'panel');
    document.documentElement.classList.toggle('dashboard-theater-scope-all', dashboardTheaterMode && dashboardTheaterScope === 'all');
    document.documentElement.classList.toggle('dashboard-theater-scope-panel', dashboardTheaterMode && dashboardTheaterScope === 'panel');

    applyDashboardTheaterPanelTarget();
    updateDashboardTheaterModeButton();
    closeDashboardTheaterMenu();

    // Layout changes happen across frames when switching theater mode.
    // Resize charts immediately and once more after styles settle.
    scheduleDashboardChartsResize();
    setTimeout(scheduleDashboardChartsResize, 220);
  }

  function toggleDashboardTheaterMode(scope, panelIndex = null) {
    const normalizedScope = scope === 'panel' ? 'panel' : 'all';
    const normalizedPanelIndex = normalizedScope === 'panel' ? Number(panelIndex) : null;
    const isSamePanelMode = normalizedScope === 'panel' && dashboardTheaterScope === 'panel' && dashboardTheaterPanelIndex === normalizedPanelIndex;
    const isSameAllMode = normalizedScope === 'all' && dashboardTheaterScope === 'all';

    if (dashboardTheaterMode && (isSamePanelMode || isSameAllMode)) {
      setDashboardTheaterMode(false, normalizedScope, normalizedPanelIndex);
      return;
    }

    setDashboardTheaterMode(true, normalizedScope, normalizedPanelIndex);
  }

  const pacificAxisFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: PACIFIC_TIME_ZONE,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  const pacificCrosshairFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: PACIFIC_TIME_ZONE,
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
    hour12: true
  });

  function chartTimeToUnixSeconds(timeValue) {
    if (typeof timeValue === 'number') {
      return timeValue;
    }

    if (timeValue && typeof timeValue === 'object') {
      const y = Number(timeValue.year);
      const m = Number(timeValue.month);
      const d = Number(timeValue.day);
      if (Number.isFinite(y) && Number.isFinite(m) && Number.isFinite(d)) {
        return Math.floor(Date.UTC(y, m - 1, d) / 1000);
      }
    }

    return null;
  }

  function formatPacificChartTime(timeValue, formatter) {
    const unixSeconds = chartTimeToUnixSeconds(timeValue);
    if (!Number.isFinite(unixSeconds)) {
      return '';
    }
    return formatter.format(new Date(unixSeconds * 1000));
  }

  function normalizeChartSymbol(symbol) {
    const trimmedSymbol = String(symbol || '').trim().toUpperCase();
    return YAHOO_SYMBOL_MAP[trimmedSymbol] || trimmedSymbol;
  }

  function formatChartPrice(price) {
    if (!Number.isFinite(price)) {
      return 'N/A';
    }

    const fractionDigits = price >= 1000 ? 2 : price >= 1 ? 2 : 6;
    return price.toLocaleString('en-US', {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits
    });
  }

  function formatChartChange(change, changePercent) {
    if (!Number.isFinite(change) || !Number.isFinite(changePercent)) {
      return 'Day change unavailable';
    }

    const sign = change > 0 ? '+' : change < 0 ? '-' : '';
    const magnitude = Math.abs(change).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    const percent = Math.abs(changePercent).toFixed(2);
    const direction = change > 0 ? '▲' : change < 0 ? '▼' : '•';

    return `${direction} ${sign}${magnitude} (${sign}${percent}%)`;
  }

  function updateChartTooltip(toolTip, symbol, candles, result) {
    if (!toolTip) return;

    const lastCandle = candles[candles.length - 1];
    const firstCandle = candles[0];
    const lastPrice = lastCandle && Number.isFinite(lastCandle.close) ? lastCandle.close : NaN;
    const previousClose = Number(result && result.meta && result.meta.previousClose);
    const referencePrice = Number.isFinite(previousClose)
      ? previousClose
      : (firstCandle && Number.isFinite(firstCandle.open) ? firstCandle.open : NaN);
    const change = Number.isFinite(lastPrice) && Number.isFinite(referencePrice) ? lastPrice - referencePrice : NaN;
    const changePercent = Number.isFinite(change) && Number.isFinite(referencePrice) && referencePrice !== 0
      ? (change / referencePrice) * 100
      : NaN;
    const isUp = Number.isFinite(change) && change > 0;
    const isDown = Number.isFinite(change) && change < 0;
    const textColor = isUp ? '#64fbcf' : isDown ? '#ff8a85' : '#e1f2ff';

    toolTip.innerHTML = '';

    const symbolLine = document.createElement('div');
    symbolLine.textContent = `${symbol} · 1m`;
    symbolLine.style.fontSize = '18px';
    symbolLine.style.fontWeight = '800';
    symbolLine.style.lineHeight = '1.15';
    symbolLine.style.color = '#fff';

    const priceLine = document.createElement('div');
    priceLine.textContent = `${formatChartPrice(lastPrice)} ${formatChartChange(change, changePercent)}`;
    priceLine.style.marginTop = '4px';
    priceLine.style.fontSize = '13px';
    priceLine.style.fontWeight = '700';
    priceLine.style.lineHeight = '1.2';
    priceLine.style.color = textColor;

    toolTip.appendChild(symbolLine);
    toolTip.appendChild(priceLine);
  }

  function clearChartInterval(index) {
    const intervalKey = `interval${index}`;
    if (window[intervalKey]) {
      clearInterval(window[intervalKey]);
      delete window[intervalKey];
    }

    const retryKey = `retryTimeout${index}`;
    if (window[retryKey]) {
      clearTimeout(window[retryKey]);
      delete window[retryKey];
    }
  }

  function getTickerInputs() {
    return [
      document.getElementById('tvTicker0'),
      document.getElementById('tvTicker1'),
      document.getElementById('tvTicker2'),
      document.getElementById('tvTicker3')
    ];
  }

  function getYahooChartUrl(symbol) {
    return `https://r.jina.ai/http://https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1m&range=${CHART_HISTORY_RANGE}&includePrePost=true`;
  }

  function getChartCacheKey(symbol) {
    return `${CHART_CACHE_KEY_PREFIX}${normalizeChartSymbol(symbol)}`;
  }

  function getCachedChartData(symbol) {
    try {
      const raw = localStorage.getItem(getChartCacheKey(symbol));
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.candles) || !Array.isArray(parsed.volumes)) {
        return null;
      }

      const ageMs = Date.now() - Number(parsed.updatedAt || 0);
      if (!Number.isFinite(ageMs) || ageMs > CHART_CACHE_TTL_MS) {
        return null;
      }

      return parsed;
    } catch {
      return null;
    }
  }

  function setCachedChartData(symbol, candles, volumes, result) {
    if (!Array.isArray(candles) || candles.length === 0) {
      return;
    }

    try {
      const cachePayload = {
        updatedAt: Date.now(),
        candles,
        volumes,
        resultMeta: {
          meta: result && result.meta
            ? {
                previousClose: Number(result.meta.previousClose),
                currentTradingPeriod: result.meta.currentTradingPeriod || null
              }
            : null
        }
      };
      localStorage.setItem(getChartCacheKey(symbol), JSON.stringify(cachePayload));
    } catch {
      // Ignore storage errors and continue with live-only rendering.
    }
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function scheduleChartRetry(index, symbol, delayMs = 8000) {
    const retryKey = `retryTimeout${index}`;
    if (window[retryKey]) {
      return;
    }

    window[retryKey] = setTimeout(() => {
      delete window[retryKey];

      // If this panel already has rendered data, avoid tearing it down just to retry.
      // Recreating the widget here can cause charts to disappear during repeated 429s.
      if (window[`hasChartData${index}`]) {
        return;
      }

      createTradingViewWidget(index, symbol);
    }, delayMs);
  }

  function queueYahooChartRequest(symbol, spacingMs = YAHOO_REQUEST_SPACING_MS) {
    const requestTask = yahooRequestQueue.then(async () => {
      const waitMs = Math.max(0, spacingMs - (Date.now() - yahooLastRequestAt));
      if (waitMs > 0) {
        await sleep(waitMs);
      }

      yahooLastRequestAt = Date.now();
      const response = await fetch(getYahooChartUrl(symbol));
      const payload = await response.text();
      return { response, payload };
    });

    yahooRequestQueue = requestTask.catch(() => {});
    return requestTask;
  }

  function parseJinaYahooPayload(payload) {
    const marker = 'Markdown Content:\n';
    const markerIndex = payload.indexOf(marker);
    const jsonText = markerIndex >= 0 ? payload.slice(markerIndex + marker.length) : payload;
    return JSON.parse(jsonText.trim());
  }

  function buildChartSeriesFromYahooResult(result) {
    const timestamps = result.timestamp || [];
    const quote = result.indicators && result.indicators.quote && result.indicators.quote[0];
    if (!quote) {
      return { candles: [], volumes: [] };
    }

    const candles = [];
    const volumes = [];

    let previousClose = NaN;

    timestamps.forEach((timestamp, index) => {
      const rawOpen = Number(quote.open && quote.open[index]);
      const rawHigh = Number(quote.high && quote.high[index]);
      const rawLow = Number(quote.low && quote.low[index]);
      const rawClose = Number(quote.close && quote.close[index]);

      // Yahoo can leave the currently-forming minute partially null.
      // Backfill missing values so the latest candle can render immediately.
      const open = Number.isFinite(rawOpen)
        ? rawOpen
        : (Number.isFinite(previousClose) ? previousClose : NaN);
      const close = Number.isFinite(rawClose)
        ? rawClose
        : (Number.isFinite(rawOpen) ? rawOpen : (Number.isFinite(previousClose) ? previousClose : NaN));
      const high = Number.isFinite(rawHigh) ? rawHigh : Math.max(open, close);
      const low = Number.isFinite(rawLow) ? rawLow : Math.min(open, close);

      if (![open, high, low, close].every(Number.isFinite)) {
        return;
      }

      if (open <= 0 || high <= 0 || low <= 0 || close <= 0) {
        return;
      }

      candles.push({
        time: Number(timestamp),
        open,
        high,
        low,
        close
      });

      const volume = Number(quote.volume && quote.volume[index]);
      volumes.push({
        time: Number(timestamp),
        value: Number.isFinite(volume) ? volume : 0,
        color: close >= open ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)'
      });

      previousClose = close;
    });

    return { candles, volumes };
  }

  function getInitialLogicalRange(result, candles) {
    const firstBar = candles[0];
    const lastBar = candles[candles.length - 1];
    if (!firstBar || !lastBar) {
      return null;
    }

    // Default viewport is current regular trading hours; history still includes 48h.
    const periods = result && result.meta && result.meta.currentTradingPeriod;
    const regularStart = periods && periods.regular && Number(periods.regular.start);
    const regularEnd = periods && periods.regular && Number(periods.regular.end);

    const sessionStart = Number.isFinite(regularStart)
      ? regularStart
      : Math.max(firstBar.time, lastBar.time - CHART_WINDOW_SECONDS);
    const sessionEnd = Number.isFinite(regularEnd)
      ? Math.min(regularEnd, lastBar.time)
      : lastBar.time;

    const startIndex = candles.findIndex((bar) => bar.time >= Math.max(firstBar.time, sessionStart));
    const endIndex = Math.max(
      startIndex,
      candles.reduce((lastMatch, bar, index) => (bar.time <= Math.max(sessionStart, sessionEnd) ? index : lastMatch), -1)
    );

    if (startIndex < 0 || endIndex < 0) {
      return null;
    }

    return {
      from: Math.max(0, startIndex - 1),
      to: endIndex + 2
    };
  }

  async function createTradingViewWidget(index, symbol) {
    const container = document.getElementById(`tvWidget${index}`);
    if (!container) return;

    clearChartInterval(index);
    unregisterDashboardChart(index);

    const media = parseMediaSource(symbol);
    container.innerHTML = '';

    if (media) {
      const iframe = document.createElement('iframe');
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = '0';
      iframe.allowFullscreen = true;
      iframe.setAttribute('allowfullscreen', '');
      iframe.setAttribute('webkitallowfullscreen', '');
      iframe.setAttribute('mozallowfullscreen', '');

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
      return;
    }

    const chartDiv = document.createElement('div');
    chartDiv.id = `chart${index}`;
    chartDiv.style.width = '100%';
    chartDiv.style.height = '100%';
    container.appendChild(chartDiv);

    const toolTip = document.createElement('div');
    toolTip.style.position = 'absolute';
    toolTip.style.top = '10px';
    toolTip.style.left = '10px';
    toolTip.style.zIndex = '10';
    toolTip.style.pointerEvents = 'none';
    toolTip.style.padding = '8px 10px';
    toolTip.style.borderRadius = '12px';
    toolTip.style.background = 'rgba(8, 14, 22, 0.72)';
    toolTip.style.backdropFilter = 'blur(8px)';
    toolTip.style.border = '1px solid rgba(184, 214, 255, 0.15)';
    updateChartTooltip(toolTip, symbol, [], null);
    container.appendChild(toolTip);

    const chart = LightweightCharts.createChart(chartDiv, {
      width: chartDiv.clientWidth,
      height: chartDiv.clientHeight,
      layout: { background: { type: 'solid', color: '#080d14' }, textColor: '#c7d5e8' },
      grid: { vertLines: { color: '#1a2431' }, horzLines: { color: '#1a2431' } },
      crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false
      },
      handleScale: {
        axisPressedMouseMove: {
          time: true,
          price: true
        },
        mouseWheel: true,
        pinch: true
      },
      kineticScroll: {
        mouse: true,
        touch: true
      },
      localization: {
        timeFormatter: (time) => formatPacificChartTime(time, pacificCrosshairFormatter)
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        fixLeftEdge: false,
        fixRightEdge: false,
        rightOffset: 2,
        tickMarkFormatter: (time) => formatPacificChartTime(time, pacificAxisFormatter)
      }
    });

    dashboardChartsByPanel.set(index, { chart, chartDiv });

    const candleSeries = chart.addSeries(LightweightCharts.CandlestickSeries, {
      upColor: '#22d6bf',
      downColor: '#ff7e79',
      borderVisible: false,
      wickUpColor: '#22d6bf',
      wickDownColor: '#ff7e79'
    });

    const volumeSeries = chart.addSeries(LightweightCharts.HistogramSeries, {
      color: '#22d6bf',
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume'
    });

    chart.priceScale('right').applyOptions({
      autoScale: true,
      scaleMargins: { top: 0.14, bottom: 0.14 }
    });
    chart.priceScale('volume').applyOptions({
      visible: false,
      autoScale: true,
      scaleMargins: { top: 0.8, bottom: 0 }
    });

    const cachedChartData = getCachedChartData(symbol);
    if (cachedChartData) {
      const cachedResult = cachedChartData.resultMeta || null;
      candleSeries.setData(cachedChartData.candles);
      volumeSeries.setData(cachedChartData.volumes);
      updateChartTooltip(toolTip, symbol, cachedChartData.candles, cachedResult);

      const initialRange = getInitialLogicalRange(cachedResult, cachedChartData.candles);
      if (initialRange) {
        chart.timeScale().setVisibleLogicalRange(initialRange);
      } else {
        chart.timeScale().fitContent();
      }

      window[`hasChartData${index}`] = true;
    }

    const loadSucceeded = await loadChartData(
      symbol,
      candleSeries,
      volumeSeries,
      chart,
      index,
      toolTip,
      {
        allowFallback: !cachedChartData,
        requestSpacingMs: INITIAL_YAHOO_REQUEST_SPACING_MS
      }
    );
    if (!loadSucceeded && !window[`hasChartData${index}`]) {
      return;
    }

    window[`interval${index}`] = setInterval(() => {
      if (document.hidden) return;
      loadChartData(symbol, candleSeries, volumeSeries, chart, index, toolTip, {
        allowFallback: false,
        requestSpacingMs: YAHOO_REQUEST_SPACING_MS
      });
    }, CHART_REFRESH_MS);

    scheduleDashboardChartsResize();
  }

  async function loadChartData(ticker, candleSeries, volumeSeries, chart, index, toolTip, options = {}) {
    const { allowFallback = true, requestSpacingMs = YAHOO_REQUEST_SPACING_MS } = options;
    const normalizedTicker = normalizeChartSymbol(ticker);
    try {
      const { response, payload } = await queueYahooChartRequest(normalizedTicker, requestSpacingMs);

      if (!response.ok) {
        throw new Error(`Yahoo chart request failed with ${response.status}`);
      }

      const json = parseJinaYahooPayload(payload);
      const result = json && json.chart && json.chart.result && json.chart.result[0];
      const providerError = json && json.chart && json.chart.error;

      if (providerError) {
        throw new Error(providerError.description || 'Yahoo chart data unavailable');
      }

      if (!result) {
        throw new Error('No chart result available');
      }

      const { candles, volumes } = buildChartSeriesFromYahooResult(result);

      if (candles.length > 0) {
        candleSeries.setData(candles);
        volumeSeries.setData(volumes);
        updateChartTooltip(toolTip, ticker, candles, result);
        setCachedChartData(ticker, candles, volumes, result);
        window[`chartRateLimitCount${index}`] = 0;
        if (!window[`hasChartData${index}`]) {
          const initialRange = getInitialLogicalRange(result, candles);
          if (initialRange) {
            chart.timeScale().setVisibleLogicalRange(initialRange);
          } else {
            chart.timeScale().fitContent();
          }
        }
        window[`hasChartData${index}`] = true;
        return true;
      }

      throw new Error('No data available');
    } catch (error) {
      const message = String(error && error.message ? error.message : error);
      const isRateLimited = message.includes('429');
      const hasExistingChartData = Boolean(window[`hasChartData${index}`]);

      if (!hasExistingChartData) {
        const cachedChartData = getCachedChartData(ticker);
        if (cachedChartData) {
          const cachedResult = cachedChartData.resultMeta || null;
          candleSeries.setData(cachedChartData.candles);
          volumeSeries.setData(cachedChartData.volumes);
          updateChartTooltip(toolTip, ticker, cachedChartData.candles, cachedResult);

          const initialRange = getInitialLogicalRange(cachedResult, cachedChartData.candles);
          if (initialRange) {
            chart.timeScale().setVisibleLogicalRange(initialRange);
          } else {
            chart.timeScale().fitContent();
          }

          window[`hasChartData${index}`] = true;

          if (isRateLimited) {
            console.warn('Using cached chart data while rate-limited:', ticker);
            scheduleChartRetry(index, ticker);
          }

          return true;
        }
      }

      if (isRateLimited && !hasExistingChartData) {
        const rateLimitCountKey = `chartRateLimitCount${index}`;
        const retryCount = Number(window[rateLimitCountKey] || 0) + 1;
        window[rateLimitCountKey] = retryCount;

        if (retryCount >= 3) {
          console.warn('Repeated initial 429s, falling back to TradingView widget:', ticker);
          clearChartInterval(index);
          fallbackToTradingView(index, ticker);
          return false;
        }

        console.warn('Initial chart load rate-limited, retrying shortly:', error);
        scheduleChartRetry(index, ticker);
        return false;
      }

      if (!allowFallback || isRateLimited || hasExistingChartData) {
        console.warn('Chart refresh error, keeping existing chart:', error);
        return false;
      }

      clearChartInterval(index);
      console.error('Chart load error, falling back to TradingView widget:', error);
      fallbackToTradingView(index, ticker);
      return false;
    }
  }

  function fallbackToTradingView(index, symbol) {
    const container = document.getElementById(`tvWidget${index}`);
    if (!container) return;

    unregisterDashboardChart(index);

    container.innerHTML = '';

    const notification = document.createElement('div');
    notification.style.position = 'absolute';
    notification.style.top = '0';
    notification.style.left = '0';
    notification.style.right = '0';
    notification.style.background = 'rgba(20, 34, 48, 0.92)';
    notification.style.color = '#dff1ff';
    notification.style.padding = '10px';
    notification.style.fontSize = '12px';
    notification.style.zIndex = '20';
    notification.style.textAlign = 'center';
    notification.textContent = `Ticker "${symbol}" not available. Falling back to TradingView...`;
    container.appendChild(notification);

    setTimeout(() => { notification.style.display = 'none'; }, 5000);

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
      autosize: true,
      symbol,
      interval: '1',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      theme: 'dark',
      style: '1',
      locale: 'en',
      allow_symbol_change: true,
      calendar: true,
      support_host: 'https://www.tradingview.com'
    });
    widgetContainer.appendChild(script);
  }

  function renderDefaultTradingViewWidgets() {
    const tvTickerInputs = getTickerInputs();
    for (const [index, symbol] of defaultTvTickers.entries()) {
      if (tvTickerInputs[index]) {
        tvTickerInputs[index].value = '';
      }

      const staggerDelay = index * DEFAULT_PANEL_STAGGER_MS;
      setTimeout(() => {
        createTradingViewWidget(index, symbol).catch((error) => {
          console.warn('Failed to initialize dashboard panel:', index, error);
        });
      }, staggerDelay);
    }
  }

  function initializeTradingViewPage() {
    const tvTickerInputs = getTickerInputs();
    const tradingviewGrid = document.getElementById('tradingviewGrid');
    if (tradingviewGrid) {
      tradingviewGrid.classList.add('show');
    }
    renderDefaultTradingViewWidgets();

    const updatePanel = (index) => {
      const symbolInput = tvTickerInputs[index];
      const symbol = symbolInput ? symbolInput.value.trim() : '';

      if (symbol) {
        symbolInput.dataset.lastInput = symbol;
        symbolInput.value = `You are Watching: ${symbol}`;
        createTradingViewWidget(index, symbol);
      }
    };

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
      button.addEventListener('click', (event) => {
        if (button.dataset.action === 'theater') {
          event.preventDefault();
          event.stopPropagation();
          openDashboardTheaterMenu(button, Number(button.dataset.panel));
          return;
        }

        const panelIndex = Number(button.dataset.panel);
        updatePanel(panelIndex);
      });
    });

    const theaterExitBtn = document.getElementById('dashboardTheaterExitBtn');
    if (theaterExitBtn) {
      theaterExitBtn.addEventListener('click', () => {
        if (dashboardTheaterMode) setDashboardTheaterMode(false, dashboardTheaterScope, dashboardTheaterPanelIndex);
      });
    }

    const theaterMenu = document.getElementById('dashboardTheaterMenu');
    if (theaterMenu) {
      theaterMenu.querySelectorAll('.dashboard-theater-menu-btn').forEach((menuButton) => {
        menuButton.addEventListener('click', () => {
          const scope = menuButton.dataset.scope;
          if (scope === 'panel') {
            toggleDashboardTheaterMode('panel', dashboardTheaterMenuPanelIndex);
            return;
          }

          toggleDashboardTheaterMode('all');
        });
      });
    }

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && dashboardTheaterMode) {
        setDashboardTheaterMode(false, dashboardTheaterScope, dashboardTheaterPanelIndex);
      } else if (event.key === 'Escape') {
        closeDashboardTheaterMenu();
      }
    });

    document.addEventListener('click', (event) => {
      const target = event.target;
      const clickedTheaterToggle = target && target.closest && target.closest('.dashboard-theater-toggle-btn');
      const clickedTheaterMenu = target && target.closest && target.closest('#dashboardTheaterMenu');
      if (!clickedTheaterToggle && !clickedTheaterMenu) {
        closeDashboardTheaterMenu();
      }
    });

    updateDashboardTheaterModeButton();

    if (tradingviewGrid && typeof ResizeObserver === 'function') {
      const observer = new ResizeObserver(() => {
        scheduleDashboardChartsResize();
      });
      observer.observe(tradingviewGrid);
    }

    window.addEventListener('resize', scheduleDashboardChartsResize);
  }

  document.addEventListener('DOMContentLoaded', initializeTradingViewPage);
}
