import React, { useRef, useEffect, useCallback, useMemo, useState } from "react";
import { Box, Typography, Alert, Snackbar, IconButton, TextField, Divider, Tooltip } from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { selectActiveSession, selectActiveSessionId } from "../store/sessionSelectors";
import { setElapsedTime, setError } from "../features/chat/chatSlice";
import {
  createSession,
  renameSession,
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
  sessionLiveAfterComplete,
  sessionLiveSoftReset,
} from "../features/session/sessionSlice";
import { store } from "../store";
import { wsService } from "../services/websocket";
import { fetchHealth, patchChatOnServer } from "../api/chatApi";
import { generateId } from "../utils/helpers";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import { useSettingsUi } from "../context/SettingsUiContext";
 
/** --- Resolve which sidebar chat a WS frame belongs to (added); server always sends `sessionId`. */
function resolveWsSessionId(data) {
  return data.sessionId ?? store.getState().session.activeSessionId;
}
 
const ChatPanel = () => {
  const theme = useTheme();
  const { toggleSettings } = useSettingsUi();
  const dispatch = useAppDispatch();
  const { error } = useAppSelector((s) => s.chat);
 
  const activeSessionId = useAppSelector(selectActiveSessionId);
  const activeSession = useAppSelector(selectActiveSession);
  const messages = activeSession?.messages ?? [];
  const live = activeSession?.live;
  const isBusyStreaming = Boolean(live?.isStreaming);
  const processingSteps = live?.processingSteps ?? [];
  const runPhase = live?.runPhase ?? "idle";
  const pipelineProgress = live?.pipelineProgress ?? 0;
 
  const streamingAssistant = useMemo(
    () => [...messages].reverse().find((m) => m.role === "assistant" && m.status === "streaming"),
    [messages],
  );
  const displayTitle = activeSession?.title || "";
 
  const [titleEditing, setTitleEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState(displayTitle);
 
  useEffect(() => {
    if (!titleEditing) setTitleDraft(displayTitle);
  }, [displayTitle, titleEditing]);
 
  /** Persist title to backend first; Redux updates only after a successful PATCH. */
  const commitTitle = useCallback(async () => {
    if (!activeSessionId) {
      setTitleEditing(false);
      return;
    }
    const t = titleDraft.trim() || "Untitled chat";
    const res = await patchChatOnServer(activeSessionId, { title: t });
    if (!res?.ok) {
      dispatch(setError("Failed to rename. Please try again later."));
      setTitleEditing(false);
      return;
    }
    dispatch(renameSession({ id: activeSessionId, title: t }));
    setTitleEditing(false);
  }, [activeSessionId, titleDraft, dispatch]);
 
  const scrollRef = useRef(null);
  const stickToBottomRef = useRef(true);
  const prevSessionIdRef = useRef(activeSessionId);
  const timerRef = useRef(null);
  const startTimeRef = useRef(0);
  /** Cleared on new send so a prior `complete` timeout cannot wipe an in-flight run. */
  const completeResetTimeoutRef = useRef(null);
  /** Which session started the elapsed timer (added) so tab switches do not stop the wrong run. */
  const timerOwnerSessionRef = useRef(null);
 
  const livePipelineUi = useMemo(() => {
    if (!isBusyStreaming || !streamingAssistant?.id) return undefined;
    return { runPhase, pipelineProgress };
  }, [isBusyStreaming, streamingAssistant?.id, runPhase, pipelineProgress]);
 
  const isNearBottom = useCallback((el, threshold = 120) => {
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
  }, []);
 
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      stickToBottomRef.current = isNearBottom(el);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [isNearBottom]);
 
  useEffect(() => {
    if (activeSessionId !== prevSessionIdRef.current) {
      prevSessionIdRef.current = activeSessionId;
      stickToBottomRef.current = true;
      requestAnimationFrame(() => {
        const el = scrollRef.current;
        if (el) el.scrollTop = el.scrollHeight;
      });
    }
  }, [activeSessionId]);
 
  const streamingContentLen = streamingAssistant?.content?.length ?? 0;
 
  // --- Auto-scroll: one rAF per update keeps up with tokens without blocking scroll handlers.
  useEffect(() => {
    if (!stickToBottomRef.current) return;
    const id = requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el && stickToBottomRef.current) el.scrollTop = el.scrollHeight;
    });
    return () => cancelAnimationFrame(id);
  }, [
    messages.length,
    activeSessionId,
    streamingAssistant?.id,
    processingSteps?.length,
    runPhase,
    pipelineProgress,
    streamingContentLen,
  ]);
 
  useEffect(() => {
    wsService.connect();
    fetchHealth().catch(() => {});
    return () => wsService.disconnect();
  }, []);
 
  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      dispatch(setElapsedTime(Date.now() - startTimeRef.current));
    }, 100);
  }, [dispatch]);
 
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);
 
  const clearCompleteResetTimeout = useCallback(() => {
    if (completeResetTimeoutRef.current != null) {
      clearTimeout(completeResetTimeoutRef.current);
      completeResetTimeoutRef.current = null;
    }
  }, []);
 
  useEffect(() => () => clearCompleteResetTimeout(), [clearCompleteResetTimeout]);
 
  useEffect(() => {
    // --- All stream handlers target `sessionId` so background chats still receive tokens (added).
    wsService.on("step", (data) => {
      const sessionId = resolveWsSessionId(data);
      if (!sessionId) return;
      dispatch(sessionLiveSetProcessingSteps({ sessionId, allSteps: data.allSteps }));
    });
 
    wsService.on("progress", (data) => {
      const sessionId = resolveWsSessionId(data);
      if (!sessionId) return;
      dispatch(sessionLiveSetPipelineStage({ sessionId, stage: data.stage }));
      dispatch(sessionLiveSetCurrentTool({ sessionId, detail: data.detail ?? null }));
    });
 
    wsService.on("pipeline", (data) => {
      const sessionId = resolveWsSessionId(data);
      if (!sessionId || typeof data.percent !== "number") return;
      dispatch(sessionLiveSetPipelineProgress({ sessionId, percent: data.percent }));
    });
 
    wsService.on("runPhase", (data) => {
      const sessionId = resolveWsSessionId(data);
      if (!sessionId) return;
      if (data.phase === "initializing" || data.phase === "steps" || data.phase === "streaming") {
        dispatch(sessionLiveSetRunPhase({ sessionId, phase: data.phase }));
      }
    });
 
    wsService.on("message", (data) => {
      const sessionId = resolveWsSessionId(data);
      if (!sessionId) return;
      const mid = data.messageId;
      if (data.type === "token") {
        dispatch(sessionAppendToMessage({ sessionId, messageId: mid, token: data.token }));
      } else if (data.type === "tool_output") {
        dispatch(sessionAddToolOutput({ sessionId, messageId: mid, output: data.output }));
      } else if (data.type === "sources") {
        dispatch(sessionSetMessageSources({ sessionId, messageId: mid, sources: data.sources }));
        dispatch(sessionSetMessageCitations({ sessionId, messageId: mid, citations: data.citations }));
      } else if (data.type === "activity") {
        dispatch(sessionAppendMessageActivity({ sessionId, messageId: mid, line: data.line }));
      } else if (data.type === "stream_meta") {
        dispatch(sessionSetMessageStreamMeta({ sessionId, messageId: mid, meta: data.meta || {} }));
      }
    });
 
    wsService.on("complete", (data) => {
      const sessionId = resolveWsSessionId(data);
      const { messageId } = data;
      if (!sessionId || !messageId) return;
      const sess = store.getState().session.sessions.find((s) => s.id === sessionId);
      const steps = [...(sess?.live?.processingSteps ?? [])];
      dispatch(sessionSetMessageProcessingSteps({ sessionId, messageId, steps }));
      dispatch(sessionSetMessageStatus({ sessionId, id: messageId, status: "complete" }));
      dispatch(sessionLiveAfterComplete({ sessionId }));
      if (timerOwnerSessionRef.current === sessionId) stopTimer();
      clearCompleteResetTimeout();
      completeResetTimeoutRef.current = window.setTimeout(() => {
        completeResetTimeoutRef.current = null;
        dispatch(sessionLiveSoftReset({ sessionId }));
      }, 1000);
    });
 
    wsService.on("error", (data) => {
      const sessionId = resolveWsSessionId(data);
      if (data.messageId && sessionId) {
        dispatch(sessionSetMessageStatus({ sessionId, id: data.messageId, status: "error" }));
      }
      if (sessionId) dispatch(sessionLiveSoftReset({ sessionId }));
      dispatch(setError(data.error || "Something went wrong"));
      if (timerOwnerSessionRef.current === sessionId) stopTimer();
      clearCompleteResetTimeout();
    });
  }, [dispatch, stopTimer, clearCompleteResetTimeout]);
 
  const handleSend = useCallback(
    async (content, attachments) => {
      clearCompleteResetTimeout();
      let sessionId = activeSessionId;
      if (!sessionId) {
        sessionId = generateId();
        dispatch(
          createSession({
            id: sessionId,
            title: content.slice(0, 50),
            createdAt: Date.now(),
            updatedAt: Date.now(),
            messages: [],
            live: null,
          }),
        );
      }
 
      const userMsg = {
        id: generateId(),
        role: "user",
        content,
        timestamp: Date.now(),
        status: "complete",
        attachments,
      };
      dispatch(sessionAddMessage({ sessionId, message: userMsg }));
 
      const assistantId = generateId();
      dispatch(
        sessionAddMessage({
          sessionId,
          message: {
            id: assistantId,
            role: "assistant",
            content: "",
            timestamp: Date.now(),
            status: "streaming",
          },
        }),
      );
      // Backend-required: if Python server is down, show an assistant error message.
      const health = await fetchHealth();
      if (!health?.ok) {
        const msg = health?.error || "Server is down, please try later after sometime.";
        dispatch(
          sessionSetMessageStatus({ sessionId, id: assistantId, status: "error" }),
        );
        dispatch(
          sessionAppendToMessage({
            sessionId,
            messageId: assistantId,
            token: msg,
          }),
        );
        dispatch(setError(msg));
        dispatch(sessionLiveSoftReset({ sessionId }));
        return;
      }
 
      dispatch(sessionInitLiveStream({ sessionId, assistantMessageId: assistantId }));
      timerOwnerSessionRef.current = sessionId;
      startTimer();
      stickToBottomRef.current = true;
 
      wsService.send(content, assistantId, sessionId);
    },
    [activeSessionId, dispatch, startTimer, clearCompleteResetTimeout],
  );
 
  return (
    <Box
      sx={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        minWidth: 0,
        bgcolor: "background.default",
      }}
    >
      <Box
        sx={{
          bgcolor: theme.palette.mode === "dark" ? alpha("#fff", 0.03) : theme.palette.background.paper,
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Box sx={{ px: 2, py: 0.75, display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
          <Tooltip title="Settings">
            <IconButton size="small" onClick={toggleSettings} aria-label="Open settings" sx={{ color: "text.secondary" }}>
              <SettingsOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
        {messages.length > 0 && (
          <>
            <Divider sx={{ borderColor: "divider" }} />
            <Box
              sx={{
                px: 2,
                py: 1.25,
                display: "flex",
                alignItems: "center",
                gap: 1,
                flexWrap: "wrap",
                maxWidth: 920,
                mx: "auto",
                width: "100%",
                boxSizing: "border-box",
              }}
            >
              <Box sx={{ minWidth: 0, flex: "1 1 200px" }}>
                {titleEditing && activeSessionId ? (
                  <TextField
                    autoFocus
                    size="small"
                    fullWidth
                    value={titleDraft}
                    onChange={(e) => setTitleDraft(e.target.value)}
                    onBlur={commitTitle}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitTitle();
                      if (e.key === "Escape") {
                        setTitleDraft(displayTitle || "Untitled chat");
                        setTitleEditing(false);
                      }
                    }}
                    placeholder="Chat name"
                    sx={{ maxWidth: 480, "& .MuiInputBase-input": { fontSize: 14, fontWeight: 600 } }}
                  />
                ) : (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      minWidth: 0,
                      "& .chat-title-edit-btn": { opacity: 0, transition: "opacity 0.15s" },
                      "&:hover .chat-title-edit-btn": { opacity: activeSessionId ? 1 : 0 },
                      "&:focus-within .chat-title-edit-btn": { opacity: activeSessionId ? 1 : 0 },
                    }}
                  >
                    <Typography sx={{ fontWeight: 600, fontSize: 15, color: "text.primary", noWrap: true }}>
                      {displayTitle || "Untitled chat"}
                    </Typography>
                    {activeSessionId && (
                      <Tooltip title="Rename chat">
                        <IconButton
                          className="chat-title-edit-btn"
                          size="small"
                          aria-label="Rename chat"
                          onClick={() => setTitleEditing(true)}
                          sx={{ color: "text.secondary" }}
                        >
                          <EditOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                )}
              </Box>
            </Box>
            <Divider sx={{ borderColor: "divider" }} />
          </>
        )}
      </Box>
 
      {messages.length === 0 ? (
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            px: { xs: 2, sm: 4 },
            py: 4,
            overflow: "auto",
          }}
        >
          <Typography
            component="h1"
            sx={{
              fontFamily: theme.palette.mode === "dark" ? '"Georgia", "Times New Roman", serif' : theme.typography.fontFamily,
              fontWeight: 500,
              fontSize: { xs: "1.65rem", sm: "2.125rem" },
              color: "text.primary",
              textAlign: "center",
              lineHeight: 1.25,
              maxWidth: 560,
            }}
          >
            What can I help you with?
          </Typography>
          <Typography
            sx={{
              mt: 1.5,
              color: "text.secondary",
              fontSize: 14,
              textAlign: "center",
              maxWidth: 480,
              lineHeight: 1.55,
            }}
          >
            Paste logs, describe a ticket, or upload files — I&apos;ll analyze and help.
          </Typography>
          <Box sx={{ width: "100%", maxWidth: 720, mt: 4 }}>
            <ChatInput variant="hero" onSend={handleSend} disabled={isBusyStreaming} placeholder="Ask Logic Chat something…" />
          </Box>
        </Box>
      ) : (
        <Box
          ref={scrollRef}
          sx={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
            py: 1,
            minHeight: 0,
            minWidth: 0,
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <Box sx={{ width: "100%", maxWidth: 920, flex: "1 1 auto", minHeight: 0, minWidth: 0, boxSizing: "border-box" }}>
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                liveProcessingSteps={isBusyStreaming && streamingAssistant?.id === msg.id ? processingSteps : undefined}
                livePipelineUi={streamingAssistant?.id === msg.id ? livePipelineUi : undefined}
                onRetry={
                  msg.status === "error"
                    ? () => handleSend(messages[messages.length - 2]?.content || "", [])
                    : undefined
                }
              />
            ))}
          </Box>
        </Box>
      )}
 
      <Snackbar open={!!error} autoHideDuration={5000} onClose={() => dispatch(setError(null))}>
        <Alert severity="error" onClose={() => dispatch(setError(null))}>
          {error}
        </Alert>
      </Snackbar>
 
      {messages.length > 0 && (
        <Box sx={{ flexShrink: 0, width: "100%", display: "flex", justifyContent: "center", minWidth: 0 }}>
          <Box sx={{ width: "100%", maxWidth: 920, minWidth: 0 }}>
            <ChatInput onSend={handleSend} disabled={isBusyStreaming} />
          </Box>
        </Box>
      )}
    </Box>
  );
};
 
export default ChatPanel;
 
