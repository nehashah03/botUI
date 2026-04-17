
import React, { useState, useEffect, Fragment } from "react";
import {
  Box,
  Typography,
  Avatar,
  IconButton,
  Tooltip,
  Collapse,
  Dialog,
  DialogTitle,
  DialogContent,
  Snackbar,
  Alert,
  Button,
  LinearProgress,
  CircularProgress,
  Popover,
} from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ReplayIcon from "@mui/icons-material/Replay";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ProcessingSteps from "./ProcessingSteps";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import SmartToyOutlinedIcon from "@mui/icons-material/SmartToyOutlined";
import ThumbUpOutlinedIcon from "@mui/icons-material/ThumbUpOutlined";
import ThumbDownOutlinedIcon from "@mui/icons-material/ThumbDownOutlined";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight, oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { formatTimestamp, formatMessageDateTime } from "../utils/helpers";
import { getUserMessageColors } from "../constants/colorSystem";
import EventsSourcesPanel from "./EventsSourcesPanel";
import ToolOutputBlock from "./ToolOutputBlock";
 
const USER_PASTE_MAX_PX = 200;
 
/** Inline [n] citation — click opens popover with source chunk text (added). */
function CitationChip({ n, citations }) {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState(null);
  const idx = Number(n);
  const cite = citations?.find((c) => Number(c.index) === idx) || citations?.find((c) => String(c.index) === String(n));
  const chunk = cite?.chunk || cite?.snippet || "No excerpt stored for this citation.";
  const open = Boolean(anchorEl);
 
  return (
    <>
      <Box
        component="button"
        type="button"
        aria-label={`Citation ${n}, open source chunk`}
        onClick={(e) => setAnchorEl(e.currentTarget)}
        sx={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          minWidth: 18,
          height: 18,
          px: 0.35,
          mx: 0.15,
          fontSize: 10,
          fontWeight: 700,
          color: "primary.main",
          border: "1px solid",
          borderColor: theme.palette.mode === "light" ? "#D5D9D9" : "divider",
          borderRadius: "4px",
          bgcolor: theme.palette.mode === "dark" ? alpha("#fff", 0.08) : alpha(theme.palette.primary.main, 0.08),
          verticalAlign: "super",
          lineHeight: 1,
          cursor: "pointer",
          fontFamily: "inherit",
          padding: 0,
        }}
      >
        {n}
      </Box>
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        slotProps={{ paper: { sx: { maxWidth: 360, borderRadius: 2 } } }}
      >
        <Box sx={{ p: 1.5 }}>
          <Typography sx={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, color: "text.secondary", mb: 0.5 }}>
            Derived from chunk
          </Typography>
          <Typography sx={{ fontSize: 13, color: "text.primary", lineHeight: 1.5 }}>{chunk}</Typography>
          {cite?.source && (
            <Typography sx={{ fontSize: 11, color: "primary.main", mt: 1, fontStyle: "italic" }}>
              {cite.source}
            </Typography>
          )}
        </Box>
      </Popover>
    </>
  );
}
 
function splitCitationString(s, citations) {
  const parts = s.split(/(\[\d+\])/g);
  return parts.map((part, i) => {
    const m = part.match(/^\[(\d+)\]$/);
    if (m) return <CitationChip key={`c-${i}-${m[1]}`} n={m[1]} citations={citations} />;
    return part;
  });
}
 
function processMdChildren(children, citations) {
  if (children == null || children === false) return children;
  if (typeof children === "string") return splitCitationString(children, citations);
  if (Array.isArray(children)) {
    return children.map((c, i) => (
      <Fragment key={i}>{processMdChild(c, citations)}</Fragment>
    ));
  }
  return processMdChild(children, citations);
}
 
function processMdChild(c, citations) {
  if (typeof c === "string") return splitCitationString(c, citations);
  if (React.isValidElement(c)) {
    if (c.type === "code") return c;
    const next = c.props.children;
    if (next === undefined) return c;
    return React.cloneElement(c, {}, processMdChildren(next, citations));
  }
  return c;
}
 
