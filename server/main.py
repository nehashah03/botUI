# """
# Dummy Logic Chat backend — FastAPI + WebSocket.
 
# Run (from repo root):
#   cd server
#   pip install -r requirements.txt
#   uvicorn main:app --reload --host 127.0.0.1 --port 3001
 
# Or: npm run server  (uses python -m uvicorn from the `server` directory)
 
# --- Multi-session WebSocket (added): each `chat` frame must include `sessionId` so parallel
#     streams on one connection update the correct sidebar chat; see `persisted_state.py` for REST.
# """
 
# from __future__ import annotations
 
# import asyncio
# import json
# import os
# import time
# import uuid
# from contextlib import suppress
# from typing import Any, Dict, List, Optional
 
# from fastapi import Body, FastAPI, HTTPException, WebSocket, WebSocketDisconnect
# from fastapi.middleware.cors import CORSMiddleware
 
# from mock_stream import run_mock_stream
# from persisted_state import (
#     append_or_replace_session,
#     delete_chat,
#     load_state,
#     merge_chat_patch,
#     save_state,
# )
 
# # --- FastAPI app + permissive CORS for local dev (tighten in production). ---
# app = FastAPI(title="Logic Chat dummy backend", version="0.3.0")
 
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )
 
 
# # --- REST: health + persisted session snapshot (used by SPA bootstrap / debounced save). ---
 
 
# @app.get("/api/health")
# def health():
#     """Liveness check; same shape as `fetchHealth()` in the SPA (`src/api/chatApi.js`)."""
#     return {"ok": True, "service": "logic-chat-dummy-backend", "version": "0.3.0"}
 
 
# # --- Full snapshot for SPA bootstrap / persistence (added).
# @app.get("/api/sessions-state")
# def get_sessions_state():
#     """Return `sessions` + `activeSessionId` exactly as the Redux `session` slice expects."""
#     st = load_state()
#     return {
#         "ok": True,
#         "data": {
#             "sessions": st.get("sessions") or [],
#             "activeSessionId": st.get("activeSessionId"),
#         },
#     }
 
 
# @app.put("/api/sessions-state")
# def put_sessions_state(body: Dict[str, Any] = Body(...)):
#     """Replace stored snapshot (debounced client writes after local edits)."""
#     sessions = body.get("sessions")
#     active = body.get("activeSessionId")
#     if not isinstance(sessions, list):
#         raise HTTPException(400, "`sessions` must be a list")
#     # --- Do not persist ephemeral `live` pipeline state (added); only messages + metadata.
#     cleaned = []
#     for s in sessions:
#         if isinstance(s, dict):
#             c = {**s}
#             c.pop("live", None)
#             cleaned.append(c)
#     save_state(cleaned, active)
#     return {"ok": True}
 
 
# @app.get("/api/chats")
# def list_chats():
#     """List chat summaries for sidebar (derived from persisted sessions)."""
#     st = load_state()
#     chats = []
#     for s in st.get("sessions") or []:
#         msgs = s.get("messages") or []
#         chats.append(
#             {
#                 "id": s.get("id"),
#                 "title": s.get("title") or "Untitled",
#                 "updatedAt": s.get("updatedAt") or int(time.time() * 1000),
#                 "messageCount": len(msgs),
#                 "favorite": bool(s.get("favorite")),
#             }
#         )
#     return {"ok": True, "data": {"chats": chats}}
 
 
# @app.get("/api/chats/{chat_id}")
# def get_chat(chat_id: str):
#     """Return one session document (messages + metadata)."""
#     for s in load_state().get("sessions") or []:
#         if s.get("id") == chat_id:
#             return {"ok": True, "data": {"chat": s}}
#     raise HTTPException(404, "Chat not found")
 
 
# @app.post("/api/chats")
# def create_chat(body: Dict[str, Any] = Body(default={})):
#     """Create an empty conversation row (client usually already has an id — can pass `id` in body)."""
#     cid = body.get("id") or str(uuid.uuid4())
#     now = int(time.time() * 1000)
#     session = {
#         "id": cid,
#         "title": (body.get("title") or "New Conversation").strip() or "New Conversation",
#         "createdAt": now,
#         "updatedAt": now,
#         "favorite": bool(body.get("favorite")),
#         "messages": body.get("messages") or [],
#         "live": None,
#     }
#     append_or_replace_session(session)
#     return {"ok": True, "data": {"chat": session}}
 
 
# @app.patch("/api/chats/{chat_id}")
# def patch_chat(chat_id: str, body: Dict[str, Any] = Body(...)):
#     """Rename or toggle favorite (dummy business rules: update `updatedAt`)."""
#     updated = merge_chat_patch(chat_id, body)
#     if not updated:
#         raise HTTPException(404, "Chat not found")
#     return {"ok": True, "data": {"chat": updated}}
 
 
# @app.delete("/api/chats/{chat_id}")
# def remove_chat(chat_id: str):
#     """Hard-delete one chat from JSON store (404 if missing)."""
#     if not delete_chat(chat_id):
#         raise HTTPException(404, "Chat not found")
#     return {"ok": True, "deletedId": chat_id}
 
 
# # --- WebSocket: multiplex streams keyed by `sessionId` (added).
# stream_tasks: Dict[str, asyncio.Task] = {}
 
 
# async def cancel_keys(keys: List[str]) -> None:
#     for k in keys:
#         t = stream_tasks.pop(k, None)
#         if t is not None and not t.done():
#             t.cancel()
#             with suppress(asyncio.CancelledError):
#                 await t
 
 
# async def cancel_session_runs(session_id: str) -> None:
#     """Cancel in-flight generation for one conversation (new user message in same chat)."""
#     prefix = f"{session_id}:"
#     await cancel_keys([k for k in list(stream_tasks.keys()) if k.startswith(prefix)])
 
 
# async def cancel_all_streams() -> None:
#     await cancel_keys(list(stream_tasks.keys()))
 
 
# @app.websocket("/ws")
# async def websocket_chat(ws: WebSocket):
#     """
#     WebSocket endpoint. Client sends JSON text messages:
#       { "type": "chat", "message": "...", "messageId": "...", "sessionId": "..." }
#       { "type": "abort", "sessionId": "..." }  — optional sessionId to stop one chat only.
#     """
#     await ws.accept()
 
