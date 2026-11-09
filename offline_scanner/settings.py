"""Local scanner preferences. No credentials or biometric data belong here."""

import json
import os
from dataclasses import asdict, dataclass
from pathlib import Path


@dataclass(frozen=True)
class ScannerSettings:
    camera_index: int = 0
    detection_interval_seconds: float = 0.85
    repeat_cooldown_seconds: int = 10


DETECTION_INTERVALS = (0.5, 0.85, 1.5)
REPEAT_COOLDOWNS = (10, 30, 60)


def load_settings(path: Path) -> ScannerSettings:
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
        camera = raw["camera_index"]
        interval = raw["detection_interval_seconds"]
        cooldown = raw["repeat_cooldown_seconds"]
        if (type(camera) is not int or camera < 0 or camera > 9 or
                type(interval) not in (int, float) or interval not in DETECTION_INTERVALS or
                type(cooldown) is not int or cooldown not in REPEAT_COOLDOWNS):
            raise ValueError("invalid scanner preferences")
        return ScannerSettings(camera, float(interval), cooldown)
    except (OSError, ValueError, KeyError, TypeError):
        return ScannerSettings()


def save_settings(path: Path, settings: ScannerSettings) -> None:
    if (type(settings.camera_index) is not int or not 0 <= settings.camera_index <= 9 or
            settings.detection_interval_seconds not in DETECTION_INTERVALS or
            settings.repeat_cooldown_seconds not in REPEAT_COOLDOWNS):
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
