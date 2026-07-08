#!/usr/bin/env python3
from __future__ import annotations

import json
import mimetypes
import os
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

ROOT_DIR = Path(__file__).resolve().parent
DATA_DIR = ROOT_DIR / 'data'
LEADERBOARD_FILE = DATA_DIR / 'leaderboard.json'
PORT = int(os.environ.get('PORT', '8000'))


def ensure_leaderboard_file() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if not LEADERBOARD_FILE.exists():
        LEADERBOARD_FILE.write_text('[]\n', encoding='utf-8')


def read_leaderboard() -> list[dict]:
    ensure_leaderboard_file()
    try:
        data = json.loads(LEADERBOARD_FILE.read_text(encoding='utf-8'))
        return data if isinstance(data, list) else []
    except Exception:
        return []


def write_leaderboard(entries: list[dict]) -> None:
    ensure_leaderboard_file()
    LEADERBOARD_FILE.write_text(json.dumps(entries, indent=2) + '\n', encoding='utf-8')


def sanitize_name(name: object) -> str:
    cleaned = ' '.join(str(name or '').strip().split()).upper()[:12]
    return cleaned or 'PLAYER'


def safe_int(value: object, fallback: int, minimum: int = 0) -> int:
    try:
        number = int(value)
    except Exception:
        return fallback
    return max(minimum, number)


def normalize_entry(raw: object) -> dict:
    raw = raw if isinstance(raw, dict) else {}
    name = sanitize_name(raw.get('name'))
    kills = safe_int(raw.get('kills'), 0, 0)
    upgrades = safe_int(raw.get('upgrades'), 0, 0)
    levels = safe_int(raw.get('levels'), 1, 1)
    created_at = raw.get('createdAt') or datetime.now(timezone.utc).isoformat(timespec='seconds').replace('+00:00', 'Z')
    sort_score = levels * 10000 + kills * 100 + upgrades
    return {
        'name': name,
        'kills': kills,
        'upgrades': upgrades,
        'levels': levels,
        'createdAt': created_at,
        'sortScore': sort_score,
    }


def sort_entries(entries: list[dict]) -> list[dict]:
    return sorted(
        entries,
        key=lambda entry: (
            -int(entry.get('sortScore', 0)),
            entry.get('createdAt', ''),
        ),
    )


class DashboardHandler(SimpleHTTPRequestHandler):
    server_version = 'DashboardLeaderboardServer/1.0'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT_DIR), **kwargs)

    def log_message(self, format: str, *args) -> None:  # noqa: A003
        print(f"{self.address_string()} - - [{self.log_date_time_string()}] {format % args}")

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == '/api/leaderboard':
            entries = sort_entries(read_leaderboard())[:10]
            payload = [{k: v for k, v in entry.items() if k != 'sortScore'} for entry in entries]
            self._send_json(HTTPStatus.OK, payload)
            return
        super().do_GET()

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path != '/api/leaderboard':
            self.send_error(HTTPStatus.METHOD_NOT_ALLOWED)
            return

        content_length = int(self.headers.get('Content-Length', '0'))
        if content_length > 1_000_000:
            self.send_error(HTTPStatus.REQUEST_ENTITY_TOO_LARGE)
            return

        body = self.rfile.read(content_length).decode('utf-8') if content_length else '{}'
        try:
            payload = json.loads(body) if body else {}
        except json.JSONDecodeError:
            self._send_json(HTTPStatus.BAD_REQUEST, {'error': 'Invalid leaderboard payload'})
            return

        entry = normalize_entry(payload)
        current = [item for item in read_leaderboard() if isinstance(item, dict)]
        current.append(entry)
        trimmed = sort_entries(current)[:10]
        write_leaderboard(trimmed)
        response = [{k: v for k, v in item.items() if k != 'sortScore'} for item in trimmed]
        self._send_json(HTTPStatus.OK, response)

    def end_headers(self) -> None:
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def guess_type(self, path: str) -> str:
        content_type = mimetypes.guess_type(path)[0]
        return content_type or 'application/octet-stream'

    def _send_json(self, status: HTTPStatus, payload: object) -> None:
        data = json.dumps(payload, indent=2).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)


if __name__ == '__main__':
    ensure_leaderboard_file()
    print(f'Dashboard server running at http://localhost:{PORT}')
    ThreadingHTTPServer(('0.0.0.0', PORT), DashboardHandler).serve_forever()
