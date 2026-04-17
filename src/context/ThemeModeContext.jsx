 
import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { darkTheme, lightTheme } from "../theme";
 
const STORAGE_KEY = "logic-chat-theme-mode";
 
const ThemeModeContext = createContext({
  mode: "light",
  toggleMode: () => {},
  setMode: () => {},
});
 
export function ThemeModeProvider({ children }) {
  const [mode, setModeState] = useState(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      if (v === "light" || v === "dark") return v;
    } catch {
      /* ignore */
    }
    return "light";
  });
 
  const setMode = useCallback((m) => {
    setModeState(m);
    try {
      localStorage.setItem(STORAGE_KEY, m);
    } catch {
      /* ignore */
    }
  }, []);
 
  const toggleMode = useCallback(() => {
    setMode(mode === "dark" ? "light" : "dark");
  }, [mode, setMode]);
 
  const theme = mode === "dark" ? darkTheme : lightTheme;
 
  const value = useMemo(() => ({ mode, toggleMode, setMode }), [mode, toggleMode, setMode]);
 
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
  return useContext(ThemeModeContext);
}
 
