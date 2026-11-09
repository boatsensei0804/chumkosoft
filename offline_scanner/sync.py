"""Durable offline outbox with production acknowledgements and a local mock."""

import json
import sqlite3
import urllib.error
import urllib.request
from urllib.parse import urlparse

from store import mark_rejected, mark_synced, pending
from web_client import KioskWebClient


def sync_live(db: sqlite3.Connection, client: KioskWebClient) -> tuple[int, int, int]:
    rows = pending(db)
    if not rows:
        return (0, 0, 0)
    accepted, rejected = client.sync_events(rows)
    mark_synced(db, accepted)
    mark_rejected(db, rejected)
    remaining = db.execute("SELECT COUNT(*) FROM events WHERE state='pending'").fetchone()[0]
    return (len(accepted), remaining, len(rejected))


def sync_once(db: sqlite3.Connection, url: str) -> tuple[int, int]:
    parsed = urlparse(url)
    if parsed.scheme != "http" or parsed.hostname not in ("127.0.0.1", "localhost"):
        raise ValueError("ตัวทดสอบส่งได้เฉพาะ mock server ในเครื่อง (http://127.0.0.1)")
    rows = pending(db)
    if not rows:
        return (0, 0)
    payload = {"events": [dict(row) for row in rows]}
    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=2) as response:
            result = json.load(response)
    except (OSError, urllib.error.URLError, ValueError) as error:
        print(f"ยังซิงก์ไม่ได้ เก็บคิวไว้ในเครื่อง: {error}")
        return (0, len(rows))
    accepted = result.get("accepted")
    if not isinstance(accepted, list):
        print("คำตอบจากเซิร์ฟเวอร์ไม่ถูกต้อง เก็บคิวไว้")
        return (0, len(rows))
    known = {row["event_id"] for row in rows}
    acknowledged = list({item for item in accepted if isinstance(item, str) and item in known})
    mark_synced(db, acknowledged)
    return (len(acknowledged), len(rows) - len(acknowledged))
