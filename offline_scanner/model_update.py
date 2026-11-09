"""Versioned, checksum-verified model downloads from the Chumkosoft site."""

import hashlib
import json
import os
import re
import shutil
import sys
import tempfile
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Optional

DEFAULT_MANIFEST_URL = "https://chumkosoft.com/models/scanner/manifest.json"
MODEL_NAMES = (
    "face_detection_yunet_2023mar.onnx",
    "face_recognition_sface_2021dec.onnx",
)
MAX_MODEL_BYTES = 100_000_000


class ModelUpdateError(Exception):
    pass


def _same_site_url(url: str) -> bool:
    parts = urllib.parse.urlsplit(url)
    return parts.scheme == "https" and parts.hostname == "chumkosoft.com" and parts.port is None


def _validate_manifest(manifest: object) -> dict:
    if not isinstance(manifest, dict) or manifest.get("schema_version") != 1:
        raise ModelUpdateError("รูปแบบ manifest ไม่ถูกต้อง")
    version = manifest.get("model_version")
    embedding_version = manifest.get("embedding_version")
    if not isinstance(version, str) or not re.fullmatch(r"[A-Za-z0-9_-]{1,32}", version):
        raise ModelUpdateError("model_version ไม่ถูกต้อง")
    if not isinstance(embedding_version, str) or not re.fullmatch(r"[A-Za-z0-9_-]{1,64}", embedding_version):
        raise ModelUpdateError("embedding_version ไม่ถูกต้อง")
    files = manifest.get("files")
    if not isinstance(files, dict) or set(files) != set(MODEL_NAMES):
        raise ModelUpdateError("รายชื่อไฟล์โมเดลไม่ครบ")
    for name in MODEL_NAMES:
        entry = files[name]
        if not isinstance(entry, dict):
            raise ModelUpdateError("ข้อมูลไฟล์โมเดลไม่ถูกต้อง")
        if entry.get("path") != f"/models/scanner/{version}/{name}":
            raise ModelUpdateError("ตำแหน่งไฟล์โมเดลไม่ถูกต้อง")
        size = entry.get("size_bytes")
        digest = entry.get("sha256")
        if type(size) is not int or not (100_000 <= size <= MAX_MODEL_BYTES):
            raise ModelUpdateError("ขนาดไฟล์โมเดลไม่ถูกต้อง")
        if not isinstance(digest, str) or not re.fullmatch(r"[0-9a-f]{64}", digest):
            raise ModelUpdateError("SHA-256 ของโมเดลไม่ถูกต้อง")
    return manifest


def _read_json_url(url: str) -> object:
    request = urllib.request.Request(url, headers={"Accept": "application/json", "User-Agent": "ChumkosoftScanner/1.0"})
    with urllib.request.urlopen(request, timeout=8) as response:
        if not _same_site_url(response.geturl()):
            raise ModelUpdateError("manifest เปลี่ยนเส้นทางออกนอก chumkosoft.com")
        if response.status != 200:
            raise ModelUpdateError("ดาวน์โหลด manifest ไม่สำเร็จ")
        raw = response.read(20_001)
        if len(raw) > 20_000:
            raise ModelUpdateError("manifest ใหญ่ผิดปกติ")
        return json.loads(raw)


def _valid_file(path: Path, entry: dict) -> bool:
    if not path.is_file() or path.stat().st_size != entry["size_bytes"]:
        return False
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest() == entry["sha256"]


def _download_file(url: str, destination: Path, entry: dict) -> None:
    destination.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    temp_path = None
    try:
        request = urllib.request.Request(url, headers={"User-Agent": "ChumkosoftScanner/1.0"})
        with urllib.request.urlopen(request, timeout=30) as response:
            if not _same_site_url(response.geturl()) or response.status != 200:
                raise ModelUpdateError("โมเดลเปลี่ยนเส้นทางหรือโหลดไม่สำเร็จ")
            with tempfile.NamedTemporaryFile(dir=destination.parent, prefix=".download-", delete=False) as target:
                temp_path = Path(target.name)
                total = 0
                digest = hashlib.sha256()
                for chunk in iter(lambda: response.read(1024 * 1024), b""):
                    total += len(chunk)
                    if total > entry["size_bytes"]:
                        raise ModelUpdateError("โมเดลใหญ่กว่าที่ manifest ระบุ")
                    target.write(chunk)
                    digest.update(chunk)
                target.flush()
                os.fsync(target.fileno())
        if total != entry["size_bytes"] or digest.hexdigest() != entry["sha256"]:
            raise ModelUpdateError("SHA-256 หรือขนาดไฟล์โมเดลไม่ตรง")
        os.replace(temp_path, destination)
        temp_path = None
    finally:
        if temp_path is not None:
            temp_path.unlink(missing_ok=True)


