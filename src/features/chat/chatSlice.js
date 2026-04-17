 
/**
 * Redux slice: legacy single-thread chat fields + **global `error`** (Snackbar in `ChatPanel`).
 * Per-session messages live in `sessionSlice`; this slice mainly holds timers, errors, and legacy reducers.
 */
import { createSlice } from "@reduxjs/toolkit";
 
const initialState = {
  messages: [],
  isStreaming: false,
  pipelineStage: "idle",
  /** 0–100 for the bottom progress bar (four main stages ≈ 25% each). */
  pipelineProgress: 0,
  runPhase: "idle",
  currentToolName: null,
  elapsedTime: 0,
  /** Shown as a toaster; set on API/WS failures, cleared with `null`. */
  error: null,
  processingSteps: [],
};
 
const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    /** Append one user/assistant message (legacy single-thread UI). */
    addMessage(state, action) {
      state.messages.push(action.payload);
    },
    /** Replace message body / optional status (legacy). */
    updateMessage(state, action) {
      const msg = state.messages.find((m) => m.id === action.payload.id);
      if (msg) {
        msg.content = action.payload.content;
        if (action.payload.status) msg.status = action.payload.status;
      }
    },
    /** Append one streamed token (legacy). */
    appendToMessage(state, action) {
      const msg = state.messages.find((m) => m.id === action.payload.id);
      if (msg) {
        msg.content += action.payload.token;
      }
    },
    /** Set message lifecycle status (legacy). */
    setMessageStatus(state, action) {
      const msg = state.messages.find((m) => m.id === action.payload.id);
      if (msg) msg.status = action.payload.status;
    },
    /** Push structured tool output onto an assistant message (legacy). */
    addToolOutput(state, action) {
      const msg = state.messages.find((m) => m.id === action.payload.messageId);
      if (msg) {
        if (!msg.toolOutputs) msg.toolOutputs = [];
        msg.toolOutputs.push(action.payload.output);
      }
    },
    /** Attach source cards (legacy). */
    setMessageSources(state, action) {
      const msg = state.messages.find((m) => m.id === action.payload.messageId);
      if (msg) msg.sources = action.payload.sources;
    },
    /** Attach numeric citations (legacy). */
    setMessageCitations(state, action) {
      const msg = state.messages.find((m) => m.id === action.payload.messageId);
      if (msg) msg.citations = action.payload.citations;
    },
    /** Store final pipeline steps on a completed message (legacy). */
    setMessageProcessingSteps(state, action) {
      const msg = state.messages.find((m) => m.id === action.payload.messageId);
      if (msg) msg.processingSteps = action.payload.steps;
    },
    /** Append one activity log line under the stream (legacy). */
    appendMessageActivity(state, action) {
      const msg = state.messages.find((m) => m.id === action.payload.messageId);
      if (msg) {
        if (!msg.activityLog) msg.activityLog = [];
        msg.activityLog.push(action.payload.line);
      }
    },
    /** Merge retrieval metadata (search query, doc names, …) on a message (legacy). */
    setMessageStreamMeta(state, action) {
      const msg = state.messages.find((m) => m.id === action.payload.messageId);
      if (msg) msg.streamMeta = { ...msg.streamMeta, ...action.payload.meta };
    },
    /** Whether the legacy view considers a stream active. */
    setStreaming(state, action) {
      state.isStreaming = action.payload;
    },
    /** High-level pipeline stage label (legacy). */
    setPipelineStage(state, action) {
      state.pipelineStage = action.payload;
    },
    /** Overall pipeline percent (legacy). */
    setPipelineProgress(state, action) {
      state.pipelineProgress = Math.max(0, Math.min(100, action.payload));
    },
    /** Run phase: initializing | steps | streaming (legacy). */
    setRunPhase(state, action) {
      state.runPhase = action.payload;
    },
    /** Optional tool name for the progress strip (legacy). */
    setCurrentTool(state, action) {
      state.currentToolName = action.payload;
    },
    /** Elapsed ms since send — driven from `ChatPanel` timer. */
    setElapsedTime(state, action) {
      state.elapsedTime = action.payload;
    },
    /** Global Snackbar text; `null` clears. */
    setError(state, action) {
      state.error = action.payload;
    },
    /** Replace the full processing step list (legacy). */
    setProcessingSteps(state, action) {
      state.processingSteps = action.payload;
    },
    /** Update one step’s status in the legacy list. */
    updateProcessingStep(state, action) {
      const step = state.processingSteps.find((s) => s.id === action.payload.id);
      if (step) {
        step.status = action.payload.status;
        if (action.payload.status === "complete") step.timestamp = Date.now();
      }
    },
    /** Hydrate legacy thread when switching sessions; clears pipeline UI. */
    loadMessages(state, action) {
      state.messages = action.payload;
      state.isStreaming = false;
      state.pipelineStage = "idle";
      state.pipelineProgress = 0;
      state.runPhase = "idle";
      state.processingSteps = [];
      state.currentToolName = null;
    },
    /** Clear legacy thread + error. */
    clearMessages(state) {
      state.messages = [];
      state.isStreaming = false;
      state.pipelineStage = "idle";
      state.pipelineProgress = 0;
      state.runPhase = "idle";
      state.error = null;
      state.processingSteps = [];
    },
  },
});
 
export const {
  addMessage,
  updateMessage,
  appendToMessage,
  setMessageStatus,
  addToolOutput,
  setStreaming,
  setPipelineStage,
  setPipelineProgress,
  setRunPhase,
  setCurrentTool,
  setElapsedTime,
  setError,
  loadMessages,
  clearMessages,
  setMessageSources,
  setMessageCitations,
  setMessageProcessingSteps,
  appendMessageActivity,
  setMessageStreamMeta,
  setProcessingSteps,
  updateProcessingStep,
} = chatSlice.actions;
 
export default chatSlice.reducer;
 
