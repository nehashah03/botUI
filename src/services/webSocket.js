// /**
//  * WebSocket client for the Python backend only (`/ws`, Vite-proxied in dev).
//  * Registers handlers for server `event` names: `step`, `progress`, `pipeline`, `runPhase`, `message`, `complete`, `error`.
//  * There is no in-browser stream simulator — if the socket is not open, `send()` triggers the `error` handler.
//  */

// /** Build ws: URL from current page host, or use `VITE_WS_URL` when set (e.g. production). */
// function resolveWsUrl() {
//   const explicit = import.meta.env.VITE_WS_URL;
//   if (explicit) return String(explicit);
//   const proto = typeof window !== "undefined" && window.location.protocol === "https:" ? "wss:" : "ws:";
//   const host = typeof window !== "undefined" ? window.location.host : "localhost:8080";
//   return `${proto}//${host}/ws`;
// }

// const CONNECT_FAIL = "Failed to connect to server. Please try again later.";

// class ChatWebSocketService {
//   constructor() {
//     /** @type {Record<string, Function>} */
//     this.handlers = {};
//     /** @type {WebSocket | null} */
//     this.ws = null;
//     /** True when the socket has reached `open` and we have not torn it down. */
//     this.connected = false;
//     this._closingFromApp = false;
//     /** @type {Promise<void>} */
//     this._ready = Promise.resolve();
//   }

//   /** Register a single callback per event name (same pattern `ChatPanel` expects). */
//   on(event, handler) {
//     this.handlers[event] = handler;
//   }

//   /** Attempt one connection to `/ws`; `send` awaits `_ready`. */
//   connect() {
//     this._ready = this._connectOnce();
//   }

//   _connectOnce() {
//     return new Promise((resolve) => {
//       let settled = false;
//       const finish = (ok) => {
//         if (settled) return;
//         settled = true;
//         this.connected = ok;
//         if (ok) console.log("[WS] Connected to server");
//         else console.warn("[WS]", CONNECT_FAIL);
//         resolve();
//       };

//       let socket;
//       try {
//         socket = new WebSocket(resolveWsUrl());
//       } catch {
//         finish(false);
//         return;
//       }

//       const timer = setTimeout(() => {
//         try {
//           socket.close();
//         } catch {
//           /* ignore */
//         }
//         finish(false);
//       }, 2500);

//       socket.onopen = () => {
//         clearTimeout(timer);
//         this.ws = socket;
//         this._bindSocketMessages();
//         finish(true);
//       };

//       socket.onerror = () => {
//         clearTimeout(timer);
//         try {
//           socket.close();
//         } catch {
//           /* ignore */
//         }
//         if (!settled) finish(false);
//       };
//     });
//   }

//   /** Parse `{ event, ... }` from Python and forward to the matching UI handler. */
//   _dispatchFromServer(payload) {
//     const evt = payload.event;
//     if (!evt) return;
//     const { event: _e, ...rest } = payload;
//     const h = this.handlers;

//     if (evt === "runPhase") {
//       h.runPhase?.(rest);
//       return;
//     }
//     if (evt === "pipeline") {
//       h.pipeline?.(rest);
//       return;
//     }
//     if (evt === "step") {
//       h.step?.(rest);
//       return;
//     }
//     if (evt === "progress") {
//       h.progress?.(rest);
//       return;
//     }
//     if (evt === "message") {
//       h.message?.(rest);
//       return;
//     }
//     if (evt === "complete") {
//       h.complete?.(rest);
//       return;
//     }
//     if (evt === "error") {
//       h.error?.(rest);
//     }
//   }

//   _bindSocketMessages() {
//     if (!this.ws) return;
//     this.ws.onmessage = (ev) => {
//       try {
//         const data = JSON.parse(ev.data);
//         this._dispatchFromServer(data);
//       } catch {
//         /* ignore malformed frames */
//       }
//     };
//     this.ws.onclose = () => {
//       const had = this.connected;
//       this.connected = false;
//       this.ws = null;
//       if (!this._closingFromApp && had) {
//         console.warn("[WS] Connection closed — reconnect on next page load or call connect().");
//       }
//     };
//   }

