# Logic Chat — Python backend
 
FastAPI + Uvicorn: **REST** (`/api/*`) and **WebSocket** (`/ws`). The React app calls these via the Vite dev proxy (`/api`, `/ws` → port **3001**).
 
## Setup
 
```bash
cd server
python -m venv .venv
.venv\Scripts\activate   # Windows
# source .venv/bin/activate  # macOS / Linux
pip install -r requirements.txt
```
 
## Run
 
```bash
uvicorn main:app --reload --host 127.0.0.1 --port 3001
```
 
Or from repo root: `npm run server` (uses `python -m uvicorn` from the `server` directory; override port with `PORT`).
 
## Endpoints (summary)
 
| Method | Path | Notes |
|--------|------|--------|
| GET | `/api/health` | Liveness JSON `{ ok, service, version }` |
| GET/PUT | `/api/sessions-state` | Full session snapshot for the SPA |
| GET/PATCH/DELETE | `/api/chats` … | Chat list, patch, delete |
| WS | `/ws` | Client sends `{ "type": "chat", "message", "messageId", "sessionId" }`; server streams JSON frames with an **`event`** field |
 
Outbound WS messages are JSON strings; see `mock_stream.py` and `main.py` for `event` types.