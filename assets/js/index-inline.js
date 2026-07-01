    let allNewsItems = [];
    const NEWS_MAX_ITEMS = 10;

    async function getAreaNewsFeedUrl() {
      const fallback = 'https://news.google.com/rss/search?q=' + encodeURIComponent('regional news us') + '&hl=en-US&gl=US&ceid=US:en';

      if (!navigator.geolocation) return fallback;

      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 7000 });
        });

        const { latitude, longitude } = position.coords;
        const geoRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
        const geo = await geoRes.json();

        // Use broader area only (state/region + country), not pinpoint city/locality.
        const region = geo.principalSubdivision || geo.principalSubdivisionCode || '';
        const country = geo.countryName || geo.countryCode || 'US';
        const query = [region, country, 'regional news'].filter(Boolean).join(' ');

        if (!query) return fallback;

        return 'https://news.google.com/rss/search?q=' + encodeURIComponent(query) + '&hl=en-US&gl=US&ceid=US:en';
      } catch (e) {
        return fallback;
      }
    }

    // News cache with timestamps
    const newsCache = {};
    const CACHE_DURATION = 3600000; // 1 hour in milliseconds

    async function showNews(type) {
      const container = document.getElementById('news-container');
      container.textContent = 'Loading...';
      try {
        let feedUrl = '';

        // Set RSS feeds based on category
        if (type === 'usa') {
          feedUrl = 'https://news.google.com/rss/search?q=' + encodeURIComponent('United States news') + '&hl=en-US&gl=US&ceid=US:en';
        } else if (type === 'world') {
          feedUrl = 'https://news.google.com/rss/search?q=' + encodeURIComponent('world news') + '&hl=en-US&gl=US&ceid=US:en';
        } else if (type === 'finance') {
          feedUrl = 'https://news.google.com/rss/search?q=' + encodeURIComponent('finance stocks market') + '&hl=en-US&gl=US&ceid=US:en';
        } else {
          feedUrl = 'https://feeds.bloomberg.com/markets/news.rss';
        }

        let data = await fetchNewsWithCache(feedUrl, type);

        allNewsItems = Array.isArray(data?.items) ? data.items : [];
        renderNews();
      } catch (e) { 
        console.error('News error:', e);
        container.textContent = 'Could not load news. Try refreshing in a moment.'; 
      }
    }

    // Cached fallback news data
    const FALLBACK_NEWS = {
      items: [
        { title: "Technology advances drive market growth", link: "#", pubDate: new Date().toISOString(), author: "News Feed" },
        { title: "Global economic updates this week", link: "#", pubDate: new Date().toISOString(), author: "Finance" },
        { title: "Breaking: Industry trends reshape 2026", link: "#", pubDate: new Date().toISOString(), author: "Business" },
      ]
    };

    async function fetchNewsWithCache(feedUrl, cacheKey) {
      // Check if cache exists and is still valid
      if (newsCache[cacheKey]) {
        const cached = newsCache[cacheKey];
        const now = Date.now();
        if (now - cached.timestamp < CACHE_DURATION) {
          console.log(`Using cached news for ${cacheKey}`);
          return cached.data;
        }
      }

      // Cache miss or expired - fetch fresh data
      const data = await fetchNewsWithRetry(feedUrl);
      
      // Store in cache
      newsCache[cacheKey] = {
        data: data,
        timestamp: Date.now()
      };
      
      return data;
    }

    // Parse RSS XML and extract items
    function parseRSSItems(xmlText) {
      try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        
        // Check for parsing errors
        if (xmlDoc.getElementsByTagName('parsererror').length) {
          throw new Error('Invalid XML');
        }
        
        const items = [];
        const rssItems = xmlDoc.getElementsByTagName('item');
        
        for (let i = 0; i < rssItems.length && items.length < 20; i++) {
          const item = rssItems[i];
          
          const title = item.getElementsByTagName('title')[0]?.textContent || 'No title';
          const link = item.getElementsByTagName('link')[0]?.textContent || '#';
          const pubDate = item.getElementsByTagName('pubDate')[0]?.textContent || new Date().toISOString();
          const author = item.getElementsByTagName('author')[0]?.textContent || 
                        item.getElementsByTagName('creator')[0]?.textContent || 
                        'News';
          
          items.push({
            title: title.trim(),
            link: link.trim(),
            pubDate: pubDate,
            author: author.trim()
          });
        }
        
        return { items: items };
      } catch (e) {
        console.error('RSS parsing error:', e);
        return { items: [] };
      }
    }

    async function fetchNewsWithRetry(feedUrl, maxRetries = 3) {
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          // Use RSS2JSON API to convert RSS to JSON
          const response = await fetch('https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(feedUrl));
          
          if (!response.ok) {
            console.warn(`HTTP ${response.status} on attempt ${attempt + 1}`);
            if (attempt < maxRetries - 1) {
              await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
              continue;
            }
            throw new Error(`HTTP ${response.status}`);
          }
          
          const data = await response.json();
          
          if (data.status === 'error') {
            console.warn(`API error: ${data.message} on attempt ${attempt + 1}`);
            if (attempt < maxRetries - 1) {
              await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
              continue;
            }
            throw new Error(data.message || 'API returned error');
          }
          
          if (data.items && Array.isArray(data.items) && data.items.length > 0) {
            console.log(`Successfully fetched ${data.items.length} news items`);
            return data;
          }
          
          throw new Error('No items in response');
        } catch (e) {
          console.error(`Attempt ${attempt + 1} failed:`, e.message);
          if (attempt === maxRetries - 1) {
            console.warn('Using fallback news - RSS feed unavailable');
            return FALLBACK_NEWS;
          }
        }
      }
    }

    function renderNews() {
      const container = document.getElementById('news-container');
      const limit = NEWS_MAX_ITEMS;

      const toSafeLink = (value) => {
        try {
          const parsed = new URL(String(value || '#'), window.location.href);
          if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
            return parsed.href;
          }
        } catch (_) {}
        return '#';
      };

      const list = document.createElement('ul');
      list.style.paddingLeft = '0';
      list.style.margin = '0';
      list.style.listStyle = 'none';

      allNewsItems.slice(0, limit).forEach((item) => {
        const date = item.pubDate ? new Date(item.pubDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

        let displayTitle = String(item.title || 'Untitled');
        let displaySource = String(item.author || 'News Feed');

        if (displayTitle.includes(' - ')) {
          const parts = displayTitle.split(' - ');
          displaySource = String(parts.pop() || displaySource);
          displayTitle = parts.join(' - ');
        }

        const li = document.createElement('li');
        li.style.marginBottom = '18px';
        li.style.paddingBottom = '12px';
        li.style.borderBottom = '1px solid var(--border)';

        const link = document.createElement('a');
        link.href = toSafeLink(item.link);
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.style.color = '#e8ecef';
        link.style.textDecoration = 'none';
        link.style.fontSize = '1.05rem';
        link.style.lineHeight = '1.5';
        link.style.fontWeight = '500';
        link.style.display = 'block';
        link.style.transition = 'color 0.2s';
        link.textContent = displayTitle;

        const meta = document.createElement('div');
        meta.style.fontSize = '0.75rem';
        meta.style.color = '#8892b0';
        meta.style.marginTop = '6px';
        meta.style.fontFamily = 'monospace';
        meta.style.letterSpacing = '0.02em';
        meta.textContent = `🗞️ ${displaySource} • 🕒 ${date}`;

        li.appendChild(link);
        li.appendChild(meta);
        list.appendChild(li);
      });

      container.innerHTML = '';
      container.appendChild(list);
    }
    showNews('usa');
    const SENTIMENT_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

    function applysentiment(el, valueText, color) {
      el.textContent = valueText;
      el.style.color = color;
    }

    async function fetchSentiment() {
      const el = document.getElementById('sentiment-val');
      if (!el) return;

      // Show cached value instantly if available (stale-while-revalidate)
      let hadCache = false;
      try {
        const cached = JSON.parse(localStorage.getItem('cnnSentimentCache') || 'null');
        if (cached && cached.valueText) {
          const age = Date.now() - (cached.updatedAt || 0);
          // If cache is fresh enough, show it and skip the network call entirely
          if (age < SENTIMENT_CACHE_TTL) {
            applysentiment(el, cached.valueText, cached.color || '#ffffff');
            return;
          }
          // Stale cache: show it immediately, then refresh in background
          applysentiment(el, `${cached.valueText}`, cached.color || '#ffffff');
          hadCache = true;
        }
      } catch (_) { /* ignore broken cache */ }

      // Background (or foreground if no cache) network fetch
      try {
        const proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://production.dataviz.cnn.io/index/fearandgreed/graphdata');
        const res = await fetch(proxyUrl);
        if (!res.ok) throw new Error('CNN sentiment fetch failed');

        const data = await res.json();
        const score = data?.fear_and_greed?.score;
        const rating = data?.fear_and_greed?.rating;

        if (typeof score === 'number' && typeof rating === 'string') {
          const rounded = Math.round(score);
          const label = rating.replace(/\b\w/g, c => c.toUpperCase());

          let color = '#ffffff';
          if (rounded <= 25) color = '#ff4f4f';
          else if (rounded <= 45) color = '#ff9c4f';
          else if (rounded < 55) color = '#ffffff';
          else if (rounded < 75) color = '#9eff6b';
          else color = '#6dff85';

          const valueText = `${rounded} (${label})`;
          applysentiment(el, valueText, color);

          localStorage.setItem('cnnSentimentCache', JSON.stringify({
            valueText,
            color,
            updatedAt: Date.now()
          }));
          return;
        }
      } catch (e) {
        // Network failed — if we already showed stale cache, leave it; otherwise show unavailable
        if (hadCache) return;
      }

      if (!hadCache) {
        el.textContent = 'Unavailable';
        el.style.color = 'rgba(255,255,255,0.65)';
      }
    }

    function isUsMarketOpenNow() {
      const now = new Date();
      const estNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
      const day = estNow.getDay();
      if (day === 0 || day === 6) return false;

      const minutes = estNow.getHours() * 60 + estNow.getMinutes();
      const openMinutes = 9 * 60 + 30;
      const closeMinutes = 16 * 60;
      return minutes >= openMinutes && minutes < closeMinutes;
    }

    const TWELVE_DATA_API_KEY = 'e113279daa094cf29e24802ff56566e2';
    const ALPHA_VANTAGE_API_KEY = 'JUIUIHXXSHB4IAJW';
    const TWELVE_DATA_BACKOFF_KEY = 'twelveDataBackoffUntil';
    const TWELVE_DATA_BACKOFF_MS = 12 * 60 * 60 * 1000;

    function isQuoteLive(quote) {
      if (!quote || quote.is_market_open === undefined || quote.is_market_open === null) {
        return isUsMarketOpenNow();
      }

      if (typeof quote.is_market_open === 'boolean') return quote.is_market_open;
      if (typeof quote.is_market_open === 'number') return quote.is_market_open === 1;
      if (typeof quote.is_market_open === 'string') {
        const value = quote.is_market_open.trim().toLowerCase();
        return value === 'true' || value === '1' || value === 'yes';
      }

      return isUsMarketOpenNow();
    }

    function updateIndexRow(prefix, quote) {
      const priceEl = document.getElementById(`${prefix}-price`);
      const changeEl = document.getElementById(`${prefix}-change`);
      const stateEl = document.getElementById(`${prefix}-state`);
      if (!priceEl || !changeEl || !stateEl) return;

      if (!quote) {
        priceEl.textContent = '--';
        changeEl.textContent = '--';
        changeEl.className = 'market-index-change flat';
        stateEl.textContent = '--';
        stateEl.className = 'market-index-state na';
        return;
      }

      const price = parseFloat(quote.close);
      const change = parseFloat(quote.change);
      const pct = parseFloat(quote.percent_change);

      if (Number.isNaN(price) || Number.isNaN(change) || Number.isNaN(pct)) {
        priceEl.textContent = '--';
        changeEl.textContent = '--';
        changeEl.className = 'market-index-change flat';
        stateEl.textContent = '--';
        stateEl.className = 'market-index-state na';
        return;
      }

      priceEl.textContent = price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      const sign = change > 0 ? '+' : change < 0 ? '-' : '';
      const changeText = `${sign}${Math.abs(pct).toFixed(2)}%`;
      changeEl.textContent = changeText;
      changeEl.className = `market-index-change ${change > 0 ? 'up' : change < 0 ? 'down' : 'flat'}`;

      const quoteIsLive = isQuoteLive(quote);
      stateEl.textContent = quoteIsLive ? 'Live' : 'Last';
      stateEl.className = `market-index-state ${quoteIsLive ? 'live' : 'last'}`;
    }

    // During market hours refresh every 5 min; outside hours every 60 min (prices don't change)
    const INDEX_CACHE_TTL_LIVE = 5 * 60 * 1000;
    const INDEX_CACHE_TTL_CLOSED = 60 * 60 * 1000;

    function applyIndexCache(cache) {
      updateIndexRow('idx-dji', cache.dji);
      updateIndexRow('idx-ixic', cache.ixic);
      updateIndexRow('idx-gspc', cache.spx);
    }

    async function fetchMajorIndexes() {
      const isUsableQuote = (quote) => quote && quote.status !== 'error' && quote.close !== undefined;
      const hasUsableCachedQuote = (cache) => cache && (
        isUsableQuote(cache.dji) ||
        isUsableQuote(cache.ixic) ||
        isUsableQuote(cache.spx)
      );
      const getTwelveDataBackoffUntil = () => Number(localStorage.getItem(TWELVE_DATA_BACKOFF_KEY) || '0');
      const isTwelveDataBackedOff = () => getTwelveDataBackoffUntil() > Date.now();
      const markTwelveDataBackoff = () => {
        localStorage.setItem(TWELVE_DATA_BACKOFF_KEY, String(Date.now() + TWELVE_DATA_BACKOFF_MS));
      };
      const clearTwelveDataBackoff = () => {
        localStorage.removeItem(TWELVE_DATA_BACKOFF_KEY);
      };

      // Determine appropriate TTL based on market hours
      const cacheTTL = isUsMarketOpenNow() ? INDEX_CACHE_TTL_LIVE : INDEX_CACHE_TTL_CLOSED;

      // Show cached data immediately if fresh enough, skipping the network entirely
      let hadCache = false;
      try {
        const cached = JSON.parse(localStorage.getItem('majorIndexCache') || 'null');
        if (cached && cached.updatedAt && hasUsableCachedQuote(cached)) {
          const age = Date.now() - cached.updatedAt;
          if (age < cacheTTL) {
            applyIndexCache(cached);
            fetchSentiment();
            return;
          }
          // Stale — show immediately while refreshing in background
          applyIndexCache(cached);
          hadCache = true;
        } else if (cached && cached.updatedAt) {
          localStorage.removeItem('majorIndexCache');
        }
      } catch (_) { /* ignore broken cache */ }

      // --- Helper: fetch a single ETF proxy quote from Alpha Vantage ---
      async function fetchAlphaVantageQuote(symbol) {
        const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${ALPHA_VANTAGE_API_KEY}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Alpha Vantage ${symbol} ${res.status}`);

        const data = await res.json();
        if (data?.Information || data?.Note || data?.['Error Message']) {
          throw new Error(`Alpha Vantage ${symbol} unavailable`);
        }

        const quote = data?.['Global Quote'];
        if (!quote || Object.keys(quote).length === 0) {
          throw new Error(`Alpha Vantage ${symbol} missing quote`);
        }

        const price = parseFloat(quote['05. price']);
        const change = parseFloat(quote['09. change']);
        const pctText = quote['10. change percent'] || '';
        const pct = parseFloat(pctText.replace('%', ''));
        if (Number.isNaN(price) || Number.isNaN(change) || Number.isNaN(pct)) {
          throw new Error(`Alpha Vantage ${symbol} invalid numbers`);
        }

        return {
          close: price,
          change,
          percent_change: pct,
          is_market_open: isUsMarketOpenNow()
        };
      }

      // --- Helper: fetch a single ETF proxy quote from Yahoo Finance via r.jina.ai ---
      async function fetchJinaYahooQuote(symbol) {
        const url = `https://r.jina.ai/http://https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Jina Yahoo ${symbol} ${res.status}`);

        const text = await res.text();
        const jsonStart = text.indexOf('{');
        const jsonEnd = text.lastIndexOf('}');
        if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
          throw new Error(`Jina Yahoo ${symbol} missing JSON`);
        }

        const data = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
        const meta = data?.chart?.result?.[0]?.meta;
        if (!meta) throw new Error(`Jina Yahoo ${symbol} missing meta`);

        const price = Number(meta.regularMarketPrice);
        const prevClose = Number(meta.chartPreviousClose ?? meta.previousClose ?? meta.regularMarketPreviousClose);
        if (Number.isNaN(price) || Number.isNaN(prevClose) || prevClose === 0) {
          throw new Error(`Jina Yahoo ${symbol} invalid numbers`);
        }

        const change = price - prevClose;
        const pct = (change / prevClose) * 100;
        return {
          close: price,
          change,
          percent_change: pct,
          is_market_open: isUsMarketOpenNow()
        };
      }

      // --- Tier 1: Twelve Data ---
      let djiQuote = null, ixicQuote = null, spxQuote = null;
      let twelveDataOk = false;
      if (!isTwelveDataBackedOff()) {
        try {
          const requestedRes = await fetch(`https://api.twelvedata.com/quote?symbol=.DJI,.SPX,.IXIC&apikey=${TWELVE_DATA_API_KEY}`);
          if (requestedRes.status === 429) {
            markTwelveDataBackoff();
            throw new Error('Twelve Data rate limited');
          }
          const requestedData = await requestedRes.json();

          djiQuote = requestedData['.DJI'] || null;
          ixicQuote = requestedData['.IXIC'] || null;
          spxQuote = requestedData['.SPX'] || null;

          // Twelve Data sometimes rejects dotted index symbols — fall back to ETF proxies
          if (!isUsableQuote(djiQuote) || !isUsableQuote(ixicQuote) || !isUsableQuote(spxQuote)) {
            const fallbackRes = await fetch(`https://api.twelvedata.com/quote?symbol=DIA,QQQ,SPY&apikey=${TWELVE_DATA_API_KEY}`);
            if (fallbackRes.status === 429) {
              markTwelveDataBackoff();
              throw new Error('Twelve Data rate limited');
            }
            const fallbackData = await fallbackRes.json();
            if (!isUsableQuote(djiQuote)) djiQuote = fallbackData.DIA || null;
            if (!isUsableQuote(ixicQuote)) ixicQuote = fallbackData.QQQ || null;
            if (!isUsableQuote(spxQuote)) spxQuote = fallbackData.SPY || null;
          }

          if (isUsableQuote(djiQuote) && isUsableQuote(ixicQuote) && isUsableQuote(spxQuote)) {
            twelveDataOk = true;
            clearTwelveDataBackoff();
          }
        } catch (_) { /* fall through to Alpha Vantage */ }
      }

      // --- Tier 2: Alpha Vantage ETF proxies ---
      if (!twelveDataOk) {
        try {
          const [aDji, aIxic, aSpx] = await Promise.all([
            fetchAlphaVantageQuote('DIA'),
            fetchAlphaVantageQuote('QQQ'),
            fetchAlphaVantageQuote('SPY')
          ]);
          if (!isUsableQuote(djiQuote)) djiQuote = aDji;
          if (!isUsableQuote(ixicQuote)) ixicQuote = aIxic;
          if (!isUsableQuote(spxQuote)) spxQuote = aSpx;
        } catch (_) { /* fall through to Yahoo via r.jina.ai */ }
      }

      // --- Tier 3: Yahoo Finance ETF proxies via r.jina.ai ---
      if (!isUsableQuote(djiQuote) || !isUsableQuote(ixicQuote) || !isUsableQuote(spxQuote)) {
        try {
          const [yDji, yIxic, ySpx] = await Promise.all([
            fetchJinaYahooQuote('DIA'),
            fetchJinaYahooQuote('QQQ'),
            fetchJinaYahooQuote('SPY')
          ]);
          if (!isUsableQuote(djiQuote)) djiQuote = yDji;
          if (!isUsableQuote(ixicQuote)) ixicQuote = yIxic;
          if (!isUsableQuote(spxQuote)) spxQuote = ySpx;
        } catch (_) { /* all sources failed */ }
      }

      if (isUsableQuote(djiQuote) || isUsableQuote(ixicQuote) || isUsableQuote(spxQuote)) {
        updateIndexRow('idx-dji', djiQuote);
        updateIndexRow('idx-ixic', ixicQuote);
        updateIndexRow('idx-gspc', spxQuote);

        localStorage.setItem('majorIndexCache', JSON.stringify({
          dji: djiQuote,
          ixic: ixicQuote,
          spx: spxQuote,
          updatedAt: Date.now()
        }));
      } else if (!hadCache) {
        updateIndexRow('idx-dji', null);
        updateIndexRow('idx-ixic', null);
        updateIndexRow('idx-gspc', null);
      }

      fetchSentiment();
    }
    function updateMarketStatus() {
      const now = new Date();
      // Adjust to EST for accurate market time
      const estTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
      const day = estTime.getDay(); // 0 is Sunday, 6 is Saturday
      const marketStatus = document.getElementById('market-status');

      // Check if weekend
      if (day === 0 || day === 6) {
          const totalMinutes = estTime.getHours() * 60 + estTime.getMinutes();
          const openTime = 9 * 60 + 30;
          let daysUntilOpen = day === 6 ? 2 : 1; // Saturday -> 2 days to Monday, Sunday -> 1 day to Monday
          const minutesUntilOpen = ((24 * 60 - totalMinutes) + openTime) + ((daysUntilOpen - 1) * 24 * 60);
          marketStatus.textContent = 'Weekend · Opens in ' + Math.floor(minutesUntilOpen / 60 / 24) + 'd ' + Math.floor((minutesUntilOpen / 60) % 24) + 'h';
          return;
      }

      // TODO: Add holiday logic here if needed (e.g., specific dates)

      const totalMinutes = estTime.getHours() * 60 + estTime.getMinutes();
      const openTime = 9 * 60 + 30, closeTime = 16 * 60;

      if (totalMinutes >= openTime && totalMinutes < closeTime) {
          const timeLeft = closeTime - totalMinutes;
          marketStatus.textContent = 'Market closes in ' + Math.floor(timeLeft/60) + 'h ' + (timeLeft%60) + 'm';
      } else {
          // If before 9:30 AM, calculate time until open today
          if (totalMinutes < openTime) {
              const timeUntilOpen = openTime - totalMinutes;
              marketStatus.textContent = 'Market opens in ' + Math.floor(timeUntilOpen/60) + 'h ' + (timeUntilOpen%60) + 'm';
          } else {
              // After 4 PM, calculate time until open tomorrow (or Monday)
              let daysUntilOpen = 1;
              if (day === 5) daysUntilOpen = 3; // If Friday, open Monday

              const minutesUntilOpen = ((24 * 60 - totalMinutes) + openTime) + ((daysUntilOpen - 1) * 24 * 60);
              marketStatus.textContent = 'Market opens in ' + Math.floor(minutesUntilOpen / 60) + 'h ' + (minutesUntilOpen % 60) + 'm';
          }
      }
    }
    function updateClock() {
      const options = {
        timeZone: 'America/Los_Angeles',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      };
      document.getElementById('clock').textContent = new Date().toLocaleTimeString('en-US', options);
      updateMarketStatus();
    }
    fetchMajorIndexes();
    setInterval(fetchMajorIndexes, 120000);
    setInterval(updateClock, 1000);
    updateClock();

    // Weather Script
    async function fetchWeather() {
      const descEl = document.getElementById('weather-desc');
      const rangeEl = document.getElementById('weather-range');
      const summaryEl = document.getElementById('weather-summary');
      const cityEl = document.getElementById('weather-city');
      const tempEl = document.getElementById('weather-temp');

      const conditions = {
        0: "Clear", 1: "Mainly Clear", 2: "Partly Cloudy", 3: "Cloudy",
        45: "Foggy", 48: "Rime Fog", 51: "Light Drizzle", 53: "Drizzle",
        55: "Heavy Drizzle", 61: "Light Rain", 63: "Rain", 65: "Heavy Rain",
        71: "Light Snow", 73: "Snow", 75: "Heavy Snow", 95: "Thunderstorm"
      };

      const icons = {
        0: "☀️", 1: "🌤️", 2: "⛅", 3: "☁️",
        45: "🌫️", 48: "🌫️", 51: "🌦️", 53: "🌦️",
        55: "🌧️", 61: "🌧️", 63: "🌧️", 65: "⛈️",
        71: "🌨️", 73: "🌨️", 75: "❄️", 95: "⚡"
      };

      async function renderWeather(latitude, longitude, locationLabel) {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code&temperature_unit=fahrenheit&timezone=auto`);
        const data = await res.json();

        const temp = Math.round(data.current.temperature_2m);
        const max = Math.round(data.daily.temperature_2m_max[0]);
        const min = Math.round(data.daily.temperature_2m_min[0]);
        const condition = conditions[data.current.weather_code] || "Unknown";
        const icon = icons[data.current.weather_code] || "🌡️";

        const dailyCodes = data.daily.weather_code;
        const dailyMax = data.daily.temperature_2m_max;
        const dailyMin = data.daily.temperature_2m_min;
        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const today = new Date().getDay();

        let weekHTML = "";
        for (let i = 1; i <= 6; i++) {
          const dayIndex = (today + i) % 7;
          const dayCondition = conditions[dailyCodes[i]] || "Var";
          const dayIcon = icons[dailyCodes[i]] || "🌡️";
          const dayMax = Math.round(dailyMax[i]);
          const dayMin = Math.round(dailyMin[i]);
          weekHTML += `<div class="weather-day">
                       <div class="weather-day-name">${days[dayIndex]} ${dayIcon}</div>
                       <div class="weather-day-cond">${dayCondition}</div>
                       <div class="weather-day-temps">H:${dayMax}° L:${dayMin}°</div>
                      </div>`;
        }

        tempEl.textContent = `${icon} ${temp}°F`;
        descEl.textContent = condition;
        rangeEl.textContent = `H: ${max}° L: ${min}°`;
        summaryEl.innerHTML = weekHTML;
        if (cityEl && locationLabel) cityEl.textContent = `Location: ${locationLabel}`;
      }

      async function fetchApproximateLocation() {
        const res = await fetch('https://ipapi.co/json/');
        if (!res.ok) throw new Error('Approximate location lookup failed');
        const data = await res.json();
        if (typeof data.latitude !== 'number' || typeof data.longitude !== 'number') {
          throw new Error('Approximate location lookup missing coordinates');
        }

        const parts = [data.city, data.region_code || data.region].filter(Boolean);
        return {
          latitude: data.latitude,
          longitude: data.longitude,
          label: parts.length > 0 ? parts.join(', ') : 'Approximate location'
        };
      }

      async function fetchLocationLabel(latitude, longitude) {
        try {
          const geoRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
          const geo = await geoRes.json();
          const city = geo.city || geo.locality || geo.principalSubdivision || '';
          const region = geo.principalSubdivisionCode || geo.principalSubdivision || '';

          if (city && region) return `${city}, ${region}`;
          if (city) return city;
          if (region) return region;
        } catch (e) {
          // Ignore location lookup errors and fall back below.
        }
        return 'Unknown location';
      }

      if (!navigator.geolocation) {
        try {
          const approx = await fetchApproximateLocation();
          await renderWeather(approx.latitude, approx.longitude, `${approx.label} (Approx)`);
        } catch (_) {
          descEl.textContent = "Geoloc not supported";
          if (cityEl) cityEl.textContent = 'Location: Unavailable';
        }
        return;
      }

      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        if (cityEl) {
          cityEl.textContent = 'Location: Detecting...';
          fetchLocationLabel(latitude, longitude).then((label) => {
            cityEl.textContent = `Location: ${label}`;
          });
        }

        try {
          await renderWeather(latitude, longitude, null);
        } catch (e) {
          descEl.textContent = "Error loading";
        }
      }, async () => {
        try {
          const approx = await fetchApproximateLocation();
          await renderWeather(approx.latitude, approx.longitude, `${approx.label} (Approx)`);
        } catch (_) {
          descEl.textContent = "Location access denied";
          if (cityEl) cityEl.textContent = 'Location: Permission denied';
        }
      });
    }
    fetchWeather();

    function setNascarTabActive(seriesType) {
      const tabs = ['cup', 'truck', 'oreilly'];
      tabs.forEach((tab) => {
        const el = document.getElementById(`nascar-tab-${tab}`);
        if (!el) return;
        if (tab === seriesType) el.classList.add('active');
        else el.classList.remove('active');
      });
    }

    window.showNascarSeries = function(seriesType) {
      setNascarTabActive(seriesType);
      fetchNextNascarRace(seriesType);
    };

    async function fetchNextNascarRace(seriesType = 'cup') {
      const raceEl = document.getElementById('nascar-race');
      const trackEl = document.getElementById('nascar-track');
      const whenEl = document.getElementById('nascar-when');
      const broadcastEl = document.getElementById('nascar-broadcast');

      const seriesMap = {
        cup: { key: 'series_1', fallbackLabel: 'Cup' },
        truck: { key: 'series_3', fallbackLabel: 'Truck' },
        oreilly: { key: 'series_2', fallbackLabel: "O'Reilly Auto Parts Series" }
      };

      const selected = seriesMap[seriesType] || seriesMap.cup;

      const setUnavailable = () => {
        raceEl.textContent = 'Unavailable';
        trackEl.textContent = '--';
        whenEl.textContent = '--';
        broadcastEl.textContent = '--';
      };

      try {
        const now = new Date();
        const yearsToCheck = [now.getFullYear(), now.getFullYear() + 1];
        let nextRace = null;

        for (const year of yearsToCheck) {
          const res = await fetch(`https://cf.nascar.com/cacher/${year}/race_list_basic.json`);
          const data = await res.json();
          const seriesRaces = Array.isArray(data[selected.key]) ? data[selected.key] : [];

          const upcoming = seriesRaces
            .map((race) => ({ ...race, raceDateObj: new Date(race.race_date || race.date_scheduled) }))
            .filter((race) => !isNaN(race.raceDateObj.getTime()) && race.raceDateObj >= now)
            .sort((a, b) => a.raceDateObj - b.raceDateObj);

          if (upcoming.length > 0) {
            nextRace = upcoming[0];
            break;
          }
        }

        if (!nextRace) {
          setUnavailable();
          return;
        }

        const displayDate = nextRace.raceDateObj.toLocaleDateString('en-US', {
          timeZone: 'America/New_York',
          weekday: 'short',
          month: 'short',
          day: 'numeric'
        });

        const displayTimeET = nextRace.raceDateObj.toLocaleTimeString('en-US', {
          timeZone: 'America/New_York',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });

        const displayTimePT = nextRace.raceDateObj.toLocaleTimeString('en-US', {
          timeZone: 'America/Los_Angeles',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });

        const tv = nextRace.television_broadcaster || 'TBA';
        const raceTitle = [
          nextRace.race_name,
          nextRace.event_name,
          nextRace.name,
          nextRace.title
        ].find((value) => typeof value === 'string' && value.trim());

        raceEl.textContent = raceTitle || `Next ${selected.fallbackLabel} Event`;
        trackEl.textContent = nextRace.track_name || '--';
        whenEl.textContent = `${displayDate} | PT: ${displayTimePT} | ET: ${displayTimeET}`;
        broadcastEl.textContent = `TV: ${tv}`;
      } catch (e) {
        setUnavailable();
      }
    }

    fetchNextNascarRace('cup');

    const newsButtons = [
      { id: 'btn-usa', type: 'usa' },
      { id: 'btn-world', type: 'world' },
      { id: 'btn-finance', type: 'finance' }
    ];
    newsButtons.forEach(({ id, type }) => {
      const button = document.getElementById(id);
      if (button) {
        button.addEventListener('click', () => showNews(type));
      }
    });

    const nascarButtons = [
      { id: 'nascar-tab-cup', type: 'cup' },
      { id: 'nascar-tab-truck', type: 'truck' },
      { id: 'nascar-tab-oreilly', type: 'oreilly' }
    ];
    nascarButtons.forEach(({ id, type }) => {
      const button = document.getElementById(id);
      if (button) {
        button.addEventListener('click', () => showNascarSeries(type));
      }
    });
