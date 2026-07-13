    let allNewsItems = [];
    const NEWS_MAX_ITEMS = 10;
    const NEWS_CACHE_PREFIX = 'homeNewsCache:';
    const NEWS_REQUEST_TIMEOUT_MS = 9000;
    const NEWS_LOADING_TIMEOUT_MS = 12000;
    const WEATHER_CACHE_TTL_MS = 15 * 60 * 1000;
    const WEATHER_LOCATION_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
    const WEATHER_LAST_SNAPSHOT_KEY = 'homeWeatherLastSnapshot';
    const WEATHER_APPROX_LOCATION_KEY = 'homeWeatherApproxLocation';
    const NASCAR_CACHE_PREFIX = 'homeNascarSchedule:';
    const NASCAR_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
    const DEBUG_LOGS = false;
    const REVERSE_GEO_CACHE_PREFIX = 'homeReverseGeoCache:';
    const REVERSE_GEO_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
    let newsRequestSeq = 0;

    function debugLog(...args) {
      if (!DEBUG_LOGS) return;
      console.log(...args);
    }

    function readStorageJson(key, storage = localStorage) {
      try {
        return JSON.parse(storage.getItem(key) || 'null');
      } catch (_) {
        return null;
      }
    }

    function writeStorageJson(key, value, storage = localStorage) {
      try {
        storage.setItem(key, JSON.stringify(value));
      } catch (_) {
        // Ignore storage quota and privacy mode failures.
      }
    }

    function isFreshTimestamp(updatedAt, ttlMs) {
      return Number.isFinite(updatedAt) && Date.now() - updatedAt < ttlMs;
    }

    function reverseGeoCacheKey(latitude, longitude) {
      return `${REVERSE_GEO_CACHE_PREFIX}${Number(latitude).toFixed(3)},${Number(longitude).toFixed(3)}`;
    }

    async function getReverseGeocode(latitude, longitude) {
      const cacheKey = reverseGeoCacheKey(latitude, longitude);
      const cached = readStorageJson(cacheKey);
      if (cached && isFreshTimestamp(cached.updatedAt, REVERSE_GEO_CACHE_TTL_MS) && cached.data) {
        return cached.data;
      }

      const geoRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
      const geo = await geoRes.json();
      writeStorageJson(cacheKey, { data: geo, updatedAt: Date.now() });
      return geo;
    }

    // News cache with timestamps
    const newsCache = {};
    const CACHE_DURATION = 3600000; // 1 hour in milliseconds

    async function showNews(type) {
      const container = document.getElementById('news-container');
      if (!container) return;

      const requestId = ++newsRequestSeq;
      container.textContent = 'Loading...';

      const loadingWatchdog = window.setTimeout(() => {
        if (requestId !== newsRequestSeq) return;
        if (String(container.textContent || '').trim() !== 'Loading...') return;

        allNewsItems = Array.isArray(FALLBACK_NEWS.items) ? FALLBACK_NEWS.items : [];
        renderNews();
      }, NEWS_LOADING_TIMEOUT_MS);

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
        if (requestId !== newsRequestSeq) return;

        allNewsItems = Array.isArray(data?.items) ? data.items : [];
        renderNews();
      } catch (e) { 
        if (requestId !== newsRequestSeq) return;
        console.error('News error:', e);
        allNewsItems = Array.isArray(FALLBACK_NEWS.items) ? FALLBACK_NEWS.items : [];
        renderNews();
      } finally {
        clearTimeout(loadingWatchdog);
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
          debugLog(`Using cached news for ${cacheKey}`);
          return cached.data;
        }
      }

      const persistentCacheKey = `${NEWS_CACHE_PREFIX}${cacheKey}`;
      const persisted = readStorageJson(persistentCacheKey);
      if (persisted && isFreshTimestamp(persisted.timestamp, CACHE_DURATION) && persisted.data) {
        newsCache[cacheKey] = persisted;
        return persisted.data;
      }

      // Cache miss or expired - fetch fresh data
      const data = await fetchNewsWithRetry(feedUrl);
      
      // Store in cache
      newsCache[cacheKey] = {
        data: data,
        timestamp: Date.now()
      };
      writeStorageJson(persistentCacheKey, newsCache[cacheKey]);
      
      return data;
    }

    async function fetchNewsWithRetry(feedUrl, maxRetries = 3) {
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          // Use RSS2JSON API to convert RSS to JSON
          const controller = new AbortController();
          const timeoutId = window.setTimeout(() => controller.abort(), NEWS_REQUEST_TIMEOUT_MS);
          const response = await fetch(
            'https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(feedUrl),
            { signal: controller.signal }
          );
          clearTimeout(timeoutId);
          
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
            debugLog(`Successfully fetched ${data.items.length} news items`);
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
      list.className = 'news-list';
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
        li.className = 'news-item-card';

        const link = document.createElement('a');
        link.className = 'news-item-link';
        link.href = toSafeLink(item.link);
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = displayTitle;

        const meta = document.createElement('div');
        meta.className = 'news-item-meta';
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

      const sentimentSources = [
        'https://production.dataviz.cnn.io/index/fearandgreed/graphdata',
        'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://production.dataviz.cnn.io/index/fearandgreed/graphdata')
      ];

      const readSentimentPayload = async (response) => {
        if (!response.ok) {
          throw new Error(`CNN sentiment fetch failed with ${response.status}`);
        }

        const contentType = String(response.headers.get('content-type') || '').toLowerCase();
        if (contentType.includes('application/json')) {
          return response.json();
        }

        const text = await response.text();
        try {
          return JSON.parse(text);
        } catch (_) {
          const start = text.indexOf('{');
          const end = text.lastIndexOf('}');
          if (start === -1 || end === -1 || end <= start) {
            throw new Error('CNN sentiment response did not include JSON');
          }
          return JSON.parse(text.slice(start, end + 1));
        }
      };

      // Background (or foreground if no cache) network fetch
      try {
        let data = null;
        let lastError = null;

        for (const sourceUrl of sentimentSources) {
          try {
            const res = await fetch(sourceUrl, { cache: 'no-store' });
            data = await readSentimentPayload(res);
            break;
          } catch (error) {
            lastError = error;
          }
        }

        if (!data) {
          throw lastError || new Error('CNN sentiment fetch failed');
        }

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

    const MARKET_OPEN_SECONDS = (9 * 3600) + (30 * 60);
    const MARKET_CLOSE_SECONDS = 16 * 3600;
    const MARKET_EARLY_CLOSE_SECONDS = 13 * 3600;
    const marketHolidayCache = {};

    function toDateKey(year, month, day) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }

    function toDateKeyFromDate(date) {
      return toDateKey(date.getFullYear(), date.getMonth() + 1, date.getDate());
    }

    function observedFixedHoliday(year, monthIndexZeroBased, day) {
      const observed = new Date(year, monthIndexZeroBased, day, 12, 0, 0, 0);
      const weekday = observed.getDay();
      if (weekday === 6) observed.setDate(observed.getDate() - 1); // Saturday -> Friday
      if (weekday === 0) observed.setDate(observed.getDate() + 1); // Sunday -> Monday
      return observed;
    }

    function nthWeekdayOfMonth(year, monthIndexZeroBased, weekday, nth) {
      const date = new Date(year, monthIndexZeroBased, 1, 12, 0, 0, 0);
      const firstWeekday = date.getDay();
      const delta = (weekday - firstWeekday + 7) % 7;
      date.setDate(1 + delta + ((nth - 1) * 7));
      return date;
    }

    function lastWeekdayOfMonth(year, monthIndexZeroBased, weekday) {
      const date = new Date(year, monthIndexZeroBased + 1, 0, 12, 0, 0, 0);
      const delta = (date.getDay() - weekday + 7) % 7;
      date.setDate(date.getDate() - delta);
      return date;
    }

    function calculateEasterSunday(year) {
      // Anonymous Gregorian algorithm
      const a = year % 19;
      const b = Math.floor(year / 100);
      const c = year % 100;
      const d = Math.floor(b / 4);
      const e = b % 4;
      const f = Math.floor((b + 8) / 25);
      const g = Math.floor((b - f + 1) / 3);
      const h = (19 * a + b - d - g + 15) % 30;
      const i = Math.floor(c / 4);
      const k = c % 4;
      const l = (32 + (2 * e) + (2 * i) - h - k) % 7;
      const m = Math.floor((a + (11 * h) + (22 * l)) / 451);
      const month = Math.floor((h + l - (7 * m) + 114) / 31); // 3=Mar, 4=Apr
      const day = ((h + l - (7 * m) + 114) % 31) + 1;
      return new Date(year, month - 1, day, 12, 0, 0, 0);
    }

    function getUsMarketHolidayMap(year) {
      if (marketHolidayCache[year]) return marketHolidayCache[year];

      const holidays = new Map();
      const addHoliday = (date, label) => {
        if (!date || date.getFullYear() !== year) return;
        holidays.set(toDateKeyFromDate(date), label);
      };

      // Fixed-date holidays with observed rules.
      addHoliday(observedFixedHoliday(year, 0, 1), "New Year's Day");
      addHoliday(observedFixedHoliday(year + 1, 0, 1), "New Year's Day"); // can observe on Dec 31 of current year
      addHoliday(observedFixedHoliday(year, 5, 19), 'Juneteenth');
      addHoliday(observedFixedHoliday(year, 6, 4), 'Independence Day');
      addHoliday(observedFixedHoliday(year, 11, 25), 'Christmas Day');

      // Floating holidays.
      addHoliday(nthWeekdayOfMonth(year, 0, 1, 3), 'Martin Luther King Jr. Day'); // 3rd Monday Jan
      addHoliday(nthWeekdayOfMonth(year, 1, 1, 3), "Presidents' Day"); // 3rd Monday Feb
      addHoliday(lastWeekdayOfMonth(year, 4, 1), 'Memorial Day'); // last Monday May
      addHoliday(nthWeekdayOfMonth(year, 8, 1, 1), 'Labor Day'); // 1st Monday Sep
      addHoliday(nthWeekdayOfMonth(year, 10, 4, 4), 'Thanksgiving Day'); // 4th Thursday Nov

      const easterSunday = calculateEasterSunday(year);
      const goodFriday = new Date(easterSunday);
      goodFriday.setDate(goodFriday.getDate() - 2);
      addHoliday(goodFriday, 'Good Friday');

      marketHolidayCache[year] = holidays;
      return holidays;
    }

    function isEarlyCloseDate(estDate, holidayMap) {
      const day = estDate.getDay();
      const month = estDate.getMonth();
      const dayOfMonth = estDate.getDate();

      // Day after Thanksgiving (Friday)
      const thanksgiving = nthWeekdayOfMonth(estDate.getFullYear(), 10, 4, 4);
      const dayAfterThanksgiving = new Date(thanksgiving);
      dayAfterThanksgiving.setDate(dayAfterThanksgiving.getDate() + 1);
      if (toDateKeyFromDate(estDate) === toDateKeyFromDate(dayAfterThanksgiving)) {
        return true;
      }

      // Christmas Eve early close when weekday and not already a full holiday.
      if (month === 11 && dayOfMonth === 24 && day >= 1 && day <= 5 && !holidayMap.has(toDateKeyFromDate(estDate))) {
        return true;
      }

      // Typical July 3 early close if weekday and not already observed holiday closure.
      if (month === 6 && dayOfMonth === 3 && day >= 1 && day <= 5 && !holidayMap.has(toDateKeyFromDate(estDate))) {
        return true;
      }

      return false;
    }

    function getUsMarketSession(estDate) {
      const day = estDate.getDay();
      if (day === 0 || day === 6) {
        return { isTradingDay: false, reason: 'weekend', openSeconds: MARKET_OPEN_SECONDS, closeSeconds: MARKET_CLOSE_SECONDS };
      }

      const holidayMap = getUsMarketHolidayMap(estDate.getFullYear());
      const dateKey = toDateKeyFromDate(estDate);
      if (holidayMap.has(dateKey)) {
        return {
          isTradingDay: false,
          reason: 'holiday',
          holidayName: holidayMap.get(dateKey),
          openSeconds: MARKET_OPEN_SECONDS,
          closeSeconds: MARKET_CLOSE_SECONDS
        };
      }

      const earlyClose = isEarlyCloseDate(estDate, holidayMap);
      return {
        isTradingDay: true,
        reason: earlyClose ? 'early-close' : 'regular',
        openSeconds: MARKET_OPEN_SECONDS,
        closeSeconds: earlyClose ? MARKET_EARLY_CLOSE_SECONDS : MARKET_CLOSE_SECONDS,
        isEarlyClose: earlyClose
      };
    }

    function isUsMarketOpenNow() {
      const now = new Date();
      const estNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
      const session = getUsMarketSession(estNow);
      if (!session.isTradingDay) return false;

      const totalSeconds = (estNow.getHours() * 3600) + (estNow.getMinutes() * 60) + estNow.getSeconds();
      return totalSeconds >= session.openSeconds && totalSeconds < session.closeSeconds;
    }

    const TWELVE_DATA_API_KEY = 'e113279daa094cf29e24802ff56566e2';
    const MAJOR_INDEX_CACHE_KEY = 'majorIndexCache:v2';
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

      // Never show "Live" unless local market-hours logic says the market is open.
      const quoteIsLive = isUsMarketOpenNow() && isQuoteLive(quote);
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
        const cached = JSON.parse(localStorage.getItem(MAJOR_INDEX_CACHE_KEY) || 'null');
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
          localStorage.removeItem(MAJOR_INDEX_CACHE_KEY);
        }
      } catch (_) { /* ignore broken cache */ }

      // --- Helper: fetch a single index quote from Yahoo Finance via r.jina.ai ---
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

          if (isUsableQuote(djiQuote) && isUsableQuote(ixicQuote) && isUsableQuote(spxQuote)) {
            twelveDataOk = true;
            clearTwelveDataBackoff();
          }
        } catch (_) { /* fall through to Yahoo index symbols */ }
      }

      // --- Tier 2: Yahoo Finance index symbols via r.jina.ai ---
      if (!twelveDataOk) {
        try {
          const [yDji, yIxic, ySpx] = await Promise.all([
            fetchJinaYahooQuote('^DJI'),
            fetchJinaYahooQuote('^IXIC'),
            fetchJinaYahooQuote('^GSPC')
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

        localStorage.setItem(MAJOR_INDEX_CACHE_KEY, JSON.stringify({
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
    function formatDuration(secondsRemaining) {
      const total = Math.max(0, Math.floor(secondsRemaining));
      const days = Math.floor(total / 86400);
      const hours = Math.floor((total % 86400) / 3600);
      const minutes = Math.floor((total % 3600) / 60);
      const seconds = total % 60;

      if (days > 0) return `${days}d ${hours}h ${minutes}m ${seconds}s`;
      if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
      return `${minutes}m ${seconds}s`;
    }

    function updateMarketStatus() {
      const now = new Date();
      // Adjust to EST for accurate market time
      const estTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
      const day = estTime.getDay(); // 0 is Sunday, 6 is Saturday
      const marketStatus = document.getElementById('market-status');
      if (!marketStatus) return;

      const totalSeconds = (estTime.getHours() * 3600) + (estTime.getMinutes() * 60) + estTime.getSeconds();
      const session = getUsMarketSession(estTime);

      const getSecondsUntilNextOpen = () => {
        for (let dayOffset = 0; dayOffset < 10; dayOffset++) {
          const candidate = new Date(estTime.getFullYear(), estTime.getMonth(), estTime.getDate() + dayOffset, estTime.getHours(), estTime.getMinutes(), estTime.getSeconds(), 0);
          const candidateSession = getUsMarketSession(candidate);
          if (!candidateSession.isTradingDay) continue;

          if (dayOffset === 0) {
            if (totalSeconds < candidateSession.openSeconds) {
              return candidateSession.openSeconds - totalSeconds;
            }
            if (totalSeconds < candidateSession.closeSeconds) {
              return 0;
            }
            continue;
          }

          return (dayOffset * 24 * 3600) + candidateSession.openSeconds - totalSeconds;
        }

        return 0;
      };

      if (session.isTradingDay && totalSeconds >= session.openSeconds && totalSeconds < session.closeSeconds) {
        const secondsLeft = session.closeSeconds - totalSeconds;
        const closeLabel = session.isEarlyClose ? 'Early closes' : 'Closes';
        marketStatus.textContent = `Market open · ${closeLabel} in ${formatDuration(secondsLeft)}`;
        marketStatus.style.color = '#8df5b2';
        marketStatus.style.fontWeight = '700';
        return;
      }

      const secondsUntilOpen = getSecondsUntilNextOpen();
      const reasonLabel = session.reason === 'holiday'
        ? `(${session.holidayName || 'Holiday'})`
        : (session.reason === 'weekend' ? '(Weekend)' : '');
      marketStatus.textContent = `Market closed ${reasonLabel} · Opens in ${formatDuration(secondsUntilOpen)}`.replace('  ', ' ').trim();
      marketStatus.style.color = session.reason === 'weekend' ? '#9ab7db' : '#f0c77e';
      marketStatus.style.fontWeight = '700';
    }
    function getUserTimeZone() {
      try {
        const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (typeof zone === 'string' && zone.trim()) return zone;
      } catch (_) {
        // Fallback handled by caller.
      }
      return null;
    }

    function formatTimeZoneLabel(zone) {
      if (!zone) return 'Local';

      try {
        const parts = new Intl.DateTimeFormat('en-US', {
          timeZone: zone,
          timeZoneName: 'short'
        }).formatToParts(new Date());

        const tzPart = parts.find((part) => part.type === 'timeZoneName');
        if (tzPart && tzPart.value) return tzPart.value;
      } catch (_) {
        // Fallback handled below.
      }

      return zone;
    }

    function updateClock() {
      const zone = getUserTimeZone();
      const titleEl = document.getElementById('clock-title');
      if (titleEl) {
        titleEl.textContent = `Time (${formatTimeZoneLabel(zone)})`;
      }

      const options = {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      };

      if (zone) {
        options.timeZone = zone;
      }

      document.getElementById('clock').textContent = new Date().toLocaleTimeString('en-US', options);
    }

    let majorIndexesTimer = null;
    let majorIndexesInFlight = false;
    let clockTimer = null;
    let marketStatusTimer = null;

    function getMajorIndexRefreshIntervalMs() {
      return isUsMarketOpenNow() ? INDEX_CACHE_TTL_LIVE : INDEX_CACHE_TTL_CLOSED;
    }

    async function refreshMajorIndexesNow() {
      if (majorIndexesInFlight || document.hidden) return;

      majorIndexesInFlight = true;
      try {
        await fetchMajorIndexes();
      } finally {
        majorIndexesInFlight = false;
        scheduleMajorIndexesRefresh();
      }
    }

    function scheduleMajorIndexesRefresh(delayMs = getMajorIndexRefreshIntervalMs()) {
      if (majorIndexesTimer) clearTimeout(majorIndexesTimer);
      if (document.hidden) return;

      majorIndexesTimer = window.setTimeout(() => {
        majorIndexesTimer = null;
        refreshMajorIndexesNow();
      }, delayMs);
    }

    function startClockUpdates() {
      if (clockTimer) return;
      updateClock();
      clockTimer = window.setInterval(updateClock, 1000);
    }

    function stopClockUpdates() {
      if (!clockTimer) return;
      clearInterval(clockTimer);
      clockTimer = null;
    }

    function startMarketStatusUpdates() {
      if (marketStatusTimer) return;
      updateMarketStatus();
      marketStatusTimer = window.setInterval(updateMarketStatus, 1000);
    }

    function stopMarketStatusUpdates() {
      if (!marketStatusTimer) return;
      clearInterval(marketStatusTimer);
      marketStatusTimer = null;
    }

    function syncHomePageSchedulers() {
      if (document.hidden) {
        stopClockUpdates();
        stopMarketStatusUpdates();
        if (majorIndexesTimer) {
          clearTimeout(majorIndexesTimer);
          majorIndexesTimer = null;
        }
        return;
      }

      startClockUpdates();
      startMarketStatusUpdates();
      if (!majorIndexesTimer && !majorIndexesInFlight) {
        refreshMajorIndexesNow();
      }
    }

    document.addEventListener('visibilitychange', syncHomePageSchedulers);
    syncHomePageSchedulers();

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

      function renderWeatherSnapshot(snapshot, locationLabel) {
        if (!snapshot) return;

        tempEl.textContent = `${snapshot.icon} ${snapshot.temp}°F`;
        descEl.textContent = snapshot.condition;
        rangeEl.textContent = `H: ${snapshot.max}° L: ${snapshot.min}°`;
        summaryEl.innerHTML = snapshot.weekHtml;
        if (cityEl && locationLabel) cityEl.textContent = `Location: ${locationLabel}`;
      }

      function buildWeatherSnapshot(data) {
        const temp = Math.round(data.current.temperature_2m);
        const max = Math.round(data.daily.temperature_2m_max[0]);
        const min = Math.round(data.daily.temperature_2m_min[0]);
        const condition = conditions[data.current.weather_code] || 'Unknown';
        const icon = icons[data.current.weather_code] || '🌡️';

        const dailyCodes = data.daily.weather_code;
        const dailyMax = data.daily.temperature_2m_max;
        const dailyMin = data.daily.temperature_2m_min;
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const today = new Date().getDay();

        let weekHtml = '';
        for (let i = 1; i <= 6; i++) {
          const dayIndex = (today + i) % 7;
          const dayCondition = conditions[dailyCodes[i]] || 'Var';
          const dayIcon = icons[dailyCodes[i]] || '🌡️';
          const dayMax = Math.round(dailyMax[i]);
          const dayMin = Math.round(dailyMin[i]);
          weekHtml += `<div class="weather-day">
                       <div class="weather-day-name">${days[dayIndex]} ${dayIcon}</div>
                       <div class="weather-day-cond">${dayCondition}</div>
                       <div class="weather-day-temps">H:${dayMax}° L:${dayMin}°</div>
                      </div>`;
        }

        return { temp, max, min, condition, icon, weekHtml };
      }

      function getWeatherCacheKey(latitude, longitude) {
        return `${WEATHER_LAST_SNAPSHOT_KEY}:${latitude.toFixed(2)},${longitude.toFixed(2)}`;
      }

      function persistWeatherSnapshot(cacheKey, snapshot, locationLabel) {
        const payload = {
          snapshot,
          locationLabel: locationLabel || '',
          updatedAt: Date.now()
        };
        writeStorageJson(cacheKey, payload);
        writeStorageJson(WEATHER_LAST_SNAPSHOT_KEY, payload);
      }

      const lastSnapshot = readStorageJson(WEATHER_LAST_SNAPSHOT_KEY);
      if (lastSnapshot && isFreshTimestamp(lastSnapshot.updatedAt, WEATHER_CACHE_TTL_MS) && lastSnapshot.snapshot) {
        renderWeatherSnapshot(lastSnapshot.snapshot, lastSnapshot.locationLabel);
      }

      async function renderWeather(latitude, longitude, locationLabel) {
        const cacheKey = getWeatherCacheKey(latitude, longitude);
        const cached = readStorageJson(cacheKey);
        if (cached && isFreshTimestamp(cached.updatedAt, WEATHER_CACHE_TTL_MS) && cached.snapshot) {
          renderWeatherSnapshot(cached.snapshot, locationLabel || cached.locationLabel);
          return;
        }

        if (cached && cached.snapshot) {
          renderWeatherSnapshot(cached.snapshot, locationLabel || cached.locationLabel);
        }

        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code&temperature_unit=fahrenheit&timezone=auto`);
        const data = await res.json();
        const snapshot = buildWeatherSnapshot(data);

        renderWeatherSnapshot(snapshot, locationLabel || cached?.locationLabel);
        persistWeatherSnapshot(cacheKey, snapshot, locationLabel || cached?.locationLabel);
      }

      async function fetchApproximateLocation() {
        const cached = readStorageJson(WEATHER_APPROX_LOCATION_KEY);
        if (cached && isFreshTimestamp(cached.updatedAt, WEATHER_LOCATION_CACHE_TTL_MS)) {
          return cached;
        }

        const res = await fetch('https://ipapi.co/json/');
        if (!res.ok) throw new Error('Approximate location lookup failed');
        const data = await res.json();
        if (typeof data.latitude !== 'number' || typeof data.longitude !== 'number') {
          throw new Error('Approximate location lookup missing coordinates');
        }

        const parts = [data.city, data.region_code || data.region].filter(Boolean);
        const approx = {
          latitude: data.latitude,
          longitude: data.longitude,
          label: parts.length > 0 ? parts.join(', ') : 'Approximate location',
          updatedAt: Date.now()
        };
        writeStorageJson(WEATHER_APPROX_LOCATION_KEY, approx);
        return approx;
      }

      async function fetchLocationLabel(latitude, longitude) {
        try {
          const geo = await getReverseGeocode(latitude, longitude);
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
            const latest = readStorageJson(getWeatherCacheKey(latitude, longitude));
            if (latest && latest.snapshot) {
              persistWeatherSnapshot(getWeatherCacheKey(latitude, longitude), latest.snapshot, label);
            }
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

      async function getNascarSchedule(year) {
        const cacheKey = `${NASCAR_CACHE_PREFIX}${year}`;
        const cached = readStorageJson(cacheKey);
        if (cached && isFreshTimestamp(cached.updatedAt, NASCAR_CACHE_TTL_MS) && cached.data) {
          return cached.data;
        }

        const res = await fetch(`https://cf.nascar.com/cacher/${year}/race_list_basic.json`);
        const data = await res.json();
        writeStorageJson(cacheKey, { data, updatedAt: Date.now() });
        return data;
      }

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
          const data = await getNascarSchedule(year);
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
