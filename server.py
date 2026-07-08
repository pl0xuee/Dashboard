#!/usr/bin/env python3
from __future__ import annotations

import mimetypes
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
PORT = int(os.environ.get('PORT', '8000'))


class DashboardHandler(SimpleHTTPRequestHandler):
    server_version = 'DashboardStaticServer/1.0'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT_DIR), **kwargs)

    def log_message(self, format: str, *args) -> None:  # noqa: A003
        print(f"{self.address_string()} - - [{self.log_date_time_string()}] {format % args}")

    def end_headers(self) -> None:
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def guess_type(self, path: str) -> str:
        content_type = mimetypes.guess_type(path)[0]
        return content_type or 'application/octet-stream'


if __name__ == '__main__':
    print(f'Dashboard server running at http://localhost:{PORT}')
    ThreadingHTTPServer(('0.0.0.0', PORT), DashboardHandler).serve_forever()
