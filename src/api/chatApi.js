/**
 * HTTP client for the Python FastAPI backend (`/api/*`, proxied in dev by Vite).
 * All calls hit the server; on failure each function returns `{ ok: false, error }` — no in-browser mock data.
 * Live streaming uses `src/services/websocket.js`.
 */
const API_BASE = "/api";
 
/** User-facing copy when the backend is unreachable or returns an error. */
export const BACKEND_UNAVAILABLE = "Failed to connect to server. Please try again later.";
 
/** GET /api/sessions-state — snapshot for first-load hydrate when local storage is empty. */
export async function fetchSessionsState() {
  try {
    const r = await fetch(`${API_BASE}/sessions-state`);
    if (!r.ok) return { ok: false, error: BACKEND_UNAVAILABLE };
    return await r.json();
  } catch {
    return { ok: false, error: BACKEND_UNAVAILABLE };
  }
}
 
/** PUT /api/sessions-state — persist sidebar + messages (debounced from the Redux store subscriber). */
export async function putSessionsState(body) {
  try {
    const r = await fetch(`${API_BASE}/sessions-state`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return { ok: r.ok, error: r.ok ? undefined : BACKEND_UNAVAILABLE };
  } catch {
    return { ok: false, error: BACKEND_UNAVAILABLE };
  }
}
 
/** PATCH /api/chats/:id — rename / favorite on the server. */
export async function patchChatOnServer(chatId, body) {
  try {
    const r = await fetch(`${API_BASE}/chats/${encodeURIComponent(chatId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) return { ok: false, error: BACKEND_UNAVAILABLE };
    return await r.json();
  } catch {
    return { ok: false, error: BACKEND_UNAVAILABLE };
  }
}
 
/** DELETE /api/chats/:id — remove one chat on the server. */
export async function deleteChatOnServer(chatId) {
  try {
    const r = await fetch(`${API_BASE}/chats/${encodeURIComponent(chatId)}`, { method: "DELETE" });
    if (r.ok) return { ok: true, deletedId: chatId };
    return { ok: false, error: BACKEND_UNAVAILABLE };
  } catch {
    return { ok: false, error: BACKEND_UNAVAILABLE };
  }
}
 
/**
 * GET /api/health — liveness probe before send or after idle.
 * Returns `{ ok: false, error }` when the Python process is not reachable.
 */
export async function fetchHealth() {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2000);
    const r = await fetch(`${API_BASE}/health`, { signal: ctrl.signal });
    clearTimeout(t);
    if (r.ok) return await r.json();
  } catch {
    /* network / timeout */
  }
  return { ok: false, error: BACKEND_UNAVAILABLE };
}
 
export { API_BASE };
 
