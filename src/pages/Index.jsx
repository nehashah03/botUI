 
// import React, { useEffect } from "react";
// import { Grid } from "@mui/material";
// import { useTheme } from "@mui/material/styles";
// import { Provider } from "react-redux";
// import { store, SESSION_STORAGE_KEY } from "../store";
// import { hydrateSessions } from "../features/session/sessionSlice";
// import { setError } from "../features/chat/chatSlice";
// import { fetchSessionsState } from "../api/chatApi";
// import SessionSidebar from "../components/SessionSidebar";
// import ChatPanel from "../components/ChatPanel";
 
// const AppContent = () => {
//   const theme = useTheme();
 
//   // --- If there is no local session list yet, pull the dummy backend snapshot (added). When `localStorage`
//   // already has chats, we keep them so an older server file cannot wipe a newer browser state.
//   useEffect(() => {
//     let cancelled = false;
//     (async () => {
//       const r = await fetchSessionsState();
//       if (cancelled) return;
//       if (store.getState().session.sessions.length > 0) return;
//       if (!r?.ok) {
//         store.dispatch(setError("Could not load chats from server. Please try again later."));
//         return;
//       }
//       if (!Array.isArray(r.data?.sessions) || r.data.sessions.length === 0) return;
//       store.dispatch(
//         hydrateSessions({
//           sessions: r.data.sessions,
//           activeSessionId: r.data.activeSessionId ?? null,
//         }),
//       );
//       try {
//         localStorage.setItem(
//           SESSION_STORAGE_KEY,
//           JSON.stringify({ sessions: r.data.sessions, activeSessionId: r.data.activeSessionId ?? null }),
//         );
//       } catch {
//         /* ignore */
//       }
//     })();
//     return () => {
//       cancelled = true;
//     };
//   }, []);
 
//   return (
//     <Grid
//       container
//       direction={{ xs: "column", md: "row" }}
//       wrap="nowrap"
//       sx={{
//         height: "100vh",
//         maxHeight: "100dvh",
//         overflow: "hidden",
//         bgcolor: theme.palette.background.default,
//         minWidth: 0,
//       }}
//     >
//       <Grid
//         size={{ xs: 12, md: "auto" }}
//         sx={{
//           flexShrink: 0,
//           minWidth: 0,
//           height: { xs: "auto", md: "100%" },
//           maxHeight: { xs: "min(40vh, 300px)", md: "none" },
//           overflow: { xs: "auto", md: "visible" },
//           display: "flex",
//           borderBottom: { xs: (t) => `1px solid ${t.palette.divider}`, md: "none" },
//         }}
//       >
//         <SessionSidebar />
//       </Grid>
//       <Grid
//         size={{ xs: 12, md: "grow" }}
//         sx={{
//           flex: { xs: "1 1 0%", md: "1 1 0%" },
//           minWidth: 0,
//           minHeight: 0,
//           height: { xs: 0, md: "100%" },
//           display: "flex",
//           flexDirection: "column",
//           overflow: "hidden",
//         }}
//       >
//         <ChatPanel />
//       </Grid>
//     </Grid>
//   );
// };
 
// const Index = () => (
//   // Redux store
//   <Provider store={store}>
//     <AppContent />
//   </Provider>
// );
 
// export default Index;
import React, { useEffect } from "react";
import { Grid } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { Provider, useDispatch } from "react-redux";

// Redux store
import { store } from "../store";

// Redux actions
import { hydrateSessions } from "../features/session/sessionSlice";
import { setError } from "../features/chat/chatSlice";

// API call to fetch initial chat sessions
import { fetchSessionsState } from "../api/chatApi";

// UI components
import SessionSidebar from "../components/SessionSidebar";
import ChatPanel from "../components/ChatPanel";

/**
 * This component contains:
 * - API call (initial data load)
 * - Main layout (Sidebar + Chat)
 */
