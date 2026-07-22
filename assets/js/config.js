export const TWITCH_CLIENT_ID ='fjsw1bjffiqyraujar8p297ltorexf';
export const YOUTUBE_CLIENT_ID = '743961588451-0du4kputk1qd54iilbsanqfoe9t0n2c1.apps.googleusercontent.com';
export const TWITCH_REDIRECT_URI = 'https://pl0xuee.com/stream/';
export const YOUTUBE_REDIRECT_URI = 'https://pl0xuee.com/stream/';

// Reads public data only: a channel's uploads playlist. Everything private —
// which channels you subscribe to — goes through OAuth above and never touches
// this key.
//
// It is served to every visitor and cannot be otherwise on a static site, so
// secrecy is not the control. Restrict it by HTTP referrer in the Google Cloud
// console (pl0xuee.com/* and localhost:*) and it is unusable anywhere else;
// leave it unrestricted and someone else will spend your daily quota.
export const YOUTUBE_API_KEY = 'AIzaSyB8fSLKN41rjFhbWR5LluY-7cpfTZaTCbw';

// The subscription import returns here. Google rejects any redirect_uri not
// listed on the OAuth client, so this exact URL has to be registered alongside
// the stream page's.
export const YOUTUBE_SUBS_REDIRECT_URI = 'https://pl0xuee.com/media-portal/';