const CodeBlock = ({ language, value }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const prismStyle = isDark ? oneDark : oneLight;
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
 
  return (
    <Box
      sx={{
        position: "relative",
        my: 1.5,
        borderRadius: "10px",
        overflow: "hidden",
        maxWidth: "100%",
        minWidth: 0,
        border: "1px solid",
        borderColor: theme.palette.mode === "light" ? "#D5D9D9" : "divider",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 2,
          py: 0.5,
          bgcolor: isDark ? alpha("#fff", 0.06) : alpha(theme.palette.primary.main, 0.06),
        }}
      >
        <Typography sx={{ fontFamily: '"SF Mono", "JetBrains Mono", monospace', color: "text.secondary", fontSize: 11 }}>
          {language || "code"}
        </Typography>
        <Tooltip title={copied ? "Copied!" : "Copy code"}>
          <IconButton size="small" onClick={handleCopy} sx={{ color: "text.secondary", "&:hover": { color: "primary.main" } }}>
            <ContentCopyIcon sx={{ fontSize: 13 }} />
          </IconButton>
        </Tooltip>
      </Box>
      <SyntaxHighlighter
        language={language || "text"}
        style={prismStyle}
        customStyle={{
          margin: 0,
          padding: "14px",
          fontSize: "0.78rem",
          background: isDark ? "#0d0d12" : "#FAFAFA",
        }}
      >
        {value}
      </SyntaxHighlighter>
    </Box>
  );
};
 
