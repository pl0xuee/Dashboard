export const TWITCH_CLIENT_ID ='fjsw1bjffiqyraujar8p297ltorexf';
export const YOUTUBE_CLIENT_ID = '743961588451-0du4kputk1qd54iilbsanqfoe9t0n2c1.apps.googleusercontent.com';
export const TWITCH_REDIRECT_URI = 'https://pl0xuee.com/stream/';
export const YOUTUBE_REDIRECT_URI = 'https://pl0xuee.com/stream/';

// No YouTube API key here on purpose.
//
// The key only reads public data — a channel's uploads playlist — so publishing
// it was defensible, and the first version of this page did exactly that with an
// HTTP-referrer restriction as the control. Two things made it not worth it:
// GitHub's secret scanning is right to flag a live key in a public repo, and a
// key committed once stays in the history forever, so the only real cleanup is
// revoking it.
//
// The key now lives in the reader's own localStorage, entered once through the
// control on the media page. It never reaches this repo or the deployed files.
// See media-portal/assets/media-inline.js.

// The subscription import returns here. Google rejects any redirect_uri not
// listed on the OAuth client, so this exact URL has to be registered alongside
// the stream page's.
export const YOUTUBE_SUBS_REDIRECT_URI = 'https://pl0xuee.com/media-portal/';
