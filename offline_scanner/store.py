"""Local test data. No production credentials or face images are stored here."""

import json
import os
import sqlite3
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional
from zoneinfo import ZoneInfo


def open_store(path: Path) -> sqlite3.Connection:
    path.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    if os.name == "posix":
        os.chmod(path.parent, 0o700)
    old_umask = os.umask(0o077)
    try:
        db = sqlite3.connect(str(path))
    finally:
        os.umask(old_umask)
    if os.name == "posix":
        os.chmod(path, 0o600)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA journal_mode=WAL")
    db.execute("PRAGMA busy_timeout=5000")
    db.executescript("""
        CREATE TABLE IF NOT EXISTS templates (
            student_id TEXT PRIMARY KEY,
            display_name TEXT NOT NULL,
            model_id TEXT NOT NULL DEFAULT 'legacy',
            embedding TEXT NOT NULL,
            photo_jpeg BLOB,
            upload_id TEXT,
            upload_state TEXT NOT NULL DEFAULT 'none'
        );
        CREATE TABLE IF NOT EXISTS events (
            event_id TEXT PRIMARY KEY,
            student_id TEXT NOT NULL,
            display_name TEXT NOT NULL,
            local_date TEXT NOT NULL,
            captured_at TEXT NOT NULL,
            state TEXT NOT NULL DEFAULT 'pending',
            rejection_reason TEXT,
            UNIQUE(student_id, local_date)
        );
    """)
    columns = {row[1] for row in db.execute("PRAGMA table_info(templates)")}
    if "model_id" not in columns:
        db.execute("ALTER TABLE templates ADD COLUMN model_id TEXT NOT NULL DEFAULT 'legacy'")
    if "photo_jpeg" not in columns:
        db.execute("ALTER TABLE templates ADD COLUMN photo_jpeg BLOB")
    if "upload_id" not in columns:
        db.execute("ALTER TABLE templates ADD COLUMN upload_id TEXT")
    if "upload_state" not in columns:
        db.execute("ALTER TABLE templates ADD COLUMN upload_state TEXT NOT NULL DEFAULT 'none'")
    event_columns = {row[1] for row in db.execute("PRAGMA table_info(events)")}
    if "rejection_reason" not in event_columns:
        db.execute("ALTER TABLE events ADD COLUMN rejection_reason TEXT")
    db.commit()
    return db


def enroll(db: sqlite3.Connection, student_id: str, name: str, embedding: list[float], model_id: str = "test-v1", photo_jpeg: Optional[bytes] = None) -> None:
    if not student_id.strip() or not name.strip() or len(embedding) != 128:
        raise ValueError("ต้องระบุรหัส ชื่อ และ embedding 128 ค่า")
    if photo_jpeg is not None and (len(photo_jpeg) > 3 * 1024 * 1024 or not photo_jpeg.startswith(b"\xff\xd8\xff")):
        raise ValueError("รูปอัปโหลดต้องเป็น JPEG ขนาดไม่เกิน 3MB")
    upload_id = str(uuid.uuid4()) if photo_jpeg is not None else None
    upload_state = "pending" if photo_jpeg is not None else "none"
    with db:
        db.execute(
            "INSERT INTO templates(student_id, display_name, model_id, embedding, photo_jpeg, upload_id, upload_state) VALUES (?, ?, ?, ?, ?, ?, ?) "
            "ON CONFLICT(student_id) DO UPDATE SET display_name=excluded.display_name, model_id=excluded.model_id, "
            "embedding=excluded.embedding, photo_jpeg=excluded.photo_jpeg, upload_id=excluded.upload_id, upload_state=excluded.upload_state",
            (student_id, name, model_id, json.dumps(embedding), photo_jpeg, upload_id, upload_state),
        )


def templates(db: sqlite3.Connection, model_id: Optional[str] = None) -> list[sqlite3.Row]:
    if model_id is None:
        return db.execute("SELECT student_id, display_name, model_id, embedding FROM templates").fetchall()
    return db.execute(
        "SELECT student_id, display_name, model_id, embedding FROM templates WHERE model_id=?", (model_id,)
    ).fetchall()


def pending_photos(db: sqlite3.Connection) -> list[sqlite3.Row]:
    return db.execute(
        "SELECT student_id, model_id, embedding, photo_jpeg, upload_id FROM templates "
        "WHERE upload_state='pending' AND photo_jpeg IS NOT NULL ORDER BY student_id LIMIT 20"
    ).fetchall()


def pending_photo_count(db: sqlite3.Connection) -> int:
    return db.execute("SELECT COUNT(*) FROM templates WHERE upload_state='pending' AND photo_jpeg IS NOT NULL").fetchone()[0]


def mark_photo_uploaded(db: sqlite3.Connection, student_id: str, upload_id: str) -> None:
    with db:
        db.execute(
            "UPDATE templates SET photo_jpeg=NULL, upload_state='uploaded' "
            "WHERE student_id=? AND upload_id=? AND upload_state='pending'",
            (student_id, upload_id),
        )


def check_in(db: sqlite3.Connection, student_id: str, name: str, now: datetime) -> bool:
    if now.tzinfo is None:
        raise ValueError("timestamp must have timezone")
    local_date = now.astimezone(ZoneInfo("Asia/Bangkok")).date().isoformat()
    with db:
        cursor = db.execute(
            "INSERT OR IGNORE INTO events(event_id, student_id, display_name, local_date, captured_at) "
            "VALUES (?, ?, ?, ?, ?)",
            (str(uuid.uuid4()), student_id, name, local_date, now.isoformat()),
        )
    return cursor.rowcount == 1


def pending(db: sqlite3.Connection) -> list[sqlite3.Row]:
    return db.execute(
        "SELECT event_id, student_id, display_name, local_date, captured_at FROM events "
        "WHERE state='pending' ORDER BY captured_at LIMIT 20"
    ).fetchall()


def mark_synced(db: sqlite3.Connection, event_ids: list[str]) -> None:
    with db:
        db.executemany("UPDATE events SET state='synced' WHERE event_id=? AND state='pending'", ((item,) for item in event_ids))


def mark_rejected(db: sqlite3.Connection, rejected: list[tuple[str, str]]) -> None:
    with db:
        db.executemany(
            "UPDATE events SET state='rejected', rejection_reason=? WHERE event_id=? AND state='pending'",
            ((reason[:160], event_id) for event_id, reason in rejected),
        )
