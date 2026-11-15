"""Active patient for ESP32 uploads when Live Scan listener is armed (prototype)."""

from datetime import datetime, timedelta
from threading import Lock
from typing import Any, Dict, Optional

SESSION_TTL = timedelta(hours=4)

_session: Optional[Dict[str, Any]] = None
_session_lock = Lock()
_session_id = 0


def arm_listener(medical_personnel_id: int, patient_id: int, patient_name: str) -> None:
    global _session, _session_id
    with _session_lock:
        _session_id += 1
        _session = {
            "session_id": _session_id,
            "medical_personnel_id": medical_personnel_id,
            "patient_id": patient_id,
            "patient_name": patient_name,
            "expires_at": datetime.utcnow() + SESSION_TTL,
            "processing": False,
            "completed": False,
        }


def disarm_listener(medical_personnel_id: Optional[int] = None) -> None:
    global _session
    with _session_lock:
        if _session is None:
            return
        if medical_personnel_id is not None and _session.get("medical_personnel_id") != medical_personnel_id:
            return
        _session = None


def get_armed_session() -> Optional[Dict[str, Any]]:
    global _session
    with _session_lock:
        if _session is None:
            return None
        if datetime.utcnow() > _session["expires_at"] or _session["completed"]:
            _session = None
            return None
        return _session.copy()


def claim_reading(session_id: int) -> Optional[Dict[str, Any]]:
    global _session
    with _session_lock:
        if (
            _session is None
            or _session["session_id"] != session_id
            or datetime.utcnow() > _session["expires_at"]
            or _session["processing"]
            or _session["completed"]
        ):
            return None
        _session["processing"] = True
        return _session.copy()


def complete_reading(session_id: int) -> None:
    global _session
    with _session_lock:
        if _session is not None and _session["session_id"] == session_id:
            _session["processing"] = False
            _session["completed"] = True


def release_reading(session_id: int) -> None:
    global _session
    with _session_lock:
        if (
            _session is not None
            and _session["session_id"] == session_id
            and not _session["completed"]
        ):
            _session["processing"] = False
