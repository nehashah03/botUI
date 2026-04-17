 
# Logic Chat — React + Material UI (Amazon Q–style)
 
Enterprise-style chat UI: **Material UI only** (no Tailwind), **JavaScript + JSX** (Redux and services are **`.js`**, not TypeScript), **light theme by default**, streaming “thinking” steps, **Events** / **Sources** / **citations**, markdown answers (tables, code, links), and a **Python backend** under `server/` (FastAPI + Uvicorn) for REST (`/api`) and streaming (`/ws`). The SPA uses `src/api/chatApi.js` and `src/services/websocket.js` only — no in-browser mock of the server.
 
---
 
## Design
 
- **Light theme default** — Page background `#f2f4f7`, cards `#ffffff`, borders `#D5D9D9`, primary blue `#2563eb`, success green for step checkmarks.
- **User messages** — Right-aligned, magenta accent avatar; **long pasted text** scrolls inside the bubble (fixed max height, ChatGPT-style).
- **Assistant messages** — Left-aligned, white card, thin border; inline citation chips for `[1]`, `[2]`, …
- **Typography** — Inter for UI; monospace stacks for code and live activity lines.
 
---
 
## Project layout
 
```
src/
├── api/
│   └── chatApi.js               # REST client for Python `/api` (health, sessions, chats)
├── components/
│   ├── ChatPanel.jsx           # Thread, WS wiring, Copy chat / Export
│   ├── ChatInput.jsx           # Scrollable textarea, attachments + PDF/image preview
│   ├── MessageBubble.jsx       # Markdown, citations, tool blocks, previews
│   ├── ToolOutputBlock.jsx     # Collapsible tool output
│   ├── SessionSidebar.jsx      # Chats list, search, delete (Yes/No), theme toggle
│   ├── ProcessingSteps.jsx     # Live pipeline + search pill + doc chips + activity log
│   ├── EventsSourcesPanel.jsx  # Post-reply Events & Sources (collapsible, scroll)
│   ├── TypingIndicator.jsx
│   └── StepTracker.jsx         # Optional; not mounted in main layout
├── features/
│   ├── chat/chatSlice.js       # Redux chat thread + pipeline UI state (commented)
│   └── session/sessionSlice.js
├── services/
│   └── websocket.js            # WebSocket client for Python `/ws` (no in-browser stream mock)
├── context/ThemeModeContext.jsx
├── theme.js                    # lightTheme + darkTheme + accent tokens
├── pages/Index.jsx
├── store/
│   ├── index.js                # configureStore
│   └── hooks.js                # useAppDispatch / useAppSelector
└── utils/helpers.js
```
 
**Repo root:** `vite.config.js`, `vitest.config.js`, `jsconfig.json` (path alias `@` → `src`), and **`server/`** (dummy **Python** backend: `main.py`, `mock_stream.py`, `requirements.txt`).
 
---
 
## Features
 
### Input
 
- Placeholder: **“Ask a followup question”**.
- **Max height ~160px** with **vertical scroll** for long or pasted content (same idea as ChatGPT).
- Attachments: **PDF, DOCX, images** (see `accept` in `ChatInput.jsx`). Every file gets an **`objectUrl`** for preview.
- **Click a file chip** → dialog preview: **images** as `<img>`, **PDFs** as `<iframe src={blobUrl}>`.
 
### Messages
 
- **Copy** per message (Request/Response label + timestamp + body).
- **Copy chat** in the header (entire thread via `exportConversationText`).
- **Code blocks**: Prism highlighting + **Copy** in the block header.
- **Tables**: GitHub-flavored markdown tables (`remark-gfm`).
- **Links**: standard `[text](url)` markdown.
- **Citations**: use `[1]`, `[2]` in the model text; UI renders small boxed numbers. Match indices to the `citations` array and **Sources** list from the backend.
 
### While the answer is streaming
 
