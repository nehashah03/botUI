 
// import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
// import { ThemeProvider } from "@mui/material/styles";
// import CssBaseline from "@mui/material/CssBaseline";
// import { darkTheme, lightTheme } from "../theme";
 
// const STORAGE_KEY = "logic-chat-theme-mode";
 
// const ThemeModeContext = createContext({
//   mode: "light",
//   toggleMode: () => {},
//   setMode: () => {},
// });
 
// export function ThemeModeProvider({ children }) {
//   const [mode, setModeState] = useState(() => {
//     try {
//       const v = localStorage.getItem(STORAGE_KEY);
//       if (v === "light" || v === "dark") return v;
//     } catch {
//       /* ignore */
//     }
//     return "light";
//   });
 
//   const setMode = useCallback((m) => {
//     setModeState(m);
//     try {
//       localStorage.setItem(STORAGE_KEY, m);
//     } catch {
//       /* ignore */
//     }
//   }, []);
 
//   const toggleMode = useCallback(() => {
//     setMode(mode === "dark" ? "light" : "dark");
//   }, [mode, setMode]);
 
//   const theme = mode === "dark" ? darkTheme : lightTheme;
 
//   const value = useMemo(() => ({ mode, toggleMode, setMode }), [mode, toggleMode, setMode]);
 
//   return (
//     <ThemeModeContext.Provider value={value}>
//       <ThemeProvider theme={theme}>
//         <CssBaseline />
//         {children}
//       </ThemeProvider>
//     </ThemeModeContext.Provider>
//   );
// }
 
// export function useThemeMode() {
//   return useContext(ThemeModeContext);
// }
 
import React, { createContext, useContext, useMemo, useState } from "react";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { darkTheme, lightTheme } from "../theme";

const STORAGE_KEY = "logic-chat-theme-mode";

const ThemeModeContext = createContext(null);

export function ThemeModeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "light" || saved === "dark") return saved;
    } catch (e) {
      console.warn("Error reading theme from storage", e);
    }
    return "light";
  });

  // Centralized setter (handles storage too)
  const updateMode = (newMode) => {
    setMode(newMode);
    try {
      localStorage.setItem(STORAGE_KEY, newMode);
    } catch (e) {
      console.warn("Error saving theme", e);
    }
  };

  const toggleMode = () => {
    updateMode(mode === "dark" ? "light" : "dark");
  };

  const theme = mode === "dark" ? darkTheme : lightTheme;

  const value = useMemo(() => ({
    mode,
    toggleMode,
    setMode: updateMode
  }), [mode]);

  return (
    <ThemeModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
}

export function useThemeMode() {
  const context = useContext(ThemeModeContext);
  if (!context) {
    throw new Error("useThemeMode must be used within ThemeModeProvider");
  }
  return context;
}