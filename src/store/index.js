 
/**
 * Redux store — combines `chat` (global UI/errors) + `session` (sidebar + per-chat messages).
 *
 * Persistence:
 * - Writes to `localStorage` (browser-only UX) on a short debounce.
 * - Mirrors the same snapshot to the Python backend via `PUT /api/sessions-state` when online;
 *   failures surface as `chat.error` (Snackbar in `ChatPanel`).
 */
import { configureStore } from "@reduxjs/toolkit";
import chatReducer, { setError } from "../features/chat/chatSlice";
import sessionReducer from "../features/session/sessionSlice";
import { putSessionsState } from "../api/chatApi";
 
const SESSION_STORAGE_KEY = "logicchat.sessionState";
 
/** Read last saved session list from the browser (offline-friendly UI cache only). */
function readPersistedSession() {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return undefined;
    const j = JSON.parse(raw);
    return {
      sessions: Array.isArray(j.sessions) ? j.sessions : [],
      activeSessionId: j.activeSessionId ?? null,
    };
  } catch {
    return undefined;
  }
}
 
const persistedSession = readPersistedSession();
const hasPersisted =
  persistedSession && (persistedSession.sessions.length > 0 || persistedSession.activeSessionId != null);
 
export const store = configureStore({
  reducer: {
    chat: chatReducer,
    session: sessionReducer,
  },
  preloadedState: hasPersisted
    ? {
        session: {
          sessions: persistedSession.sessions,
          activeSessionId: persistedSession.activeSessionId,
        },
      }
    : undefined,
});
 
/** Debounce timer id for mirroring Redux session → localStorage + backend. */
let persistDebounce = null;
 
store.subscribe(() => {
  clearTimeout(persistDebounce);
  persistDebounce = setTimeout(() => {
    const { session } = store.getState();
    const payload = { sessions: session.sessions, activeSessionId: session.activeSessionId };
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      /* quota / private mode */
    }
    void putSessionsState(payload).then((r) => {
      if (!r?.ok) {
        store.dispatch(setError("Could not save to server. Please try again later."));
      }
    });
  }, 450);
});
 
export { SESSION_STORAGE_KEY, readPersistedSession };
 