1. **Initializing (~3s)** — Dock above the footer shows a **spinner** and short copy (“pulling context / preparing”). **No checklist yet.** Backend should use this window for session load, auth, and kicking off retrieval.
2. **Steps** — Collapsible **Processing** card with **ProcessingSteps**: Analyzing → Searching → Extracting → **Creating answer from fetched data** (compose from sources **before** tokens). Green checks / spinner per row.
3. **Bottom bar** — **`LinearProgress`** shows **0–100%**. The mock advances **~25% after each of the four main stages** completes (backend should emit the same).
4. **Streaming** — After stage 4 completes, **`runPhase: streaming`**: the markdown answer is appended **word-by-word** (`token` events). Progress stays at **100%** for the bar.
5. **Search pill** — `Q <user query>` when the search step runs; **document chips** when hits are reported; **LIVE ACTIVITY** lines as they arrive.
 
### After the answer completes
 
- **Events** (collapsed by default): full **processing log** + search pill + steps (scrollable).
- **Sources** (expanded by default): documents with link + URL line + snippet; **Citations** list maps `[n]` to sources.
 
### Sessions
 
- **New chat** clears the thread for a new session (no separate “clear history” control).
- **Delete** from the ⋮ menu asks **“Do you confirm?”** with **No** / **Yes**.
- **No quick-start suggestion chips** in the empty state (only a short line of help text).
 
---
 
## Markdown contract (what the backend should send)
 
### Tables
 
````markdown
| Metric | Value |
|--------|-------|
| CPU    | 78%   |
````
 
Requires a header row and separator row. Rendered with full-width table and borders.
 
### Code (with copy in UI)
 
````markdown
```javascript
export function answer() {
  return "ok";
}
```
````
 
Always specify a language after the opening fence for syntax highlighting.
 
### Links
 
```markdown
Read [PostgreSQL docs](https://www.postgresql.org/docs/).
```
 
### Inline code
 
```markdown
Use the `user_sessions` table.
```
 
### Blockquotes
 
```markdown
> **Note:** Memory is the top risk.
```
 
### Citations in the answer body
 
```markdown
Memory growth is elevated [1]. Latency is high on hot paths [2].
```
 
Send a matching `citations` payload (see WebSocket section) so **Sources** and citation chips align.
 
---
 
## WebSocket protocol (mock + production)
 
The UI listens on the same handler API as `wsService` in `src/services/websocket.js`.
 
### Server → client
 
| Payload | Purpose |
|--------|---------|
| `{ type: 'runPhase', messageId, phase }` | `phase`: `initializing` (spinner only, ~3s) → `steps` (checklist + activity) → `streaming` (tokens). |
| `{ type: 'pipeline', messageId, percent }` | **0–100** for the footer progress bar; **+25 per major stage** (four stages = 25, 50, 75, 100). |
| `{ type: 'step', messageId, step, allSteps }` | Pipeline step state; `allSteps` drives the live checklist. |
| `{ type: 'progress', messageId, stage, detail? }` | `stage`: `analyzing` \| `searching` \| `extracting` \| `generating` \| … (maps to Redux `pipelineStage`). |
| `{ type: 'message', messageId, type: 'activity', line }` | One **activity log** line (append-only on the assistant message). |
| `{ type: 'message', messageId, type: 'stream_meta', meta }` | Merge into `streamMeta`: `{ searchQuery?, foundSummary?, documents?: string[] }`. |
| `{ type: 'message', messageId, type: 'token', token }` | Append to assistant markdown buffer. |
| `{ type: 'message', messageId, type: 'tool_output', output }` | Tool block (`ToolOutput`). |
| `{ type: 'message', messageId, type: 'sources', sources, citations }` | Final sources + citation metadata. |
| `{ type: 'complete', messageId }` | Marks message complete; copies `processingSteps` onto the message for **Events**. |
| `{ type: 'error', messageId?, error }` | Error handling. |
 
### Client → server
 
Send a JSON frame (your shape) when you replace the mock, e.g.:
 
```json
{ "message": "User text", "messageId": "assistant-uuid", "sessionId": "..." }
```
 
### Backend steps (order the UI expects)
 
