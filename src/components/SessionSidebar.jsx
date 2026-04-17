import React, { useCallback, useMemo, useState, useRef, useEffect, memo } from "react";
import {
  Box,
  List,
  ListItemButton,
  Typography,
  IconButton,
  Button,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  InputAdornment,
  Tooltip,
  Menu,
  MenuItem,
  ListItemText,
  Collapse,
  Chip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import SearchIcon from "@mui/icons-material/Search";
import ViewSidebarIcon from "@mui/icons-material/ViewSidebar";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import DriveFileRenameOutlineIcon from "@mui/icons-material/DriveFileRenameOutline";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import PhotoLibraryOutlinedIcon from "@mui/icons-material/PhotoLibraryOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import StarOutlineIcon from "@mui/icons-material/StarOutline";
import StarIcon from "@mui/icons-material/Star";
import { useTheme, alpha } from "@mui/material/styles";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { store } from "../store";
import { selectSessionSidebarSnapshot, sessionsSidebarSnapshotEqual } from "../store/sessionSelectors";
import {
  createSession,
  setActiveSession,
  deleteSession,
  renameSession,
  toggleSessionFavorite,
} from "../features/session/sessionSlice";
import { patchChatOnServer, deleteChatOnServer } from "../api/chatApi";
import { setError } from "../features/chat/chatSlice";
import { generateId, formatMessageDateTime, exportConversationText, escapeRegExp } from "../utils/helpers";
import { useSettingsUi } from "../context/SettingsUiContext";
 
const EXPANDED_W = 300;
const COLLAPSED_W = 72;
 
function Kbd({ children }) {
  return (
    <Chip
      label={children}
      size="small"
      sx={{
        height: 22,
        fontSize: 10,
        fontFamily: "ui-monospace, monospace",
        bgcolor: (t) => alpha(t.palette.text.primary, 0.08),
        color: "text.secondary",
        border: "1px solid",
        borderColor: "divider",
        "& .MuiChip-label": { px: 0.75 },
      }}
    />
  );
}
 
function TitleWithHighlight({ title, query }) {
  const theme = useTheme();
  const q = query.trim();
  if (!q) {
    return (
      <Typography noWrap sx={{ fontSize: 13, fontWeight: 450, color: "text.primary", lineHeight: 1.35 }}>
        {title}
      </Typography>
    );
  }
  const parts = title.split(new RegExp(`(${escapeRegExp(q)})`, "gi"));
  return (
    <Typography component="div" noWrap sx={{ fontSize: 13, fontWeight: 450, color: "text.primary", lineHeight: 1.35 }}>
      {parts.map((part, i) =>
        part.toLowerCase() === q.toLowerCase() ? (
          <Box
            component="span"
            key={i}
            sx={{
              bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.35 : 0.18),
              color: theme.palette.mode === "dark" ? "#fff" : theme.palette.primary.dark,
              borderRadius: "4px",
              px: 0.25,
            }}
          >
            {part}
          </Box>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </Typography>
  );
}
 
function ChatRowInner({ session, activeSessionId, search, expanded, onSelect, onMenu, theme }) {
  return (
    <ListItemButton
      selected={session.id === activeSessionId}
      onClick={() => onSelect(session.id)}
      sx={{
        borderRadius: 1.5,
        py: 0.85,
        px: 1,
        mb: 0.25,
        alignItems: "flex-start",
        "&.Mui-selected": {
          bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.18 : 0.1),
        },
        "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.06) },
      }}
    >
      <ListItemText
        primary={<TitleWithHighlight title={session.title} query={search} />}
        secondary={formatMessageDateTime(session.updatedAt)}
        primaryTypographyProps={{ component: "div" }}
        secondaryTypographyProps={{ fontSize: 10.5, color: "text.secondary", sx: { mt: 0.25 } }}
        sx={{ mr: 0.5, minWidth: 0, my: 0 }}
      />
      {expanded && (
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onMenu(e, session.id);
          }}
          sx={{ color: "text.secondary", mt: -0.25 }}
        >
          <MoreVertIcon sx={{ fontSize: 18 }} />
        </IconButton>
      )}
    </ListItemButton>
  );
}
 
