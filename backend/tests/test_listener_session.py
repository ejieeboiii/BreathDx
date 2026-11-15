import unittest
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier

import listener_session


class ListenerSessionTests(unittest.TestCase):
    def setUp(self):
        listener_session.disarm_listener()

    def tearDown(self):
        listener_session.disarm_listener()

    def test_only_one_concurrent_reading_can_claim_a_session(self):
        listener_session.arm_listener(1, 2, "Test Patient")
        session = listener_session.get_armed_session()
        barrier = Barrier(2)

        def claim():
            barrier.wait()
            return listener_session.claim_reading(session["session_id"])

        with ThreadPoolExecutor(max_workers=2) as executor:
            claims = list(executor.map(lambda _: claim(), range(2)))

        self.assertEqual(sum(claim is not None for claim in claims), 1)

    def test_failed_processing_can_be_retried_but_completion_closes_session(self):
        listener_session.arm_listener(1, 2, "Test Patient")
        session = listener_session.get_armed_session()
        session_id = session["session_id"]

        self.assertIsNotNone(listener_session.claim_reading(session_id))
        listener_session.release_reading(session_id)
        self.assertIsNotNone(listener_session.claim_reading(session_id))
        listener_session.complete_reading(session_id)

        self.assertIsNone(listener_session.get_armed_session())
        self.assertIsNone(listener_session.claim_reading(session_id))

    def test_starting_again_creates_an_independent_session(self):
        listener_session.arm_listener(1, 2, "Test Patient")
        first_session = listener_session.get_armed_session()
        listener_session.complete_reading(first_session["session_id"])

        listener_session.arm_listener(1, 2, "Test Patient")
        next_session = listener_session.get_armed_session()

        self.assertNotEqual(first_session["session_id"], next_session["session_id"])
        self.assertIsNotNone(listener_session.claim_reading(next_session["session_id"]))


if __name__ == "__main__":
    unittest.main()
