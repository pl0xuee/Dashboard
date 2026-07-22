export const TWITCH_CLIENT_ID ='fjsw1bjffiqyraujar8p297ltorexf';
export const YOUTUBE_CLIENT_ID = '743961588451-0du4kputk1qd54iilbsanqfoe9t0n2c1.apps.googleusercontent.com';
export const TWITCH_REDIRECT_URI = 'https://pl0xuee.com/stream/';
export const YOUTUBE_REDIRECT_URI = 'https://pl0xuee.com/stream/';

// The YouTube API key is not here, and not anywhere else in this repository.
//
// A key in a static site is a key every visitor can read — there is no hiding it
// once the browser needs it. It now lives as an encrypted secret in a Cloudflare
// Worker, which is the only thing that talks to Google with it. The page calls
// the Worker instead. See worker/README.md.
//
// No trailing slash. Empty means the media page has no way to read uploads and
// will say so rather than failing quietly.
export const YOUTUBE_PROXY_URL = 'https://yt-proxy.pl0xuee.workers.dev';

// The subscription import returns here. Google rejects any redirect_uri not
// listed on the OAuth client, so this exact URL has to be registered alongside
// the stream page's.
export const YOUTUBE_SUBS_REDIRECT_URI = 'https://pl0xuee.com/media-portal/';
