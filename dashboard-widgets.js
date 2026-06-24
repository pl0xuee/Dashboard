const tvTickerInputs = [
  document.getElementById('tvTicker0'),
  document.getElementById('tvTicker1'),
  document.getElementById('tvTicker2'),
  document.getElementById('tvTicker3')
];
const defaultTvTickers = ['GOOGL', 'SPCX', 'SPY', 'BTCUSD'];
const TWELVE_DATA_API_KEY = 'e113279daa094cf29e24802ff56566e2';
const PACIFIC_TIME_ZONE = 'America/Los_Angeles';
const CHART_WINDOW_SECONDS = 24 * 60 * 60;

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

function createTradingViewWidget(index, symbol) {
  const container = document.getElementById(`tvWidget${index}`);
  if (!container) return;

  if (window[`interval${index}`]) clearInterval(window[`interval${index}`]);

  const media = parseMediaSource(symbol);
  container.innerHTML = '';

  if (media) {
    const iframe = document.createElement('iframe');
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = '0';

    if (media.type === 'youtube') {
      const youtubeSrc = getYouTubeEmbedUrl(media.id);
      if (youtubeSrc) {
        iframe.src = youtubeSrc;
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
        container.appendChild(iframe);
      }
    } else if (media.type === 'twitch') {
      const twitchSrc = getTwitchEmbedUrl(media);
      if (twitchSrc) {
        iframe.src = twitchSrc;
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
        container.appendChild(iframe);
      }
    } else if (media.type === 'youtube_tv') {
      iframe.src = `https://tv.youtube.com/watch/${media.id}`;
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
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
  toolTip.style.fontSize = '18px';
  toolTip.style.fontWeight = 'bold';
  toolTip.style.color = '#fff';
  toolTip.style.zIndex = '10';
  toolTip.style.pointerEvents = 'none';
  toolTip.textContent = symbol;
  container.appendChild(toolTip);

  const chart = LightweightCharts.createChart(chartDiv, {
    width: chartDiv.clientWidth,
    height: chartDiv.clientHeight,
    layout: { background: { type: 'solid', color: '#081018' }, textColor: '#DDD' },
    grid: { vertLines: { color: '#1f2937' }, horzLines: { color: '#1f2937' } },
    crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
    localization: {
      timeFormatter: (time) => formatPacificChartTime(time, pacificCrosshairFormatter)
    },
    timeScale: {
      timeVisible: true,
      secondsVisible: false,
      fixLeftEdge: true,
      fixRightEdge: false,
      rightOffset: 10,
      tickMarkFormatter: (time) => formatPacificChartTime(time, pacificAxisFormatter)
    }
  });

  const candleSeries = chart.addSeries(LightweightCharts.CandlestickSeries, {
    upColor: '#26a69a',
    downColor: '#ef5350',
    borderVisible: false,
    wickUpColor: '#26a69a',
    wickDownColor: '#ef5350'
  });

  const volumeSeries = chart.addSeries(LightweightCharts.HistogramSeries, {
    color: '#26a69a',
    priceFormat: { type: 'volume' },
    priceScaleId: ''
  });

  chart.priceScale('').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });

  loadChartData(symbol, candleSeries, volumeSeries, chart, index);

  window[`interval${index}`] = setInterval(() => {
    updateChartPrice(symbol, candleSeries, index);
  }, 40000);
}

async function loadChartData(ticker, candleSeries, volumeSeries, chart, index) {
  try {
    const response = await fetch(`https://api.twelvedata.com/time_series?symbol=${ticker}&interval=1min&outputsize=1500&prepost=true&timezone=${encodeURIComponent(PACIFIC_TIME_ZONE)}&apikey=${TWELVE_DATA_API_KEY}`);
    const json = await response.json();

    if (json.values && json.values.length > 0) {
      const formattedData = json.values.map((bar) => ({
        time: Math.floor(new Date(bar.datetime.replace(' ', 'T')).getTime() / 1000),
        open: parseFloat(bar.open),
        high: parseFloat(bar.high),
        low: parseFloat(bar.low),
        close: parseFloat(bar.close)
      })).reverse();

      const volumeData = json.values.map((bar) => ({
        time: Math.floor(new Date(bar.datetime.replace(' ', 'T')).getTime() / 1000),
        value: parseFloat(bar.volume),
        color: parseFloat(bar.close) >= parseFloat(bar.open) ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)'
      })).reverse();

      candleSeries.setData(formattedData);
      volumeSeries.setData(volumeData);
      const firstBar = formattedData[0];
      const lastBar = formattedData[formattedData.length - 1];
      if (firstBar && lastBar) {
        chart.timeScale().setVisibleRange({
          from: Math.max(firstBar.time, lastBar.time - CHART_WINDOW_SECONDS),
          to: lastBar.time
        });
      } else {
        chart.timeScale().fitContent();
      }
      window[`lastCandle${index}`] = formattedData[formattedData.length - 1];
    } else {
      throw new Error('No data available');
    }
  } catch (error) {
    console.error('Chart load error, falling back to TradingView widget:', error);
    fallbackToTradingView(index, ticker);
  }
}

function fallbackToTradingView(index, symbol) {
  const container = document.getElementById(`tvWidget${index}`);
  if (!container) return;

  container.innerHTML = '';

  const notification = document.createElement('div');
  notification.style.position = 'absolute';
  notification.style.top = '0';
  notification.style.left = '0';
  notification.style.right = '0';
  notification.style.background = 'rgba(255, 165, 0, 0.9)';
  notification.style.color = '#000';
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

async function updateChartPrice(ticker, candleSeries, index) {
  try {
    const res = await fetch(`https://api.twelvedata.com/price?symbol=${ticker}&apikey=${TWELVE_DATA_API_KEY}`);
    const data = await res.json();
    if (data.price) {
      const currentPrice = parseFloat(data.price);
      const lastCandle = window[`lastCandle${index}`];
      if (lastCandle) {
        lastCandle.close = currentPrice;
        lastCandle.high = Math.max(lastCandle.high, currentPrice);
        lastCandle.low = Math.min(lastCandle.low, currentPrice);
        candleSeries.update(lastCandle);
      }
    }
  } catch (error) {}
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
    button.addEventListener('click', () => {
      const panelIndex = Number(button.dataset.panel);
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
