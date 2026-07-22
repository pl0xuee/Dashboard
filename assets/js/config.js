export const TWITCH_CLIENT_ID ='fjsw1bjffiqyraujar8p297ltorexf';
export const YOUTUBE_CLIENT_ID = '743961588451-0du4kputk1qd54iilbsanqfoe9t0n2c1.apps.googleusercontent.com';
export const TWITCH_REDIRECT_URI = 'https://pl0xuee.com/stream/';
export const YOUTUBE_REDIRECT_URI = 'https://pl0xuee.com/stream/';

// Reads public data only: a channel's uploads playlist. Everything private —
// which channels you subscribe to — goes through OAuth above and never touches
// this key.
//
// It is served to every visitor and cannot be otherwise on a static site, so
// secrecy is not the control. The HTTP-referrer restriction is, and it has been
// checked against the live API rather than assumed: requests from pl0xuee.com
// are answered, requests from another origin and requests with no referrer at
// all are refused.
//
// GitHub's secret scanner flags this, correctly — it is a real key in a public
// repo. The alert is accepted rather than a false positive: the worst a taker
// can do is spend the daily quota, at which point the feed stops loading until
// this is regenerated. Nothing about the account is reachable with it.
//
// The media page also reads localStorage['ccSubsApiKey:v1'] first, so a
// different key can be used in one browser without touching this file.
export const YOUTUBE_API_KEY = 'AIzaSyB8fSLKN41rjFhbWR5LluY-7cpfTZaTCbw';

// The subscription import returns here. Google rejects any redirect_uri not
// listed on the OAuth client, so this exact URL has to be registered alongside
// the stream page's.
export const YOUTUBE_SUBS_REDIRECT_URI = 'https://pl0xuee.com/media-portal/';
