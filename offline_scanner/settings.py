"""Local scanner preferences. No credentials or biometric data belong here."""

import json
import os
import re
import uuid
from dataclasses import asdict, dataclass
from pathlib import Path


@dataclass(frozen=True)
class ScannerSettings:
    camera_index: int = 0
    detection_interval_seconds: float = 0.85
    repeat_cooldown_seconds: int = 10
    scan_start_time: str = "06:30"
    late_after_time: str = "08:00"


DETECTION_INTERVALS = (0.5, 0.85, 1.5)
REPEAT_COOLDOWNS = (10, 30, 60)


def load_settings(path: Path) -> ScannerSettings:
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
        camera = raw["camera_index"]
        interval = raw["detection_interval_seconds"]
        cooldown = raw["repeat_cooldown_seconds"]
        start = raw.get("scan_start_time", "06:30")
        late = raw.get("late_after_time", "08:00")
        if (type(camera) is not int or camera < 0 or camera > 9 or
                type(interval) not in (int, float) or interval not in DETECTION_INTERVALS or
                type(cooldown) is not int or cooldown not in REPEAT_COOLDOWNS or
                not isinstance(start, str) or not re.fullmatch(r"([01]\d|2[0-3]):[0-5]\d", start) or
                not isinstance(late, str) or not re.fullmatch(r"([01]\d|2[0-3]):[0-5]\d", late) or late <= start):
            raise ValueError("invalid scanner preferences")
        return ScannerSettings(camera, float(interval), cooldown, start, late)
    except (OSError, ValueError, KeyError, TypeError):
        return ScannerSettings()


def save_settings(path: Path, settings: ScannerSettings) -> None:
    if (type(settings.camera_index) is not int or not 0 <= settings.camera_index <= 9 or
            settings.detection_interval_seconds not in DETECTION_INTERVALS or
            settings.repeat_cooldown_seconds not in REPEAT_COOLDOWNS or
            not re.fullmatch(r"([01]\d|2[0-3]):[0-5]\d", settings.scan_start_time) or
            not re.fullmatch(r"([01]\d|2[0-3]):[0-5]\d", settings.late_after_time) or
            settings.late_after_time <= settings.scan_start_time):
        raise ValueError("invalid scanner preferences")
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    if os.name == "posix":
        os.chmod(path.parent, 0o700)
    temporary = path.with_name(path.name + ".tmp")
    old_umask = os.umask(0o077)
    try:
        temporary.write_text(json.dumps(asdict(settings), ensure_ascii=False), encoding="utf-8")
        os.replace(temporary, path)
    finally:
        os.umask(old_umask)
        if temporary.exists():
            temporary.unlink()
    if os.name == "posix":
        os.chmod(path, 0o600)


def get_or_create_device_id(path: Path) -> str:
    try:
        return str(uuid.UUID(path.read_text(encoding="ascii").strip()))
    except (OSError, ValueError, UnicodeError):
        pass
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    if os.name == "posix":
        os.chmod(path.parent, 0o700)
    value = str(uuid.uuid4())
    temporary = path.with_name(path.name + ".tmp")
    old_umask = os.umask(0o077)
    try:
        temporary.write_text(value, encoding="ascii")
        os.replace(temporary, path)
    finally:
        os.umask(old_umask)
        if temporary.exists():
            temporary.unlink()
    if os.name == "posix":
        os.chmod(path, 0o600)
    return value