#     try:
#         while True:
#             raw = await ws.receive_text()
#             try:
#                 data = json.loads(raw)
#             except json.JSONDecodeError:
#                 await ws.send_text(json.dumps({"event": "error", "error": "Invalid JSON"}))
#                 continue
 
#             msg_type = data.get("type")
 
#             if msg_type == "abort":
#                 sid = data.get("sessionId")
#                 if sid:
#                     await cancel_session_runs(str(sid))
#                 else:
#                     await cancel_all_streams()
#                 continue
 
#             if msg_type == "chat" and data.get("messageId") and data.get("sessionId"):
#                 sid = str(data["sessionId"])
#                 mid = str(data["messageId"])
#                 text = data.get("message") or ""
 
#                 await cancel_session_runs(sid)
#                 task_key = f"{sid}:{mid}"
 
#                 async def runner(session_id: str = sid, message_id: str = mid, user_text: str = text) -> None:
#                     try:
#                         await run_mock_stream(ws.send_text, user_text, message_id, session_id)
#                     except WebSocketDisconnect:
#                         raise
#                     except asyncio.CancelledError:
#                         raise
#                     except Exception as e:  # noqa: BLE001 — dummy server
#                         err = {"event": "error", "messageId": message_id, "sessionId": session_id, "error": str(e)}
#                         with suppress(Exception):
#                             await ws.send_text(json.dumps(err))
 
#                 stream_tasks[task_key] = asyncio.create_task(runner())
 
