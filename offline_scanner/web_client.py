"""Kiosk-authenticated, in-memory web session for private face-photo uploads."""

import http.cookiejar
import json
import re
import sqlite3
import urllib.error
import urllib.request
import uuid
from urllib.parse import urlsplit

from store import mark_photo_uploaded, pending_photo_count, pending_photos

SITE = "https://chumkosoft.com"


class ScannerWebError(Exception):
    pass


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, msg, headers, newurl):
        raise ScannerWebError("เว็บเปลี่ยนที่อยู่ กรุณาตรวจ URL ที่เชื่อมต่อ")


def _json_response(opener, request, expected_host):
    request.add_header("User-Agent", "ChumkosoftScanner/1.0")
    try:
        with opener.open(request, timeout=10) as response:
            if urlsplit(response.geturl()).netloc != expected_host:
                raise ScannerWebError("คำตอบมาจากโดเมนที่ไม่ถูกต้อง")
            raw = response.read(1024 * 1024 + 1)
            if len(raw) > 1024 * 1024:
                raise ScannerWebError("คำตอบจากเว็บไซต์ใหญ่เกินไป")
            data = json.loads(raw)
    except urllib.error.HTTPError as error:
        try:
            body = json.load(error)
            message = body.get("message") if isinstance(body, dict) else None
        except (ValueError, UnicodeError):
            message = None
        raise ScannerWebError(message or f"เว็บตอบรหัส {error.code}") from error
    except (OSError, ValueError, UnicodeError) as error:
        raise ScannerWebError("เชื่อมต่อเว็บไซต์ไม่ได้ รายการยังเก็บอยู่ในเครื่อง") from error
    if not isinstance(data, dict) or data.get("ok") is not True:
        raise ScannerWebError("คำตอบจากเว็บไซต์ไม่ถูกต้อง")
    return data


def validate_site_url(site_url: str) -> str:
    if not isinstance(site_url, str):
        raise ValueError("URL เว็บไซต์ไม่ถูกต้อง")
    site_url = site_url.rstrip("/")
    try:
        site = urlsplit(site_url.rstrip("/"))
        approved_production = site.scheme == "https" and site.netloc == "chumkosoft.com"
        approved_dev = site.scheme == "http" and site.hostname in ("localhost", "127.0.0.1") and site.port is not None
    except ValueError as error:
        raise ValueError("URL เว็บไซต์ไม่ถูกต้อง") from error
    if (not (approved_production or approved_dev) or site.username or site.password or
            site.path or site.query or site.fragment):
        raise ValueError("ใช้ได้เฉพาะเว็บหลักแบบ HTTPS หรือเว็บ dev บนเครื่องนี้")
    return site_url


class KioskWebClient:
    def __init__(self, site_url: str = SITE):
        self.site = validate_site_url(site_url)
        self.host = urlsplit(self.site).netloc
        self.cookies = http.cookiejar.CookieJar()
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.cookies), NoRedirect())

    def start_pairing(self) -> dict:
        request = urllib.request.Request(
            self.site + "/api/scanner/pair/start",
            data=json.dumps({"siteUrl": self.site}).encode("utf-8"),
            headers={"Content-Type": "application/json", "Accept": "application/json"},
            method="POST",
        )
        data = _json_response(self.opener, request, self.host)
        code = data.get("userCode")
        device_code = data.get("deviceCode")
        verification_url = data.get("verificationUrl")
        image = data.get("qrDataUrl")
        if (not isinstance(code, str) or not re.fullmatch(r"[A-F0-9]{12}", code) or
                not isinstance(device_code, str) or not re.fullmatch(r"[A-Za-z0-9_-]{43}", device_code) or
                verification_url != f"{self.site}/pair-scanner/{code}" or
                not isinstance(image, str) or not image.startswith("data:image/png;base64,") or
                len(image) > 200_000 or
                data.get("expiresIn") != 300 or data.get("pollInterval") != 5):
            raise ScannerWebError("QR จากเว็บไซต์ไม่ถูกต้อง")
        return data

    def poll_pairing(self, device_code: str) -> str:
        request = urllib.request.Request(
            self.site + "/api/scanner/pair/poll",
            data=json.dumps({"deviceCode": device_code}).encode("utf-8"),
            headers={"Content-Type": "application/json", "Accept": "application/json"},
            method="POST",
        )
        data = _json_response(self.opener, request, self.host)
        state = data.get("state")
        if state not in ("pending", "approved"):
            raise ScannerWebError("สถานะการเชื่อม QR ไม่ถูกต้อง")
        if state == "approved" and not any(cookie.name == "session" for cookie in self.cookies):
            raise ScannerWebError("เว็บไม่ได้ส่งเซสชันจุดสแกนกลับมา")
        return state

    def get_students(self) -> list[dict[str, str]]:
        students = []
        seen_codes = set()
        for page in range(50):
            request = urllib.request.Request(
                f"{self.site}/api/scanner/students?page={page}",
                headers={"Accept": "application/json"},
            )
            data = _json_response(self.opener, request, self.host)
            batch = data.get("students")
            if not isinstance(batch, list) or not isinstance(data.get("hasMore"), bool) or len(batch) > 200:
                raise ScannerWebError("รายชื่อนักเรียนจากเว็บไซต์ไม่ถูกต้อง")
            for student in batch:
                if (not isinstance(student, dict) or
                        not isinstance(student.get("code"), str) or not student["code"] or
                        not isinstance(student.get("name"), str) or not student["name"] or
                        not isinstance(student.get("classroom"), str)):
                    raise ScannerWebError("รายชื่อนักเรียนจากเว็บไซต์ไม่ถูกต้อง")
                if student["code"] not in seen_codes:
                    students.append(student)
                    seen_codes.add(student["code"])
            if not data["hasMore"]:
                return students
        raise ScannerWebError("รายชื่อนักเรียนมีมากเกินขีดจำกัด กรุณาติดต่อผู้ดูแล")

    def upload_photo(self, row: sqlite3.Row) -> None:
        boundary = uuid.uuid4().hex
        chunks = []
        for name, value in (
            ("studentCode", row["student_id"]),
            ("uploadId", row["upload_id"]),
            ("modelId", row["model_id"]),
            ("embedding", row["embedding"]),
        ):
            chunks.append(f"--{boundary}\r\nContent-Disposition: form-data; name=\"{name}\"\r\n\r\n{value}\r\n".encode("utf-8"))
        chunks.append(
            f"--{boundary}\r\nContent-Disposition: form-data; name=\"image\"; filename=\"face.jpg\"\r\n"
            "Content-Type: image/jpeg\r\n\r\n".encode("ascii")
        )
        chunks.append(row["photo_jpeg"])
        chunks.append(f"\r\n--{boundary}--\r\n".encode("ascii"))
        request = urllib.request.Request(
            self.site + "/api/scanner/faces",
            data=b"".join(chunks),
            headers={"Content-Type": f"multipart/form-data; boundary={boundary}", "Accept": "application/json"},
            method="POST",
        )
        _json_response(self.opener, request, self.host)


def upload_pending_photos(db: sqlite3.Connection, client: KioskWebClient) -> tuple[int, int, str]:
    sent = 0
    error_message = ""
    for row in pending_photos(db):
        try:
            client.upload_photo(row)
        except ScannerWebError as error:
            error_message = str(error)
            break
        mark_photo_uploaded(db, row["student_id"], row["upload_id"])
        sent += 1
    remaining = pending_photo_count(db)
    return sent, remaining, error_message