//   disconnect() {
//     this._closingFromApp = true;
//     try {
//       this.ws?.close();
//     } catch {
//       /* ignore */
//     }
//     this.ws = null;
//     this.connected = false;
//     this._closingFromApp = false;
//     this._ready = Promise.resolve();
//   }

//   /** Ask the server to cancel in-flight generation (optionally for one `sessionId`). */
//   abort(sessionId) {
//     if (this.ws?.readyState === WebSocket.OPEN) {
//       try {
//         this.ws.send(JSON.stringify(sessionId ? { type: "abort", sessionId } : { type: "abort" }));
//       } catch {
//         /* ignore */
//       }
//     }
//   }

//   /**
//    * Send a user message to the backend. Requires an open WebSocket.
//    * @param {string} message — user text
//    * @param {string} messageId — assistant placeholder id
//    * @param {string | null} sessionId — conversation id for multiplexing
//    */
//   async send(message, messageId, sessionId = null) {
//     await this._ready;
//     if (this.ws?.readyState === WebSocket.OPEN) {
//       this.ws.send(JSON.stringify({ type: "chat", message, messageId, sessionId }));
//       return;
//     }
//     this.handlers.error?.({ error: CONNECT_FAIL, messageId, sessionId });
//   }
// }

// export const wsService = new ChatWebSocketService();
/**
 * ============================================================
 * WEBSOCKET SERVICE (PRODUCTION READY)
 * ============================================================
 *
 * Purpose:
 * - Connect to backend `/ws`
 * - Send user messages
 * - Receive streaming events
 * - Forward events to UI via handlers
 *
 * Backend sends:
 * {
 *   event: "message" | "progress" | "step" | "pipeline" | "runPhase" | "complete" | "error",
 *   ...data
 * }
 */

/**
 * Build WebSocket URL
 * - Uses env variable if provided
 * - Otherwise builds from current host
 */
// function resolveWsUrl() {
//   const envUrl = import.meta.env.VITE_WS_URL;
//   if (envUrl) return String(envUrl);

//   const isSecure = window.location.protocol === "https:";
//   const protocol = isSecure ? "wss:" : "ws:";
//   return `${protocol}//${window.location.host}/ws`;
// }

// const CONNECT_FAIL = "Failed to connect to server. Please try again later.";

// class ChatWebSocketService {
//   constructor() {
//     /** Stores event handlers: { eventName: callback } */
//     this.handlers = {};

//     /** Active WebSocket instance */
//     this.ws = null;

//     /** Whether connection is open */
//     this.connected = false;

//     /** Promise used to wait until connection is ready */
//     this._ready = Promise.resolve();

//     /** Internal flag to avoid false warnings on manual disconnect */
//     this._closingFromApp = false;
//   }

//   /**
//    * Register handler for server event
//    * Example:
//    * ws.on("message", callback)
//    */
//   on(event, handler) {
//     this.handlers[event] = handler;
//   }

//   /**
//    * Initiates connection
//    * - Stores promise so `send()` can wait
//    */
//   connect() {
//     this._ready = this._connect();
//   }

//   /**
//    * Core connection logic
//    */
//   _connect() {
//     return new Promise((resolve) => {
//       let finished = false;

//       const done = (success) => {
//         if (finished) return;
//         finished = true;

//         this.connected = success;

//         if (success) {
//           console.log("[WS] Connected");
//         } else {
//           console.warn("[WS]", CONNECT_FAIL);
//         }

//         resolve();
//       };

//       let socket;

//       try {
//         socket = new WebSocket(resolveWsUrl());
//       } catch {
//         done(false);
//         return;
//       }

//       /** Timeout → fail connection */
//       const timeout = setTimeout(() => {
//         socket.close();
//         done(false);
//       }, 2500);

//       socket.onopen = () => {
//         clearTimeout(timeout);

//         this.ws = socket;
//         this._bindListeners();

//         done(true);
//       };

//       socket.onerror = () => {
//         clearTimeout(timeout);
//         socket.close();
//         done(false);
//       };
//     });
//   }

//   /**
//    * Attach message + close listeners
//    */
//   _bindListeners() {
//     if (!this.ws) return;