#                 def _done(t: asyncio.Task, key: str = task_key) -> None:
#                     stream_tasks.pop(key, None)
 
#                 stream_tasks[task_key].add_done_callback(_done)
#     except WebSocketDisconnect:
#         await cancel_all_streams()
 
 
# def main() -> None:
#     """Allow `python main.py` when cwd is `server/`."""
#     import uvicorn
 
#     port = int(os.environ.get("PORT", "3001"))
#     uvicorn.run("main:app", host="127.0.0.1", port=port, reload=False)
 
 
# if __name__ == "__main__":
#     main()


"""
============================================================
LOGIC CHAT BACKEND (CLEAN + PRODUCTION SAFE)
============================================================

✔ REST APIs → sessions + chats persistence
✔ WebSocket → streaming responses
✔ Multi-session support
✔ File-based persistence (via persisted_state.py)

IMPORTANT:
- DO NOT store `live` field (UI-only)
- Only persist actual chat data
"""

from __future__ import annotations

import asyncio
import json
import os
import time
import uuid
from contextlib import suppress
from typing import Any, Dict, List

from fastapi import Body, FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from mock_stream import run_mock_stream
from persisted_state import (
    append_or_replace_session,
    delete_chat,
    load_state,
    merge_chat_patch,
    save_state,
)

# ============================================================
# APP SETUP
# ============================================================

app = FastAPI(title="Logic Chat backend", version="1.0.0")

# ⚠️ Allow all origins (OK for dev, restrict in production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/api/health")
def health():
    """Simple health endpoint"""
    return {"ok": True, "service": "logic-chat-backend", "version": "1.0.0"}

# ============================================================
# SESSIONS STATE (CRITICAL FOR REFRESH)
# ============================================================

@app.get("/api/sessions-state")
def get_sessions_state():
    """
    Return all sessions.
    This is called on app load (VERY IMPORTANT)
    """
    try:
        state = load_state()

        return {
            "ok": True,
            "data": {
                "sessions": state.get("sessions", []),
                "activeSessionId": state.get("activeSessionId"),
            },
        }

    except Exception as e:
        print("[ERROR] Failed to load sessions:", str(e))
        return {"ok": False, "error": "Failed to load sessions"}


@app.put("/api/sessions-state")
def put_sessions_state(body: Dict[str, Any] = Body(...)):
    """
    Save full session state.

    Called from frontend (debounced).
    """

    try:
        sessions = body.get("sessions")
        active = body.get("activeSessionId")

        # 🔒 Validate input
        if not isinstance(sessions, list):
            raise HTTPException(400, "`sessions` must be a list")

        cleaned_sessions = []

        for s in sessions:
            if not isinstance(s, dict):
                continue

            # 🔥 IMPORTANT: Remove UI-only data
            session_copy = {**s}
            session_copy.pop("live", None)

            cleaned_sessions.append(session_copy)

        # 🔥 SAVE TO FILE (CRITICAL STEP)
        save_state(cleaned_sessions, active)

        print(f"[SAVE] Sessions saved: {len(cleaned_sessions)}")

        return {"ok": True}

    except Exception as e:
        print("[ERROR] Failed to save sessions:", str(e))
        return {"ok": False, "error": "Failed to save sessions"}


# ============================================================
# CHAT CRUD
# ============================================================

@app.get("/api/chats")
def list_chats():
    """Return sidebar chat list"""

    state = load_state()
    chats = []

    for s in state.get("sessions", []):
        msgs = s.get("messages", [])

        chats.append({
            "id": s.get("id"),
            "title": s.get("title") or "Untitled",
            "updatedAt": s.get("updatedAt") or int(time.time() * 1000),
            "messageCount": len(msgs),
            "favorite": bool(s.get("favorite")),
        })

    return {"ok": True, "data": {"chats": chats}}


