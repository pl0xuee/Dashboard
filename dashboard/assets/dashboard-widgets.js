if (!window.__dashboardWidgetsInitialized) {
  window.__dashboardWidgetsInitialized = true;

  const defaultTvTickers = ['GOOGL', 'SPCX', 'SPY', 'BTCUSD'];
  const PACIFIC_TIME_ZONE = 'America/Los_Angeles';
  const CHART_WINDOW_SECONDS = 24 * 60 * 60;
  const CHART_HISTORY_RANGE = '2d';
  const CHART_REFRESH_MS = 45 * 1000;
  const DEFAULT_PANEL_STAGGER_MS = 260;
  const INITIAL_YAHOO_REQUEST_SPACING_MS = 1500;
  const YAHOO_REQUEST_SPACING_MS = 4500;
  const YAHOO_RATE_LIMIT_COOLDOWN_MS = 120 * 1000;
  const CHART_CACHE_TTL_MS = 15 * 60 * 1000;
  const CHART_CACHE_KEY_PREFIX = 'dashboardChartCache:v3:';
  const CUSTOM_TICKERS_STORAGE_KEY = 'dashboardCustomTickers:v1';
  const MAX_VISIBLE_TICKER_OPTIONS = 10;
  const INITIAL_VISIBLE_TICKER_OPTIONS = 6;
  const TOP_TICKER_OPTIONS = [
    { value: 'AAPL', label: 'AAPL - Apple', group: 'Stocks' },
    { value: 'MSFT', label: 'MSFT - Microsoft', group: 'Stocks' },
    { value: 'NVDA', label: 'NVDA - Nvidia', group: 'Stocks' },
    { value: 'AMZN', label: 'AMZN - Amazon', group: 'Stocks' },
    { value: 'GOOGL', label: 'GOOGL - Alphabet', group: 'Stocks' },
    { value: 'META', label: 'META - Meta', group: 'Stocks' },
    { value: 'TSLA', label: 'TSLA - Tesla', group: 'Stocks' },
    { value: 'SPCX', label: 'SPCX - SpaceX', group: 'Stocks' },
    { value: 'SPY', label: 'SPY - S&P 500 ETF', group: 'ETFs' },
    { value: 'QQQ', label: 'QQQ - Nasdaq 100 ETF', group: 'ETFs' },
    { value: 'OIL', label: 'OIL - WTI Crude Oil', group: 'Commodities' },
    { value: 'BTCUSD', label: 'BTCUSD - Bitcoin', group: 'Crypto' },
    { value: 'ETHUSD', label: 'ETHUSD - Ethereum', group: 'Crypto' },
    { value: 'XRPUSD', label: 'XRPUSD - XRP', group: 'Crypto' },
    { value: 'BNBUSD', label: 'BNBUSD - BNB', group: 'Crypto' },
    { value: 'SOLUSD', label: 'SOLUSD - Solana', group: 'Crypto' }
  ];
  const YAHOO_SYMBOL_MAP = {
    CL: 'CL=F',
    'CRUDE OIL': 'CL=F',
    CRUDE: 'CL=F',
    OIL: 'CL=F',
    WTI: 'CL=F',
    BRENT: 'BZ=F',
    'BRENT OIL': 'BZ=F',
    BTCUSD: 'BTC-USD',
    ETHUSD: 'ETH-USD',
    XRPUSD: 'XRP-USD',
    BNBUSD: 'BNB-USD',
    SOLUSD: 'SOL-USD'
  };
  let yahooRequestQueue = Promise.resolve();
  let yahooLastRequestAt = 0;
  let yahooRateLimitUntil = 0;
  let dashboardTheaterMode = false;
  let dashboardTheaterScope = 'all';
  let dashboardTheaterPanelIndex = null;
  let dashboardTheaterMenuPanelIndex = null;
  let tickerMenuPanelIndex = null;
  let tickerMenuOptions = [];
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
    const trimmedSymbol = String(symbol || '').trim();
    const cleanedSymbol = trimmedSymbol.replace(/^you are watching:\s*/i, '').trim();
    const upperSymbol = cleanedSymbol.toUpperCase();
    return YAHOO_SYMBOL_MAP[upperSymbol] || upperSymbol;
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

  function resetDashboardChartState(index) {
    clearChartInterval(index);
    window[`chartRequestToken${index}`] = Number(window[`chartRequestToken${index}`] || 0) + 1;
    delete window[`hasChartData${index}`];
    delete window[`chartRateLimitCount${index}`];
  }

  function getChartRequestToken(index) {
    return Number(window[`chartRequestToken${index}`] || 0);
  }

  function isChartRequestActive(index, token) {
    return getChartRequestToken(index) === Number(token);
  }

  function getTickerInputs() {
    return [
      document.getElementById('tvTicker0'),
      document.getElementById('tvTicker1'),
      document.getElementById('tvTicker2'),
      document.getElementById('tvTicker3')
    ];
  }

  function getTickerSelects() {
    return [
      document.getElementById('tvTickerSelect0'),
      document.getElementById('tvTickerSelect1'),
      document.getElementById('tvTickerSelect2'),
      document.getElementById('tvTickerSelect3')
    ];
  }

  function normalizeCustomTickerValue(rawValue) {
    return String(rawValue || '')
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '');
  }

  function readCustomTickers() {
    try {
      const parsed = JSON.parse(localStorage.getItem(CUSTOM_TICKERS_STORAGE_KEY) || '[]');
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map((value) => normalizeCustomTickerValue(value))
        .filter(Boolean);
    } catch (_) {
      return [];
    }
  }

  function writeCustomTickers(tickers) {
    try {
      localStorage.setItem(CUSTOM_TICKERS_STORAGE_KEY, JSON.stringify(tickers));
    } catch (_) {
      // Ignore storage failures and continue.
    }
  }

  function buildTickerOptionEntries() {
    const seen = new Set();
    const options = [];

    TOP_TICKER_OPTIONS.forEach((entry) => {
      const value = normalizeCustomTickerValue(entry.value);
      if (!value || seen.has(value)) return;
      seen.add(value);
      options.push({ value, label: entry.label, group: entry.group || 'General', isCustom: false });
    });

    readCustomTickers().forEach((ticker) => {
      if (!ticker || seen.has(ticker)) return;
      seen.add(ticker);
      options.push({ value: ticker, label: `${ticker} - Custom`, group: 'Custom', isCustom: true });
    });

    return options;
  }

  function getTickerOptionByValue(value) {
    const normalizedValue = normalizeCustomTickerValue(value);
    if (!normalizedValue) return null;
    return tickerMenuOptions.find((entry) => entry.value === normalizedValue) || null;
  }

  function setTickerTriggerLabel(trigger, tickerValue) {
    if (!trigger) return;

    const normalizedTicker = normalizeCustomTickerValue(tickerValue);
    trigger.dataset.value = normalizedTicker;

    if (!normalizedTicker) {
      trigger.textContent = 'Select ticker';
      return;
    }

    const knownOption = getTickerOptionByValue(normalizedTicker);
    trigger.textContent = knownOption ? knownOption.label : `${normalizedTicker} - Custom`;
  }

  function refreshTickerSelects(tickerInputs) {
    tickerMenuOptions = buildTickerOptionEntries();
    getTickerSelects().forEach((trigger, index) => {
      if (!trigger) return;
      const fallbackTicker = defaultTvTickers[index] || '';
      const selected = trigger.dataset.value || (tickerInputs[index] && tickerInputs[index].value) || fallbackTicker;
      setTickerTriggerLabel(trigger, selected);
      trigger.setAttribute('aria-expanded', 'false');
    });
  }

  function getTickerMenu() {
    let menu = document.getElementById('dashboardTickerMenu');
    if (menu) return menu;

    menu = document.createElement('div');
    menu.id = 'dashboardTickerMenu';
    menu.className = 'ticker-overlay-menu';
    menu.setAttribute('role', 'listbox');
    menu.hidden = true;
    document.body.appendChild(menu);
    return menu;
  }

  function closeTickerMenu() {
    const menu = document.getElementById('dashboardTickerMenu');
    if (menu) {
      menu.hidden = true;
      menu.innerHTML = '';
      menu.style.top = '';
      menu.style.left = '';
      menu.style.width = '';
    }

    getTickerSelects().forEach((trigger) => {
      if (trigger) trigger.setAttribute('aria-expanded', 'false');
    });

    tickerMenuPanelIndex = null;
  }

  function openTickerMenu(trigger, panelIndex, tickerInputs) {
    if (!trigger) return;

    if (tickerMenuPanelIndex === panelIndex) {
      closeTickerMenu();
      return;
    }

    const menu = getTickerMenu();
    tickerMenuPanelIndex = panelIndex;
    menu.innerHTML = '';

    const selectedTicker = normalizeCustomTickerValue(
      (tickerInputs[panelIndex] && tickerInputs[panelIndex].value)
      || trigger.dataset.value
      || defaultTvTickers[panelIndex]
      || ''
    );

    let lastGroup = '';
    tickerMenuOptions.forEach((entry) => {
      const groupName = entry.group || 'General';
      if (groupName !== lastGroup) {
        const groupHeader = document.createElement('div');
        groupHeader.className = 'ticker-overlay-group-header';
        groupHeader.textContent = groupName;
        menu.appendChild(groupHeader);
        lastGroup = groupName;
      }

      const optionButton = document.createElement('button');
      optionButton.type = 'button';
      optionButton.className = 'ticker-overlay-option';
      optionButton.setAttribute('role', 'option');
      optionButton.dataset.value = entry.value;
      optionButton.textContent = entry.label;
      if (entry.value === selectedTicker) {
        optionButton.classList.add('is-active');
      }

      optionButton.addEventListener('click', () => {
        const ticker = normalizeCustomTickerValue(optionButton.dataset.value);
        if (!ticker) return;

        const symbolInput = tickerInputs[panelIndex];
        if (symbolInput) {
          symbolInput.dataset.lastInput = ticker;
          symbolInput.value = ticker;
        }

        setTickerTriggerLabel(trigger, ticker);
        createTradingViewWidget(panelIndex, ticker);
        closeTickerMenu();
      });

      if (!entry.isCustom) {
        menu.appendChild(optionButton);
        return;
      }

      const row = document.createElement('div');
      row.className = 'ticker-overlay-row';
      row.appendChild(optionButton);

      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'ticker-overlay-delete';
      deleteButton.title = `Delete ${entry.value}`;
      deleteButton.setAttribute('aria-label', `Delete ${entry.value}`);
      deleteButton.textContent = 'x';
      deleteButton.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();

        removeCustomTicker(entry.value);
        refreshTickerSelects(tickerInputs);

        tickerMenuPanelIndex = null;
        openTickerMenu(trigger, panelIndex, tickerInputs);
      });

      row.appendChild(deleteButton);
      menu.appendChild(row);
    });

    let totalGridRows = 0;
    let currentGroup = '';
    let itemsInGroup = 0;
    tickerMenuOptions.forEach((entry) => {
      const groupName = entry.group || 'General';
      if (groupName !== currentGroup) {
        if (itemsInGroup > 0) {
          totalGridRows += Math.ceil(itemsInGroup / 2);
          itemsInGroup = 0;
        }
        totalGridRows += 1; // Group header row.
        currentGroup = groupName;
      }
      itemsInGroup += 1;
    });
    if (itemsInGroup > 0) {
      totalGridRows += Math.ceil(itemsInGroup / 2);
    }
    totalGridRows = Math.max(1, totalGridRows);

    const visibleRows = Math.min(INITIAL_VISIBLE_TICKER_OPTIONS, totalGridRows);
    menu.style.setProperty('--ticker-visible-rows', String(visibleRows));

    const rect = trigger.getBoundingClientRect();
    const width = Math.max(360, Math.min(520, Math.round((rect.width * 2) + 120)));
    const viewportPadding = 10;
    const left = Math.max(viewportPadding, Math.min(Math.round(rect.left), window.innerWidth - width - viewportPadding));
    const top = Math.max(viewportPadding, Math.min(Math.round(rect.bottom + 6), window.innerHeight - 390));

    menu.style.width = `${width}px`;
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
    menu.hidden = false;

    getTickerSelects().forEach((item) => {
      if (item) item.setAttribute('aria-expanded', item === trigger ? 'true' : 'false');
    });
  }

  function addCustomTicker(rawValue) {
    const normalized = normalizeCustomTickerValue(rawValue);
    if (!normalized) return null;

    const nextTickers = readCustomTickers();
    if (!nextTickers.includes(normalized) && !TOP_TICKER_OPTIONS.some((entry) => normalizeCustomTickerValue(entry.value) === normalized)) {
      nextTickers.push(normalized);
      writeCustomTickers(nextTickers);
    }

    return normalized;
  }

  function removeCustomTicker(rawValue) {
    const normalized = normalizeCustomTickerValue(rawValue);
    if (!normalized) return;

    const filtered = readCustomTickers().filter((ticker) => ticker !== normalized);
    writeCustomTickers(filtered);
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
      const now = Date.now();
      const spacingWaitMs = Math.max(0, spacingMs - (now - yahooLastRequestAt));
      const cooldownWaitMs = Math.max(0, yahooRateLimitUntil - now);
      const waitMs = Math.max(spacingWaitMs, cooldownWaitMs);
      if (waitMs > 0) {
        await sleep(waitMs);
      }

      yahooLastRequestAt = Date.now();
      const response = await fetch(getYahooChartUrl(symbol));
      if (response.status === 429) {
        yahooRateLimitUntil = Date.now() + YAHOO_RATE_LIMIT_COOLDOWN_MS;
      }
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

  function isOilSymbol(symbol) {
    const upperSymbol = String(symbol || '').trim().toUpperCase();
    return upperSymbol === 'CL=F' || upperSymbol === 'BZ=F';
  }

  function getTradingViewSymbol(symbol) {
    const normalized = normalizeChartSymbol(symbol);
    if (normalized === 'CL=F') {
      return 'NYMEX:CL1!';
    }
    if (normalized === 'BZ=F') {
      return 'TVC:UKOIL';
    }
    return normalized;
  }

  function buildChartSeriesFromYahooResult(result, symbol = '') {
    const timestamps = result.timestamp || [];
    const quote = result.indicators && result.indicators.quote && result.indicators.quote[0];
    if (!quote) {
      return { candles: [], volumes: [] };
    }

    const candles = [];
    const volumes = [];
    const recentRanges = [];
    const RECENT_RANGE_WINDOW = 30;
    let previousClose = NaN;

    const getMedian = (values) => {
      if (!values.length) return NaN;
      const sorted = values.slice().sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      if (sorted.length % 2 === 0) {
        return (sorted[mid - 1] + sorted[mid]) / 2;
      }
      return sorted[mid];
    };

    timestamps.forEach((timestamp, index) => {
      const openValue = quote.open && quote.open[index];
      const highValue = quote.high && quote.high[index];
      const lowValue = quote.low && quote.low[index];
      const closeValue = quote.close && quote.close[index];

      const open = openValue == null ? NaN : Number(openValue);
      const high = highValue == null ? NaN : Number(highValue);
      const low = lowValue == null ? NaN : Number(lowValue);
      const close = closeValue == null ? NaN : Number(closeValue);

      // Skip incomplete or invalid bars to avoid occasional malformed candles.
      if (![open, high, low, close].every(Number.isFinite)) {
        return;
      }

      if (open <= 0 || high <= 0 || low <= 0 || close <= 0) {
        return;
      }

      if (high < Math.max(open, close) || low > Math.min(open, close) || high < low) {
        return;
      }

      const range = high - low;
      if (!Number.isFinite(range) || range <= 0) {
        return;
      }

      // Filter occasional malformed provider spikes while preserving real volatility.
      if (Number.isFinite(previousClose) && previousClose > 0) {
        const medianRange = getMedian(recentRanges);
        const maxRange = Number.isFinite(medianRange)
          ? Math.max(medianRange * 10, previousClose * 0.03)
          : previousClose * 0.05;

        if (range > maxRange) {
          return;
        }

        const maxDistanceFromPrev = Number.isFinite(medianRange)
          ? Math.max(medianRange * 12, previousClose * 0.04)
          : previousClose * 0.06;
        const extremeDistance = Math.max(Math.abs(high - previousClose), Math.abs(low - previousClose));

        if (extremeDistance > maxDistanceFromPrev) {
          return;
        }
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
      recentRanges.push(range);
      if (recentRanges.length > RECENT_RANGE_WINDOW) {
        recentRanges.shift();
      }
    });

    if (!isOilSymbol(symbol) || candles.length < 3) {
      return { candles, volumes };
    }

    const nowUnix = Math.floor(Date.now() / 1000);

    // Remove isolated single-bar spikes seen on some oil minutes.
    const filteredCandles = [];
    const filteredVolumes = [];

    for (let i = 0; i < candles.length; i += 1) {
      const prev = i > 0 ? candles[i - 1] : null;
      const curr = candles[i];
      const next = i < candles.length - 1 ? candles[i + 1] : null;

      if (!prev || !next) {
        filteredCandles.push(curr);
        filteredVolumes.push(volumes[i]);
        continue;
      }

      const currRange = curr.high - curr.low;
      const prevRange = prev.high - prev.low;
      const nextRange = next.high - next.low;
      const refRange = Math.max(prevRange, nextRange, 0.01);
      const baseline = Math.max(Math.abs(prev.close), Math.abs(next.close), 1);
      const expectedClose = (prev.close + next.close) / 2;
      const closeDeviation = Math.abs(curr.close - expectedClose);
      const neighborMove = Math.abs(next.close - prev.close);
      const wickDistance = Math.max(
        Math.abs(curr.high - prev.close),
        Math.abs(curr.low - prev.close),
        Math.abs(curr.high - next.close),
        Math.abs(curr.low - next.close)
      );

      const rangeIsExtreme = currRange > Math.max(refRange * 8, baseline * 0.03);
      const closeIsIsolated = closeDeviation > Math.max(refRange * 6, baseline * 0.02);
      const wickIsExtreme = wickDistance > Math.max(refRange * 9, baseline * 0.025);
      const neighborsStable = neighborMove < Math.max(refRange * 3, baseline * 0.01);

      if (neighborsStable && (rangeIsExtreme || (closeIsIsolated && wickIsExtreme))) {
        continue;
      }

      filteredCandles.push(curr);
      filteredVolumes.push(volumes[i]);
    }

    // Ignore the still-forming last oil minute, which can briefly report bad highs/lows.
    if (filteredCandles.length > 0) {
      const lastCandle = filteredCandles[filteredCandles.length - 1];
      if (Number.isFinite(lastCandle.time) && nowUnix - Number(lastCandle.time) < 120) {
        filteredCandles.pop();
        filteredVolumes.pop();
      }
    }

    if (filteredCandles.length < 3) {
      return { candles: filteredCandles, volumes: filteredVolumes };
    }

    const oilHighFrequency = new Map();
    const oilPriceFrequency = new Map();
    filteredCandles.forEach((bar) => {
      const key = bar.high.toFixed(2);
      oilHighFrequency.set(key, (oilHighFrequency.get(key) || 0) + 1);

      [bar.open, bar.high, bar.low, bar.close].forEach((price) => {
        const rounded = Number(price).toFixed(2);
        oilPriceFrequency.set(rounded, (oilPriceFrequency.get(rounded) || 0) + 1);
      });
    });

    // Clamp residual wick/range extremes against neighboring context.
    const stabilizedCandles = [];
    const stabilizedVolumes = [];
    const recentStabilizedRanges = [];
    const OIL_STABILIZE_WINDOW = 24;

    const rollingMedian = (values) => {
      if (!values.length) return NaN;
      const sorted = values.slice().sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      if (sorted.length % 2 === 0) {
        return (sorted[mid - 1] + sorted[mid]) / 2;
      }
      return sorted[mid];
    };

    for (let i = 0; i < filteredCandles.length; i += 1) {
      const prev = i > 0 ? filteredCandles[i - 1] : null;
      const curr = filteredCandles[i];
      const next = i < filteredCandles.length - 1 ? filteredCandles[i + 1] : null;

      let open = curr.open;
      let high = curr.high;
      let low = curr.low;
      let close = curr.close;

      const prevClose = prev ? prev.close : close;
      const nextClose = next ? next.close : close;
      const typicalRange = rollingMedian(recentStabilizedRanges);
      const baseline = Math.max(Math.abs(prevClose), Math.abs(close), 1);
      const wickCap = Number.isFinite(typicalRange)
        ? Math.max(typicalRange * 3, baseline * 0.002)
        : baseline * 0.003;
      const totalRangeCap = Number.isFinite(typicalRange)
        ? Math.max(typicalRange * 5, baseline * 0.006)
        : baseline * 0.008;

      const upperAnchor = Math.max(open, close, prevClose, nextClose);
      const lowerAnchor = Math.min(open, close, prevClose, nextClose);

      high = Math.min(high, upperAnchor + wickCap);
      low = Math.max(low, lowerAnchor - wickCap);

      if (high < Math.max(open, close)) {
        high = Math.max(open, close);
      }
      if (low > Math.min(open, close)) {
        low = Math.min(open, close);
      }

      if (high - low > totalRangeCap) {
        const mid = (open + close) / 2;
        const half = totalRangeCap / 2;
        high = Math.max(Math.max(open, close), mid + half);
        low = Math.min(Math.min(open, close), mid - half);
      }

      const highKey = high.toFixed(2);
      const repeatedHighCount = oilHighFrequency.get(highKey) || 0;
      const repeatedHighThreshold = Number.isFinite(typicalRange)
        ? Math.max(typicalRange * 2.5, baseline * 0.0015)
        : baseline * 0.002;
      const highIsRepeatedSpike = repeatedHighCount >= 3
        && (high - upperAnchor) > repeatedHighThreshold;

      if (highIsRepeatedSpike) {
        high = upperAnchor + repeatedHighThreshold;
      }

      stabilizedCandles.push({ time: curr.time, open, high, low, close });
      stabilizedVolumes.push(filteredVolumes[i]);

      const stabilizedRange = high - low;
      if (Number.isFinite(stabilizedRange) && stabilizedRange > 0) {
        recentStabilizedRanges.push(stabilizedRange);
        if (recentStabilizedRanges.length > OIL_STABILIZE_WINDOW) {
          recentStabilizedRanges.shift();
        }
      }
    }

    if (stabilizedCandles.length < 3) {
      return { candles: stabilizedCandles, volumes: stabilizedVolumes };
    }

    const finalCandles = [];
    const finalVolumes = [];

    for (let i = 0; i < stabilizedCandles.length; i += 1) {
      const prev = i > 0 ? stabilizedCandles[i - 1] : null;
      const curr = stabilizedCandles[i];
      const next = i < stabilizedCandles.length - 1 ? stabilizedCandles[i + 1] : null;

      let open = curr.open;
      let high = curr.high;
      let low = curr.low;
      let close = curr.close;

      if (prev && next) {
        const neighborCloseMid = (prev.close + next.close) / 2;
        const neighborMove = Math.abs(next.close - prev.close);
        const baseline = Math.max(Math.abs(neighborCloseMid), 1);
        const body = Math.abs(close - open);
        const closeOutlierThreshold = Math.max(baseline * 0.0025, neighborMove * 3);
        const repeatedPlaceholderThreshold = Math.max(baseline * 0.0012, neighborMove * 2, 0.04);
        const isRepeatedPlaceholder = (price) => (oilPriceFrequency.get(Number(price).toFixed(2)) || 0) >= 12;

        // Repair isolated closes that jump away from both neighbors then immediately mean-revert.
        if (Math.abs(close - neighborCloseMid) > closeOutlierThreshold && neighborMove < baseline * 0.0018) {
          close = neighborCloseMid;
          open = prev.close;
        }

        // Some oil minutes carry a repeated placeholder-like value; replace isolated ones with local context.
        if (isRepeatedPlaceholder(close) && Math.abs(close - neighborCloseMid) > repeatedPlaceholderThreshold) {
          close = neighborCloseMid;
          open = prev.close;
        }

        const bodyCap = Math.max(neighborMove * 2.5, baseline * 0.0015, 0.03);
        if (Math.abs(close - open) > bodyCap && neighborMove < baseline * 0.0025) {
          open = prev.close;
          close = neighborCloseMid;
        }

        const upperAnchor = Math.max(open, close, prev.close, next.close);
        const lowerAnchor = Math.min(open, close, prev.close, next.close);
        const wickCap = Math.max(baseline * 0.0011, neighborMove * 1.5, body * 1.8, 0.03);

        high = Math.min(high, upperAnchor + wickCap);
        low = Math.max(low, lowerAnchor - wickCap);

        if (isRepeatedPlaceholder(high) && (high - upperAnchor) > repeatedPlaceholderThreshold) {
          high = upperAnchor + repeatedPlaceholderThreshold;
        }
        if (isRepeatedPlaceholder(low) && (lowerAnchor - low) > repeatedPlaceholderThreshold) {
          low = lowerAnchor - repeatedPlaceholderThreshold;
        }
      }

      if (high < Math.max(open, close)) {
        high = Math.max(open, close);
      }
      if (low > Math.min(open, close)) {
        low = Math.min(open, close);
      }

      finalCandles.push({ time: curr.time, open, high, low, close });
      finalVolumes.push(stabilizedVolumes[i]);
    }

    return { candles: finalCandles, volumes: finalVolumes };
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

    resetDashboardChartState(index);
    const panelRequestToken = getChartRequestToken(index);
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
      layout: { background: { type: 'solid', color: '#080d14' }, textColor: '#c7d5e8', attributionLogo: false },
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
        requestSpacingMs: INITIAL_YAHOO_REQUEST_SPACING_MS,
        panelRequestToken
      }
    );
    if (!loadSucceeded && !window[`hasChartData${index}`]) {
      return;
    }

    window[`interval${index}`] = setInterval(() => {
      if (document.hidden) return;
      loadChartData(symbol, candleSeries, volumeSeries, chart, index, toolTip, {
        allowFallback: false,
        requestSpacingMs: YAHOO_REQUEST_SPACING_MS,
        panelRequestToken
      });
    }, CHART_REFRESH_MS);

    scheduleDashboardChartsResize();
  }

  async function loadChartData(ticker, candleSeries, volumeSeries, chart, index, toolTip, options = {}) {
    const {
      allowFallback = true,
      requestSpacingMs = YAHOO_REQUEST_SPACING_MS,
      panelRequestToken = getChartRequestToken(index)
    } = options;
    const normalizedTicker = normalizeChartSymbol(ticker);
    try {
      const { response, payload } = await queueYahooChartRequest(normalizedTicker, requestSpacingMs);

      if (!isChartRequestActive(index, panelRequestToken)) {
        return false;
      }

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

      const { candles, volumes } = buildChartSeriesFromYahooResult(result, normalizedTicker);

      if (!isChartRequestActive(index, panelRequestToken)) {
        return false;
      }

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

      if (!isChartRequestActive(index, panelRequestToken)) {
        return false;
      }

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
            const rateLimitLogKey = `rateLimitLogAt${index}`;
            const now = Date.now();
            const lastLogAt = Number(window[rateLimitLogKey] || 0);
            if (now - lastLogAt > 60 * 1000) {
              console.warn('Using cached chart data while rate-limited:', ticker);
              window[rateLimitLogKey] = now;
            }
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

        const rateLimitLogKey = `rateLimitLogAt${index}`;
        const now = Date.now();
        const lastLogAt = Number(window[rateLimitLogKey] || 0);
        if (now - lastLogAt > 60 * 1000) {
          console.warn('Initial chart load rate-limited, retrying shortly:', error);
          window[rateLimitLogKey] = now;
        }
        scheduleChartRetry(index, ticker);
        return false;
      }

      if (!allowFallback || hasExistingChartData) {
        if (isRateLimited) {
          const rateLimitLogKey = `rateLimitLogAt${index}`;
          const now = Date.now();
          const lastLogAt = Number(window[rateLimitLogKey] || 0);
          if (now - lastLogAt > 60 * 1000) {
            console.warn('Chart refresh rate-limited, keeping existing chart:', ticker);
            window[rateLimitLogKey] = now;
          }
        } else {
          console.warn('Chart refresh error, keeping existing chart:', error);
        }
        return false;
      }

      clearChartInterval(index);
      console.error('Chart load error, falling back to TradingView widget:', error);
      fallbackToTradingView(index, ticker);
      return false;
    }
  }

  function renderTradingViewWidget(index, symbol, message) {
    const container = document.getElementById(`tvWidget${index}`);
    if (!container) return;

    unregisterDashboardChart(index);
    delete window[`hasChartData${index}`];

    container.innerHTML = '';

    if (message) {
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
      notification.textContent = message;
      container.appendChild(notification);

      setTimeout(() => { notification.style.display = 'none'; }, 5000);
    }

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

  function fallbackToTradingView(index, symbol) {
    const normalizedSymbol = normalizeChartSymbol(symbol);
    const tradingViewSymbol = isOilSymbol(normalizedSymbol)
      ? getTradingViewSymbol(normalizedSymbol)
      : symbol;

    renderTradingViewWidget(index, tradingViewSymbol, `Ticker "${symbol}" not available. Falling back to TradingView...`);
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
    const tickerSelects = getTickerSelects();
    const tradingviewGrid = document.getElementById('tradingviewGrid');
    if (tradingviewGrid) {
      tradingviewGrid.classList.add('show');
    }
    renderDefaultTradingViewWidgets();
    refreshTickerSelects(tvTickerInputs);

    const updatePanel = (index) => {
      const symbolInput = tvTickerInputs[index];
      const symbol = symbolInput ? symbolInput.value.trim() : '';

      if (symbol) {
        symbolInput.dataset.lastInput = symbol;
        symbolInput.value = symbol;
        setTickerTriggerLabel(tickerSelects[index], symbol);
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

        if (button.dataset.action === 'add-ticker') {
          const panelIndex = Number(button.dataset.panel);
          const rawTicker = window.prompt('Enter a ticker symbol to add (example: AMD, XOM, CL=F):', '');
          const ticker = addCustomTicker(rawTicker);
          if (!ticker) return;

          refreshTickerSelects(tvTickerInputs);
          setTickerTriggerLabel(tickerSelects[panelIndex], ticker);

          const symbolInput = tvTickerInputs[panelIndex];
          if (symbolInput) {
            symbolInput.dataset.lastInput = ticker;
            symbolInput.value = ticker;
          }

          createTradingViewWidget(panelIndex, ticker);
          closeTickerMenu();
          return;
        }

        if (button.dataset.action === 'ticker-menu') {
          const panelIndex = Number(button.dataset.panel);
          refreshTickerSelects(tvTickerInputs);
          openTickerMenu(button, panelIndex, tvTickerInputs);
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
        closeTickerMenu();
      }
    });

    document.addEventListener('click', (event) => {
      const target = event.target;
      const clickedTheaterToggle = target && target.closest && target.closest('.dashboard-theater-toggle-btn');
      const clickedTheaterMenu = target && target.closest && target.closest('#dashboardTheaterMenu');
      const clickedTickerToggle = target && target.closest && target.closest('.ticker-select-trigger');
      const clickedTickerMenu = target && target.closest && target.closest('#dashboardTickerMenu');
      if (!clickedTheaterToggle && !clickedTheaterMenu) {
        closeDashboardTheaterMenu();
      }
      if (!clickedTickerToggle && !clickedTickerMenu) {
        closeTickerMenu();
      }
    });

    updateDashboardTheaterModeButton();

    if (tradingviewGrid && typeof ResizeObserver === 'function') {
      const observer = new ResizeObserver(() => {
        scheduleDashboardChartsResize();
      });
      observer.observe(tradingviewGrid);
    }

    window.addEventListener('resize', () => {
      closeTickerMenu();
      scheduleDashboardChartsResize();
    });
  }

  document.addEventListener('DOMContentLoaded', initializeTradingViewPage);
}
