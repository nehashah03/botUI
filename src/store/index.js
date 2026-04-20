 
// /**
//  * Redux store — combines `chat` (global UI/errors) + `session` (sidebar + per-chat messages).
//  *
//  * Persistence:
//  * - Writes to `localStorage` (browser-only UX) on a short debounce.
//  * - Mirrors the same snapshot to the Python backend via `PUT /api/sessions-state` when online;
//  *   failures surface as `chat.error` (Snackbar in `ChatPanel`).
//  */
// import { configureStore } from "@reduxjs/toolkit";
// import chatReducer, { setError } from "../features/chat/chatSlice";
// import sessionReducer from "../features/session/sessionSlice";
// import { putSessionsState } from "../api/chatApi";
 
// const SESSION_STORAGE_KEY = "logicchat.sessionState";
 
// /** Read last saved session list from the browser (offline-friendly UI cache only). */
// function readPersistedSession() {
//   try {
//     const raw = localStorage.getItem(SESSION_STORAGE_KEY);
//     if (!raw) return undefined;
//     const j = JSON.parse(raw);
//     return {
//       sessions: Array.isArray(j.sessions) ? j.sessions : [],
//       activeSessionId: j.activeSessionId ?? null,
//     };
//   } catch {
//     return undefined;
//   }
// }
 
// const persistedSession = readPersistedSession();
// const hasPersisted =
//   persistedSession && (persistedSession.sessions.length > 0 || persistedSession.activeSessionId != null);
 
// export const store = configureStore({
//   reducer: {
//     chat: chatReducer,
//     session: sessionReducer,
//   },
//   preloadedState: hasPersisted
//     ? {
//         session: {
//           sessions: persistedSession.sessions,
//           activeSessionId: persistedSession.activeSessionId,
//         },
//       }
//     : undefined,
// });
 
// /** Debounce timer id for mirroring Redux session → localStorage + backend. */
// let persistDebounce = null;
 
// store.subscribe(() => {
//   clearTimeout(persistDebounce);
//   persistDebounce = setTimeout(() => {
//     const { session } = store.getState();
//     const payload = { sessions: session.sessions, activeSessionId: session.activeSessionId };
//     try {
//       localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(payload));
//     } catch {
//       /* quota / private mode */
//     }
//     void putSessionsState(payload).then((r) => {
//       if (!r?.ok) {
//         store.dispatch(setError("Could not save to server. Please try again later."));
//       }
//     });
//   }, 450);
// });
 
// export { SESSION_STORAGE_KEY, readPersistedSession };
 
// import { configureStore } from "@reduxjs/toolkit";
// import chatReducer, { setError } from "../features/chat/chatSlice";
// import sessionReducer from "../features/session/sessionSlice";
// import { putSessionsState } from "../api/chatApi";

// /**
//  * ============================================================
//  * REDUX STORE (CLEAN VERSION)
//  * ============================================================
//  *
//  * Changes:
//  * ❌ Removed localStorage completely
//  * ✅ Only backend persistence
//  * ✅ Cleaner logic
//  */

// export const store = configureStore({
//   reducer: {
//     chat: chatReducer,
//     session: sessionReducer,
//   },
// });

// /**
//  * ============================================================
//  * BACKEND PERSISTENCE (DEBOUNCED)
//  * ============================================================
//  *
//  * WHY debounce?
//  * - Avoid API spam on every token / small change
//  * - Save only after user pauses interaction
//  */

// let persistTimer = null;

// store.subscribe(() => {
//   clearTimeout(persistTimer);

//   persistTimer = setTimeout(async () => {
//     const { session } = store.getState();

//     const payload = {
//       sessions: session.sessions,
//       activeSessionId: session.activeSessionId,
//     };

//     try {
//       const res = await putSessionsState(payload);

//       if (!res?.ok) {
//         store.dispatch(
//           setError("Could not save to server. Please try again later.")
//         );
//       }
//     } catch {
//       store.dispatch(
//         setError("Network error while saving sessions.")
//       );
//     }
//   }, 500); // slightly increased for stability
// });


/**
 * ============================================================
 * REDUX STORE (BACKEND-ONLY PERSISTENCE)
 * ============================================================
 *
 * - No localStorage (backend is source of truth)
 * - Sessions are saved to backend (debounced)
 * - Avoids unnecessary API calls
 */

import { configureStore } from "@reduxjs/toolkit";
import chatReducer, { setError } from "../features/chat/chatSlice";
import sessionReducer from "../features/session/sessionSlice";
import { putSessionsState } from "../api/chatApi";

/**
 * Create Redux store
 */
export const store = configureStore({
  reducer: {
    chat: chatReducer,
    session: sessionReducer,
  },
});

/**
 * ============================================================
 * BACKEND SYNC (DEBOUNCED + CHANGE DETECTION)
 * ============================================================
 */

let persistTimer = null;

/**
 * Keep last saved snapshot
 * Used to avoid unnecessary API calls
 */
let lastSavedState = null;

store.subscribe(() => {
  // Clear previous timer (debounce)
  clearTimeout(persistTimer);

  persistTimer = setTimeout(async () => {
    const { session } = store.getState();

    /**
     * Prepare payload to send
     */
    const payload = {
      sessions: session.sessions,
      activeSessionId: session.activeSessionId,
    };

    /**
     * 🚨 Skip API call if nothing changed
     */
    const currentStateString = JSON.stringify(payload);

    if (currentStateString === lastSavedState) {
      return; // no change → no API call
    }

    // update last saved snapshot
    lastSavedState = currentStateString;

    /**
     * Call backend API
     */
    try {
      const response = await putSessionsState(payload);

      if (!response?.ok) {
        store.dispatch(
          setError("Could not save to server. Please try again later.")
        );
      }
    } catch (error) {
      store.dispatch(
        setError("Network error while saving sessions.")
      );
    }
  }, 500); // debounce delay
});