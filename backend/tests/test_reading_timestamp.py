import unittest
from datetime import datetime, timedelta, timezone

from models import DiabetesLevel
from schemas import ReadingResponse


class ReadingTimestampTests(unittest.TestCase):
    def make_reading(self, taken_at: datetime) -> ReadingResponse:
        return ReadingResponse(
            id=1,
            patient_id=1,
            acetone_ppm=1.0,
            temperature=25.0,
            humidity=50.0,
            diabetes_level=DiabetesLevel.NORMAL,
            raw_sensor_value=100,
            suggestion=None,
            taken_at=taken_at,
        )

    def test_naive_database_timestamp_is_serialized_as_utc(self):
        reading = self.make_reading(datetime(2026, 11, 15, 12, 39))

        self.assertEqual(reading.taken_at.utcoffset(), timedelta(0))
        serialized = reading.model_dump(mode="json")["taken_at"]
        serialized_datetime = datetime.fromisoformat(serialized.replace("Z", "+00:00"))
        self.assertEqual(serialized_datetime.utcoffset(), timedelta(0))

    def test_aware_timestamp_is_normalized_to_utc(self):
        reading = self.make_reading(
            datetime(2026, 11, 15, 20, 39, tzinfo=timezone(timedelta(hours=8)))
        )

        self.assertEqual(reading.taken_at, datetime(2026, 11, 15, 12, 39, tzinfo=timezone.utc))


if __name__ == "__main__":
    unittest.main()
