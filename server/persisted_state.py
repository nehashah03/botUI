# """
# --- Dummy persistence for multi-chat UX (added).
# Stores the same shape the React app uses (`sessions` + `activeSessionId`) in a JSON file
# so refresh / another tab can reload conversation list and messages. Replace with DB + auth later.
# """
# from __future__ import annotations
 
# import json
# import threading
# import time
# from pathlib import Path
# from typing import Any, Dict, List, Optional
 
# _lock = threading.Lock()
# # Repo-local file; not for production secrets.
# _DATA_PATH = Path(__file__).resolve().parent / "data" / "sessions_state.json"
 
 
# def _default_state() -> Dict[str, Any]:
#     return {"version": 1, "activeSessionId": None, "sessions": []}
 
 
# def load_state() -> Dict[str, Any]:
#     """Load full UI snapshot from disk; returns a dict with `sessions` and `activeSessionId`."""
#     with _lock:
#         if not _DATA_PATH.exists():
#             return _default_state()
#         try:
#             raw = _DATA_PATH.read_text(encoding="utf-8")
#             data = json.loads(raw)
#             if not isinstance(data, dict):
#                 return _default_state()
#             data.setdefault("sessions", [])
#             data.setdefault("activeSessionId", None)
#             return data
#         except (json.JSONDecodeError, OSError):
#             return _default_state()
 
 
# def save_state(sessions: List[dict], active_session_id: Optional[str]) -> None:
#     """Persist current sessions list and which chat is selected (mirrors Redux `session` slice)."""
#     payload = {
#         "version": 1,
#         "updatedAt": int(time.time() * 1000),
#         "activeSessionId": active_session_id,
#         "sessions": sessions,
#     }
#     _DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
#     with _lock:
#         _DATA_PATH.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
 
 
# def merge_chat_patch(chat_id: str, patch: Dict[str, Any]) -> Optional[dict]:
#     """Apply PATCH fields (`title`, `favorite`) to one chat; returns updated chat or None."""
#     state = load_state()
#     sessions: List[dict] = state.get("sessions") or []
#     for i, s in enumerate(sessions):
#         if s.get("id") == chat_id:
#             if "title" in patch and isinstance(patch["title"], str):
#                 sessions[i]["title"] = patch["title"].strip() or "Untitled chat"
#             if "favorite" in patch:
#                 sessions[i]["favorite"] = bool(patch["favorite"])
#             sessions[i]["updatedAt"] = int(time.time() * 1000)
#             save_state(sessions, state.get("activeSessionId"))
#             return sessions[i]
#     return None
 
 
# def delete_chat(chat_id: str) -> bool:
#     """Remove one session by id; fix `activeSessionId` if it pointed at the deleted chat."""
#     state = load_state()
#     old = state.get("sessions") or []
#     sessions = [s for s in old if s.get("id") != chat_id]
#     if len(sessions) == len(old):
#         return False
#     active = state.get("activeSessionId")
#     if active == chat_id:
#         active = sessions[0].get("id") if sessions else None
#     save_state(sessions, active)
#     return True
 
 
# def append_or_replace_session(session: dict) -> None:
#     """Upsert one session by `id` (used when a new chat is created from the API)."""
#     state = load_state()
#     sessions: List[dict] = list(state.get("sessions") or [])
#     sid = session.get("id")
#     found = False
#     for i, s in enumerate(sessions):
#         if s.get("id") == sid:
#             sessions[i] = {**s, **session}
#             found = True
#             break
#     if not found:
#         sessions.insert(0, session)
#     save_state(sessions, state.get("activeSessionId"))

"""
============================================================
PERSISTENCE LAYER (SAFE + DEBUGGABLE VERSION)
============================================================

Stores chat sessions in JSON file.

IMPORTANT:
- This is SOURCE OF TRUTH for refresh
- If this fails → chats disappear
"""

from __future__ import annotations

import json
import threading
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

# Thread lock → prevents concurrent file writes
_lock = threading.Lock()

# File path
_DATA_PATH = Path(__file__).resolve().parent / "data" / "sessions_state.json"