@app.get("/api/chats/{chat_id}")
def get_chat(chat_id: str):
    """Return full chat"""

    for s in load_state().get("sessions", []):
        if s.get("id") == chat_id:
            return {"ok": True, "data": {"chat": s}}

    raise HTTPException(404, "Chat not found")


@app.post("/api/chats")
def create_chat(body: Dict[str, Any] = Body(default={})):
    """Create new chat"""

    chat_id = body.get("id") or str(uuid.uuid4())
    now = int(time.time() * 1000)

    session = {
        "id": chat_id,
        "title": (body.get("title") or "New Conversation").strip() or "New Conversation",
        "createdAt": now,
        "updatedAt": now,
        "favorite": bool(body.get("favorite")),
        "messages": body.get("messages", []),
        "live": None,
    }

    append_or_replace_session(session)

    return {"ok": True, "data": {"chat": session}}


@app.patch("/api/chats/{chat_id}")
def patch_chat(chat_id: str, body: Dict[str, Any] = Body(...)):
    """Rename / favorite toggle"""

    updated = merge_chat_patch(chat_id, body)

    if not updated:
        raise HTTPException(404, "Chat not found")

    return {"ok": True, "data": {"chat": updated}}


@app.delete("/api/chats/{chat_id}")
def remove_chat(chat_id: str):
    """Delete chat"""

    if not delete_chat(chat_id):
        raise HTTPException(404, "Chat not found")

    return {"ok": True, "deletedId": chat_id}


# ============================================================
# WEBSOCKET (REAL-TIME STREAMING)
# ============================================================

stream_tasks: Dict[str, asyncio.Task] = {}


async def cancel_keys(keys: List[str]):
    """Cancel running streams safely"""
    for k in keys:
        task = stream_tasks.pop(k, None)
        if task and not task.done():
            task.cancel()
            with suppress(asyncio.CancelledError):
                await task


async def cancel_session_runs(session_id: str):
    """Cancel streams for one session"""
    prefix = f"{session_id}:"
    await cancel_keys([k for k in list(stream_tasks.keys()) if k.startswith(prefix)])


async def cancel_all_streams():
    """Cancel everything"""
    await cancel_keys(list(stream_tasks.keys()))


@app.websocket("/ws")
async def websocket_chat(ws: WebSocket):
    """
    WebSocket endpoint

    Handles:
    - chat messages
    - abort requests
    """

    await ws.accept()

    try:
        while True:
            raw = await ws.receive_text()

            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                await ws.send_text(json.dumps({"event": "error", "error": "Invalid JSON"}))
                continue

            msg_type = data.get("type")

            # ====================================================
            # ABORT
            # ====================================================
            if msg_type == "abort":
                sid = data.get("sessionId")

                if sid:
                    await cancel_session_runs(str(sid))
                else:
                    await cancel_all_streams()

                continue

            # ====================================================
            # CHAT
            # ====================================================
            if msg_type == "chat" and data.get("messageId") and data.get("sessionId"):
                sid = str(data["sessionId"])
                mid = str(data["messageId"])
                text = data.get("message", "")

                await cancel_session_runs(sid)

                task_key = f"{sid}:{mid}"

                async def runner():
                    try:
                        await run_mock_stream(ws.send_text, text, mid, sid)
                    except Exception as e:
                        await ws.send_text(json.dumps({
                            "event": "error",
                            "messageId": mid,
                            "sessionId": sid,
                            "error": str(e),
                        }))

                stream_tasks[task_key] = asyncio.create_task(runner())

                def cleanup(task):
                    stream_tasks.pop(task_key, None)

                stream_tasks[task_key].add_done_callback(cleanup)

    except WebSocketDisconnect:
        await cancel_all_streams()


# ============================================================
# ENTRY POINT
# ============================================================

def main():
    import uvicorn

    port = int(os.environ.get("PORT", "3001"))
    uvicorn.run("main:app", host="127.0.0.1", port=port)


if __name__ == "__main__":
    main()