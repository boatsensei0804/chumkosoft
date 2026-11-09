"""Loopback-only receiver for testing offline replay; never use for production."""

import argparse
import json
import os
import sqlite3
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path


class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path != "/events":
            self.send_error(404)
            return
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if size < 1 or size > 100_000:
                raise ValueError("invalid payload size")
            events = json.loads(self.rfile.read(size))["events"]
            if not isinstance(events, list) or len(events) > 100:
                raise ValueError("invalid event list")
            accepted = []
            with self.server.db:
                for item in events:
                    event_id = item["event_id"]
                    if not isinstance(event_id, str) or not isinstance(item["student_id"], str):
                        raise ValueError("invalid event")
                    self.server.db.execute(
                        "INSERT OR IGNORE INTO received(event_id, student_id, captured_at) VALUES (?, ?, ?)",
                        (event_id, item["student_id"], item["captured_at"]),
                    )
                    accepted.append(event_id)
        except (KeyError, TypeError, ValueError, json.JSONDecodeError):
            self.send_error(400)
            return
        body = json.dumps({"accepted": accepted}).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", type=Path, default=Path(__file__).resolve().parent / "data" / "mock.sqlite3")
    args = parser.parse_args()
    args.db.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    old_umask = os.umask(0o077)
    try:
        db = sqlite3.connect(str(args.db))
    finally:
        os.umask(old_umask)
    if os.name == "posix":
        os.chmod(args.db, 0o600)
    db.execute("CREATE TABLE IF NOT EXISTS received (event_id TEXT PRIMARY KEY, student_id TEXT NOT NULL, captured_at TEXT NOT NULL)")
    server = HTTPServer(("127.0.0.1", 8765), Handler)
    server.db = db
    print("Mock receiver: http://127.0.0.1:8765/events (Ctrl+C to stop)")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
        db.close()


if __name__ == "__main__":
    main()