# ============================================================
# DEFAULT STATE
# ============================================================

def _default_state() -> Dict[str, Any]:
    return {
        "version": 1,
        "activeSessionId": None,
        "sessions": [],
    }


# ============================================================
# LOAD STATE (READ FROM FILE)
# ============================================================

def load_state() -> Dict[str, Any]:
    """
    Read sessions from disk.

    If file is missing / corrupted → return default
    """
    with _lock:
        if not _DATA_PATH.exists():
            print("[LOAD] No file found → returning empty state")
            return _default_state()

        try:
            raw = _DATA_PATH.read_text(encoding="utf-8")
            data = json.loads(raw)

            if not isinstance(data, dict):
                print("[LOAD] Invalid format → resetting")
                return _default_state()

            data.setdefault("sessions", [])
            data.setdefault("activeSessionId", None)

            print(f"[LOAD] Loaded sessions: {len(data['sessions'])}")

            return data

        except (json.JSONDecodeError, OSError) as e:
            print("[LOAD ERROR]", str(e))
            return _default_state()


# ============================================================
# SAVE STATE (WRITE TO FILE)
# ============================================================

def save_state(sessions: List[dict], active_session_id: Optional[str]) -> None:
    """
    Save sessions safely.

    PROTECTION ADDED:
    - Prevent accidental overwrite with empty list
    """

    # 🔒 Safety check
    if not isinstance(sessions, list):
        print("[SAVE ERROR] Invalid sessions format")
        return

    # 🚨 CRITICAL FIX: Prevent wiping all data accidentally
    if len(sessions) == 0:
        print("[WARNING] Attempted to save EMPTY sessions → skipping write")
        return

    payload = {
        "version": 1,
        "updatedAt": int(time.time() * 1000),
        "activeSessionId": active_session_id,
        "sessions": sessions,
    }

    try:
        _DATA_PATH.parent.mkdir(parents=True, exist_ok=True)

        with _lock:
            _DATA_PATH.write_text(
                json.dumps(payload, indent=2, ensure_ascii=False),
                encoding="utf-8",
            )

        print(f"[SAVE] Sessions saved: {len(sessions)}")

    except Exception as e:
        print("[SAVE ERROR]", str(e))


# ============================================================
# UPDATE CHAT (PATCH)
# ============================================================

def merge_chat_patch(chat_id: str, patch: Dict[str, Any]) -> Optional[dict]:
    """
    Update chat title / favorite
    """
    state = load_state()
    sessions: List[dict] = state.get("sessions") or []

    for i, s in enumerate(sessions):
        if s.get("id") == chat_id:

            if "title" in patch and isinstance(patch["title"], str):
                sessions[i]["title"] = patch["title"].strip() or "Untitled chat"

            if "favorite" in patch:
                sessions[i]["favorite"] = bool(patch["favorite"])

            sessions[i]["updatedAt"] = int(time.time() * 1000)

            save_state(sessions, state.get("activeSessionId"))
            return sessions[i]

    return None


# ============================================================
# DELETE CHAT
# ============================================================

def delete_chat(chat_id: str) -> bool:
    """
    Delete one session safely
    """
    state = load_state()
    old_sessions = state.get("sessions") or []

    new_sessions = [s for s in old_sessions if s.get("id") != chat_id]

    if len(new_sessions) == len(old_sessions):
        return False

    active = state.get("activeSessionId")

    if active == chat_id:
        active = new_sessions[0].get("id") if new_sessions else None

    save_state(new_sessions, active)
    return True


# ============================================================
# UPSERT SESSION
# ============================================================

def append_or_replace_session(session: dict) -> None:
    """
    Add or update session
    """
    state = load_state()
    sessions: List[dict] = list(state.get("sessions") or [])

    session_id = session.get("id")
    found = False

    for i, s in enumerate(sessions):
        if s.get("id") == session_id:
            sessions[i] = {**s, **session}
            found = True
            break

    if not found:
        sessions.insert(0, session)

    save_state(sessions, state.get("activeSessionId"))