//     /**
//      * Handle incoming messages
//      */
//     this.ws.onmessage = (event) => {
//       try {
//         const data = JSON.parse(event.data);
//         this._handleServerEvent(data);
//       } catch {
//         // Ignore invalid JSON
//       }
//     };

//     /**
//      * Handle connection close
//      */
//     this.ws.onclose = () => {
//       const wasConnected = this.connected;

//       this.connected = false;
//       this.ws = null;

//       if (!this._closingFromApp && wasConnected) {
//         console.warn("[WS] Disconnected. Call connect() again if needed.");
//       }
//     };
//   }

//   /**
//    * Dispatch server event to registered handler
//    */
//   _handleServerEvent(payload) {
//     const { event, ...data } = payload;

//     if (!event) return;

//     const handler = this.handlers[event];

//     if (handler) {
//       handler(data);
//     }
//   }

//   /**
//    * Disconnect WebSocket safely
//    */
//   disconnect() {
//     this._closingFromApp = true;

//     try {
//       this.ws?.close();
//     } catch {
//       // ignore
//     }

//     this.ws = null;
//     this.connected = false;
//     this._closingFromApp = false;
//     this._ready = Promise.resolve();
//   }

//   /**
//    * Abort ongoing request
//    */
//   abort(sessionId) {
//     if (this.ws?.readyState === WebSocket.OPEN) {
//       const payload = sessionId
//         ? { type: "abort", sessionId }
//         : { type: "abort" };

//       try {
//         this.ws.send(JSON.stringify(payload));
//       } catch {
//         // ignore send errors
//       }
//     }
//   }

//   /**
//    * Send user message to backend
//    *
//    * @param message - user input
//    * @param messageId - assistant placeholder id
//    * @param sessionId - session identifier
//    */
//   async send(message, messageId, sessionId = null) {
//     // Wait until connection attempt finishes
//     await this._ready;

//     if (this.ws?.readyState === WebSocket.OPEN) {
//       this.ws.send(
//         JSON.stringify({
//           type: "chat",
//           message,
//           messageId,
//           sessionId,
//         })
//       );
//       return;
//     }

//     // If not connected → trigger error handler
//     this.handlers.error?.({
//       error: CONNECT_FAIL,
//       messageId,
//       sessionId,
//     });
//   }
// }

// /** Singleton instance */
// export const wsService = new ChatWebSocketService();


// /**
//  * ============================================================
//  * WEBSOCKET CLIENT (FULL VERSION - READABLE)
//  * ============================================================
//  *
//  * Purpose:
//  * - Connect to Python backend (/ws)
//  * - Send user messages
//  * - Receive streaming events
//  * - Forward events to UI via handlers
//  *
//  * Server sends events:
//  *   step | progress | pipeline | runPhase | message | complete | error
//  *
//  * IMPORTANT:
//  * - No local simulation
//  * - If socket not connected → send() triggers error
//  */

// /**
//  * ============================================================
//  * BUILD WEBSOCKET URL
//  * ============================================================
//  *
//  * Priority:
//  * 1. Use VITE_WS_URL (production)
//  * 2. Otherwise build from current browser URL
//  */
// function resolveWsUrl() {
//   const explicit = import.meta.env.VITE_WS_URL;
//   if (explicit) return String(explicit);

//   const proto =
//     typeof window !== "undefined" && window.location.protocol === "https:"
//       ? "wss:"
//       : "ws:";

//   const host =
//     typeof window !== "undefined"
//       ? window.location.host
//       : "localhost:8080";

//   return `${proto}//${host}/ws`;
// }

// /** Common error message */
// const CONNECT_FAIL =
//   "Failed to connect to server. Please try again later.";

// class ChatWebSocketService {
//   constructor() {
//     /**
//      * Stores event handlers
//      * Example:
//      * {
//      *   message: fn,
//      *   progress: fn
//      * }
//      */
//     this.handlers = {};

//     /** Actual WebSocket instance */
//     this.ws = null;

//     /**
//      * Connection state:
//      * true  → connected
//      * false → not connected
//      */
//     this.connected = false;

