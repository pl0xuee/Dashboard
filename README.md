# Command Center

Command Center is a personal multi-page web dashboard that combines daily-use tools, live information, media access, and browser games into a single site.

## What the site includes

- Home page with search, live news, market sentiment, major index status, weather, and quick links
- Dashboard page with market widgets, chart panels, and trading-focused views
- Stream page for loading YouTube and Twitch streams with theater mode and chat controls
- Media portal page for launching a private Jellyfin server from the local network
- Web games section with arcade-style games plus larger embedded projects like Sector 93 and the Middle-earth RPG

## Project structure

- `index.html` - main landing page
- `dashboard/` - finance and charting dashboard
- `stream/` - streaming viewer tools
- `media-portal/` - local media server access page
- `web-games/` - browser games hub and embedded game projects
- `assets/` - shared CSS, JS, icons, and app resources

This repo is built as a static site with client-side JavaScript, a shared stylesheet, a service worker, and a web app manifest for installable app-style behavior.
