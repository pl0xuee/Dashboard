#!/usr/bin/env sh
# Quick helper to serve this folder over HTTP for local testing of embeds
# Usage: chmod +x start_local_server.sh && ./start_local_server.sh

cd "$(dirname "$0")"
if command -v python3 >/dev/null 2>&1; then
  echo "Starting Python 3 HTTP server on http://localhost:8000"
  exec python3 -m http.server 8000
elif command -v python >/dev/null 2>&1; then
  echo "Starting Python HTTP server on http://localhost:8000"
  exec python -m SimpleHTTPServer 8000
else
  echo "Python is not installed. Run: python3 -m http.server 8000"
  exit 1
fi
