"""Offline face scanner prototype for a Mac/Linux webcam and local mock server."""

import argparse
import json
import math
import time
from datetime import datetime, timezone
from pathlib import Path

from model_update import ModelUpdateError, ensure_models, installed_models, model_paths
from store import check_in, enroll, open_store, templates
from sync import sync_once

ROOT = Path(__file__).resolve().parent
DEFAULT_DB = ROOT / "data" / "scanner.sqlite3"
MODELS = ROOT / "models"
# A conservative starting point for SFace cosine similarity; calibrate with real
# consented test subjects before using any attendance decision.
MATCH_THRESHOLD = 0.50


def load_cv(models_dir: Path = MODELS, check_updates: bool = True):
    if check_updates:
        try:
            manifest, changed = ensure_models(models_dir)
        except ModelUpdateError as error:
            raise SystemExit(str(error)) from error
        if changed:
            print(f"ดาวน์โหลดโมเดลรุ่น {manifest['model_version']} แล้ว")
    else:
        manifest = installed_models(models_dir)
        if manifest is None:
            raise ModelUpdateError("ไม่พบโมเดลในเครื่องที่ตรวจสอบผ่าน")
    detector_path, recognizer_path = model_paths(models_dir, manifest)
    try:
        import cv2 as cv
        import numpy as np
    except ImportError as error:
        raise RuntimeError("ติดตั้ง dependencies ก่อน: python3 -m pip install -r requirements.txt") from error
    for path in (detector_path, recognizer_path):
        if not path.is_file() or path.stat().st_size < 100_000:
            raise ModelUpdateError(f"ไม่พบไฟล์โมเดลจริง: {path} (ดู README.md)")
    detector = cv.FaceDetectorYN.create(str(detector_path), "", (320, 320), 0.9, 0.3, 5000)
    recognizer = cv.FaceRecognizerSF.create(str(recognizer_path), "")
    return cv, np, detector, recognizer, manifest


def extract_face(cv, np, detector, recognizer, frame):
    height, width = frame.shape[:2]
    detector.setInputSize((width, height))
    _, faces = detector.detect(frame)
    if faces is None or len(faces) != 1:
        return None
    aligned = recognizer.alignCrop(frame, faces[0])
    embedding = recognizer.feature(aligned).flatten().astype("float32")
    norm = np.linalg.norm(embedding)
    if not math.isfinite(float(norm)) or norm == 0:
        return None
    return embedding / norm


def best_match(np, embedding, rows):
    best = None
    score = -1.0
    second = -1.0
    for row in rows:
        candidate = np.asarray(json.loads(row["embedding"]), dtype="float32")
        if candidate.shape != (128,):
            continue
        value = float(np.dot(embedding, candidate))
        if value > score:
            second = score
            score = value
            best = row
        elif value > second:
            second = value
    # Ambiguous faces must be checked manually.
    return best if score >= MATCH_THRESHOLD and score - second >= 0.05 else None


def enroll_image(args, db):
    cv, np, detector, recognizer, manifest = load_cv()
    image = cv.imread(str(args.image))
    if image is None:
        raise SystemExit("เปิดรูปไม่ได้")
    embedding = extract_face(cv, np, detector, recognizer, image)
    if embedding is None:
        raise SystemExit("ต้องมีใบหน้าที่ตรวจพบเพียง 1 คนในภาพ")
    enroll(db, args.student_id, args.name, embedding.tolist(), manifest["embedding_version"])
    print(f"ลงทะเบียนภาพทดสอบสำเร็จ: {args.student_id} (ภาพต้นฉบับไม่ได้ถูกคัดลอก)")


def scan(args, db):
    cv, np, detector, recognizer, manifest = load_cv()
    rows = templates(db, manifest["embedding_version"])
    camera = cv.VideoCapture(args.camera)
    if not camera.isOpened():
        raise SystemExit("เปิดกล้องไม่ได้ ตรวจสิทธิ์ Camera และหมายเลขกล้อง")
    streak_id = None
    streak_count = 0
    last_sync = 0.0
    last_scan = {}
    status = "Ready (press q to quit)" if rows else "No test faces enrolled (press q to quit)"
    try:
        while True:
            ok, frame = camera.read()
            if not ok:
                raise SystemExit("อ่านภาพจากกล้องไม่ได้")
            embedding = extract_face(cv, np, detector, recognizer, frame)
            match = best_match(np, embedding, rows) if embedding is not None else None
            student_id = match["student_id"] if match is not None else None
            if student_id and student_id == streak_id:
                streak_count += 1
            else:
                streak_id, streak_count = student_id, 1 if student_id else 0
            if match is not None and streak_count >= 3 and time.monotonic() - last_scan.get(student_id, 0) > 10:
                added = check_in(db, student_id, match["display_name"], datetime.now(timezone.utc))
                status = f"{'Queued' if added else 'Already queued'}: {match['display_name']}"
                print(status)
                last_scan[student_id] = time.monotonic()
                streak_count = 0
            if args.sync_url and time.monotonic() - last_sync >= 10:
                sent, remaining = sync_once(db, args.sync_url)
                if sent:
                    status = f"Synced {sent}; pending {remaining}"
                    print(status)
                last_sync = time.monotonic()
            cv.putText(frame, status[:65], (12, 32), cv.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
            cv.imshow("Chumkosoft offline scanner TEST", frame)
            if cv.waitKey(1) & 0xFF == ord("q"):
                break
    finally:
        camera.release()
        cv.destroyAllWindows()


def main():
    parser = argparse.ArgumentParser(description="Offline scanner prototype; mock sync only")
    parser.add_argument("--db", type=Path, default=DEFAULT_DB)
    sub = parser.add_subparsers(dest="command", required=True)
    enroll_cmd = sub.add_parser("enroll", help="register one consented TEST photo")
    enroll_cmd.add_argument("student_id")
    enroll_cmd.add_argument("name")
    enroll_cmd.add_argument("image", type=Path)
    scan_cmd = sub.add_parser("scan", help="open webcam and queue check-ins")
    scan_cmd.add_argument("--camera", type=int, default=0)
    scan_cmd.add_argument("--sync-url", help="mock endpoint, e.g. http://127.0.0.1:8765/events")
    sync_cmd = sub.add_parser("sync", help="send pending events to local mock server")
    sync_cmd.add_argument("url")
    sub.add_parser("update-models", help="download or verify models from chumkosoft.com")
    sub.add_parser("status", help="show local counts")
    args = parser.parse_args()
    db = open_store(args.db)
    try:
        if args.command == "enroll":
            enroll_image(args, db)
        elif args.command == "scan":
            scan(args, db)
        elif args.command == "sync":
            sent, remaining = sync_once(db, args.url)
            print(f"ซิงก์แล้ว {sent}; ค้าง {remaining}")
        elif args.command == "update-models":
            try:
                manifest, changed = ensure_models(MODELS)
            except ModelUpdateError as error:
                raise SystemExit(str(error)) from error
            print(f"โมเดลรุ่น {manifest['model_version']} ({'อัปเดตแล้ว' if changed else 'พร้อมใช้'})")
        else:
            counts = db.execute("SELECT state, COUNT(*) AS n FROM events GROUP BY state").fetchall()
            print("templates:", len(templates(db)), "events:", {row["state"]: row["n"] for row in counts})
    finally:
        db.close()


if __name__ == "__main__":
    main()
