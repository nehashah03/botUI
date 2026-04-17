
/**
 * Redux slice: **all chats** (sidebar) + **per-session messages** + **per-session `live`** pipeline.
 *
 * - Sidebar uses `sessions[].title`, `favorite`, `updatedAt`.
 * - `messages[]` holds the thread; WebSocket handlers append tokens into the matching `sessionId`.
 * - `live` holds streaming-only UI (progress, steps); it is not persisted to disk.
 */
import { createSlice } from "@reduxjs/toolkit";
 
/** Return one session object by id, or `undefined`. */
function sessionById(state, id) {
  return state.sessions.find((s) => s.id === id);
}
 
/** Default `live` blob when the user sends a message (assistant id + empty pipeline). */
function createLiveStreamSeed(assistantMessageId) {
  return {
    isStreaming: true,
    assistantMessageId,
    pipelineProgress: 0,
    pipelineStage: "idle",
    runPhase: "initializing",
    currentToolName: null,
    processingSteps: [],
  };
}
 
const initialState = {
  sessions: [],
  activeSessionId: null,
};
 
const sessionSlice = createSlice({
  name: "session",
  initialState,
  reducers: {
    /* --- Sidebar: create / select / rename / delete / favorites --- */
    createSession(state, action) {
      const s = {
        ...action.payload,
        favorite: action.payload.favorite ?? false,
        messages: action.payload.messages ?? [],
        live: action.payload.live ?? null,
      };
      state.sessions.unshift(s);
      state.activeSessionId = s.id;
    },
    setActiveSession(state, action) {
      state.activeSessionId = action.payload;
    },
    updateSessionMessages(state, action) {
      const session = state.sessions.find((s) => s.id === action.payload.id);
      if (session) {
        session.messages = action.payload.messages;
        session.updatedAt = Date.now();
        if (action.payload.messages.length > 0 && session.title === "New Conversation") {
          const firstUserMsg = action.payload.messages.find((m) => m.role === "user");
          if (firstUserMsg) {
            session.title =
              firstUserMsg.content.slice(0, 50) + (firstUserMsg.content.length > 50 ? "..." : "");
          }
        }
      }
    },
    renameSession(state, action) {
      const session = state.sessions.find((s) => s.id === action.payload.id);
      if (session) {
        const t = action.payload.title.trim();
        session.title = t || "Untitled chat";
        session.updatedAt = Date.now();
      }
    },
    deleteSession(state, action) {
      state.sessions = state.sessions.filter((s) => s.id !== action.payload);
      if (state.activeSessionId === action.payload) {
        state.activeSessionId = state.sessions[0]?.id || null;
      }
    },
    clearAllSessions(state) {
      state.sessions = [];
      state.activeSessionId = null;
    },
    toggleSessionFavorite(state, action) {
      const session = state.sessions.find((s) => s.id === action.payload);
      if (session) {
        session.favorite = !session.favorite;
        session.updatedAt = Date.now();
      }
    },
    /** Replace all sessions from `GET /api/sessions-state` or localStorage hydrate (no `live`). */
    hydrateSessions(state, action) {
      const { sessions, activeSessionId } = action.payload;
      const list = Array.isArray(sessions) ? sessions : [];
      // Never rehydrate in-flight `live` from disk (stale); streams are WS-only after reload.
      state.sessions = list.map((s) => ({
        favorite: false,
        messages: [],
        ...s,
        live: null,
      }));
      state.activeSessionId = activeSessionId ?? state.sessions[0]?.id ?? null;
    },
 
    /* --- Messages: add / append / status / attachments to stream --- */
    sessionAddMessage(state, action) {
      const { sessionId, message } = action.payload;
      const session = sessionById(state, sessionId);
      if (!session) return;
      session.messages.push(message);
      session.updatedAt = Date.now();
      if (message.role === "user") {
        const t = (session.title || "").trim();
        const c = message.content || "";
        if (t === "New Conversation" || t === "" || t === "Untitled chat") {
          session.title = c.slice(0, 50) + (c.length > 50 ? "..." : "");
        }
      }
    },
    sessionAppendToMessage(state, action) {
      const { sessionId, messageId, token } = action.payload;
      const session = sessionById(state, sessionId);
      const msg = session?.messages.find((m) => m.id === messageId);
      if (msg) msg.content += token;
      // Intentionally do not bump `updatedAt` on each token — avoids sidebar + layout thrash during streaming.
    },
    sessionSetMessageStatus(state, action) {
      const { sessionId, id, status } = action.payload;
      const session = sessionById(state, sessionId);
      const msg = session?.messages.find((m) => m.id === id);
      if (msg) msg.status = status;
      if (session && (status === "complete" || status === "error")) session.updatedAt = Date.now();
    },
    sessionAddToolOutput(state, action) {
      const { sessionId, messageId, output } = action.payload;
      const session = sessionById(state, sessionId);
      const msg = session?.messages.find((m) => m.id === messageId);
      if (msg) {
        if (!msg.toolOutputs) msg.toolOutputs = [];
        msg.toolOutputs.push(output);
      }
      if (session) session.updatedAt = Date.now();
    },
    sessionSetMessageSources(state, action) {
      const { sessionId, messageId, sources } = action.payload;
      const session = sessionById(state, sessionId);
      const msg = session?.messages.find((m) => m.id === messageId);
      if (msg) msg.sources = sources;
      if (session) session.updatedAt = Date.now();
    },
    sessionSetMessageCitations(state, action) {
      const { sessionId, messageId, citations } = action.payload;
      const session = sessionById(state, sessionId);
      const msg = session?.messages.find((m) => m.id === messageId);
      if (msg) msg.citations = citations;
      if (session) session.updatedAt = Date.now();
    },
    sessionSetMessageProcessingSteps(state, action) {
      const { sessionId, messageId, steps } = action.payload;
      const session = sessionById(state, sessionId);
      const msg = session?.messages.find((m) => m.id === messageId);
      if (msg) msg.processingSteps = steps;
      if (session) session.updatedAt = Date.now();
    },
    sessionAppendMessageActivity(state, action) {
      const { sessionId, messageId, line } = action.payload;
      const session = sessionById(state, sessionId);
      const msg = session?.messages.find((m) => m.id === messageId);
      if (msg) {
        if (!msg.activityLog) msg.activityLog = [];
        msg.activityLog.push(line);
      }
    },
    sessionSetMessageStreamMeta(state, action) {
      const { sessionId, messageId, meta } = action.payload;
      const session = sessionById(state, sessionId);
      const msg = session?.messages.find((m) => m.id === messageId);
      if (msg) msg.streamMeta = { ...msg.streamMeta, ...meta };
    },
 
    /* --- Live pipeline (one streaming assistant per session) --- */
    sessionInitLiveStream(state, action) {
      const { sessionId, assistantMessageId } = action.payload;
      const session = sessionById(state, sessionId);
      if (!session) return;
      session.live = createLiveStreamSeed(assistantMessageId);
      session.updatedAt = Date.now();
    },
    sessionLiveSetProcessingSteps(state, action) {
      const { sessionId, allSteps } = action.payload;
      const session = sessionById(state, sessionId);
      if (session?.live) session.live.processingSteps = allSteps;
    },
    sessionLiveSetPipelineProgress(state, action) {
      const { sessionId, percent } = action.payload;
      const session = sessionById(state, sessionId);
      if (session?.live && typeof percent === "number") {
        session.live.pipelineProgress = Math.max(0, Math.min(100, percent));
      }
    },
    sessionLiveSetRunPhase(state, action) {
      const { sessionId, phase } = action.payload;
      const session = sessionById(state, sessionId);
      if (session?.live && (phase === "initializing" || phase === "steps" || phase === "streaming")) {
        session.live.runPhase = phase;
      }
    },
    sessionLiveSetPipelineStage(state, action) {
      const { sessionId, stage } = action.payload;
      const session = sessionById(state, sessionId);
      if (session?.live) session.live.pipelineStage = stage;
    },
    sessionLiveSetCurrentTool(state, action) {
      const { sessionId, detail } = action.payload;
      const session = sessionById(state, sessionId);
      if (session?.live) session.live.currentToolName = detail ?? null;
    },
    sessionLiveSetStreaming(state, action) {
      const { sessionId, value } = action.payload;
      const session = sessionById(state, sessionId);
      if (session?.live) session.live.isStreaming = value;
    },
    /** After `complete`, clear the bottom strip; optional delayed UI reset (same timing as before). */
    sessionLiveAfterComplete(state, action) {
      const { sessionId } = action.payload;
      const session = sessionById(state, sessionId);
      if (!session?.live) return;
      session.live.isStreaming = false;
      session.live.pipelineStage = "complete";
      session.live.currentToolName = null;
    },
    sessionLiveSoftReset(state, action) {
      const { sessionId } = action.payload;
      const session = sessionById(state, sessionId);
      if (!session?.live) return;
      session.live.pipelineStage = "idle";
      session.live.processingSteps = [];
      session.live.runPhase = "idle";
      session.live.pipelineProgress = 0;
      session.live = null;
    },
  },
});
 
export const {
  createSession,
  setActiveSession,
  updateSessionMessages,
  renameSession,
  deleteSession,
  clearAllSessions,
  toggleSessionFavorite,
  hydrateSessions,
  sessionAddMessage,
  sessionAppendToMessage,
  sessionSetMessageStatus,
  sessionAddToolOutput,
  sessionSetMessageSources,
  sessionSetMessageCitations,
  sessionSetMessageProcessingSteps,
  sessionAppendMessageActivity,
  sessionSetMessageStreamMeta,
  sessionInitLiveStream,
  sessionLiveSetProcessingSteps,
  sessionLiveSetPipelineProgress,
  sessionLiveSetRunPhase,
  sessionLiveSetPipelineStage,
  sessionLiveSetCurrentTool,
  sessionLiveSetStreaming,
  sessionLiveAfterComplete,
  sessionLiveSoftReset,
} = sessionSlice.actions;
 
export default sessionSlice.reducer;
 