"""Short-lived local face snapshots for the scan history UI only."""

from __future__ import annotations

import os
import sqlite3
import time
import uuid
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

RETENTION_SECONDS = 24 * 60 * 60
MAX_JPEG_BYTES = 200_000


def save_scan_snapshot(db: sqlite3.Connection, directory: Path, student_id: str,
                       captured_at: datetime, jpeg: bytes) -> bool:
    """Save a cropped JPEG for an existing check-in; never add it to the sync payload."""
    if (captured_at.tzinfo is None or not jpeg.startswith(b"\xff\xd8\xff") or
            len(jpeg) > MAX_JPEG_BYTES):
        return False
    local_date = captured_at.astimezone(ZoneInfo("Asia/Bangkok")).date().isoformat()
    row = db.execute(
        "SELECT event_id FROM events WHERE student_id=? AND local_date=?",
        (student_id, local_date),
    ).fetchone()
    if row is None:
        return False
    event_id = str(uuid.UUID(row["event_id"]))
    directory.mkdir(mode=0o700, parents=True, exist_ok=True)
    if os.name == "posix":
        os.chmod(directory, 0o700)
    temporary = directory / f"{event_id}.{uuid.uuid4().hex}.tmp"
    target = directory / f"{event_id}.jpg"
    try:
        descriptor = os.open(str(temporary), os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(descriptor, "wb") as stream:
            stream.write(jpeg)
        os.replace(temporary, target)
        return True
    finally:
        if temporary.exists():
            temporary.unlink()


def snapshot_path(directory: Path, event_id: str, now: float | None = None) -> Path | None:
    try:
        path = directory / f"{uuid.UUID(event_id)}.jpg"
        if path.is_file() and path.stat().st_mtime > (time.time() if now is None else now) - RETENTION_SECONDS:
            return path
    except (OSError, ValueError):
        pass
    return None


def purge_scan_snapshots(directory: Path, now: float | None = None) -> int:
    if not directory.is_dir():
        return 0
    cutoff = (time.time() if now is None else now) - RETENTION_SECONDS
    removed = 0
    for path in directory.iterdir():
        if path.suffix not in (".jpg", ".tmp"):
            continue
        try:
            if path.stat().st_mtime <= cutoff:
                path.unlink()
                removed += 1
        except FileNotFoundError:
            continue
    return removed