1. **`runPhase: initializing`** + **`pipeline: 0`** — Optional prep (DB, RAG index, file staging). Hold **~2–4s** or until ready; **no `step` events** required yet.
2. **`runPhase: steps`** — Emit **`step` / `allSteps`** for each phase: analyze → search → extract → **compose answer from fetched data** (stage 4 finishes **before** any answer tokens).
3. After each major stage completes, emit **`pipeline`** with **`percent`** 25, 50, 75, then **100** when stage 4 is done.
4. **`runPhase: streaming`** — Stream **`token`** chunks (word-by-word or sub-sentence).
5. Emit **`tool_output`** (if any), then **`sources` + `citations`**, then **`complete`**.
 
### Implementing a real backend (sketch)
 
1. **WebSocket server** — Node (`ws`), Python (**FastAPI** `WebSocket`, as in `server/main.py`), or your stack’s WS.
2. On connect/send, follow **Backend steps** above: `runPhase` + `pipeline` + `step` + `activity` + `stream_meta` during retrieval, then tokens.
3. Stream answer **tokens** only after the fourth stage (compose) is complete.
4. Send **`sources` + `citations`** when grounded context is known (the dummy server may send them near stream end).
5. End with **`complete`**.
 
---
 
## REST API (SPA → Python)
 
`src/api/chatApi.js` calls the FastAPI routes under `/api`:
 
- `fetchHealth()` — liveness; **`ChatPanel`** may call it on mount and before send.
- `fetchSessionsState()` / `putSessionsState()` — hydrate / persist session snapshot.
- `patchChatOnServer()` / `deleteChatOnServer()` — rename, favorite, delete.
 
If the server is unreachable, these return `{ ok: false, error }` and the UI shows toasts.
 
---
 
## Python backend (`server/`)
 
**FastAPI + Uvicorn** app that streams the same **event sequence** the UI expects over `/ws` (initializing → steps → tokens → tools → sources → complete). The SPA talks to this server via the Vite dev proxy (`/api`, `/ws`).
 
**Setup once:**
 
```bash
cd server
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```
 
| Command | Description |
|--------|-------------|
| `npm run server` | From repo root: `cd server && python -m uvicorn …` on **port 3001** (edit `package.json` or run Uvicorn manually to change port). |
| Manual | `cd server && uvicorn main:app --reload --host 127.0.0.1 --port 3001` |
 
- **REST:** `GET http://localhost:3001/api/health`, `GET http://localhost:3001/api/sessions-state`, etc.
- **WebSocket:** `ws://localhost:3001/ws` — send a JSON **chat** command to start the server stream:
 
```json
{ "type": "chat", "message": "Your question", "messageId": "same-uuid-as-assistant-message" }
```
 
Send `{ "type": "abort" }` to cancel the in-flight stream. Each outbound message is one JSON object (text frame) with an **`event`** key (`runPhase`, `pipeline`, `step`, `progress`, `message`, `complete`, `error`). See module docstrings in `server/mock_stream.py` and `server/main.py`, and `server/README.md`.
 
In dev, **`vite.config.js`** proxies `/api` and `/ws` to `127.0.0.1:3001` so the SPA hits the same backend.
 
---
 
## Commands
 
```bash
npm install
npm run dev          # Vite UI (see vite.config.js for port; often 8080 in this repo)
npm run server       # Python dummy backend (needs: cd server && pip install -r requirements.txt)
npm test             # Vitest
```
 
Open the dev URL from the terminal output. Send a message to see streaming steps, activity lines, markdown answer, and Events/Sources.
 
---
 
## Tech stack
 
| Piece | Role |
|--------|------|
| React 18 + Vite | UI |
| Redux Toolkit | `chat` + `session` state |
| MUI v7 | Layout, dialogs, buttons, theme |
| react-markdown + remark-gfm | Markdown (tables, GFM) |
| react-syntax-highlighter | Code blocks |
| Mock `websocket.js` | End-to-end UI demo without a server |
| `server/` (FastAPI + Uvicorn) | Optional dummy HTTP/WS for contract tests |
 
---
 
## Export
 
**Export** downloads a `.txt` transcript. **Copy chat** copies the same text to the clipboard.