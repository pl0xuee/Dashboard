    import { TWITCH_CLIENT_ID, YOUTUBE_CLIENT_ID, TWITCH_REDIRECT_URI, YOUTUBE_REDIRECT_URI } from '../../assets/js/config.js';
    window.TWITCH_CLIENT_ID = TWITCH_CLIENT_ID;
    window.YOUTUBE_CLIENT_ID = YOUTUBE_CLIENT_ID;
    window.TWITCH_REDIRECT_URI = TWITCH_REDIRECT_URI;
    window.YOUTUBE_REDIRECT_URI = YOUTUBE_REDIRECT_URI;
    // Now that clientId is set, complete any pending OAuth callback
    window.addEventListener('load', () => {
      if (window._twitchJustConnected && typeof window.fetchTwitchFollows === 'function') {
        window.fetchTwitchFollows();
      }
      if (window._youtubeJustConnected && typeof window.fetchYouTubeSubscriptions === 'function') {
        window.fetchYouTubeSubscriptions();
      }
    });