//     /**
//      * Used to track if close() was called manually
//      * Prevents false warnings in console
//      */
//     this._closingFromApp = false;

//     /**
//      * Promise used to WAIT until connection is ready
//      * send() will wait for this before sending data
//      */
//     this._ready = Promise.resolve();
//   }

//   /**
//    * ============================================================
//    * REGISTER EVENT HANDLER
//    * ============================================================
//    *
//    * Example:
//    * ws.on("message", handler)
//    */
//   on(event, handler) {
//     this.handlers[event] = handler;
//   }

//   //   /**
//   //  * ============================================================
//   //  * REMOVE EVENT HANDLER
//   //  * ============================================================
//   //  */
//   //   off(event, handler) {
//   //     if (!this.handlers[event]) return;

//   //     // if handler provided → remove specific
//   //     if (handler) {
//   //       this.handlers[event] = this.handlers[event].filter(
//   //         (h) => h !== handler
//   //       );
//   //       return;
//   //     }

//   //     // else remove all handlers for event
//   //     delete this.handlers[event];
//   //   }
//   off(event) {
//     if (event) {
//       delete this.handlers[event];
//     } else {
//       this.handlers = {};
//     }
//   }

//   /**
//    * ============================================================
//    * CONNECT TO WEBSOCKET
//    * ============================================================
//    *
//    * - Starts connection attempt
//    * - Stores promise in `_ready`
//    */
//   connect() {
//     this._ready = this._connectOnce();
//   }

//   /**
//    * ============================================================
//    * INTERNAL CONNECTION LOGIC
//    * ============================================================
//    *
//    * - Creates WebSocket
//    * - Handles timeout
//    * - Resolves when connection attempt completes
//    */
//   _connectOnce() {
//     return new Promise((resolve) => {
//       let settled = false;

//       /**
//        * Finish connection attempt
//        * ok = true  → connected
//        * ok = false → failed
//        */
//       const finish = (ok) => {
//         if (settled) return;
//         settled = true;

//         this.connected = ok;

//         if (ok) console.log("[WS] Connected to server");
//         else console.warn("[WS]", CONNECT_FAIL);

//         resolve();
//       };

//       let socket;

//       /** Try creating WebSocket */
//       try {
//         socket = new WebSocket(resolveWsUrl());
//       } catch {
//         finish(false);
//         return;
//       }

//       /**
//        * Timeout safety:
//        * If connection doesn't open within 2.5s → fail
//        */
//       const timer = setTimeout(() => {
//         try {
//           socket.close();
//         } catch { }
//         finish(false);
//       }, 2500);

//       /**
//        * SUCCESS: connection opened
//        */
//       socket.onopen = () => {
//         clearTimeout(timer);

//         this.ws = socket;

//         // attach listeners
//         this._bindSocketMessages();

//         finish(true);
//       };

//       /**
//        * ERROR: connection failed
//        */
//       socket.onerror = () => {
//         clearTimeout(timer);

//         try {
//           socket.close();
//         } catch { }

//         if (!settled) finish(false);
//       };
//     });
//   }

//   /**
//    * ============================================================
//    * HANDLE SERVER EVENTS
//    * ============================================================
//    *
//    * Input:
//    * { event: "message", ...data }
//    *
//    * Calls corresponding handler
//    */
//   _dispatchFromServer(payload) {
//     const evt = payload.event;
//     if (!evt) return;

//     /** remove event field */
//     const { event: _e, ...rest } = payload;

//     const h = this.handlers;

//     // Call correct handler
//     if (evt === "runPhase") {
//       h.runPhase?.(rest);
//       return;
//     }
//     if (evt === "pipeline") {
//       h.pipeline?.(rest);
//       return;
//     }
//     if (evt === "step") {
//       h.step?.(rest);
//       return;
//     }
//     if (evt === "progress") {
//       h.progress?.(rest);
//       return;
//     }
//     if (evt === "message") {
//       h.message?.(rest);
//       return;
//     }
//     if (evt === "complete") {
//       h.complete?.(rest);
//       return;
//     }
//     if (evt === "error") {
//       h.error?.(rest);
//     }
//   }

