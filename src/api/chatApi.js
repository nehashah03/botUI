// /**
//  * HTTP client for the Python FastAPI backend (`/api/*`, proxied in dev by Vite).
//  * All calls hit the server; on failure each function returns `{ ok: false, error }` — no in-browser mock data.
//  * Live streaming uses `src/services/websocket.js`.
//  */
// const API_BASE = "/api";
 
// /** User-facing copy when the backend is unreachable or returns an error. */
// export const BACKEND_UNAVAILABLE = "Failed to connect to server. Please try again later.";
 
// /** GET /api/sessions-state — snapshot for first-load hydrate when local storage is empty. */
// export async function fetchSessionsState() {
//   try {
//     const r = await fetch(`${API_BASE}/sessions-state`);
//     if (!r.ok) return { ok: false, error: BACKEND_UNAVAILABLE };
//     return await r.json();
//   } catch {
//     return { ok: false, error: BACKEND_UNAVAILABLE };
//   }
// }
 
// /** PUT /api/sessions-state — persist sidebar + messages (debounced from the Redux store subscriber). */
// export async function putSessionsState(body) {
//   try {
//     const r = await fetch(`${API_BASE}/sessions-state`, {
//       method: "PUT",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(body),
//     });
//     return { ok: r.ok, error: r.ok ? undefined : BACKEND_UNAVAILABLE };
//   } catch {
//     return { ok: false, error: BACKEND_UNAVAILABLE };
//   }
// }
 
// /** PATCH /api/chats/:id — rename / favorite on the server. */
// export async function patchChatOnServer(chatId, body) {
//   try {
//     const r = await fetch(`${API_BASE}/chats/${encodeURIComponent(chatId)}`, {
//       method: "PATCH",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(body),
//     });
//     if (!r.ok) return { ok: false, error: BACKEND_UNAVAILABLE };
//     return await r.json();
//   } catch {
//     return { ok: false, error: BACKEND_UNAVAILABLE };
//   }
// }
 
// /** DELETE /api/chats/:id — remove one chat on the server. */
// export async function deleteChatOnServer(chatId) {
//   try {
//     const r = await fetch(`${API_BASE}/chats/${encodeURIComponent(chatId)}`, { method: "DELETE" });
//     if (r.ok) return { ok: true, deletedId: chatId };
//     return { ok: false, error: BACKEND_UNAVAILABLE };
//   } catch {
//     return { ok: false, error: BACKEND_UNAVAILABLE };
//   }
// }
 
// /**
//  * GET /api/health — liveness probe before send or after idle.
//  * Returns `{ ok: false, error }` when the Python process is not reachable.
//  */
// export async function fetchHealth() {
//   try {
//     const ctrl = new AbortController();
//     const t = setTimeout(() => ctrl.abort(), 2000);
//     const r = await fetch(`${API_BASE}/health`, { signal: ctrl.signal });
//     clearTimeout(t);
//     if (r.ok) return await r.json();
//   } catch {
//     /* network / timeout */
//   }
//   return { ok: false, error: BACKEND_UNAVAILABLE };
// }
 
// export { API_BASE };
 
/**
 * ============================================================
 * API CLIENT (PRODUCTION READY)
 * ============================================================
 *
 * Purpose:
 * - Handle ALL HTTP communication with backend (/api/*)
 * - Used for:
 *    ✔ loading sessions (on app start)
 *    ✔ saving sessions (debounced)
 *    ✔ renaming / deleting chats
 *    ✔ health checks
 *
 * IMPORTANT:
 * - WebSocket handles LIVE chat (streaming)
 * - This file handles DATA persistence
 *
 * RESPONSE FORMAT (STANDARDIZED):
 *
 * SUCCESS:
 *   { ok: true, data }
 *
 * FAILURE:
 *   { ok: false, error }
 */

// const API_BASE = "/api";

// /** Common error message shown to user */
// export const BACKEND_UNAVAILABLE =
//   "Failed to connect to server. Please try again later.";

// /**
//  * ============================================================
//  * GENERIC REQUEST HELPER
//  * ============================================================
//  *
//  * WHY this exists:
//  * - Avoid repeating fetch logic everywhere
//  * - Ensure consistent response structure
//  * - Handle errors in one place
//  *
//  * Handles:
//  * ✔ fetch
//  * ✔ JSON parsing
//  * ✔ network errors
//  * ✔ non-200 responses
//  */
// async function apiRequest(url, options = {}) {
//   try {
//     const response = await fetch(url, {
//       ...options,
//       headers: {
//         "Content-Type": "application/json",
//         ...(options.headers || {}),
//       },
//     });

//     /**
//      * If backend returns error status (4xx / 5xx)
//      */
//     if (!response.ok) {
//       return { ok: false, error: BACKEND_UNAVAILABLE };
//     }

//     /**
//      * Some endpoints may not return JSON (like DELETE)
//      */
//     let data = null;

//     try {
//       data = await response.json();
//     } catch {
//       // ignore empty body
//     }

//     return { ok: true, data };
//   } catch {
//     /**
//      * Network failure / server unreachable
//      */
//     return { ok: false, error: BACKEND_UNAVAILABLE };
//   }
// }

// /**
//  * ============================================================
//  * SESSIONS (LOAD + SAVE)
//  * ============================================================
//  */

// /**
//  * GET /api/sessions-state
//  *
//  * Used:
//  * - When app loads
//  * - Hydrates Redux with previous chats
//  */
// export async function fetchSessionsState() {
//   return apiRequest(`${API_BASE}/sessions-state`);
// }

