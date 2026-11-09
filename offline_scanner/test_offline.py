import io
import hashlib
import json
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch

from model_update import DEFAULT_MANIFEST_URL, MODEL_NAMES, ModelUpdateError, ensure_models, model_paths
from store import check_in, enroll, open_store, pending, pending_photo_count, pending_photos
from sync import sync_once
from web_client import KioskWebClient, ScannerWebError, upload_pending_photos


class OfflineScannerTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.db = open_store(Path(self.temp.name) / "scanner.sqlite3")
        self.addCleanup(self.db.close)

    def test_queue_deduplicates_one_student_per_bangkok_day(self):
        enrolled = [0.0] * 128
        enroll(self.db, "test-1", "Test Student", enrolled)
        when = datetime(2026, 11, 7, 1, 0, tzinfo=timezone.utc)
        self.assertTrue(check_in(self.db, "test-1", "Test Student", when))
        self.assertFalse(check_in(self.db, "test-1", "Test Student", when))
        self.assertEqual(len(pending(self.db)), 1)

    def test_photo_upload_acknowledgement_removes_local_photo(self):
        photo = b"\xff\xd8\xff" + b"x" * 1200
        enroll(self.db, "68-0421", "Test Student", [0.01] * 128, "sface-test", photo)
        self.assertEqual(pending_photo_count(self.db), 1)

        class FakeClient:
            def upload_photo(self, row):
                assert row["student_id"] == "68-0421"
                assert row["photo_jpeg"] == photo

        self.assertEqual(upload_pending_photos(self.db, FakeClient()), (1, 0, ""))
        self.assertEqual(pending_photo_count(self.db), 0)
        saved = self.db.execute("SELECT photo_jpeg, upload_state FROM templates WHERE student_id='68-0421'").fetchone()
        self.assertIsNone(saved["photo_jpeg"])
        self.assertEqual(saved["upload_state"], "uploaded")

    def test_failed_photo_upload_keeps_local_photo(self):
        photo = b"\xff\xd8\xff" + b"x" * 1200
        enroll(self.db, "68-0421", "Test Student", [0.01] * 128, "sface-test", photo)

        class FailingClient:
            def upload_photo(self, row):
                raise ScannerWebError("offline")

        self.assertEqual(upload_pending_photos(self.db, FailingClient()), (0, 1, "offline"))
        self.assertEqual(pending_photo_count(self.db), 1)
        self.assertEqual(pending_photos(self.db)[0]["photo_jpeg"], photo)

    def test_student_roster_uses_only_approved_dev_origin_and_pages(self):
        with self.assertRaises(ValueError):
            KioskWebClient("http://example.com:3000")
        client = KioskWebClient("http://127.0.0.1:3000")

        class Response(io.BytesIO):
            def __init__(self, payload, url):
                super().__init__(json.dumps(payload).encode())
                self.url = url

            def geturl(self):
                return self.url

        class FakeOpener:
            def open(self, request, timeout):
                page = int(request.full_url.rsplit("=", 1)[1])
                students = [
                    {"code": f"TEST-{index:03d}", "name": f"Student {index}", "classroom": "M1/1"}
                    for index in range(200)
                ] if page == 0 else [{"code": "TEST-200", "name": "Student 200", "classroom": "M1/2"}]
                return Response({"ok": True, "students": students, "hasMore": page == 0}, request.full_url)

        client.opener = FakeOpener()
        roster = client.get_students()
        self.assertEqual(len(roster), 201)
        self.assertEqual(roster[-1]["code"], "TEST-200")

    def test_qr_pairing_rejects_wrong_verification_origin(self):
        client = KioskWebClient("http://127.0.0.1:3000")

        class Response(io.BytesIO):
            def __init__(self, payload, url):
                super().__init__(json.dumps(payload).encode())
                self.url = url

            def geturl(self):
                return self.url

        class FakeOpener:
            def __init__(self, verification_url):
                self.verification_url = verification_url

            def open(self, request, timeout):
                payload = {
                    "ok": True,
                    "userCode": "ABCDEF123456",
                    "deviceCode": "A" * 43,
                    "verificationUrl": self.verification_url,
                    "qrDataUrl": "data:image/png;base64,aGVsbG8=",
                    "expiresIn": 300,
                    "pollInterval": 5,
                }
                return Response(payload, request.full_url)

        client.opener = FakeOpener("https://example.com/pair-scanner/ABCDEF123456")
        with self.assertRaises(ScannerWebError):
            client.start_pairing()
        client.opener = FakeOpener("http://127.0.0.1:3000/pair-scanner/ABCDEF123456")
        self.assertEqual(client.start_pairing()["userCode"], "ABCDEF123456")

    def test_failed_sync_preserves_queue_then_acknowledges(self):
        check_in(self.db, "test-2", "Test Two", datetime.now(timezone.utc))
        with patch("sync.urllib.request.urlopen", side_effect=OSError("offline")):
            self.assertEqual(sync_once(self.db, "http://127.0.0.1:8765/events"), (0, 1))
        self.assertEqual(len(pending(self.db)), 1)
        event_id = pending(self.db)[0]["event_id"]
        response = io.BytesIO(json.dumps({"accepted": [event_id]}).encode())
        with patch("sync.urllib.request.urlopen", return_value=response):
            self.assertEqual(sync_once(self.db, "http://127.0.0.1:8765/events"), (1, 0))
        self.assertEqual(sync_once(self.db, "http://127.0.0.1:8765/events"), (0, 0))
        self.assertEqual(len(pending(self.db)), 0)

    def test_refuses_remote_sync(self):
        with self.assertRaises(ValueError):
            sync_once(self.db, "https://app.chumkosoft.com/events")

    def test_models_download_once_and_work_offline(self):
        cache = Path(self.temp.name) / "models"
        assets = {name: bytes([index + 1]) * 100_001 for index, name in enumerate(MODEL_NAMES)}
        manifest = {
            "schema_version": 1,
            "model_version": "test1",
            "embedding_version": "sface-test",
            "files": {
                name: {
                    "path": f"/models/scanner/test1/{name}",
                    "size_bytes": len(content),
                    "sha256": hashlib.sha256(content).hexdigest(),
                }
                for name, content in assets.items()
            },
        }

        class Response(io.BytesIO):
            status = 200

            def __init__(self, content, url):
                super().__init__(content)
                self.url = url

            def geturl(self):
                return self.url

        requested = []

        def serve(request, timeout):
            url = request.full_url if hasattr(request, "full_url") else request
            requested.append(url)
            content = json.dumps(manifest).encode() if url == DEFAULT_MANIFEST_URL else assets[url.rsplit("/", 1)[-1]]
            return Response(content, url)

        with patch("model_update.urllib.request.urlopen", side_effect=serve):
            active, changed = ensure_models(cache)
            self.assertTrue(changed)
            self.assertEqual(len(requested), 3)
            self.assertTrue(all(path.is_file() for path in model_paths(cache, active)))
            active, changed = ensure_models(cache)
            self.assertFalse(changed)
            self.assertEqual(len(requested), 4)  # manifest only

        with patch("model_update.urllib.request.urlopen", side_effect=OSError("offline")):
            active, changed = ensure_models(cache)
            self.assertEqual(active["model_version"], "test1")
            self.assertFalse(changed)

    def test_corrupt_download_is_not_activated(self):
        cache = Path(self.temp.name) / "models"
        name = MODEL_NAMES[0]
        manifest = {
            "schema_version": 1,
            "model_version": "test1",
            "embedding_version": "sface-test",
            "files": {
                item: {
                    "path": f"/models/scanner/test1/{item}",
                    "size_bytes": 100_001,
                    "sha256": hashlib.sha256(b"a" * 100_001).hexdigest(),
                }
                for item in MODEL_NAMES
            },
        }

        class Response(io.BytesIO):
            status = 200

            def __init__(self, content, url):
                super().__init__(content)
                self.url = url

            def geturl(self):
                return self.url

        def corrupt(request, timeout):
            url = request.full_url if hasattr(request, "full_url") else request
            data = json.dumps(manifest).encode() if url == DEFAULT_MANIFEST_URL else b"b" * 100_001
            return Response(data, url)

        with patch("model_update.urllib.request.urlopen", side_effect=corrupt):
            with self.assertRaises(ModelUpdateError):
                ensure_models(cache)
        self.assertFalse((cache / "active.json").exists())


if __name__ == "__main__":
    unittest.main()