const MessageBubble = ({ message, onRetry, liveProcessingSteps, livePipelineUi }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const userColors = getUserMessageColors(theme.palette.mode);
  const isUser = message.role === "user";
  const isError = message.status === "error";
  const [copySnack, setCopySnack] = useState(false);
  const [filePreview, setFilePreview] = useState(null);
  /** Per-message toggle so switching chats or new sends does not share one global “Processing” open state. */
  const [processingOpen, setProcessingOpen] = useState(true);
  useEffect(() => {
    setProcessingOpen(true);
  }, [message.id]);
 
  const handleCopyMessage = () => {
    const label = isUser ? "You" : "Assistant";
    const kind = isUser ? "Request" : "Response";
    const text = `[${kind}] ${label} · ${formatMessageDateTime(message.timestamp)} (${formatTimestamp(message.timestamp)})\n\n${message.content}`;
    navigator.clipboard.writeText(text);
    setCopySnack(true);
  };
 
  const isLongContent = message.content.length > 800 || message.content.split("\n").length > 20;
  const [contentExpanded, setContentExpanded] = useState(true);
 
  const laneMaxWidth = isUser
    ? { xs: "min(92%, 360px)", sm: "min(42%, 400px)", md: "min(40%, 420px)" }
    : { xs: "100%", sm: "100%", md: "100%" };
 
  const hidePipelineChrome =
    Boolean(livePipelineUi) && livePipelineUi.runPhase === "streaming" && livePipelineUi.pipelineProgress >= 100;
 
  // Show Events/Sources for the whole assistant stream whenever there is pipeline data — not only after
  // answer tokens arrive, so substeps and live activity match the inline “Processing” block.
  const showStreamingEvents =
    !isUser &&
    message.status === "streaming" &&
    (Boolean(liveProcessingSteps?.length) ||
      Boolean(message.activityLog?.length) ||
      Boolean(message.streamMeta?.searchQuery || message.streamMeta?.foundSummary) ||
      Boolean(message.sources?.length) ||
      Boolean(message.citations?.length) ||
      Boolean(message.content?.trim()));
 
  const openAttachmentPreview = (att) => {
    const url = att.objectUrl || att.preview;
    if (!url) return;
    setFilePreview({ url, name: att.name, type: att.type || "" });
  };
 
  const citations = message.citations;
  const streamingAnswerStarted = Boolean(message.content?.trim());
 
  const mdComponents = {
    p: ({ children }) => (
      <Box component="p" sx={{ my: 0.5 }}>
        {processMdChildren(children, citations)}
      </Box>
    ),
    li: ({ children }) => (
      <Box component="li" sx={{ my: 0.25 }}>
        {processMdChildren(children, citations)}
      </Box>
    ),
    td: ({ children, ...rest }) => <td {...rest}>{processMdChildren(children, citations)}</td>,
    th: ({ children, ...rest }) => <th {...rest}>{processMdChildren(children, citations)}</th>,
    blockquote: ({ children }) => (
      <Box
        component="blockquote"
        sx={{
          borderLeft: "3px solid",
          borderLeftColor: "primary.main",
          pl: 2,
          my: 1,
          color: "text.secondary",
          bgcolor: alpha(theme.palette.primary.main, 0.06),
          py: 0.5,
          borderRadius: "0 6px 6px 0",
        }}
      >
        {processMdChildren(children, citations)}
      </Box>
    ),
    code({ className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || "");
      const value = String(children).replace(/\n$/, "");
      if (match) return <CodeBlock language={match[1]} value={value} />;
      return (
        <code
          style={{
            background: isDark ? "rgba(255,255,255,0.08)" : alpha(theme.palette.primary.main, 0.1),
            padding: "2px 6px",
            borderRadius: "4px",
            fontFamily: '"SF Mono", "JetBrains Mono", monospace',
            fontSize: "0.82em",
            color: theme.palette.error.main,
          }}
          {...props}
        >
          {children}
        </code>
      );
    },
  };
 
  return (
    <>
      <Box
        sx={{
          display: "flex",
          justifyContent: isUser ? "flex-end" : "flex-start",
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
          px: { xs: 2, sm: 3 },
          py: 1.5,
          boxSizing: "border-box",
          "&:hover .msg-actions": { opacity: 1 },
          animation: "fadeIn 0.2s ease-out",
          "@keyframes fadeIn": { from: { opacity: 0, transform: "translateY(4px)" }, to: { opacity: 1, transform: "none" } },
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: isUser ? "row-reverse" : "row",
            gap: 1.5,
            maxWidth: laneMaxWidth,
            width: "100%",
            minWidth: 0,
            alignItems: "flex-start",
          }}
        >
          <Avatar
            sx={{
              width: 28,
              height: 28,
              mt: 0.25,
              flexShrink: 0,
              bgcolor: isUser ? userColors.userAvatar : isDark ? alpha(theme.palette.primary.main, 0.45) : "#2563eb",
              color: "#fff",
            }}
          >
            {isUser ? <PersonOutlineIcon sx={{ fontSize: 16 }} /> : <SmartToyOutlinedIcon sx={{ fontSize: 16 }} />}
          </Avatar>
 
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              maxWidth: "100%",
              overflow: "hidden",
              bgcolor: isUser
                ? userColors.userBubbleBg
                : isDark
                  ? alpha("#fff", 0.04)
                  : "#ffffff",
              border: "1px solid",
              borderColor: isUser ? userColors.userBubbleBorder : isDark ? "divider" : "#D5D9D9",
              borderRadius: "12px",
              px: 1.75,
              py: 1.25,
              boxShadow: !isUser && !isDark ? "0 1px 2px rgba(15, 23, 42, 0.04)" : "none",
            }}
          >
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: isUser ? "flex-end" : "flex-start",
                gap: 0.25,
                mb: 0.5,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", justifyContent: isUser ? "flex-end" : "flex-start" }}>
                <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: "text.primary" }}>{isUser ? "You" : "Assistant"}</Typography>
                {isError && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "error.main", fontSize: 11 }}>
                    <ErrorOutlineIcon sx={{ fontSize: 14 }} /> Failed
                  </Box>
                )}
              </Box>
              <Typography
                component="time"
                dateTime={new Date(message.timestamp).toISOString()}
                sx={{ fontSize: 11, color: "text.secondary" }}
              >
                {formatMessageDateTime(message.timestamp)} · {formatTimestamp(message.timestamp)}
              </Typography>
            </Box>
 
            {!isUser && message.status === "streaming" && livePipelineUi && !hidePipelineChrome && (
              <Box sx={{ mt: 0.5, mb: 1, width: "100%", minWidth: 0 }}>
                {!streamingAnswerStarted && livePipelineUi.runPhase === "initializing" && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mb: 1.25, minWidth: 0 }}>
                    <CircularProgress size={20} thickness={4} sx={{ flexShrink: 0 }} />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: "text.primary" }}>Preparing your answer</Typography>
                      <Typography sx={{ fontSize: 11.5, color: "text.secondary", mt: 0.25, wordBreak: "break-word" }}>
                        Pulling session context and getting ready to retrieve data…
                      </Typography>
                    </Box>
                  </Box>
                )}
 
                {liveProcessingSteps &&
                  liveProcessingSteps.length > 0 &&
                  (livePipelineUi.runPhase === "steps" || livePipelineUi.runPhase === "streaming") &&
                  !streamingAnswerStarted && (
                    <Box sx={{ mb: 1, minWidth: 0, maxWidth: "100%" }}>
                      <Button
                        size="small"
                        onClick={() => setProcessingOpen(!processingOpen)}
                        startIcon={processingOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        sx={{
                          mb: 0.5,
                          textTransform: "none",
                          fontSize: 12,
                          color: "text.secondary",
                          border: "1px solid",
                          borderColor: "divider",
                          borderRadius: 2,
                          px: 1.25,
                          "&:hover": { borderColor: "primary.main", bgcolor: alpha(theme.palette.primary.main, 0.06) },
                        }}
                      >
                        Processing
                      </Button>
                      <Collapse in={processingOpen}>
                        <Box
                          sx={{
                            bgcolor: theme.palette.mode === "dark" ? alpha("#fff", 0.04) : "#fafafa",
                            border: "1px solid",
                            borderColor: theme.palette.mode === "dark" ? "divider" : "#D5D9D9",
                            borderRadius: "10px",
                            px: 1.5,
                            py: 0.75,
                            minWidth: 0,
                            maxWidth: "100%",
                          }}
                        >
                          <ProcessingSteps
                            steps={liveProcessingSteps}
                            isLive
                            streamMeta={message.streamMeta}
                            activityLog={message.activityLog}
                          />
                        </Box>
                      </Collapse>
                    </Box>
                  )}
 
                {!streamingAnswerStarted && livePipelineUi.runPhase === "streaming" && (
                  <Typography sx={{ fontSize: 11, color: "text.secondary", mb: 0.75, display: "block" }}>
                    Streaming the final answer…
                  </Typography>
                )}
 
                {!streamingAnswerStarted && (
                  <LinearProgress
                    variant="determinate"
                    value={livePipelineUi.pipelineProgress}
                    sx={{
                      height: 5,
                      borderRadius: 999,
                      bgcolor: alpha(theme.palette.primary.main, 0.12),
                      "& .MuiLinearProgress-bar": { borderRadius: 999 },
                    }}
                  />
                )}
              </Box>
            )}
 
            {message.attachments && message.attachments.length > 0 && (
              <Box sx={{ display: "flex", gap: 1, mb: 1, flexWrap: "wrap", justifyContent: isUser ? "flex-end" : "flex-start" }}>
                {message.attachments.map((att, i) => {
                  const clickable = Boolean(att.preview || att.objectUrl);
                  const isImg = att.type?.startsWith("image/");
                  return (
                    <Box
                      key={i}
                      sx={{
                        borderRadius: "8px",
                        overflow: "hidden",
                        border: "1px solid",
                        borderColor: theme.palette.mode === "light" ? "#D5D9D9" : "divider",
                        cursor: clickable ? "pointer" : "default",
                        maxWidth: 220,
                      }}
                      onClick={() => clickable && openAttachmentPreview(att)}
                    >
                      {isImg && (att.preview || att.objectUrl) ? (
                        <img
                          src={att.preview || att.objectUrl}
                          alt={att.name}
                          style={{ maxWidth: 200, maxHeight: 140, display: "block" }}
                        />
                      ) : (
                        <Box
                          sx={{
                            px: 1.5,
                            py: 0.75,
                            bgcolor: alpha(theme.palette.primary.main, 0.06),
                            display: "flex",
                            alignItems: "center",
                            gap: 0.75,
                          }}
                        >
                          <InsertDriveFileIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                          <Typography sx={{ fontSize: 11, color: "text.primary" }}>{att.name}</Typography>
                        </Box>
                      )}
                    </Box>
                  );
                })}
              </Box>
            )}
 
            {message.toolOutputs?.map((output) => (
              <ToolOutputBlock key={output.id} output={output} />
            ))}
 
            {isLongContent && !isUser && (
              <Box sx={{ mb: 0.5 }}>
                <IconButton size="small" onClick={() => setContentExpanded(!contentExpanded)} sx={{ color: "text.secondary", p: 0.25 }}>
                  {contentExpanded ? <ExpandLessIcon sx={{ fontSize: 16 }} /> : <ExpandMoreIcon sx={{ fontSize: 16 }} />}
                </IconButton>
                <Typography component="span" sx={{ fontSize: 11, color: "text.secondary", ml: 0.5 }}>
                  {contentExpanded ? "Collapse" : "Expand"} response
                </Typography>
              </Box>
            )}
 
            {isUser ? (
              <Box
                sx={{
                  maxHeight: USER_PASTE_MAX_PX,
                  overflowY: "auto",
                  textAlign: "left",
                  width: "100%",
                  pr: 0.5,
                }}
              >
                <Typography
                  component="div"
                  sx={{
                    fontSize: "0.875rem",
                    color: "text.primary",
                    lineHeight: 1.65,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {message.content || " "}
                </Typography>
              </Box>
            ) : (
              <Collapse in={contentExpanded} collapsedSize={isLongContent && !isUser ? 0 : undefined}>
                <Box
                  sx={{
                    textAlign: "left",
                    minWidth: 0,
                    maxWidth: "100%",
                    overflowX: "auto",
                    overflowY: isLongContent && contentExpanded ? "auto" : "visible",
                    wordBreak: "break-word",
                    ...(isLongContent && contentExpanded ? { maxHeight: 480, pr: 1 } : {}),
                    "& p": { my: 0.5, fontSize: "0.875rem", color: "text.primary", lineHeight: 1.65 },
                    "& table": {
                      borderCollapse: "collapse",
                      width: "100%",
                      maxWidth: "100%",
                      my: 1.5,
                      fontSize: "0.8rem",
                      tableLayout: "auto",
                    },
                    "& th, & td": {
                      border: "1px solid",
                      borderColor: theme.palette.mode === "light" ? "#D5D9D9" : "divider",
                      px: 1.5,
                      py: 0.75,
                      textAlign: "left",
                    },
                    "& th": { bgcolor: alpha(theme.palette.primary.main, 0.1), fontWeight: 600, color: "text.primary" },
                    "& td": { color: "text.secondary" },
                    "& a": { color: "primary.main", textDecoration: "underline" },
                    "& img": { maxWidth: "100%", borderRadius: "8px" },
                    "& ul, & ol": { pl: 3, color: "text.secondary" },
                    "& strong": { color: "text.primary" },
                    "& h1,& h2,& h3,& h4,& h5,& h6": { color: "text.primary", mt: 2, mb: 1 },
                  }}
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                    {message.content}
                  </ReactMarkdown>
                </Box>
              </Collapse>
            )}
 
            {message.status === "streaming" && (
              <Box
                sx={{
                  display: "inline-block",
                  width: 2,
                  height: 16,
                  bgcolor: "primary.main",
                  ml: 0.5,
                  verticalAlign: "text-bottom",
                  animation: "blink 1s infinite",
                  "@keyframes blink": { "0%,100%": { opacity: 1 }, "50%": { opacity: 0 } },
                }}
              />
            )}
 
            {showStreamingEvents && (
              <EventsSourcesPanel
                isLive
                collapseLiveEventsWhenReady={Boolean(
                  livePipelineUi?.runPhase === "streaming" && livePipelineUi?.pipelineProgress >= 100,
                )}
                processingSteps={liveProcessingSteps}
                activityLog={message.activityLog}
                streamMeta={message.streamMeta}
                sources={message.sources}
                citations={message.citations}
              />
            )}
 
            {!isUser && message.status === "complete" && (
              <EventsSourcesPanel
                processingSteps={message.processingSteps}
                activityLog={message.activityLog}
                streamMeta={message.streamMeta}
                sources={message.sources}
                citations={message.citations}
              />
            )}
 
            <Box
              className="msg-actions"
              sx={{
                display: "flex",
                gap: 0.5,
                mt: 0.5,
                opacity: 0,
                transition: "opacity 0.15s",
                alignItems: "center",
                justifyContent: isUser ? "flex-end" : "flex-start",
                flexWrap: "wrap",
              }}
            >
              <Tooltip title="Copy message">
                <IconButton size="small" onClick={handleCopyMessage} sx={{ color: "text.secondary", "&:hover": { color: "primary.main" } }}>
                  <ContentCopyIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>
              {!isUser && message.status === "complete" && (
                <>
                  <Tooltip title="Good response">
                    <IconButton size="small" sx={{ color: "text.secondary", "&:hover": { color: "success.main" } }}>
                      <ThumbUpOutlinedIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Bad response">
                    <IconButton size="small" sx={{ color: "text.secondary", "&:hover": { color: "error.main" } }}>
                      <ThumbDownOutlinedIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Tooltip>
                </>
              )}
              {isError && onRetry && (
                <Tooltip title="Retry">
                  <IconButton size="small" onClick={onRetry} sx={{ color: "error.main" }}>
                    <ReplayIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          </Box>
        </Box>
      </Box>
 
      <Dialog open={Boolean(filePreview)} onClose={() => setFilePreview(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontSize: 15 }}>{filePreview?.name}</DialogTitle>
        <DialogContent sx={{ p: 1, pt: 0 }}>
          {filePreview?.type === "application/pdf" ? (
            <Box
              component="iframe"
              title={filePreview.name}
              src={filePreview.url}
              sx={{ width: "100%", height: { xs: "60vh", sm: "70vh" }, border: "none", borderRadius: 1 }}
            />
          ) : (
            <img src={filePreview?.url} alt={filePreview?.name} style={{ width: "100%", maxHeight: "80vh", objectFit: "contain" }} />
          )}
        </DialogContent>
      </Dialog>
 
      <Snackbar open={copySnack} autoHideDuration={2000} onClose={() => setCopySnack(false)} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert severity="success" onClose={() => setCopySnack(false)} sx={{ fontSize: 12 }}>
          Copied to clipboard
        </Alert>
      </Snackbar>
    </>
  );
};
 
export default MessageBubble;
 