//   /**
//    * ============================================================
//    * ATTACH SOCKET LISTENERS
//    * ============================================================
//    *
//    * - onmessage → receive server events
//    * - onclose   → handle disconnect
//    */
//   _bindSocketMessages() {
//     if (!this.ws) return;

//     /**
//      * When message received from backend
//      */
//     this.ws.onmessage = (ev) => {
//       try {
//         const data = JSON.parse(ev.data);

//         // forward to dispatcher
//         this._dispatchFromServer(data);
//       } catch {
//         // ignore invalid JSON
//       }
//     };

//     /**
//      * When connection closes
//      */
//     this.ws.onclose = () => {
//       const hadConnection = this.connected;

//       this.connected = false;
//       this.ws = null;

//       /**
//        * Show warning ONLY if:
//        * - connection was active
//        * - not manually closed
//        */
//       if (!this._closingFromApp && hadConnection) {
//         console.warn(
//           "[WS] Connection closed — reconnect manually if needed"
//         );
//       }
//     };
//   }

//   /**
//    * ============================================================
//    * DISCONNECT
//    * ============================================================
//    *
//    * Safely closes connection
//    */
//   disconnect() {
//     this._closingFromApp = true;

//     try {
//       this.ws?.close();
//     } catch { }

//     this.ws = null;
//     this.connected = false;

//     this._closingFromApp = false;
//     this._ready = Promise.resolve();
//   }

//   /**
//    * ============================================================
//    * ABORT CURRENT REQUEST
//    * ============================================================
//    *
//    * Used to stop streaming response
//    */
//   abort(sessionId) {
//     if (this.ws?.readyState === WebSocket.OPEN) {
//       try {
//         this.ws.send(
//           JSON.stringify(
//             sessionId
//               ? { type: "abort", sessionId }
//               : { type: "abort" }
//           )
//         );
//       } catch { }
//     }
//   }

//   /**
//    * ============================================================
//    * SEND MESSAGE TO BACKEND
//    * ============================================================
//    *
//    * Steps:
//    * 1. Wait for connection (_ready)
//    * 2. If open → send message
//    * 3. If not → trigger error handler
//    */
//   async send(message, messageId, sessionId = null) {
//     await this._ready;

//     if (this.ws?.readyState === WebSocket.OPEN) {
//       this.ws.send(
//         JSON.stringify({
//           type: "chat",
//           message,
//           messageId,
//           sessionId,
//         })
//       );
//       return;
//     }

//     // trigger UI error
//     this.handlers.error?.({
//       error: CONNECT_FAIL,
//       messageId,
//       sessionId,
//     });
//   }
// }

// /** Export single instance */
// export const wsService = new ChatWebSocketService();

// /**
//  * ============================================================
//  * CHAT WEBSOCKET SERVICE (PRODUCTION READY + READABLE VERSION)
//  * ============================================================
//  *
//  * PURPOSE:
//  * This service handles ALL WebSocket communication between:
//  *   - React frontend (UI)
//  *   - Python backend (/ws)
//  *
//  * RESPONSIBILITIES:
//  * 1. Connect to WebSocket server
//  * 2. Send chat messages to backend
//  * 3. Receive streaming updates (token, progress, steps)
//  * 4. Dispatch events to UI safely
//  * 5. Prevent memory leaks in React apps
//  *
//  * DESIGN STYLE:
//  * - Event-driven system (like EventEmitter)
//  * - Multiple listeners per event supported
//  * - Safe cleanup using off()
//  * ============================================================
//  */

// /**
//  * ============================================================
//  * 1. BUILD WEBSOCKET URL
//  * ============================================================
//  *
//  * Priority order:
//  * 1. Use environment variable (production)
//  * 2. Otherwise fallback to current browser host
//  */
// function resolveWsUrl() {
//   const explicit = import.meta.env.VITE_WS_URL;

//   // If deployed backend URL is provided → use it
//   if (explicit) return String(explicit);

//   // Decide protocol based on HTTPS or HTTP
//   const proto =
//     typeof window !== "undefined" &&
//     window.location.protocol === "https:"
//       ? "wss:" // secure websocket
//       : "ws:";  // normal websocket

