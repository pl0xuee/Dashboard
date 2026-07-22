# yt-proxy

Holds the YouTube API key so the media page does not have to.

The page reads two things: a channel's uploads playlist, and the duration and
live status of the videos in it. Both are public data, but Google still wants a
key naming the caller — and a key in a static page is a key anyone can copy. This
Worker keeps it at Cloudflare instead.

What does **not** come through here: the subscription import. That is private
data behind OAuth, and it goes straight from the browser to Google with the
reader's own token. This Worker never sees it.

## Deploy

Requires a free Cloudflare account.

```sh
cd worker
npx wrangler login
npx wrangler secret put YOUTUBE_API_KEY   # paste the key when prompted
npx wrangler deploy
```

`deploy` prints the URL, something like:

```
https://yt-proxy.<your-subdomain>.workers.dev
```

Put that in `assets/js/config.js` as `YOUTUBE_PROXY_URL`, with no trailing slash.

To do it without the CLI: Cloudflare dashboard → Workers & Pages → Create →
paste `yt-proxy.js` → Settings → Variables → add `YOUTUBE_API_KEY` as a
**Secret** (not a plaintext variable, or it is readable in the dashboard).

## Rotating the key

```sh
npx wrangler secret put YOUTUBE_API_KEY
```

Takes effect immediately. No commit, no redeploy of the site.

## Origins

`ALLOWED_ORIGINS` in `yt-proxy.js` lists who may call it. Editing that list
needs a redeploy. `http://localhost:8899` is included so the site can be worked
on locally against the same proxy.

An `Origin` header can be forged by anything that is not a browser, so this is a
filter, not a wall. The actual protection is that the key never leaves
Cloudflare: a bad actor can spend quota through this endpoint, which you can
rate-limit or switch off in one click, but cannot take the key and use it
somewhere you have no control over.

## Why only two operations

A Worker URL is public. A general "forward this to googleapis.com" proxy would
let anyone spend the quota on any API the key can reach — the same leak with
extra steps. So `yt-proxy.js` exposes exactly two named operations, each with a
fixed `part` and a whitelist of query parameters, mirroring the only two calls
the page makes. Anything else 404s before a request to Google is built.

## Cost

The free tier is 100,000 requests/day. A full refresh of ~80 subscriptions is
about 82 requests, and results are cached for 5 minutes at the edge and 30
minutes in the browser. Normal use is a few hundred a day.
