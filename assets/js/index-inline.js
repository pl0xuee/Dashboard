    let allNewsItems = [];
    // Tuned so the news column plus the tech pulse panel lands level with the side
    // columns - the feed itself carries 30-60 items, so this is the only limit.
    const NEWS_MAX_ITEMS = 12;
    const NEWS_CACHE_PREFIX = 'homeNewsCache:v3:';
    const NEWS_REQUEST_TIMEOUT_MS = 9000;
    const NEWS_LOADING_TIMEOUT_MS = 12000;
    const WEATHER_CACHE_TTL_MS = 15 * 60 * 1000;
    const WEATHER_LOCATION_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
    // v2: snapshots now carry an hourly strip, so older cached shapes are ignored
    const WEATHER_LAST_SNAPSHOT_KEY = 'homeWeatherLastSnapshot:v2';
    const WEATHER_APPROX_LOCATION_KEY = 'homeWeatherApproxLocation';
    const NASCAR_CACHE_PREFIX = 'homeNascarSchedule:';
    const NASCAR_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
    const DEBUG_LOGS = false;
    // every distance and speed on this page is shown imperial; the feeds are metric
    const KM_TO_MILES = 0.621371;
    const REVERSE_GEO_CACHE_PREFIX = 'homeReverseGeoCache:';
    const REVERSE_GEO_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
    let newsRequestSeq = 0;
    let currentNewsType = 'usa';
    // when the headlines currently on screen were actually fetched - the feed is
    // cached for an hour, so this is not the same as "now"
    let currentNewsFetchedAt = null;

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

    // Every network read on this page goes through here.
    //
    // A refusal is survivable - the panel keeps its last reading and flags it. A
    // hang is not: a proxy that accepts the connection and then never answers
    // leaves the panel at "Loading..." with no value, no stamp and no error, which
    // is the one state the freshness stamps exist to make impossible. The news and
    // sentiment chains each grew their own copy of this after exactly that
    // happened; this is that guard applied to the rest of them.
    const REQUEST_TIMEOUT_MS = 9000;

    async function fetchWithTimeout(url, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
      try {
        return await fetch(url, { ...options, signal: controller.signal });
      } finally {
        clearTimeout(timeoutId);
      }
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

      const geoRes = await fetchWithTimeout(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
      const geo = await geoRes.json();
      writeStorageJson(cacheKey, { data: geo, updatedAt: Date.now() });
      return geo;
    }

    // News cache with timestamps
    const newsCache = {};
    const CACHE_DURATION = 3600000; // 1 hour in milliseconds

    function setNewsTabActive(type) {
      [
        { id: 'btn-usa', type: 'usa' },
        { id: 'btn-world', type: 'world' },
        { id: 'btn-finance', type: 'finance' }
      ].forEach(({ id, type: buttonType }) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.classList.toggle('active', buttonType === type);
        el.setAttribute('aria-pressed', String(buttonType === type));
      });
    }

    // Freshness stamp shared by every panel that pulls from the network. A panel
    // holding the last good reading looks identical to a live one, so each states
    // when its number was actually obtained.
    //
    // "As of 11:45" silently reads as today, so a reading from an earlier day gets
    // the date too - the whole point of the line is that a frozen value can be seen
    // to be frozen. Passing no timestamp blanks it: there is no reading to date.
    function formatStampTime(updatedAt) {
      const when = new Date(updatedAt);
      const time = when.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      if (when.toDateString() === new Date().toDateString()) return time;
      return `${when.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${time}`;
    }

    function stampPanel(elId, updatedAt, isStale) {
      const el = document.getElementById(elId);
      if (!el) return;

      if (!Number.isFinite(updatedAt) || updatedAt <= 0) {
        el.textContent = '';
        el.classList.remove('is-stale');
        return;
      }

      el.textContent = `As of ${formatStampTime(updatedAt)}`;
      el.classList.toggle('is-stale', Boolean(isStale));
    }

    function renderNewsTimestamp() {
      const el = document.getElementById('news-asof-text');
      if (!el) return;

      if (!Number.isFinite(currentNewsFetchedAt)) {
        el.textContent = 'Refresh';
        return;
      }

      el.textContent = `As of ${formatStampTime(currentNewsFetchedAt)}`;
    }

    async function showNews(type) {
      const container = document.getElementById('news-container');
      if (!container) return;

      currentNewsType = type;
      setNewsTabActive(type);

      const requestId = ++newsRequestSeq;
      container.textContent = 'Loading...';

      // Three transports with their own deadlines can legitimately outlast this, so
      // the watchdog reports that the wait is unusual rather than ending it. It used
      // to swap in canned copy here, which is why the panel could show invented
      // headlines while the real feed was still on its way.
      const loadingWatchdog = window.setTimeout(() => {
        if (requestId !== newsRequestSeq) return;
        if (String(container.textContent || '').trim() !== 'Loading...') return;
        container.textContent = 'Still fetching headlines...';
      }, NEWS_LOADING_TIMEOUT_MS);

      try {
        let feedUrl = '';

        // Set RSS feeds based on category. Google News aggregates across
        // publishers rather than pinning each category to a single outlet.
        // Item titles arrive as "Headline - Publisher", which renderNews
        // already splits to show the originating source.
        const GNEWS_REGION = 'hl=en-US&gl=US&ceid=US:en';
        const gnewsTopic = (topic) =>
          `https://news.google.com/rss/headlines/section/topic/${topic}?${GNEWS_REGION}`;

        if (type === 'usa') {
          feedUrl = gnewsTopic('NATION');
        } else if (type === 'world') {
          feedUrl = gnewsTopic('WORLD');
        } else if (type === 'finance') {
          feedUrl = gnewsTopic('BUSINESS');
        } else {
          feedUrl = `https://news.google.com/rss?${GNEWS_REGION}`;
        }

        let data = await fetchNewsWithCache(feedUrl, type);
        if (requestId !== newsRequestSeq) return;

        allNewsItems = Array.isArray(data?.items) ? data.items : [];
        renderNews();
      } catch (e) {
        if (requestId !== newsRequestSeq) return;
        console.error('News error:', e);
        renderNewsUnavailable();
      } finally {
        clearTimeout(loadingWatchdog);
      }
    }

    // Every transport failed. This used to render three invented headlines stamped
    // with the current time - copy that was indistinguishable from real reporting on
    // a panel whose entire job is to carry real reporting, and which the freshness
    // stamp would then have dated as though it had been fetched. A panel with
    // nothing to show says so.
    function renderNewsUnavailable() {
      const container = document.getElementById('news-container');
      if (!container) return;

      allNewsItems = [];
      currentNewsFetchedAt = null;

      container.innerHTML = '';
      const note = document.createElement('p');
      note.className = 'news-status-note';
      note.textContent = 'Headlines unavailable. Use the refresh control to try again.';
      container.appendChild(note);

      renderNewsTimestamp();
    }

    async function fetchNewsWithCache(feedUrl, cacheKey) {
      // Check if cache exists and is still valid
      if (newsCache[cacheKey]) {
        const cached = newsCache[cacheKey];
        const now = Date.now();
        if (now - cached.timestamp < CACHE_DURATION) {
          debugLog(`Using cached news for ${cacheKey}`);
          currentNewsFetchedAt = cached.timestamp;
          return cached.data;
        }
      }

      const persistentCacheKey = `${NEWS_CACHE_PREFIX}${cacheKey}`;
      const persisted = readStorageJson(persistentCacheKey);
      if (persisted && isFreshTimestamp(persisted.timestamp, CACHE_DURATION) && persisted.data) {
        newsCache[cacheKey] = persisted;
        currentNewsFetchedAt = persisted.timestamp;
        return persisted.data;
      }

      // Cache miss or expired - fetch fresh data
      // cacheKey is the tab name, which the direct-publisher transport needs to pick
      // the right section feeds
      const data = await fetchNewsWithRetry(feedUrl, cacheKey);
      
      // Store in cache
      newsCache[cacheKey] = {
        data: data,
        timestamp: Date.now()
      };
      writeStorageJson(persistentCacheKey, newsCache[cacheKey]);
      currentNewsFetchedAt = newsCache[cacheKey].timestamp;

      return data;
    }

    // Publishers that serve RSS with an open CORS header, so the browser can read
    // them with no proxy and no converter in the way. This is the transport of last
    // resort, and the reason the panel no longer has to fall back to invented copy.
    const DIRECT_NEWS_FEEDS = {
      usa: [
        { url: 'https://rss.nytimes.com/services/xml/rss/nyt/US.xml', source: 'The New York Times' },
        { url: 'https://moxie.foxnews.com/google-publisher/us.xml', source: 'Fox News' }
      ],
      world: [
        { url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', source: 'The New York Times' },
        { url: 'https://moxie.foxnews.com/google-publisher/world.xml', source: 'Fox News' }
      ],
      finance: [
        { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Business.xml', source: 'The New York Times' },
        { url: 'https://moxie.foxnews.com/google-publisher/business.xml', source: 'Fox News' }
      ]
    };

    function parseRssItems(xmlText, sourceLabel) {
      const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
      // a parse failure yields a document *containing* <parsererror>, not a throw
      if (doc.querySelector('parsererror')) throw new Error('Feed was not parseable XML');

      return Array.from(doc.querySelectorAll('item')).map((item) => {
        const text = (tag) => {
          const node = item.querySelector(tag);
          return node && node.textContent ? node.textContent.trim() : '';
        };

        // Google names the publisher in <source> and repeats it as a " - Publisher"
        // suffix on the headline; direct feeds carry neither and take the label we
        // already know. Either way the suffix is removed exactly once.
        const source = text('source') || sourceLabel || '';
        let title = text('title');
        if (source && title.endsWith(` - ${source}`)) {
          title = title.slice(0, -(source.length + 3)).trim();
        }

        return {
          title,
          link: text('link'),
          pubDate: text('pubDate'),
          author: source,
          // tells renderNews the publisher is already known, so it must not go
          // hunting for one by splitting the headline on " - "
          sourceKnown: Boolean(source)
        };
      }).filter((item) => item.title);
    }

    // Read the feed's own XML rather than a JSON conversion of it.
    //
    // rss2json caps free callers at 10 items (`count` needs a paid key) and keeps
    // failing to follow the redirect Google puts in front of its topic feeds,
    // answering 422 or "not a valid RSS feed". Google sends no CORS header, so this
    // still needs a proxy; allorigins is the one the sentiment fetch already uses.
    async function fetchNewsAsXml(feedUrl) {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), NEWS_REQUEST_TIMEOUT_MS);

      try {
        const response = await fetch(
          'https://api.allorigins.win/raw?url=' + encodeURIComponent(feedUrl),
          { signal: controller.signal }
        );
        if (!response.ok) throw new Error(`Feed proxy answered ${response.status}`);

        const items = parseRssItems(await response.text());
        if (items.length === 0) throw new Error('Feed carried no items');
        debugLog(`Parsed ${items.length} news items from XML`);
        return { items };
      } finally {
        clearTimeout(timeoutId);
      }
    }

    // Every publisher is fetched concurrently and one going dark just thins the
    // list, so this only fails when none of them answer.
    async function fetchNewsDirect(newsType) {
      const feeds = DIRECT_NEWS_FEEDS[newsType] || DIRECT_NEWS_FEEDS.usa;

      const perFeed = await Promise.all(feeds.map(async (feed) => {
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), NEWS_REQUEST_TIMEOUT_MS);
        try {
          const response = await fetch(feed.url, { signal: controller.signal });
          if (!response.ok) throw new Error(`${feed.source} answered ${response.status}`);
          return parseRssItems(await response.text(), feed.source);
        } catch (_) {
          return [];
        } finally {
          clearTimeout(timeoutId);
        }
      }));

      // merge by recency so no single publisher owns the top of the column
      const merged = perFeed.flat().sort((a, b) => (Date.parse(b.pubDate) || 0) - (Date.parse(a.pubDate) || 0));

      const seen = new Set();
      const items = merged.filter((item) => {
        const key = item.title.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      if (items.length === 0) throw new Error('No direct publisher feed answered');
      debugLog(`Merged ${items.length} news items from ${feeds.length} publishers`);
      return { items };
    }

    async function fetchNewsWithRetry(feedUrl, newsType, maxRetries = 3) {
      // Preferred: the whole Google News feed, aggregated across publishers and
      // uncapped. Needs the proxy, which has been unreliable, so it is only the
      // first of three transports rather than the only one.
      try {
        return await fetchNewsAsXml(feedUrl);
      } catch (e) {
        console.warn('Proxied feed read failed:', e.message);
      }

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
          console.warn(`rss2json attempt ${attempt + 1} failed:`, e.message);
          if (attempt === maxRetries - 1) break;
        }
      }

      // Last resort: publishers that need neither proxy nor converter. This still
      // throws if they all fail, which is what keeps the failure out of the cache -
      // an empty or placeholder result written here would be served for
      // CACHE_DURATION even after the real feed recovered.
      return fetchNewsDirect(newsType);
    }

    // The transports disagree about how a publication date is written, and one of
    // them is ambiguous in a way that reads as a bug on screen.
    //
    // The XML feeds carry RFC-822 dates with an explicit zone ("Tue, 21 Jul 2026
    // 23:36:00 GMT"), which Date.parse handles. rss2json instead normalises to
    // "2026-07-21 23:36:00" - UTC, but with nothing on the string that says so, so
    // the browser reads it as local time. West of Greenwich that pushes every
    // headline into the future: a story filed at 23:36 UTC showed as 11:36 PM on a
    // panel stamped 7:03 PM. Zone-less stamps are therefore read as UTC, which is
    // what rss2json actually means by them.
    const ZONELESS_STAMP = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/;

    function parseNewsDate(pubDate) {
      const raw = String(pubDate || '').trim();
      if (!raw) return NaN;
      if (ZONELESS_STAMP.test(raw)) return Date.parse(`${raw.replace(' ', 'T')}Z`);
      return Date.parse(raw);
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
        // Same rule as the panel stamps: a bare time silently reads as today, and
        // anything not from today carries its date. An unparseable pubDate shows
        // nothing rather than "Invalid Date".
        const publishedAt = parseNewsDate(item.pubDate);
        const date = Number.isFinite(publishedAt) ? formatStampTime(publishedAt) : '';

        let displayTitle = String(item.title || 'Untitled');
        let displaySource = String(item.author || 'News Feed');

        // Only go hunting for a publisher in the headline when the feed did not name
        // one. Headlines contain dashes of their own, and splitting a title we have
        // already cleaned would eat the last few words of it.
        if (!item.sourceKnown && displayTitle.includes(' - ')) {
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
        // a dateless item drops the clock rather than trailing an empty one
        meta.textContent = date ? `🗞️ ${displaySource} • 🕒 ${date}` : `🗞️ ${displaySource}`;

        li.appendChild(link);
        li.appendChild(meta);
        list.appendChild(li);
      });

      container.innerHTML = '';
      container.appendChild(list);
      renderNewsTimestamp();
    }
    showNews('usa');
    const SENTIMENT_CACHE_TTL = 30 * 60 * 1000; // 30 minutes
    // Past this a cached reading stops standing in for a live one. The panel is a
    // market instrument: yesterday's number shown as though it were current reads
    // worse than an honest blank, because nothing on screen contradicts it.
    const SENTIMENT_STALE_LIMIT = 12 * 60 * 60 * 1000; // 12 hours
    const SENTIMENT_REQUEST_TIMEOUT_MS = 9000;

    function applysentiment(el, valueText, color, updatedAt, isStale) {
      el.textContent = valueText;
      el.style.color = color;
      stampPanel('sentiment-asof', updatedAt, isStale);

      // Read the score back off the rendered text rather than widening the cache
      // payload: entries already in localStorage predate the gauge and carry no
      // score field, and a failed parse should leave the mark hidden - an unlit
      // gauge means "waiting on data", never "score is zero".
      const mark = document.getElementById('sentiment-mark');
      if (!mark) return;

      const score = parseInt(String(valueText), 10);
      if (!Number.isFinite(score)) {
        mark.classList.remove('is-set');
        return;
      }

      mark.style.left = `${Math.min(100, Math.max(0, score))}%`;
      mark.classList.add('is-set');
    }

    // No reading to stand behind: blank the mark and the timestamp too, so none of
    // the three carries over from a previous render.
    function clearSentiment(el) {
      el.textContent = 'Unavailable';
      el.style.color = 'rgba(255,255,255,0.65)';
      stampPanel('sentiment-asof', null, false);
      const mark = document.getElementById('sentiment-mark');
      if (mark) mark.classList.remove('is-set');
    }

    async function fetchSentiment() {
      const el = document.getElementById('sentiment-val');
      if (!el) return;

      // Show cached value instantly if available (stale-while-revalidate)
      let hadCache = false;
      try {
        const cached = JSON.parse(localStorage.getItem('cnnSentimentCache') || 'null');
        if (cached && cached.valueText) {
          const cachedAt = Number(cached.updatedAt) || 0;
          const age = Date.now() - cachedAt;
          // If cache is fresh enough, show it and skip the network call entirely
          if (age < SENTIMENT_CACHE_TTL) {
            applysentiment(el, cached.valueText, cached.color || '#ffffff', cachedAt, false);
            return;
          }
          // Stale but still worth showing: display it flagged while we revalidate.
          // Beyond the stale limit it is not shown at all - the fetch below either
          // replaces it or the panel ends up reading Unavailable.
          if (age < SENTIMENT_STALE_LIMIT) {
            applysentiment(el, `${cached.valueText}`, cached.color || '#ffffff', cachedAt, true);
            hadCache = true;
          }
        }
      } catch (_) { /* ignore broken cache */ }

      // Three transports, because a single proxy going dark is what froze this
      // panel before. CNN is tried first as the canonical source but answers 418
      // to anything it reads as a bot and sends no CORS header; jina reflects the
      // caller's Origin and wraps the JSON in a text preamble, which the brace-span
      // fallback in readSentimentPayload already handles.
      const SENTIMENT_FEED = 'https://production.dataviz.cnn.io/index/fearandgreed/graphdata';
      const sentimentSources = [
        SENTIMENT_FEED,
        'https://r.jina.ai/' + SENTIMENT_FEED,
        'https://api.allorigins.win/raw?url=' + encodeURIComponent(SENTIMENT_FEED)
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
          // Each transport gets its own deadline: a proxy that hangs rather than
          // refusing would otherwise strand the whole chain and the panel with it.
          const controller = new AbortController();
          const timeoutId = window.setTimeout(() => controller.abort(), SENTIMENT_REQUEST_TIMEOUT_MS);
          try {
            const res = await fetch(sourceUrl, { cache: 'no-store', signal: controller.signal });
            data = await readSentimentPayload(res);
            break;
          } catch (error) {
            lastError = error;
          } finally {
            clearTimeout(timeoutId);
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
          const updatedAt = Date.now();
          applysentiment(el, valueText, color, updatedAt, false);

          localStorage.setItem('cnnSentimentCache', JSON.stringify({
            valueText,
            color,
            updatedAt
          }));
          return;
        }
      } catch (e) {
        // Network failed - a cache inside the stale limit is already on screen and
        // flagged as such, so leave it; anything older never got shown.
        if (hadCache) return;
      }

      if (!hadCache) {
        clearSentiment(el);
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

    // The index rows carry no stamp of their own: the card's plate stamp dates the
    // panel, and a second timestamp floating under the rows was the only reading on
    // the page not engraved on a legend. The per-row LIVE/LAST chips already say
    // whether a quote is current.
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
        const res = await fetchWithTimeout(url);
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
          const requestedRes = await fetchWithTimeout(`https://api.twelvedata.com/quote?symbol=.DJI,.SPX,.IXIC&apikey=${TWELVE_DATA_API_KEY}`);
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

        const updatedAt = Date.now();

        localStorage.setItem(MAJOR_INDEX_CACHE_KEY, JSON.stringify({
          dji: djiQuote,
          ixic: ixicQuote,
          spx: spxQuote,
          updatedAt
        }));
      } else if (!hadCache) {
        updateIndexRow('idx-dji', null);
        updateIndexRow('idx-ixic', null);
        updateIndexRow('idx-gspc', null);
      }
    }
    // No seconds: the countdown lives in the page's top bezel, and a digit changing
    // every second there reads as flicker rather than information.
    function formatDurationShort(secondsRemaining) {
      const total = Math.max(0, Math.floor(secondsRemaining));
      const days = Math.floor(total / 86400);
      const hours = Math.floor((total % 86400) / 3600);
      const minutes = Math.floor((total % 3600) / 60);

      if (days > 0) return `${days}d ${hours}h`;
      if (hours > 0) return `${hours}h ${minutes}m`;
      return `${minutes}m`;
    }

    // The rail is the only place market state is reported. `note` carries the
    // detail the chip has no room for - why it's shut, or that it shuts early -
    // as a tooltip, so switching to the compact readout loses nothing.
    function renderMarketRail(isOpen, secondsRemaining, note) {
      const stateEl = document.getElementById('rail-market-state');
      const countdownEl = document.getElementById('rail-market-countdown');
      if (stateEl) {
        stateEl.textContent = isOpen ? 'Open' : 'Closed';
        stateEl.className = `market-index-state ${isOpen ? 'live' : 'last'}`;
        stateEl.title = note || '';
      }
      if (countdownEl) {
        countdownEl.textContent = `${isOpen ? 'closes' : 'opens'} ${formatDurationShort(secondsRemaining)}`;
      }
    }

    function updateMarketStatus() {
      const now = new Date();
      // Adjust to EST for accurate market time
      const estTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));

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
        renderMarketRail(true, secondsLeft, session.isEarlyClose ? 'Early close today' : '');
        return;
      }

      const reason = session.reason === 'holiday'
        ? (session.holidayName || 'Market holiday')
        : (session.reason === 'weekend' ? 'Weekend' : '');
      renderMarketRail(false, getSecondsUntilNextOpen(), reason);
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
      // the rail eyebrow is a legend, so it carries the zone alone ("PDT"), not a sentence
      const titleEl = document.getElementById('clock-title');
      if (titleEl) {
        titleEl.textContent = formatTimeZoneLabel(zone);
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
        // Two independent readings that happen to share a card. Sentiment used to
        // be called from the tail of fetchMajorIndexes, so a slow index transport
        // held it at "Loading..." even though its own feed was answering. They run
        // side by side now, and allSettled keeps one failing from cancelling the
        // other - each panel already reports its own outcome.
        await Promise.allSettled([fetchMajorIndexes(), fetchSentiment()]);
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

      function renderWeatherSnapshot(snapshot, locationLabel, updatedAt, isStale) {
        if (!snapshot) return;
        stampPanel('weather-asof', Number(updatedAt) || 0, isStale);

        tempEl.textContent = `${snapshot.icon} ${snapshot.temp}°F`;
        descEl.textContent = snapshot.condition;
        rangeEl.textContent = `H: ${snapshot.max}° L: ${snapshot.min}°`;
        summaryEl.innerHTML = snapshot.weekHtml;

        const hourlyEl = document.getElementById('weather-hourly');
        if (hourlyEl) hourlyEl.innerHTML = snapshot.hourlyHtml || '';
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
        // Label each column from the date the forecast row is actually for, the way
        // the hourly strip below reads its own stamps. Counting forward from the
        // browser's weekday instead would slide every label by a day whenever the
        // browser and the forecast location sit on opposite sides of midnight.
        // The stamps are plain "YYYY-MM-DD" in the location's zone, so they are
        // read at noon UTC - far enough from either edge that no offset moves them.
        const dailyDates = (data.daily && data.daily.time) || [];
        const today = new Date().getDay();
        const weekdayFor = (index) => {
          const stamp = dailyDates[index];
          const parsed = stamp ? new Date(`${stamp}T12:00:00Z`) : null;
          if (parsed && Number.isFinite(parsed.getTime())) return parsed.getUTCDay();
          return (today + index) % 7;
        };

        let weekHtml = '';
        for (let i = 1; i <= 6; i++) {
          const dayIndex = weekdayFor(i);
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

        // Next six hours.
        //
        // open-meteo with timezone=auto returns wall-clock stamps in the *forecast
        // location's* zone and no offset ("2026-07-21T14:00"). Passing those to
        // new Date() would parse them in the *browser's* zone, which is only right
        // while the two happen to agree — a VPN or a trip abroad would silently
        // select the wrong hour. So shift "now" into the forecast zone using the
        // offset the API reports, and read each stamp as UTC to match.
        const hourlyTimes = (data.hourly && data.hourly.time) || [];
        const hourlyTemps = (data.hourly && data.hourly.temperature_2m) || [];
        const hourlyCodes = (data.hourly && data.hourly.weather_code) || [];
        let hourlyHtml = '';
        if (hourlyTimes.length) {
          const offsetMs = (Number(data.utc_offset_seconds) || 0) * 1000;
          const nowAtLocation = Date.now() + offsetMs;
          const stampMs = (stamp) => Date.parse(`${stamp}Z`);

          let start = hourlyTimes.findIndex((stamp) => stampMs(stamp) > nowAtLocation);
          if (start < 0) start = Math.max(0, hourlyTimes.length - 6);
          const end = Math.min(start + 6, hourlyTimes.length);

          for (let i = start; i < end; i++) {
            // read the hour off the string so the label cannot be shifted either
            const hour24 = Number(String(hourlyTimes[i]).slice(11, 13));
            const hour12 = hour24 % 12 || 12;
            const meridiem = hour24 >= 12 ? 'PM' : 'AM';
            const hourIcon = icons[hourlyCodes[i]] || '🌡️';
            const hourTemp = Math.round(hourlyTemps[i]);
            hourlyHtml += `<div class="weather-hour">
                            <div class="weather-hour-time">${Number.isFinite(hour24) ? `${hour12}${meridiem}` : '--'}</div>
                            <div class="weather-hour-icon" aria-hidden="true">${hourIcon}</div>
                            <div class="weather-hour-temp">${Number.isFinite(hourTemp) ? hourTemp : '--'}°</div>
                           </div>`;
          }
        }

        return { temp, max, min, condition, icon, weekHtml, hourlyHtml };
      }

      function getWeatherCacheKey(latitude, longitude) {
        return `${WEATHER_LAST_SNAPSHOT_KEY}:${latitude.toFixed(2)},${longitude.toFixed(2)}`;
      }

      function persistWeatherSnapshot(cacheKey, snapshot, locationLabel, updatedAt) {
        const payload = {
          snapshot,
          locationLabel: locationLabel || '',
          updatedAt: updatedAt || Date.now()
        };
        writeStorageJson(cacheKey, payload);
        writeStorageJson(WEATHER_LAST_SNAPSHOT_KEY, payload);
      }

      const lastSnapshot = readStorageJson(WEATHER_LAST_SNAPSHOT_KEY);
      if (lastSnapshot && isFreshTimestamp(lastSnapshot.updatedAt, WEATHER_CACHE_TTL_MS) && lastSnapshot.snapshot) {
        renderWeatherSnapshot(lastSnapshot.snapshot, lastSnapshot.locationLabel, lastSnapshot.updatedAt, false);
      }

      async function renderWeather(latitude, longitude, locationLabel) {
        const cacheKey = getWeatherCacheKey(latitude, longitude);
        const cached = readStorageJson(cacheKey);
        if (cached && isFreshTimestamp(cached.updatedAt, WEATHER_CACHE_TTL_MS) && cached.snapshot) {
          renderWeatherSnapshot(cached.snapshot, locationLabel || cached.locationLabel, cached.updatedAt, false);
          return;
        }

        // Past its TTL: shown flagged so the forecast on screen is not mistaken for
        // a current one while the request below runs.
        if (cached && cached.snapshot) {
          renderWeatherSnapshot(cached.snapshot, locationLabel || cached.locationLabel, cached.updatedAt, true);
        }

        const res = await fetchWithTimeout(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&hourly=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code&temperature_unit=fahrenheit&timezone=auto&forecast_days=7`);
        const data = await res.json();
        const snapshot = buildWeatherSnapshot(data);
        const updatedAt = Date.now();

        renderWeatherSnapshot(snapshot, locationLabel || cached?.locationLabel, updatedAt, false);
        persistWeatherSnapshot(cacheKey, snapshot, locationLabel || cached?.locationLabel, updatedAt);
      }

      async function fetchApproximateLocation() {
        const cached = readStorageJson(WEATHER_APPROX_LOCATION_KEY);
        if (cached && isFreshTimestamp(cached.updatedAt, WEATHER_LOCATION_CACHE_TTL_MS)) {
          return cached;
        }

        const res = await fetchWithTimeout('https://ipapi.co/json/');
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
              // Naming the place is not a new reading of the weather, so the
              // snapshot keeps the timestamp it was fetched under. Letting this
              // default to now would re-date an old forecast - and because the
              // same stamp drives the TTL, every reload would push the refresh
              // out again and the panel could sit frozen while reading current.
              persistWeatherSnapshot(getWeatherCacheKey(latitude, longitude), latest.snapshot, label, latest.updatedAt);
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

      // When the schedule behind the displayed race was pulled. The year loop can
      // read more than one cache entry, so this keeps the oldest of the ones it
      // actually used - the stamp should never claim to be fresher than its data.
      let scheduleFetchedAt = 0;
      const notePulled = (at) => {
        if (!at) return;
        scheduleFetchedAt = scheduleFetchedAt ? Math.min(scheduleFetchedAt, at) : at;
      };

      async function getNascarSchedule(year) {
        const cacheKey = `${NASCAR_CACHE_PREFIX}${year}`;
        const cached = readStorageJson(cacheKey);
        if (cached && isFreshTimestamp(cached.updatedAt, NASCAR_CACHE_TTL_MS) && cached.data) {
          notePulled(Number(cached.updatedAt) || 0);
          return cached.data;
        }

        const res = await fetchWithTimeout(`https://cf.nascar.com/cacher/${year}/race_list_basic.json`);
        const data = await res.json();
        const updatedAt = Date.now();
        notePulled(updatedAt);
        writeStorageJson(cacheKey, { data, updatedAt });
        return data;
      }

      const setUnavailable = () => {
        raceEl.textContent = 'Unavailable';
        trackEl.textContent = '--';
        whenEl.textContent = '--';
        broadcastEl.textContent = '--';
        stampPanel('nascar-asof', null, false);
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
        stampPanel('nascar-asof', scheduleFetchedAt, false);
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

    // Refresh clears both cache layers for the current feed, otherwise showNews
    // would just re-serve the same hour-old payload it already had.
    const newsRefreshButton = document.getElementById('news-refresh');
    if (newsRefreshButton) {
      newsRefreshButton.addEventListener('click', async () => {
        if (newsRefreshButton.classList.contains('is-loading')) return;

        delete newsCache[currentNewsType];
        try {
          localStorage.removeItem(`${NEWS_CACHE_PREFIX}${currentNewsType}`);
        } catch (_) {
          // storage unavailable: the in-memory delete above is enough to force a fetch
        }

        newsRefreshButton.classList.add('is-loading');
        try {
          await showNews(currentNewsType);
        } finally {
          newsRefreshButton.classList.remove('is-loading');
        }
      });
    }

    // A pointing device implies a keyboard, so focusing the search costs nothing;
    // on touch it would throw up the on-screen keyboard over the page on arrival.
    if (window.matchMedia('(pointer: fine)').matches) {
      document.querySelector('.home-search-input')?.focus({ preventScroll: true });
    }

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

    // ---------- quick links ranked by use ----------
    // Counts clicks per destination and floats the ones you actually reach for to
    // the top of their own group. Ordering is settled once per load so links never
    // move under the cursor, and ties keep the order authored in the HTML.
    (() => {
      const QUICK_LINK_CLICKS_KEY = 'homeQuickLinkClicks';

      function loadCounts() {
        const raw = readStorageJson(QUICK_LINK_CLICKS_KEY);
        return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
      }

      let counts = loadCounts();

      function hrefOf(item) {
        const link = item.querySelector('a');
        return link ? link.getAttribute('href') : '';
      }

      document.querySelectorAll('.quick-links-list').forEach((list) => {
        const items = Array.from(list.children);
        items.forEach((item, index) => { item.dataset.baseOrder = String(index); });

        items
          .slice()
          .sort((a, b) => {
            const used = (counts[hrefOf(b)] || 0) - (counts[hrefOf(a)] || 0);
            if (used !== 0) return used;
            return Number(a.dataset.baseOrder) - Number(b.dataset.baseOrder);
          })
          .forEach((item) => list.appendChild(item));
      });

      function recordUse(event) {
        // middle-click opens in a background tab and still counts as a use
        if (event.type === 'auxclick' && event.button !== 1) return;
        const link = event.target.closest && event.target.closest('.quick-links-list a');
        if (!link) return;
        const href = link.getAttribute('href');
        if (!href) return;
        // re-read first: another tab may have recorded uses since this page loaded
        counts = loadCounts();
        counts[href] = (counts[href] || 0) + 1;
        writeStorageJson(QUICK_LINK_CLICKS_KEY, counts);
      }

      document.addEventListener('click', recordUse);
      document.addEventListener('auxclick', recordUse);
    })();

    // ---------- space weather ----------
    // NOAA SWPC. Kp is the headline reading; solar wind speed and Bz are the drivers
    // behind it. Kp is published every three hours and the wind summaries every
    // minute, so a quarter-hour cache sits well inside both.
    const SPACEWX_CACHE_KEY = 'homeSpaceWeather:v1';
    const SPACEWX_CACHE_TTL_MS = 15 * 60 * 1000;

    function describeKp(kp) {
      if (kp >= 9) return { label: 'G5 Extreme', tone: 'storm' };
      if (kp >= 8) return { label: 'G4 Severe', tone: 'storm' };
      if (kp >= 7) return { label: 'G3 Strong', tone: 'storm' };
      if (kp >= 6) return { label: 'G2 Moderate', tone: 'storm' };
      if (kp >= 5) return { label: 'G1 Minor', tone: 'storm' };
      if (kp >= 4) return { label: 'Active', tone: 'active' };
      if (kp >= 3) return { label: 'Unsettled', tone: 'active' };
      return { label: 'Quiet', tone: 'calm' };
    }

    function renderSpaceWeather(reading, updatedAt, isStale) {
      stampPanel('spacewx-asof', Number(updatedAt) || 0, isStale);
      const kpEl = document.getElementById('spacewx-kp');
      const stateEl = document.getElementById('spacewx-state');
      const scaleEl = document.getElementById('spacewx-scale');
      const windEl = document.getElementById('spacewx-wind');
      const bzEl = document.getElementById('spacewx-bz');
      if (!kpEl || !stateEl || !scaleEl || !windEl || !bzEl) return;

      // not `Number(reading && reading.kp)`: that coerces a missing reading to 0,
      // which is a perfectly valid Kp - the panel would report a confident "Quiet"
      // for a feed that never answered.
      const kp = reading ? Number(reading.kp) : NaN;
      if (!Number.isFinite(kp)) {
        kpEl.textContent = 'Unavailable';
        stateEl.textContent = '--';
        stateEl.className = 'spacewx-state na';
        // the scale stays unset, so the panel lamp keeps reading "waiting on data"
        return;
      }

      const { label, tone } = describeKp(kp);
      kpEl.textContent = `Kp ${kp.toFixed(2)}`;
      stateEl.textContent = label;
      stateEl.className = `spacewx-state ${tone}`;

      Array.from(scaleEl.children).forEach((cell, index) => {
        const step = index + 1;
        cell.classList.toggle('lit', kp >= step);
        cell.classList.toggle('storm', step >= 5);
      });
      scaleEl.classList.add('is-set');
      scaleEl.setAttribute('aria-label', `Planetary K-index ${kp.toFixed(2)} of 9 - ${label}`);

      // SWPC publishes proton speed in km/s. Miles per second rather than mph keeps
      // the reading three digits wide like the source, where mph would put it near
      // a million and swamp the panel for no extra precision.
      const wind = Number(reading.wind);
      windEl.textContent = Number.isFinite(wind) ? `${Math.round(wind * KM_TO_MILES)} mi/s` : '--';

      // Bz is signed and the sign is the story: southward (negative) is what opens
      // the magnetosphere, so a leading + is spelled out rather than implied.
      const bz = Number(reading.bz);
      bzEl.textContent = Number.isFinite(bz) ? `${bz > 0 ? '+' : ''}${bz.toFixed(1)} nT` : '--';
    }

    // SWPC serves this feed as objects today, and served header-plus-rows arrays for
    // years before that, switching without notice. Read either shape.
    function readLatestKp(payload) {
      if (!Array.isArray(payload) || payload.length === 0) return NaN;

      const last = payload[payload.length - 1];
      if (last && typeof last === 'object' && !Array.isArray(last)) {
        return Number(last.Kp !== undefined ? last.Kp : last.kp_index);
      }

      if (Array.isArray(last) && Array.isArray(payload[0])) {
        const column = payload[0].indexOf('Kp');
        if (column >= 0) return Number(last[column]);
      }

      return NaN;
    }

    async function fetchSpaceWeather() {
      const cached = readStorageJson(SPACEWX_CACHE_KEY);
      if (cached && cached.reading) {
        const fresh = isFreshTimestamp(cached.updatedAt, SPACEWX_CACHE_TTL_MS);
        renderSpaceWeather(cached.reading, cached.updatedAt, !fresh);
        if (fresh) return;
      }

      try {
        // Kp is required - without it the panel has no headline. The two wind
        // summaries are supporting detail, so they degrade to "--" on their own.
        const [kpSeries, windSummary, magSummary] = await Promise.all([
          fetchWithTimeout('https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json').then((res) => {
            if (!res.ok) throw new Error(`SWPC Kp feed failed with ${res.status}`);
            return res.json();
          }),
          fetchWithTimeout('https://services.swpc.noaa.gov/products/summary/solar-wind-speed.json')
            .then((res) => (res.ok ? res.json() : null)).catch(() => null),
          fetchWithTimeout('https://services.swpc.noaa.gov/products/summary/solar-wind-mag-field.json')
            .then((res) => (res.ok ? res.json() : null)).catch(() => null)
        ]);

        const kp = readLatestKp(kpSeries);
        if (!Number.isFinite(kp)) throw new Error('SWPC Kp feed carried no usable reading');

        const reading = {
          kp,
          wind: Number(windSummary && windSummary[0] && windSummary[0].proton_speed),
          bz: Number(magSummary && magSummary[0] && magSummary[0].bz_gsm)
        };

        const updatedAt = Date.now();
        renderSpaceWeather(reading, updatedAt, false);
        writeStorageJson(SPACEWX_CACHE_KEY, { reading, updatedAt });
      } catch (e) {
        // a stale reading already on screen beats replacing it with an error - and
        // it keeps the flagged stamp the cache branch above already put on it
        if (!(cached && cached.reading)) renderSpaceWeather(null, null, false);
      }
    }

    fetchSpaceWeather();

    // ---------- seismic watch ----------
    // USGS M2.5+ over the trailing day, filtered to North America by coordinate.
    // The scope is the panel's whole premise: worldwide at this threshold the feed
    // runs to hundreds of events a day and stops being a watch.
    const QUAKE_CACHE_KEY = 'homeSeismicWatch:v3';
    const QUAKE_CACHE_TTL_MS = 15 * 60 * 1000;
    // Also the environmental column's ballast: moving the scope off the legend
    // plate shortened this column, and these rows are what bring its bottom back
    // level with the links and news columns beside it.
    const QUAKE_MAX_ROWS = 7;

    function formatTimeAgo(timestamp) {
      // an unparseable date yields no age rather than "NaNm ago"; callers drop the blank
      if (!Number.isFinite(timestamp)) return '';

      const minutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000));
      if (minutes < 60) return `${minutes}m ago`;

      const hours = Math.round(minutes / 60);
      if (hours < 24) return `${hours}h ago`;

      return `${Math.round(hours / 24)}d ago`;
    }

    // Calibrated to this panel's scope, not to global seismicity. The feed is
    // regional and starts at M2.5, where a 5 is already the largest thing on the
    // continent in a normal week - the old 5.5/6.5 cuts came from a worldwide M4.5+
    // feed and left every row on this list rendering the same grey.
    function magnitudeBand(mag) {
      if (mag >= 5) return 'major';
      if (mag >= 4) return 'moderate';
      return 'minor';
    }

    // USGS bakes a metric distance into the place string ("112 km NNE of Adak").
    // Rewrite that prefix and leave the rest of the string alone. Done at render
    // rather than on fetch so the cache keeps the feed's own text and an older
    // cached list still reads in miles.
    function toImperialPlace(place) {
      return String(place).replace(
        /^(\d+(?:\.\d+)?)\s*km\b/i,
        (_, km) => `${Math.round(Number(km) * KM_TO_MILES)} mi`
      );
    }

    // North America by coordinates rather than by guessing at the place string.
    // USGS ships [longitude, latitude, depth]. Three rules: the mainland run from
    // the isthmus to Greenland, the western Aleutians where the chain crosses the
    // antimeridian into positive longitude, and a carve-out at the bottom corner
    // so northern Colombia and Venezuela do not read as North American.
    function isNorthAmerican(longitude, latitude) {
      if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return false;
      if (latitude >= 48 && latitude <= 60 && longitude >= 172) return true;
      if (latitude < 7 || latitude > 84) return false;
      if (longitude < -170 || longitude > -50) return false;
      // below Panama, anything east of the Darién is South America
      if (latitude < 13 && longitude > -77) return false;
      return true;
    }

    function renderQuakes(events, updatedAt, isStale) {
      stampPanel('quake-asof', Number(updatedAt) || 0, isStale);
      const container = document.getElementById('quake-container');
      if (!container) return;

      container.innerHTML = '';

      if (!Array.isArray(events)) {
        const status = document.createElement('p');
        status.className = 'quake-status';
        status.textContent = 'Feed unavailable. Reload to try again.';
        container.appendChild(status);
        return;
      }

      if (events.length === 0) {
        // A quiet day is a reading, not an empty state, so this element lights the
        // panel lamp exactly as a populated list does.
        const empty = document.createElement('p');
        empty.className = 'quake-empty';
        empty.textContent = 'Nothing above magnitude 2.5 in North America in the last 24 hours.';
        container.appendChild(empty);
        return;
      }

      const list = document.createElement('ul');
      list.className = 'quake-list';

      events.slice(0, QUAKE_MAX_ROWS).forEach((event) => {
        const item = document.createElement('li');

        const link = document.createElement('a');
        link.className = 'quake-link';
        link.href = event.url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';

        const mag = document.createElement('span');
        mag.className = `quake-mag ${magnitudeBand(event.mag)}`;
        mag.textContent = event.mag.toFixed(1);

        const body = document.createElement('span');

        const place = document.createElement('span');
        place.className = 'quake-place';
        place.textContent = toImperialPlace(event.place);

        const time = document.createElement('span');
        time.className = 'quake-time';
        time.textContent = formatTimeAgo(event.time);

        body.appendChild(place);
        body.appendChild(time);
        link.appendChild(mag);
        link.appendChild(body);
        item.appendChild(link);
        list.appendChild(item);
      });

      container.appendChild(list);
    }

    async function fetchQuakes() {
      const cached = readStorageJson(QUAKE_CACHE_KEY);
      if (cached && Array.isArray(cached.events)) {
        // timestamps are absolute, so a stale list ages honestly on screen
        const fresh = isFreshTimestamp(cached.updatedAt, QUAKE_CACHE_TTL_MS);
        renderQuakes(cached.events, cached.updatedAt, !fresh);
        if (fresh) return;
      }

      try {
        const res = await fetchWithTimeout('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson');
        if (!res.ok) throw new Error(`USGS feed failed with ${res.status}`);

        const data = await res.json();
        const features = Array.isArray(data && data.features) ? data.features : [];

        const events = features
          .filter((feature) => {
            const coords = (feature && feature.geometry && feature.geometry.coordinates) || [];
            return isNorthAmerican(Number(coords[0]), Number(coords[1]));
          })
          .map((feature) => {
            const props = (feature && feature.properties) || {};
            const url = String(props.url || '');
            return {
              mag: Number(props.mag),
              place: String(props.place || 'Location pending review'),
              time: Number(props.time),
              // only ever link back to the event page on the feed's own origin
              url: url.startsWith('https://earthquake.usgs.gov/') ? url : ''
            };
          })
          .filter((event) => Number.isFinite(event.mag) && Number.isFinite(event.time) && event.url)
          .sort((a, b) => b.time - a.time)
          .slice(0, QUAKE_MAX_ROWS);

        const updatedAt = Date.now();
        renderQuakes(events, updatedAt, false);
        writeStorageJson(QUAKE_CACHE_KEY, { events, updatedAt });
      } catch (e) {
        if (!(cached && Array.isArray(cached.events))) renderQuakes(null, null, false);
      }
    }

    fetchQuakes();

    // ---------- tech pulse ----------
    // Hacker News' front page via Algolia. Eight stories, two-up, so the panel reads
    // as a different instrument from the news list it sits under.
    const HN_CACHE_KEY = 'homeTechPulse:v1';
    const HN_CACHE_TTL_MS = 15 * 60 * 1000;
    const HN_MAX_ROWS = 8;
    // the front page turns over slowly; this is roughly where a story is doing well
    const HN_HOT_SCORE = 300;

    function hnItemUrl(objectId) {
      return `https://news.ycombinator.com/item?id=${encodeURIComponent(objectId)}`;
    }

    function hnDomain(url) {
      try {
        return new URL(url).hostname.replace(/^www\./, '');
      } catch (_) {
        return '';
      }
    }

    function renderTechPulse(stories, updatedAt, isStale) {
      stampPanel('hn-asof', Number(updatedAt) || 0, isStale);
      const container = document.getElementById('hn-container');
      if (!container) return;

      container.innerHTML = '';

      if (!Array.isArray(stories)) {
        const note = document.createElement('p');
        note.className = 'hn-status-note';
        note.textContent = 'Feed unavailable. Reload to try again.';
        container.appendChild(note);
        return;
      }

      if (stories.length === 0) {
        const note = document.createElement('p');
        note.className = 'hn-status-note';
        note.textContent = 'No stories on the front page right now.';
        container.appendChild(note);
        return;
      }

      const list = document.createElement('ul');
      list.className = 'hn-list';

      stories.slice(0, HN_MAX_ROWS).forEach((story) => {
        const item = document.createElement('li');

        const cell = document.createElement('a');
        cell.className = 'hn-cell';
        // text posts carry no external link, so those open the discussion instead
        cell.href = story.url || hnItemUrl(story.id);
        cell.target = '_blank';
        cell.rel = 'noopener noreferrer';
        cell.title = story.title;

        const score = document.createElement('span');
        score.className = `hn-score ${story.points >= HN_HOT_SCORE ? 'hot' : ''}`.trim();
        score.textContent = `${story.points} ▲`;

        const body = document.createElement('span');

        const title = document.createElement('span');
        title.className = 'hn-title';
        title.textContent = story.title;

        // Domain first: on HN it is most of what tells you what you are about to
        // open. It is also the only unbounded part, so it is the part that gets to
        // truncate - the line is one row by design, and letting it ellipsise as a
        // single string meant a long domain swallowed the count and the age with it.
        const meta = document.createElement('span');
        meta.className = 'hn-meta';

        const metaDomain = document.createElement('span');
        metaDomain.className = 'hn-meta-domain';
        metaDomain.textContent = story.domain || '';

        const metaRest = document.createElement('span');
        metaRest.className = 'hn-meta-rest';
        metaRest.textContent = [
          `${story.comments} comments`,
          formatTimeAgo(story.createdAt)
        ].filter(Boolean).join(' · ');

        if (story.domain) {
          meta.appendChild(metaDomain);
          meta.appendChild(document.createTextNode(' · '));
        }
        meta.appendChild(metaRest);

        body.appendChild(title);
        body.appendChild(meta);
        cell.appendChild(score);
        cell.appendChild(body);
        item.appendChild(cell);
        list.appendChild(item);
      });

      container.appendChild(list);
    }

    async function fetchTechPulse() {
      const cached = readStorageJson(HN_CACHE_KEY);
      if (cached && Array.isArray(cached.stories)) {
        const fresh = isFreshTimestamp(cached.updatedAt, HN_CACHE_TTL_MS);
        renderTechPulse(cached.stories, cached.updatedAt, !fresh);
        if (fresh) return;
      }

      try {
        const res = await fetchWithTimeout(`https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=${HN_MAX_ROWS}`);
        if (!res.ok) throw new Error(`Hacker News feed failed with ${res.status}`);

        const data = await res.json();
        const hits = Array.isArray(data && data.hits) ? data.hits : [];

        const stories = hits
          .map((hit) => {
            const url = String((hit && hit.url) || '');
            return {
              id: String((hit && hit.objectID) || ''),
              title: String((hit && hit.title) || '').trim(),
              // only http(s) is ever put in an href
              url: /^https?:\/\//i.test(url) ? url : '',
              domain: hnDomain(url),
              points: Number((hit && hit.points) || 0),
              comments: Number((hit && hit.num_comments) || 0),
              createdAt: Date.parse((hit && hit.created_at) || '')
            };
          })
          .filter((story) => story.title && story.id)
          .sort((a, b) => b.points - a.points);

        const updatedAt = Date.now();
        renderTechPulse(stories, updatedAt, false);
        writeStorageJson(HN_CACHE_KEY, { stories, updatedAt });
      } catch (e) {
        if (!(cached && Array.isArray(cached.stories))) renderTechPulse(null, null, false);
      }
    }

    fetchTechPulse();