def _installed_manifest(cache_dir: Path) -> Optional[dict]:
    pointer = cache_dir / "active.json"
    try:
        manifest = _validate_manifest(json.loads(pointer.read_text(encoding="utf-8")))
    except (OSError, ValueError, ModelUpdateError):
        return None
    version = manifest["model_version"]
    if all(_valid_file(cache_dir / version / name, manifest["files"][name]) for name in MODEL_NAMES):
        return manifest
    return None


def installed_models(cache_dir: Path) -> Optional[dict]:
    """Return the verified local model set without making a network request."""
    return _installed_manifest(cache_dir)


def ensure_models(cache_dir: Path, manifest_url: str = DEFAULT_MANIFEST_URL) -> tuple[dict, bool]:
    """Return (active manifest, updated). On network failure, keep a valid local set."""
    if not _same_site_url(manifest_url) or manifest_url != DEFAULT_MANIFEST_URL:
        raise ModelUpdateError("อนุญาตเฉพาะ manifest ของ chumkosoft.com")
    current = _installed_manifest(cache_dir)
    try:
        remote = _validate_manifest(_read_json_url(manifest_url))
    except (OSError, ValueError, urllib.error.URLError, ModelUpdateError) as error:
        if current is not None:
            print(f"เว็บเข้าไม่ได้ ใช้โมเดลในเครื่องต่อ: {error}")
            return current, False
        raise ModelUpdateError(f"ยังไม่มีโมเดลในเครื่อง และดาวน์โหลดไม่ได้: {error}") from error

    version = remote["model_version"]
    if current == remote:
        return current, False
    for name in MODEL_NAMES:
        destination = cache_dir / version / name
        entry = remote["files"][name]
        if not _valid_file(destination, entry):
            url = urllib.parse.urljoin(manifest_url, entry["path"])
            try:
                _download_file(url, destination, entry)
            except (OSError, urllib.error.URLError, ModelUpdateError) as error:
                if current is not None:
                    print(f"อัปเดตโมเดลไม่สำเร็จ ใช้รุ่นเดิมต่อ: {error}")
                    return current, False
                raise ModelUpdateError(f"ดาวน์โหลดโมเดลไม่สำเร็จ: {error}") from error

    cache_dir.mkdir(mode=0o700, parents=True, exist_ok=True)
    pointer = cache_dir / "active.json"
    temp_path = None
    try:
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=cache_dir, prefix=".active-", delete=False) as target:
            temp_path = Path(target.name)
            json.dump(remote, target, ensure_ascii=False, indent=2)
            target.flush()
            os.fsync(target.fileno())
        os.replace(temp_path, pointer)
        temp_path = None
    finally:
        if temp_path is not None:
            temp_path.unlink(missing_ok=True)
    return remote, True


def model_paths(cache_dir: Path, manifest: dict) -> tuple[Path, Path]:
    version = manifest["model_version"]
    return (cache_dir / version / MODEL_NAMES[0], cache_dir / version / MODEL_NAMES[1])


def bootstrap_bundled_models(cache_dir: Path) -> bool:
    """Install the verified model copy shipped with the desktop app, once."""
    if _installed_manifest(cache_dir) is not None:
        return False
    if getattr(sys, "frozen", False):
        source = Path(sys._MEIPASS) / "bundled_models"
    else:
        source = Path(__file__).resolve().parent.parent / "public" / "models" / "scanner"
    try:
        manifest = _validate_manifest(json.loads((source / "manifest.json").read_text(encoding="utf-8")))
    except (OSError, ValueError, ModelUpdateError) as error:
        raise ModelUpdateError(f"ไม่พบโมเดลที่มากับโปรแกรม: {error}") from error
    version = manifest["model_version"]
    for name in MODEL_NAMES:
        original = source / version / name
        destination = cache_dir / version / name
        if not _valid_file(original, manifest["files"][name]):
            raise ModelUpdateError(f"โมเดลที่มากับโปรแกรมเสียหาย: {name}")
        destination.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
        if not _valid_file(destination, manifest["files"][name]):
            shutil.copyfile(original, destination)
    cache_dir.mkdir(mode=0o700, parents=True, exist_ok=True)
    pointer = cache_dir / "active.json"
    temp_path = None
    try:
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=cache_dir, prefix=".active-", delete=False) as target:
            temp_path = Path(target.name)
            json.dump(manifest, target, ensure_ascii=False, indent=2)
            target.flush()
            os.fsync(target.fileno())
        os.replace(temp_path, pointer)
        temp_path = None
    finally:
        if temp_path is not None:
            temp_path.unlink(missing_ok=True)
    return True