const AppContent = () => {
  const theme = useTheme(); // Access Material UI theme (colors, background, etc.)
  const dispatch = useDispatch(); // Redux dispatch to update global state

  /**
   * Runs once when component mounts
   * Purpose:
   * - Fetch chat sessions from backend
   * - Store them in Redux
   */
  // useEffect(() => {
  //   let cancelled = false; // Prevent state update if component unmounts

  //   const loadSessions = async () => {
  //     try {
  //       // 🔹 Step 1: Call backend API
  //       const response = await fetchSessionsState();

  //       // If component is unmounted, stop execution
  //       if (cancelled) return;

  //       // 🔹 Step 2: Handle API failure
  //       if (!response?.ok) {
  //         dispatch(setError("Failed to load chats from server."));
  //         return;
  //       }

  //       // 🔹 Step 3: Extract sessions safely
  //       const sessions = response.data?.sessions || [];

  //       /**
  //        * 🔹 Step 4: Store in Redux
  //        * Backend is the "source of truth"
  //        * We always trust backend data
  //        */
  //       dispatch(
  //         hydrateSessions({
  //           sessions,
  //           activeSessionId: response.data?.activeSessionId ?? null,
  //         })
  //       );

  //     } catch (error) {
  //       // 🔹 Step 5: Handle unexpected errors
  //       console.error("Error fetching sessions:", error);
  //       dispatch(setError("Something went wrong while loading chats."));
  //     }
  //   };

  //   // Call the function
  //   loadSessions();

  //   // Cleanup function (runs when component unmounts)
  //   return () => {
  //     cancelled = true;
  //   };
  // }, [dispatch]); // Dependency: dispatch (safe and recommended)
  useEffect(() => {
  let cancelled = false;

  const loadSessions = async () => {
    try {
      const response = await fetchSessionsState();

      if (cancelled) return;

      /**
       * ❌ If API failed → show error
       */
      if (!response?.ok) {
        dispatch(setError("Failed to load chats from server."));
        return;
      }

      /**
       * ✅ Validate backend response properly
       */
      const data = response.data;

      if (!data || !Array.isArray(data.sessions)) {
        console.warn("[INIT] Invalid session data from backend:", data);
        return; // 🚨 DO NOT overwrite Redux with empty data
      }

      /**
       * ✅ Safe hydration
       */
      dispatch(
        hydrateSessions({
          sessions: data.sessions,
          activeSessionId: data.activeSessionId ?? null,
        })
      );

    } catch (error) {
      console.error("Error fetching sessions:", error);
      dispatch(setError("Something went wrong while loading chats."));
    }
  };

  loadSessions();

  return () => {
    cancelled = true;
  };
}, [dispatch]);

  /**
   * 🔹 UI Layout
   * Using Material UI Grid
   * - Left: Sidebar (sessions)
   * - Right: Chat panel
   */
  return (
    <Grid
      container
      direction={{ xs: "column", md: "row" }} // Mobile: column | Desktop: row
      wrap="nowrap"
      sx={{
        height: "100vh",                 // Full viewport height
        maxHeight: "100dvh",             // Better mobile support
        overflow: "hidden",
        bgcolor: theme.palette.background.default, // Theme-based background
        minWidth: 0,
      }}
    >
      {/* 🔹 LEFT SIDE → Session Sidebar */}
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
        <SessionSidebar /> {/* Shows list of chat sessions */}
      </Grid>

      {/* 🔹 RIGHT SIDE → Chat Panel */}
      <Grid
        size={{ xs: 12, md: "grow" }}
        sx={{
          flex: "1 1 0%",
          minWidth: 0,
          minHeight: 0,
          height: { xs: 0, md: "100%" },
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <ChatPanel /> {/* Main chat UI (messages + input) */}
      </Grid>
    </Grid>
  );
};

/**
 * Root component
 * Wraps the app with Redux Provider
 * → Makes global state available everywhere
 */
const Index = () => (
  <Provider store={store}>
    <AppContent />
  </Provider>
);

export default Index;