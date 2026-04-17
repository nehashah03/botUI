 
import React, { useEffect } from "react";
import { Grid } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { Provider } from "react-redux";
import { store, SESSION_STORAGE_KEY } from "../store";
import { hydrateSessions } from "../features/session/sessionSlice";
import { setError } from "../features/chat/chatSlice";
import { fetchSessionsState } from "../api/chatApi";
import SessionSidebar from "../components/SessionSidebar";
import ChatPanel from "../components/ChatPanel";
 
const AppContent = () => {
  const theme = useTheme();
 
  // --- If there is no local session list yet, pull the dummy backend snapshot (added). When `localStorage`
  // already has chats, we keep them so an older server file cannot wipe a newer browser state.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const r = await fetchSessionsState();
      if (cancelled) return;
      if (store.getState().session.sessions.length > 0) return;
      if (!r?.ok) {
        store.dispatch(setError("Could not load chats from server. Please try again later."));
        return;
      }
      if (!Array.isArray(r.data?.sessions) || r.data.sessions.length === 0) return;
      store.dispatch(
        hydrateSessions({
          sessions: r.data.sessions,
          activeSessionId: r.data.activeSessionId ?? null,
        }),
      );
      try {
        localStorage.setItem(
          SESSION_STORAGE_KEY,
          JSON.stringify({ sessions: r.data.sessions, activeSessionId: r.data.activeSessionId ?? null }),
        );
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
 
  return (
    <Grid
      container
      direction={{ xs: "column", md: "row" }}
      wrap="nowrap"
      sx={{
        height: "100vh",
        maxHeight: "100dvh",
        overflow: "hidden",
        bgcolor: theme.palette.background.default,
        minWidth: 0,
      }}
    >
      <Grid
        size={{ xs: 12, md: "auto" }}
        sx={{
          flexShrink: 0,
          minWidth: 0,
          height: { xs: "auto", md: "100%" },
          maxHeight: { xs: "min(40vh, 300px)", md: "none" },
          overflow: { xs: "auto", md: "visible" },
          display: "flex",
          borderBottom: { xs: (t) => `1px solid ${t.palette.divider}`, md: "none" },
        }}
      >
        <SessionSidebar />
      </Grid>
      <Grid
        size={{ xs: 12, md: "grow" }}
        sx={{
          flex: { xs: "1 1 0%", md: "1 1 0%" },
          minWidth: 0,
          minHeight: 0,
          height: { xs: 0, md: "100%" },
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <ChatPanel />
      </Grid>
    </Grid>
  );
};
 
const Index = () => (
  // Redux store
  <Provider store={store}>
    <AppContent />
  </Provider>
);
 
export default Index;