//   // Default host fallback (dev environment)
//   const host =
//     typeof window !== "undefined"
//       ? window.location.host
//       : "localhost:8080";

//   return `${proto}//${host}/ws`;
// }

// /**
//  * Standard error message shown in UI
//  */
// const CONNECT_FAIL =
//   "Failed to connect to server. Please try again later.";

// /**
//  * ============================================================
//  * CHAT WEBSOCKET CLASS
//  * ============================================================
//  */
// class ChatWebSocketService {
//   constructor() {
//     /**
//      * ============================================================
//      * EVENT HANDLERS STORE
//      * ============================================================
//      *
//      * Each event can have MULTIPLE listeners
//      *
//      * Example:
//      * message → [fn1, fn2]
//      * progress → [fn3]
//      *
//      * This prevents overwriting listeners (important in React)
//      */
//     this.handlers = {
//       message: new Set(),
//       step: new Set(),
//       progress: new Set(),
//       pipeline: new Set(),
//       runPhase: new Set(),
//       complete: new Set(),
//       error: new Set(),
//     };

//     /**
//      * Active WebSocket instance
//      */
//     this.ws = null;

//     /**
//      * Connection state flag
//      */
//     this.connected = false;

//     /**
//      * Prevents false warnings when WE manually close socket
//      */
//     this._closingFromApp = false;

//     /**
//      * Promise used to ensure "send()" waits for connection
//      */
//     this._ready = Promise.resolve();
//   }

//   // ============================================================
//   // 2. REGISTER EVENT LISTENER
//   // ============================================================
//   /**
//    * Add a listener for a specific event
//    *
//    * Example:
//    * wsService.on("message", handler)
//    */
//   on(event, handler) {
//     if (!this.handlers[event]) {
//       this.handlers[event] = new Set();
//     }

//     // Add handler into set (prevents duplicates automatically)
//     this.handlers[event].add(handler);
//   }

//   // ============================================================
//   // 3. REMOVE EVENT LISTENER (IMPORTANT FIX)
//   // ============================================================
//   /**
//    * Remove event listener to prevent memory leaks
//    *
//    * Example:
//    * wsService.off("message", handler)
//    */
//   off(event, handler) {
//     const bucket = this.handlers[event];

//     // If event does not exist → do nothing safely
//     if (!bucket) return;

//     // If handler provided → remove only that function
//     if (handler) {
//       bucket.delete(handler);
//     } else {
//       // If no handler provided → clear all listeners
//       bucket.clear();
//     }
//   }

//   // ============================================================
//   // 4. CONNECT TO WEBSOCKET SERVER
//   // ============================================================
//   connect() {
//     // Store promise so send() can wait for connection
//     this._ready = this._connectOnce();
//   }

//   // ============================================================
//   // 5. INTERNAL CONNECTION LOGIC
//   // ============================================================
//   _connectOnce() {
//     return new Promise((resolve) => {
//       let settled = false;

//       /**
//        * Helper to finish connection attempt
//        */
//       const finish = (ok) => {
//         if (settled) return;
//         settled = true;

//         this.connected = ok;

//         if (ok) {
//           console.log("[WS] Connected successfully");
//         } else {
//           console.warn("[WS]", CONNECT_FAIL);
//         }

//         resolve();
//       };

//       let socket;

//       // Try creating WebSocket safely
//       try {
//         socket = new WebSocket(resolveWsUrl());
//       } catch {
//         finish(false);
//         return;
//       }

//       /**
//        * Timeout safety:
//        * If server does not respond in 2.5 seconds → fail
//        */
//       const timer = setTimeout(() => {
//         try {
//           socket.close();
//         } catch {}

//         finish(false);
//       }, 2500);

//       /**
//        * CONNECTION SUCCESS
//        */
//       socket.onopen = () => {
//         clearTimeout(timer);

//         this.ws = socket;

//         // Attach message listeners
//         this._bindSocket();

//         finish(true);
//       };

//       /**
//        * CONNECTION ERROR
//        */
//       socket.onerror = () => {
//         clearTimeout(timer);

//         try {
//           socket.close();
//         } catch {}

//         finish(false);
//       };
//     });
//   }

