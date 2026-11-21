"""Cached website display controls for a scanner that may be offline."""

import json
import os
import re
from dataclasses import asdict, dataclass
from pathlib import Path


TIME_PATTERN = re.compile(r"([01]\d|2[0-3]):[0-5]\d\Z")


@dataclass(frozen=True)
class DisplaySchedule:
    enabled: bool = False
    on_time: str = "06:00"
    off_time: str = "18:00"
    override: str = "AUTO"

    @classmethod
    def from_remote(cls, remote: dict) -> "DisplaySchedule":
        enabled = remote.get("displayScheduleEnabled")
        on_time = remote.get("displayOnTime")
        off_time = remote.get("displayOffTime")
        override = remote.get("displayOverride")
        if (type(enabled) is not bool or
                not isinstance(on_time, str) or not TIME_PATTERN.fullmatch(on_time) or
                not isinstance(off_time, str) or not TIME_PATTERN.fullmatch(off_time) or
                on_time == off_time or override not in ("AUTO", "ON", "OFF")):
            raise ValueError("invalid display schedule")
        return cls(enabled, on_time, off_time, override)

    def is_active(self, local_time: str) -> bool:
        if self.override != "AUTO":
            return self.override == "ON"
        if not self.enabled:
            return True
        if self.on_time < self.off_time:
            return self.on_time <= local_time < self.off_time
        return local_time >= self.on_time or local_time < self.off_time


def load_display_schedule(path: Path) -> DisplaySchedule:
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
        return DisplaySchedule.from_remote({
            "displayScheduleEnabled": raw["enabled"], "displayOnTime": raw["on_time"],
            "displayOffTime": raw["off_time"], "displayOverride": raw["override"],
        })
    except (OSError, ValueError, KeyError, TypeError):
        return DisplaySchedule()


def save_display_schedule(path: Path, schedule: DisplaySchedule) -> None:
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    if os.name == "posix":
        os.chmod(path.parent, 0o700)
    temporary = path.with_name(path.name + ".tmp")
    old_umask = os.umask(0o077)
    try:
        temporary.write_text(json.dumps(asdict(schedule)), encoding="utf-8")
        os.replace(temporary, path)
    finally:
        os.umask(old_umask)
        if temporary.exists():
            temporary.unlink()
    if os.name == "posix":
        os.chmod(path, 0o600)