// /**
//  * PUT /api/sessions-state
//  *
//  * Used:
//  * - Save entire session state
//  * - Triggered from Redux (debounced)
//  *
//  * NOTE:
//  * - This is your main persistence API
//  */
// export async function putSessionsState(body) {
//   return apiRequest(`${API_BASE}/sessions-state`, {
//     method: "PUT",
//     body: JSON.stringify(body),
//   });
// }

// /**
//  * ============================================================
//  * CHAT OPERATIONS (UPDATE / DELETE)
//  * ============================================================
//  */

// /**
//  * PATCH /api/chats/:id
//  *
//  * Used:
//  * - Rename chat
//  * - Toggle favorite
//  */
// export async function patchChatOnServer(chatId, body) {
//   return apiRequest(`${API_BASE}/chats/${encodeURIComponent(chatId)}`, {
//     method: "PATCH",
//     body: JSON.stringify(body),
//   });
// }

// /**
//  * DELETE /api/chats/:id
//  *
//  * Used:
//  * - Delete a chat permanently
//  */
// export async function deleteChatOnServer(chatId) {
//   const result = await apiRequest(
//     `${API_BASE}/chats/${encodeURIComponent(chatId)}`,
//     { method: "DELETE" }
//   );

//   /**
//    * Attach deletedId for easier UI handling
//    */
//   if (result.ok) {
//     return {
//       ok: true,
//       data: { deletedId: chatId },
//     };
//   }

//   return result;
// }

// /**
//  * ============================================================
//  * HEALTH CHECK
//  * ============================================================
//  *
//  * Used:
//  * - Before sending message (optional)
//  * - Detect backend downtime
//  *
//  * Features:
//  * ✔ Timeout protection (2s)
//  * ✔ Prevents UI hanging
//  */
// export async function fetchHealth() {
//   try {
//     const controller = new AbortController();

//     // Timeout after 2 seconds
//     const timeout = setTimeout(() => controller.abort(), 2000);

//     const response = await fetch(`${API_BASE}/health`, {
//       signal: controller.signal,
//     });

//     clearTimeout(timeout);

//     if (!response.ok) {
//       return { ok: false, error: BACKEND_UNAVAILABLE };
//     }

//     const data = await response.json();
//     return { ok: true, data };
//   } catch {
//     return { ok: false, error: BACKEND_UNAVAILABLE };
//   }
// }

// /** Export base URL if needed elsewhere */
// export { API_BASE };


/**
 * ============================================================
 * API CLIENT (STABLE + NON-BREAKING VERSION)
 * ============================================================
 *
 * PURPOSE:
 * - Communicate with FastAPI backend (/api/*)
 * - Used for:
 *    ✔ Loading sessions (on app start)
 *    ✔ Saving sessions (debounced from Redux)
 *    ✔ Renaming / deleting chats
 *    ✔ Health check
 *
 * IMPORTANT:
 * - Backend already returns: { ok, data }
 * - We DO NOT modify that structure (to avoid breaking UI)
 * - WebSocket handles live chat (streaming)
 */

const API_BASE = "/api";

/**
 * User-friendly error message
 * Used when backend is unreachable or fails
 */
export const BACKEND_UNAVAILABLE =
  "Failed to connect to server. Please try again later.";

/**
 * ============================================================
 * GENERIC FETCH HELPER (NON-BREAKING)
 * ============================================================
 *
 * WHY:
 * - Avoid repeating fetch logic
 * - Keep code clean and consistent
 *
 * IMPORTANT:
 * - Returns EXACT backend response (no transformation)
 * - So existing UI code continues to work
 */
async function apiRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });

    /**
     * If server returns error status (4xx / 5xx)
     */
    if (!response.ok) {
      return { ok: false, error: BACKEND_UNAVAILABLE };
    }

    /**
     * Backend already returns { ok, data }
     * So we return it directly (NO wrapping)
     */
    return await response.json();
  } catch {
    /**
     * Network error / server down
     */
    return { ok: false, error: BACKEND_UNAVAILABLE };
  }
}

/**
 * ============================================================
 * SESSIONS (LOAD + SAVE)
 * ============================================================
 */

/**
 * GET /api/sessions-state
 *
 * Used:
 * - On app load (hydrate Redux)
 */
export async function fetchSessionsState() {
  return apiRequest(`${API_BASE}/sessions-state`);
}

/**
 * PUT /api/sessions-state
 *
 * Used:
 * - Save full session state
 * - Triggered from Redux store (debounced)
 */
export async function putSessionsState(body) {
  return apiRequest(`${API_BASE}/sessions-state`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

/**
 * ============================================================
 * CHAT OPERATIONS
 * ============================================================
 */

/**
 * PATCH /api/chats/:id
 *
 * Used:
 * - Rename chat
 * - Toggle favorite
 */
export async function patchChatOnServer(chatId, body) {
  return apiRequest(`${API_BASE}/chats/${encodeURIComponent(chatId)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

/**
 * DELETE /api/chats/:id
 *
 * Used:
 * - Delete chat permanently
 */
export async function deleteChatOnServer(chatId) {
  return apiRequest(`${API_BASE}/chats/${encodeURIComponent(chatId)}`, {
    method: "DELETE",
  });
}

/**
 * ============================================================
 * HEALTH CHECK
 * ============================================================
 *
 * Used:
 * - Check if backend is alive
 * - Optional before sending message
 *
 * Includes timeout (2s) to avoid UI freeze
 */
export async function fetchHealth() {
  try {
    const controller = new AbortController();

    // Timeout after 2 seconds
    const timeout = setTimeout(() => controller.abort(), 2000);

    const response = await fetch(`${API_BASE}/health`, {
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return { ok: false, error: BACKEND_UNAVAILABLE };
    }

    return await response.json();
  } catch {
    return { ok: false, error: BACKEND_UNAVAILABLE };
  }
}

/**
 * Export base URL (if needed elsewhere)
 */
export { API_BASE };