//   // ============================================================
//   // 6. ATTACH SOCKET EVENT HANDLERS
//   // ============================================================
//   _bindSocket() {
//     if (!this.ws) return;

//     /**
//      * Called whenever backend sends data
//      */
//     this.ws.onmessage = (ev) => {
//       try {
//         // Parse backend JSON message
//         const data = JSON.parse(ev.data);

//         // Dispatch to correct UI handler
//         this._dispatch(data);
//       } catch (err) {
//         // Ignore invalid JSON safely
//         console.warn("[WS] Invalid JSON received");
//       }
//     };

//     /**
//      * Called when socket disconnects
//      */
//     this.ws.onclose = () => {
//       const wasConnected = this.connected;

//       this.connected = false;
//       this.ws = null;

//       // Only warn if NOT manually closed
//       if (!this._closingFromApp && wasConnected) {
//         console.warn("[WS] Connection closed unexpectedly");
//       }
//     };
//   }

//   // ============================================================
//   // 7. DISPATCH EVENTS TO LISTENERS
//   // ============================================================
//   _dispatch(payload) {
//     const { event, ...data } = payload;

//     // Ignore invalid events
//     if (!event) return;

//     const bucket = this.handlers[event];

//     // No listeners registered → ignore
//     if (!bucket || bucket.size === 0) return;

//     // Call ALL listeners safely
//     for (const handler of bucket) {
//       try {
//         handler(data);
//       } catch (err) {
//         console.error(`[WS ERROR] ${event}`, err);
//       }
//     }
//   }

//   // ============================================================
//   // 8. DISCONNECT WEBSOCKET
//   // ============================================================
//   disconnect() {
//     this._closingFromApp = true;

//     try {
//       this.ws?.close();
//     } catch {}

//     this.ws = null;
//     this.connected = false;

//     this._closingFromApp = false;

//     // Reset ready state
//     this._ready = Promise.resolve();
//   }

//   // ============================================================
//   // 9. ABORT STREAMING REQUEST
//   // ============================================================
//   abort(sessionId) {
//     if (this.ws?.readyState !== WebSocket.OPEN) return;

//     try {
//       this.ws.send(
//         JSON.stringify({
//           type: "abort",
//           sessionId,
//         })
//       );
//     } catch {}
//   }

//   // ============================================================
//   // 10. SEND MESSAGE TO BACKEND
//   // ============================================================
//   async send(message, messageId, sessionId = null) {
//     // Wait until connection is ready
//     await this._ready;

//     if (this.ws?.readyState === WebSocket.OPEN) {
//       this.ws.send(
//         JSON.stringify({
//           type: "chat",
//           message,
//           messageId,
//           sessionId,
//         })
//       );
//       return;
//     }

//     // If not connected → send error to UI safely
//     this.handlers.error?.forEach((h) =>
//       h({
//         error: CONNECT_FAIL,
//         messageId,
//         sessionId,
//       })
//     );
//   }
// }

// /**
//  * ============================================================
//  * SINGLETON EXPORT
//  * ============================================================
//  *
//  * Entire app shares ONE WebSocket connection
//  */
// export const wsService = new ChatWebSocketService();


/**
 * ============================================================
 * WEBSOCKET SERVICE (PRODUCTION-GRADE VERSION)
 * ============================================================
 *
 * Features:
 * - Multiple listeners per event (safe for React)
 * - Proper on/off lifecycle
 * - Memory leak safe cleanup
 * - Streaming-ready for AI chat systems
 * - No external dependencies
 */

/**
 * ============================================================
 * BUILD WEBSOCKET URL
 * ============================================================
 */
function resolveWsUrl() {
  const explicit = import.meta.env.VITE_WS_URL;
  if (explicit) return String(explicit);

  const proto =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "wss:"
      : "ws:";

  const host =
    typeof window !== "undefined"
      ? window.location.host
      : "localhost:8080";

  return `${proto}//${host}/ws`;
}

const CONNECT_FAIL = "Failed to connect to server. Please try again later.";