/** Skip re-renders when another chat streams tokens (metadata row unchanged). */
const ChatRow = memo(ChatRowInner, (prev, next) => {
  return (
    prev.session.id === next.session.id &&
    prev.session.title === next.session.title &&
    prev.session.favorite === next.session.favorite &&
    prev.session.updatedAt === next.session.updatedAt &&
    prev.activeSessionId === next.activeSessionId &&
    prev.search === next.search &&
    prev.expanded === next.expanded &&
    prev.theme === next.theme
  );
});
 
function SectionHeader({ title, open, onToggle }) {
  const theme = useTheme();
  return (
    <ListItemButton
      onClick={onToggle}
      sx={{
        py: 0.5,
        px: 1,
        borderRadius: 1,
        minHeight: 36,
        "&:hover": { bgcolor: alpha(theme.palette.text.primary, 0.04) },
      }}
    >
      {open ? <ExpandLessIcon sx={{ fontSize: 18, color: "text.secondary", mr: 0.75 }} /> : <ExpandMoreIcon sx={{ fontSize: 18, color: "text.secondary", mr: 0.75 }} />}
      <Typography sx={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 0.6, color: "text.secondary", textTransform: "uppercase" }}>
        {title}
      </Typography>
    </ListItemButton>
  );
}
 
const SessionSidebar = () => {
  const theme = useTheme();
  const { openSettings } = useSettingsUi();
  const dispatch = useAppDispatch();
  const { activeSessionId, rows: sessionRows, sessionCount } = useAppSelector(
    selectSessionSidebarSnapshot,
    sessionsSidebarSnapshotEqual,
  );
  const [expanded, setExpanded] = useState(true);
  const [search, setSearch] = useState("");
  const [favoritesOpen, setFavoritesOpen] = useState(true);
  const [recentOpen, setRecentOpen] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuSessionId, setMenuSessionId] = useState(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameTargetId, setRenameTargetId] = useState(null);
  const [renameDraft, setRenameDraft] = useState("");
  const searchInputRef = useRef(null);
 
  const matchesSearch = useCallback(
    (s) => {
      const t = search.trim().toLowerCase();
      if (!t) return true;
      return s.title.toLowerCase().includes(t);
    },
    [search],
  );
 
  const favoriteSessions = useMemo(() => {
    return sessionRows.filter((s) => s.favorite && matchesSearch(s));
  }, [sessionRows, matchesSearch]);
 
  const recentSessions = useMemo(() => {
    return sessionRows
      .filter((s) => !s.favorite && matchesSearch(s))
      .slice()
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [sessionRows, matchesSearch]);
 
  const expandAndFocusSearch = useCallback(() => {
    setExpanded(true);
    requestAnimationFrame(() => searchInputRef.current?.focus());
  }, []);
 
  const handleNewChat = useCallback(() => {
    dispatch(
      createSession({
        id: generateId(),
        title: "New Conversation",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [],
        live: null,
      }),
    );
  }, [dispatch]);
 
  useEffect(() => {
    const onKey = (e) => {
      if (e.defaultPrevented) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "n") {
        e.preventDefault();
        handleNewChat();
      }
      if (mod && e.key.toLowerCase() === "o") {
        e.preventDefault();
        expandAndFocusSearch();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [handleNewChat, expandAndFocusSearch]);
 
  // --- Chat content is read from `session.messages` in ChatPanel; only switch active id (added).
  const handleSelectSession = useCallback(
    (id) => {
      if (sessionRows.some((r) => r.id === id)) dispatch(setActiveSession(id));
    },
    [dispatch, sessionRows],
  );
 
  /** Deletes on the server first; only then removes from Redux (no fake “deleted” when API is down). */
  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    const id = deleteTarget;
    const res = await deleteChatOnServer(id);
    if (!res?.ok) {
      dispatch(setError("Failed to delete. Please try again later."));
      setDeleteTarget(null);
      return;
    }
    dispatch(deleteSession(id));
    setDeleteTarget(null);
  }, [deleteTarget, dispatch]);
 
  const exportSession = useCallback((session) => {
    const text = exportConversationText(session.messages);
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safe = session.title.slice(0, 40).replace(/[^\w-]+/g, "-") || "chat";
    a.download = `${safe}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);
 
  /** PATCH title on server before committing the optimistic Redux title (backend is source of truth). */
  const submitRename = useCallback(async () => {
    if (!renameTargetId) {
      setRenameOpen(false);
      return;
    }
    const id = renameTargetId;
    const t = renameDraft.trim() || "Untitled chat";
    const res = await patchChatOnServer(id, { title: t });
    if (!res?.ok) {
      dispatch(setError("Failed to rename. Please try again later."));
      setRenameOpen(false);
      setRenameTargetId(null);
      return;
    }
    dispatch(renameSession({ id, title: t }));
    setRenameOpen(false);
    setRenameTargetId(null);
  }, [dispatch, renameTargetId, renameDraft]);
 
  const openMenu = useCallback((e, sessionId) => {
    setMenuAnchor(e.currentTarget);
    setMenuSessionId(sessionId);
  }, []);
 
  const menuSession =
    menuSessionId != null ? store.getState().session.sessions.find((s) => s.id === menuSessionId) ?? null : null;
 
  const w = expanded ? EXPANDED_W : COLLAPSED_W;
  const isDark = theme.palette.mode === "dark";
  const accentIcon = isDark ? "#fb923c" : theme.palette.primary.main;
  const brandNameFont = isDark ? '"Georgia", "Times New Roman", serif' : theme.typography.fontFamily;
  /** Blue-only brand (logo + collapsed chat FAB) — matches light primary, no orange gradient in dark. */
  const brandLogoBg = isDark
    ? `linear-gradient(145deg, ${theme.palette.primary.light} 0%, ${theme.palette.primary.main} 52%, ${theme.palette.primary.dark} 100%)`
    : theme.palette.primary.main;
  const brandLogoShadow = isDark ? `0 1px 10px ${alpha(theme.palette.primary.main, 0.38)}` : "none";
  const brandFabShadow = isDark ? `0 2px 12px ${alpha(theme.palette.primary.main, 0.42)}` : theme.shadows[4];
 
  const actionRowSx = {
    display: "flex",
    alignItems: "center",
    gap: 1,
    px: 1.5,
    py: 0.85,
    borderRadius: 1.5,
    cursor: "pointer",
    color: "text.primary",
    "&:hover": { bgcolor: alpha(theme.palette.text.primary, 0.06) },
  };
 
  return (
    <Box
      sx={{
        position: "relative",
        flexShrink: 0,
        height: "100%",
        minHeight: 0,
        width: w,
        transition: theme.transitions.create("width", { duration: 220, easing: "ease-out" }),
        bgcolor: "background.paper",
        borderRight: "1px solid",
        borderColor: "divider",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {expanded ? (
        <Box
          sx={{
            px: 1.5,
            py: 1.25,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
            minHeight: 52,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, minWidth: 0, flex: 1 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: "8px",
                background: brandLogoBg,
                boxShadow: brandLogoShadow,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <AutoAwesomeIcon sx={{ color: "#fff", fontSize: 20 }} />
            </Box>
            <Typography
              sx={{
                fontWeight: 600,
                fontSize: 15,
                color: "text.primary",
                letterSpacing: "-0.02em",
                noWrap: true,
                fontFamily: brandNameFont,
              }}
            >
              Logic Chat
            </Typography>
          </Box>
          <Tooltip title="Collapse sidebar" placement="bottom">
            <IconButton size="small" onClick={() => setExpanded(false)} sx={{ color: "text.secondary" }} aria-label="Toggle sidebar">
              <ViewSidebarIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ) : (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 0.75,
            py: 1.25,
            px: 0.5,
          }}
        >
          <Tooltip title="Logic Chat" placement="right">
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: "8px",
                background: brandLogoBg,
                boxShadow: brandLogoShadow,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <AutoAwesomeIcon sx={{ color: "#fff", fontSize: 20 }} />
            </Box>
          </Tooltip>
          <Tooltip title="New chat" placement="right">
            <IconButton onClick={handleNewChat} size="small" sx={{ color: accentIcon }} aria-label="New chat">
              <AddIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Search chats (Ctrl+O)" placement="right">
            <IconButton onClick={expandAndFocusSearch} size="small" sx={{ color: "text.secondary" }} aria-label="Search chats">
              <SearchIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Open chat list" placement="right">
            <IconButton
              onClick={() => setExpanded(true)}
              aria-label="Open chat list"
              sx={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: brandLogoBg,
                color: "#fff",
                boxShadow: brandFabShadow,
                "&:hover": {
                  background: theme.palette.primary.dark,
                  opacity: 0.95,
                },
              }}
            >
              <ChatBubbleOutlineIcon sx={{ fontSize: 22 }} />
            </IconButton>
          </Tooltip>
        </Box>
      )}
 
      <Divider sx={{ borderColor: "divider" }} />
 
      {expanded ? (
        <>
          {/* Quick actions: New chat, Search, Library */}
          <Box sx={{ px: 1, pt: 1, pb: 0.5, display: "flex", flexDirection: "column", gap: 0.25 }}>
            <Box component="button" type="button" sx={{ ...actionRowSx, border: "none", background: "none", width: "100%", textAlign: "left" }} onClick={handleNewChat}>
              <AddIcon sx={{ fontSize: 20, color: accentIcon }} />
              <Typography sx={{ flex: 1, fontSize: 13.5, fontWeight: 500 }}>New chat</Typography>
             
            </Box>
            <Box component="button" type="button" sx={{ ...actionRowSx, border: "none", background: "none", width: "100%", textAlign: "left" }} onClick={expandAndFocusSearch}>
              <SearchIcon sx={{ fontSize: 20, color: "text.secondary" }} />
              <Typography sx={{ flex: 1, fontSize: 13.5, fontWeight: 500 }}>Search chats</Typography>
              <Kbd>Ctrl+O</Kbd>
            </Box>
            <Tooltip title="Coming soon">
              <Box sx={{ ...actionRowSx, opacity: 0.55, cursor: "default" }}>
                <PhotoLibraryOutlinedIcon sx={{ fontSize: 20, color: "text.secondary" }} />
                <Typography sx={{ flex: 1, fontSize: 13.5, fontWeight: 500 }}>Library</Typography>
              </Box>
            </Tooltip>
          </Box>
 
          <Box sx={{ px: 1.5, pb: 1 }}>
            <TextField
              inputRef={searchInputRef}
              size="small"
              fullWidth
              placeholder="Filter chats…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  fontSize: 13,
                  bgcolor: alpha(theme.palette.text.primary, isDark ? 0.06 : 0.04),
                },
              }}
            />
          </Box>
 
          <Divider sx={{ borderColor: "divider", my: 0.5 }} />
        </>
      ) : null}
 
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          px: expanded ? 0.75 : 0.25,
          py: 0.5,
          scrollbarWidth: "thin",
          "&::-webkit-scrollbar": { width: 6 },
          "&::-webkit-scrollbar-thumb": {
            background: alpha(theme.palette.text.primary, 0.15),
            borderRadius: 3,
          },
        }}
      >
        {expanded ? (
          <>
            <SectionHeader title="Favorites" open={favoritesOpen} onToggle={() => setFavoritesOpen((o) => !o)} />
            <Collapse in={favoritesOpen}>
              <List dense disablePadding sx={{ px: 0.5, pb: 1 }}>
                {favoriteSessions.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: 11.5, px: 1, py: 0.75 }}>
                    Star a chat from the menu to pin it here.
                  </Typography>
                ) : (
                  favoriteSessions.map((session) => (
                    <ChatRow
                      key={session.id}
                      session={session}
                      activeSessionId={activeSessionId}
                      search={search}
                      expanded
                      onSelect={handleSelectSession}
                      onMenu={openMenu}
                      theme={theme}
                    />
                  ))
                )}
              </List>
            </Collapse>
 
            <SectionHeader title="Recent chats" open={recentOpen} onToggle={() => setRecentOpen((o) => !o)} />
            <Collapse in={recentOpen}>
              <List dense disablePadding sx={{ px: 0.5, pb: 1 }}>
                {recentSessions.length === 0 && sessionCount === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: 11.5, px: 1, py: 0.75 }}>
                    No chats yet — start with New chat.
                  </Typography>
                ) : recentSessions.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: 11.5, px: 1, py: 0.75 }}>
                    {search.trim() ? "No matches in recent chats." : "All chats are in Favorites."}
                  </Typography>
                ) : (
                  recentSessions.map((session) => (
                    <ChatRow
                      key={session.id}
                      session={session}
                      activeSessionId={activeSessionId}
                      search={search}
                      expanded
                      onSelect={handleSelectSession}
                      onMenu={openMenu}
                      theme={theme}
                    />
                  ))
                )}
              </List>
            </Collapse>
          </>
        ) : (
          <Box sx={{ flex: 1, minHeight: 48 }} aria-hidden />
        )}
      </Box>
 
      <Divider sx={{ borderColor: "divider" }} />
 
      <Box sx={{ p: expanded ? 1.5 : 1, display: "flex", justifyContent: expanded ? "stretch" : "center" }}>
        {expanded ? (
          <Button
            fullWidth
            variant="outlined"
            onClick={openSettings}
            startIcon={<SettingsOutlinedIcon />}
            sx={{
              justifyContent: "flex-start",
              borderColor: "divider",
              color: "text.primary",
              textTransform: "none",
              fontSize: 13,
              py: 1,
            }}
          >
            Settings
          </Button>
        ) : (
          <Tooltip title="Settings" placement="right">
            <IconButton color="primary" onClick={openSettings} aria-label="Settings">
              <SettingsOutlinedIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>
 
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { minWidth: 200, borderRadius: 2 } } }}
      >
        <MenuItem
          onClick={async () => {
            if (!menuSessionId) {
              setMenuAnchor(null);
              return;
            }
            const next = !menuSession?.favorite;
            dispatch(toggleSessionFavorite(menuSessionId));
            const res = await patchChatOnServer(menuSessionId, { favorite: next });
            if (!res?.ok) {
              dispatch(toggleSessionFavorite(menuSessionId));
              dispatch(setError("Failed to update favorite. Please try again later."));
            }
            setMenuAnchor(null);
          }}
        >
          {menuSession?.favorite ? (
            <>
              <StarIcon sx={{ mr: 1, fontSize: 20, color: "warning.main" }} /> Remove from Favorites
            </>
          ) : (
            <>
              <StarOutlineIcon sx={{ mr: 1, fontSize: 20 }} /> Add to Favorites
            </>
          )}
        </MenuItem>
        <MenuItem
          onClick={() => {
            const s = menuSessionId ? store.getState().session.sessions.find((x) => x.id === menuSessionId) : null;
            if (s) {
              setRenameDraft(s.title);
              setRenameTargetId(s.id);
              setRenameOpen(true);
            }
            setMenuAnchor(null);
          }}
        >
          <DriveFileRenameOutlineIcon sx={{ mr: 1, fontSize: 20 }} /> Rename
        </MenuItem>
        <MenuItem
          onClick={() => {
            const s = menuSessionId ? store.getState().session.sessions.find((x) => x.id === menuSessionId) : null;
            if (s) exportSession(s);
            setMenuAnchor(null);
          }}
        >
          <FileDownloadOutlinedIcon sx={{ mr: 1, fontSize: 20 }} /> Export
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuSessionId) setDeleteTarget(menuSessionId);
            setMenuAnchor(null);
          }}
          sx={{ color: "error.main" }}
        >
          <DeleteOutlineIcon sx={{ mr: 1, fontSize: 20 }} /> Delete
        </MenuItem>
      </Menu>
 
      <Dialog open={renameOpen} onClose={() => setRenameOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Rename chat</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            fullWidth
            label="Title"
            value={renameDraft}
            onChange={(e) => setRenameDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitRename()}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenameOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={submitRename}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
 
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle sx={{ fontSize: 16 }}>Delete this conversation?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ fontSize: 13 }}>
            This chat will be removed permanently. Do you confirm? Export first if you need a copy.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteTarget(null)} variant="outlined" size="small">
            No
          </Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained" size="small">
            Yes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
 
export default SessionSidebar;
 