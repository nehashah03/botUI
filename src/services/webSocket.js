/**
 * WebSocket client for the Python backend only (`/ws`, Vite-proxied in dev).
 * Registers handlers for server `event` names: `step`, `progress`, `pipeline`, `runPhase`, `message`, `complete`, `error`.
 * There is no in-browser stream simulator — if the socket is not open, `send()` triggers the `error` handler.
 */
 
/** Build ws: URL from current page host, or use `VITE_WS_URL` when set (e.g. production). */
function resolveWsUrl() {
  const explicit = import.meta.env.VITE_WS_URL;
  if (explicit) return String(explicit);
  const proto = typeof window !== "undefined" && window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = typeof window !== "undefined" ? window.location.host : "localhost:8080";
  return `${proto}//${host}/ws`;
}
 
const CONNECT_FAIL = "Failed to connect to server. Please try again later.";
 
class ChatWebSocketService {
  constructor() {
    /** @type {Record<string, Function>} */
    this.handlers = {};
    /** @type {WebSocket | null} */
    this.ws = null;
    /** True when the socket has reached `open` and we have not torn it down. */
    this.connected = false;
    this._closingFromApp = false;
    /** @type {Promise<void>} */
    this._ready = Promise.resolve();
  }
 
  /** Register a single callback per event name (same pattern `ChatPanel` expects). */
  on(event, handler) {
    this.handlers[event] = handler;
  }
 
  /** Attempt one connection to `/ws`; `send` awaits `_ready`. */
  connect() {
    this._ready = this._connectOnce();
  }
 
  _connectOnce() {
    return new Promise((resolve) => {
      let settled = false;
      const finish = (ok) => {
        if (settled) return;
        settled = true;
        this.connected = ok;
        if (ok) console.log("[WS] Connected to server");
        else console.warn("[WS]", CONNECT_FAIL);
        resolve();
      };
 
      let socket;
      try {
        socket = new WebSocket(resolveWsUrl());
      } catch {
        finish(false);
        return;
      }
 
      const timer = setTimeout(() => {
        try {
          socket.close();
        } catch {
          /* ignore */
        }
        finish(false);
      }, 2500);
 
      socket.onopen = () => {
        clearTimeout(timer);
        this.ws = socket;
        this._bindSocketMessages();
        finish(true);
      };
 
      socket.onerror = () => {
        clearTimeout(timer);
        try {
          socket.close();
        } catch {
          /* ignore */
        }
        if (!settled) finish(false);
      };
    });
  }
 
  /** Parse `{ event, ... }` from Python and forward to the matching UI handler. */
  _dispatchFromServer(payload) {
    const evt = payload.event;
    if (!evt) return;
    const { event: _e, ...rest } = payload;
    const h = this.handlers;
 
    if (evt === "runPhase") {
      h.runPhase?.(rest);
      return;
    }
    if (evt === "pipeline") {
      h.pipeline?.(rest);
      return;
    }
    if (evt === "step") {
      h.step?.(rest);
      return;
    }
    if (evt === "progress") {
      h.progress?.(rest);
      return;
    }
    if (evt === "message") {
      h.message?.(rest);
      return;
    }
    if (evt === "complete") {
      h.complete?.(rest);
      return;
    }
    if (evt === "error") {
      h.error?.(rest);
    }
  }
 
  _bindSocketMessages() {
    if (!this.ws) return;
    this.ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        this._dispatchFromServer(data);
      } catch {
        /* ignore malformed frames */
      }
    };
    this.ws.onclose = () => {
      const had = this.connected;
      this.connected = false;
      this.ws = null;
      if (!this._closingFromApp && had) {
        console.warn("[WS] Connection closed — reconnect on next page load or call connect().");
      }
    };
  }
 
  disconnect() {
    this._closingFromApp = true;
    try {
      this.ws?.close();
    } catch {
      /* ignore */
    }
    this.ws = null;
    this.connected = false;
    this._closingFromApp = false;
    this._ready = Promise.resolve();
  }
 
  /** Ask the server to cancel in-flight generation (optionally for one `sessionId`). */
  abort(sessionId) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(sessionId ? { type: "abort", sessionId } : { type: "abort" }));
      } catch {
        /* ignore */
      }
    }
  }
 
  /**
   * Send a user message to the backend. Requires an open WebSocket.
   * @param {string} message — user text
   * @param {string} messageId — assistant placeholder id
   * @param {string | null} sessionId — conversation id for multiplexing
   */
  async send(message, messageId, sessionId = null) {
    await this._ready;
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "chat", message, messageId, sessionId }));
      return;
    }
    this.handlers.error?.({ error: CONNECT_FAIL, messageId, sessionId });
  }
}
 
export const wsService = new ChatWebSocketService();