class ChatWebSocketService {
  constructor() {
    /**
     * ============================================================
     * EVENT STORE (IMPORTANT CHANGE)
     * ============================================================
     *
     * BEFORE:
     *   { message: fn } ❌ (only 1 listener allowed)
     *
     * NOW:
     *   { message: [fn1, fn2] } ✅ (multiple listeners supported)
     */
    this.handlers = {};

    this.ws = null;
    this.connected = false;

    /** Prevent duplicate logs on manual disconnect */
    this._closingFromApp = false;

    /** Ensures send() waits for connection */
    this._ready = Promise.resolve();
  }

  /**
   * ============================================================
   * REGISTER EVENT LISTENER
   * ============================================================
   *
   * Example:
   * ws.on("message", handler)
   */
  on(event, handler) {
    if (!this.handlers[event]) {
      this.handlers[event] = [];
    }

    this.handlers[event].push(handler);
  }

  /**
   * ============================================================
   * REMOVE EVENT LISTENER (FIXED)
   * ============================================================
   *
   * Example:
   * ws.off("message", handler)
   *
   * If handler is provided → remove only that function
   * If not → remove all listeners for event
   */
  off(event, handler) {
    const list = this.handlers[event];
    if (!list) return;

    // remove specific listener
    if (handler) {
      this.handlers[event] = list.filter((h) => h !== handler);
      return;
    }

    // remove all listeners for event
    delete this.handlers[event];
  }

  /**
   * Remove ALL listeners (useful for cleanup)
   */
  offAll() {
    this.handlers = {};
  }

  /**
   * ============================================================
   * CONNECT WEBSOCKET
   * ============================================================
   */
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

        if (!ok) {
          console.warn("[WS]", CONNECT_FAIL);
        }

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
        } catch {}
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
        } catch {}
        finish(false);
      };
    });
  }

  /**
   * ============================================================
   * DISPATCH EVENTS TO LISTENERS
   * ============================================================
   *
   * Safe iteration → prevents crash if handlers change during loop
   */
  _emit(event, data) {
    const list = this.handlers[event];
    if (!list || list.length === 0) return;

    [...list].forEach((fn) => {
      try {
        fn(data);
      } catch (err) {
        console.error(`[WS handler error] ${event}`, err);
      }
    });
  }

  /**
   * ============================================================
   * SERVER EVENT ROUTER
   * ============================================================
   */
  _dispatchFromServer(payload) {
    const evt = payload.event;
    if (!evt) return;

    const { event: _, ...data } = payload;

    switch (evt) {
      case "runPhase":
      case "pipeline":
      case "step":
      case "progress":
      case "message":
      case "complete":
      case "error":
        this._emit(evt, data);
        break;
    }
  }

  /**
   * ============================================================
   * SOCKET LISTENERS
   * ============================================================
   */
  _bindSocketMessages() {
    if (!this.ws) return;

    this.ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        this._dispatchFromServer(data);
      } catch {
        // ignore invalid payloads safely
      }
    };

    this.ws.onclose = () => {
      const hadConnection = this.connected;

      this.connected = false;
      this.ws = null;

      if (!this._closingFromApp && hadConnection) {
        console.warn("[WS] Connection closed");
      }
    };
  }

  /**
   * ============================================================
   * DISCONNECT
   * ============================================================
   */
  disconnect() {
    this._closingFromApp = true;

    try {
      this.ws?.close();
    } catch {}

    this.ws = null;
    this.connected = false;

    this._closingFromApp = false;
    this._ready = Promise.resolve();

    // IMPORTANT: clear all listeners to prevent leaks
    this.offAll();
  }

  /**
   * ============================================================
   * SEND MESSAGE
   * ============================================================
   */
  async send(message, messageId, sessionId = null) {
    await this._ready;

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: "chat",
          message,
          messageId,
          sessionId,
        })
      );
      return;
    }

    this._emit("error", {
      error: CONNECT_FAIL,
      messageId,
      sessionId,
    });
  }

  /**
   * ============================================================
   * ABORT STREAM
   * ============================================================
   */
  abort(sessionId) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(
          JSON.stringify({
            type: "abort",
            sessionId,
          })
        );
      } catch {}
    }
  }
}

/**
 * SINGLETON INSTANCE
 */
export const wsService = new ChatWebSocketService();