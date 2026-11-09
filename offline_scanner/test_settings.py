import tempfile
import unittest
from pathlib import Path

from settings import ScannerSettings, load_settings, save_settings


class ScannerSettingsTests(unittest.TestCase):
    def test_saved_preferences_survive_restart(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "settings.json"
            selected = ScannerSettings(2, 0.5, 30)
            save_settings(path, selected)
            self.assertEqual(load_settings(path), selected)

    def test_invalid_preferences_fall_back_to_safe_defaults(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "settings.json"
            path.write_text('{"camera_index": -1, "detection_interval_seconds": 0, "repeat_cooldown_seconds": 0}')
            self.assertEqual(load_settings(path), ScannerSettings())


if __name__ == "__main__":
    unittest.main()
