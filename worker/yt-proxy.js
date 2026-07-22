/**
 * YouTube read proxy for the Command Center media page.
 *
 * The page needs an API key to read a channel's public uploads, and a key that
 * ships to the browser is a key anyone can take. This holds it instead: the key
 * lives as a Cloudflare secret, the browser calls here, and only this Worker
 * ever talks to Google with it.
 *
 * It is deliberately not a passthrough proxy. A Worker URL is public, so a
 * generic "forward whatever you're given to googleapis.com" endpoint would just
 * be the same key leak with extra steps — anyone could spend the quota on any
 * API the key can reach. Instead there are exactly two operations, each with a
 * fixed `part` and a whitelist of parameters, mirroring the only two calls the
 * page makes. Anything else is a 404 before a request to Google is even built.
 *
 * The private half of the page — which channels you subscribe to — never comes
 * through here. That is OAuth, it goes straight from the browser to Google with
 * the reader's own token, and this Worker never sees it.
 */

const ALLOWED_ORIGINS = [
  'https://pl0xuee.com',
  'http://localhost:8899'
];

// name -> the exact upstream call it is allowed to make.
const OPERATIONS = {
  uploads: {
    endpoint: 'playlistItems',
    part: 'snippet,contentDetails',
    allowed: ['playlistId', 'maxResults']
  },
  videos: {
    endpoint: 'videos',
    part: 'contentDetails,snippet,liveStreamingDetails',
    allowed: ['id']
  }
};

// Cloudflare's edge cache, so a reader reloading the page does not spend quota
// every time. Well under the feed's own 30-minute client cache.
const EDGE_CACHE_SECONDS = 300;

const corsHeaders = (origin) => ({
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
  // The response body is origin-independent but the CORS header is not, so a
  // cached response must not be replayed to a different origin.
  'Vary': 'Origin'
});

const json = (body, status, origin) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders(origin) }
});

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin') || '';
    const allowed = ALLOWED_ORIGINS.includes(origin);

    if (request.method === 'OPTIONS') {
      return allowed
        ? new Response(null, { status: 204, headers: corsHeaders(origin) })
        : new Response(null, { status: 403 });
    }

    if (request.method !== 'GET') {
      return json({ error: { message: 'Method not allowed' } }, 405, origin);
    }

    // A browser will not use a response without a matching CORS header anyway;
    // refusing outright keeps the quota from being spent on requests whose
    // answers can never be read. A non-browser client can forge Origin, which is
    // why this is a filter rather than a security boundary — the boundary is
    // that the key itself never leaves Cloudflare.
    if (!allowed) {
      return json({ error: { message: 'Origin not allowed' } }, 403, ALLOWED_ORIGINS[0]);
    }

    if (!env.YOUTUBE_API_KEY) {
      return json({ error: { message: 'Proxy has no API key configured' } }, 500, origin);
    }

    const url = new URL(request.url);
    const operation = OPERATIONS[url.pathname.replace(/^\/+|\/+$/g, '')];
    if (!operation) {
      return json({ error: { message: 'Unknown operation' } }, 404, origin);
    }

    const upstream = new URL(`https://www.googleapis.com/youtube/v3/${operation.endpoint}`);
    upstream.searchParams.set('part', operation.part);
    for (const name of operation.allowed) {
      const value = url.searchParams.get(name);
      if (value) upstream.searchParams.set(name, value);
    }
    upstream.searchParams.set('key', env.YOUTUBE_API_KEY);

    // Keyed on the upstream URL, which contains the key — never exposed, since
    // the cache is internal to Cloudflare and only this Worker can read it.
    const cache = caches.default;
    const cacheKey = new Request(upstream.toString(), { method: 'GET' });

    let response = await cache.match(cacheKey);
    if (!response) {
      response = await fetch(upstream.toString(), {
        headers: { 'Accept': 'application/json' }
      });
      if (response.ok) {
        const cacheable = new Response(response.clone().body, response);
        cacheable.headers.set('Cache-Control', `public, max-age=${EDGE_CACHE_SECONDS}`);
        ctx.waitUntil(cache.put(cacheKey, cacheable));
      }
    }

    // Google's status and body are passed through unchanged so the page can keep
    // telling quotaExceeded apart from a rejected key and say which it was.
    const body = await response.text();
    return new Response(body, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': `public, max-age=${EDGE_CACHE_SECONDS}`,
        ...corsHeaders(origin)
      }
    });
  }
};
