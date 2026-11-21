import tempfile
import unittest
from pathlib import Path

from display_schedule import DisplaySchedule, load_display_schedule, save_display_schedule


class DisplayScheduleTests(unittest.TestCase):
    def test_daytime_and_overnight_windows(self):
        daytime = DisplaySchedule(True, "06:00", "18:00")
        self.assertFalse(daytime.is_active("05:59"))
        self.assertTrue(daytime.is_active("06:00"))
        self.assertFalse(daytime.is_active("18:00"))
        overnight = DisplaySchedule(True, "18:00", "06:00")
        self.assertTrue(overnight.is_active("23:00"))
        self.assertTrue(overnight.is_active("05:59"))
        self.assertFalse(overnight.is_active("06:00"))

    def test_override_wins_and_cache_survives_restart(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "display-schedule.json"
            schedule = DisplaySchedule(True, "06:00", "18:00", "OFF")
            save_display_schedule(path, schedule)
            restored = load_display_schedule(path)
            self.assertEqual(restored, schedule)
            self.assertFalse(restored.is_active("12:00"))
            self.assertTrue(DisplaySchedule(True, "06:00", "18:00", "ON").is_active("23:00"))

    def test_invalid_remote_schedule_is_rejected(self):
        with self.assertRaises(ValueError):
            DisplaySchedule.from_remote({"displayScheduleEnabled": True, "displayOnTime": "25:00",
                                         "displayOffTime": "18:00", "displayOverride": "AUTO"})


if __name__ == "__main__":
    unittest.main()
