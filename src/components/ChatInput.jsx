 
import React, { useState, useRef, useCallback } from "react";
import { Box, IconButton, Tooltip, Typography, Dialog, DialogTitle, DialogContent } from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import { accentGradient } from "../theme";
import SendIcon from "@mui/icons-material/Send";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import CloseIcon from "@mui/icons-material/Close";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import { useDropzone } from "react-dropzone";
import { formatFileSize } from "../utils/helpers";
 
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "image/*": [],
};
const MIN_ROWS = 1;
const TEXTAREA_MAX_HEIGHT_FOOTER = 160;
const TEXTAREA_MAX_HEIGHT_HERO = 240;
 
/**
 * @param {"footer" | "hero"} variant — footer: docked bar; hero: centered empty-state composer (same attach / multiline / Enter send)
 */
const ChatInput = ({ onSend, disabled, placeholder, variant = "footer" }) => {
  const theme = useTheme();
  const isHero = variant === "hero";
  const maxTextHeight = isHero ? TEXTAREA_MAX_HEIGHT_HERO : TEXTAREA_MAX_HEIGHT_FOOTER;
  const resolvedPlaceholder = placeholder ?? (isHero ? "Ask Logic Chat something…" : "Ask a followup question");
 
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [filePreview, setFilePreview] = useState(null);
  const textareaRef = useRef(null);
 
  const onDrop = useCallback((files) => {
    const valid = files.filter((f) => f.size <= MAX_FILE_SIZE);
    const newAttachments = valid.map((f) => {
      const objectUrl = URL.createObjectURL(f);
      return {
        name: f.name,
        size: f.size,
        type: f.type,
        objectUrl,
        preview: f.type.startsWith("image/") ? objectUrl : undefined,
      };
    });
    setAttachments((prev) => [...prev, ...newAttachments]);
  }, []);
 
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    noClick: true,
    noKeyboard: true,
    maxSize: MAX_FILE_SIZE,
  });
 
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
 
  const handleSend = () => {
    if (!text.trim() && attachments.length === 0) return;
    onSend(text.trim(), attachments);
    setText("");
    setAttachments([]);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };
 
  const handleInput = (e) => {
    const val = e.target.value;
    setText(val);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, maxTextHeight)}px`;
  };
 
  const isDark = theme.palette.mode === "dark";
 
  return (
    <Box
      {...getRootProps()}
      sx={{
        px: isHero ? 0 : 3,
        py: isHero ? 0 : 2,
        borderTop: isHero ? "none" : "1px solid",
        borderColor: "divider",
        bgcolor: isDragActive ? alpha(theme.palette.primary.main, 0.12) : isHero ? "transparent" : "background.paper",
        transition: "background-color 0.2s",
      }}
    >
      <input {...getInputProps()} />
 
      {isDragActive && (
        <Box
          sx={{
            p: 2,
            mb: 1.5,
            border: "2px dashed",
            borderColor: "primary.main",
            borderRadius: "8px",
            textAlign: "center",
            bgcolor: alpha(theme.palette.primary.main, 0.1),
          }}
        >
          <Typography sx={{ color: "primary.main", fontSize: 13 }}>Drop files here…</Typography>
        </Box>
      )}
 
      {attachments.length > 0 && (
        <Box sx={{ display: "flex", gap: 1, mb: 1.5, flexWrap: "wrap", justifyContent: isHero ? "center" : "flex-start" }}>
          {attachments.map((a, i) => (
            <Box
              key={i}
              sx={{
                position: "relative",
                borderRadius: "8px",
                overflow: "hidden",
                border: "1px solid",
                borderColor: "divider",
                bgcolor: alpha(theme.palette.primary.main, 0.06),
                display: "flex",
                alignItems: "center",
                gap: 1,
                ...((a.preview || a.objectUrl) ? { cursor: "pointer" } : {}),
                ...(a.preview ? { width: 80, height: 80 } : { px: 1.5, py: 0.75 }),
              }}
              onClick={() => {
                if (a.objectUrl || a.preview) {
                  setFilePreview({ url: a.objectUrl || a.preview, type: a.type || "", name: a.name });
                }
              }}
            >
              {a.preview ? (
                <img src={a.preview} alt={a.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <>
                  <InsertDriveFileIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      sx={{
                        fontSize: 11,
                        color: "text.primary",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        maxWidth: 100,
                      }}
                    >
                      {a.name}
                    </Typography>
                    <Typography sx={{ fontSize: 10, color: "text.secondary" }}>{formatFileSize(a.size)}</Typography>
                  </Box>
                </>
              )}
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  setAttachments((prev) => {
                    const removed = prev[i];
                    if (removed?.objectUrl) URL.revokeObjectURL(removed.objectUrl);
                    return prev.filter((_, j) => j !== i);
                  });
                }}
                sx={{
                  position: "absolute",
                  top: 2,
                  right: 2,
                  width: 18,
                  height: 18,
                  bgcolor: "rgba(0,0,0,0.5)",
                  color: "#fff",
                  fontSize: 10,
                  "&:hover": { bgcolor: "rgba(0,0,0,0.7)" },
                }}
              >
                <CloseIcon sx={{ fontSize: 12 }} />
              </IconButton>
            </Box>
          ))}
        </Box>
      )}
 
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-end",
          gap: 1,
          bgcolor: isHero
            ? isDark
              ? alpha("#fff", 0.04)
              : "#ffffff"
            : alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.08 : 0.05),
          borderRadius: isHero ? "16px" : "12px",
          border: "1px solid",
          borderColor: "divider",
          px: isHero ? 2 : 1.5,
          py: isHero ? 1.5 : 1,
          minHeight: isHero ? 120 : undefined,
          transition: "border-color 0.2s, box-shadow 0.2s",
          ...(isHero && isDark
            ? {
                boxShadow: `0 0 0 1px ${alpha(theme.palette.divider, 0.95)}, 0 1px 8px ${alpha("#000", 0.28)}, inset 0 1px 0 ${alpha(theme.palette.primary.main, 0.14)}`,
              }
            : isHero && !isDark
              ? {
                  boxShadow: `0 1px 3px ${alpha("#000", 0.06)}, inset 0 1px 0 ${alpha("#2563eb", 0.12)}`,
                }
              : {}),
          "&:focus-within": {
            borderColor: "primary.main",
            boxShadow: (t) =>
              isHero && isDark
                ? `0 0 0 1px ${alpha(t.palette.primary.main, 0.45)}, 0 0 0 2px ${alpha(t.palette.primary.main, 0.22)}, 0 1px 10px ${alpha("#000", 0.25)}`
                : `0 0 0 2px ${alpha(t.palette.primary.main, 0.22)}`,
          },
        }}
      >
        <Tooltip title="Attach file">
          <IconButton size="small" onClick={open} sx={{ color: "text.secondary", "&:hover": { color: "primary.main" } }}>
            <AttachFileIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
 
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={resolvedPlaceholder}
          disabled={disabled}
          rows={isHero ? 4 : MIN_ROWS}
          style={{
            flex: 1,
            resize: "none",
            border: "none",
            outline: "none",
            background: "transparent",
            color: theme.palette.text.primary,
            fontSize: isHero ? "0.9375rem" : "0.875rem",
            fontFamily: '"Inter", -apple-system, sans-serif',
            lineHeight: 1.55,
            maxHeight: maxTextHeight,
            minHeight: isHero ? 88 : undefined,
            overflowY: "auto",
          }}
        />
        <Tooltip title="Send (Enter)">
          <span>
            <IconButton
              onClick={handleSend}
              disabled={disabled || (!text.trim() && attachments.length === 0)}
              sx={{
                background: accentGradient,
                color: "#fff",
                width: isHero ? 40 : 32,
                height: isHero ? 40 : 32,
                borderRadius: "10px",
                boxShadow: (t) => (t.palette.mode === "dark" ? "0 0 16px rgba(124,58,237,0.35)" : "0 2px 8px rgba(99,102,241,0.35)"),
                "&:hover": { opacity: 0.92, background: accentGradient },
                "&.Mui-disabled": { opacity: 0.5, background: theme.palette.action.disabledBackground },
              }}
            >
              <SendIcon sx={{ fontSize: isHero ? 18 : 16 }} />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
 
      {isHero && (
        <Typography sx={{ fontSize: 11, color: "text.secondary", textAlign: "center", mt: 1.5 }}>
          Shift+Enter for a new line · Enter to send
        </Typography>
      )}
 
      <Dialog open={Boolean(filePreview)} onClose={() => setFilePreview(null)} maxWidth="md" fullWidth>
        {filePreview && <DialogTitle sx={{ fontSize: 15 }}>{filePreview.name}</DialogTitle>}
        <DialogContent sx={{ p: 1, pt: 0 }}>
          {filePreview &&
            (filePreview.type === "application/pdf" ? (
              <Box
                component="iframe"
                title={filePreview.name}
                src={filePreview.url}
                sx={{ width: "100%", height: { xs: "60vh", sm: "72vh" }, border: "none", borderRadius: 1 }}
              />
            ) : (
              <img src={filePreview.url} alt={filePreview.name} style={{ maxWidth: "100%", maxHeight: "80vh", objectFit: "contain" }} />
            ))}
        </DialogContent>
      </Dialog>
    </Box>
  );
};
 
export default ChatInput;
 
