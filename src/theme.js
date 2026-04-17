
/**
 * MUI theme objects (light default + dark) and shared brand tokens for gradients.
 */
import { createTheme } from "@mui/material/styles";
 
/** Accent used for gradients, primary actions (purple → blue). */
export const accentGradient = "linear-gradient(135deg, #a855f7 0%, #7c3aed 35%, #6366f1 70%, #3b82f6 100%)";
export const accentGlow = "0 0 24px rgba(124, 58, 237, 0.35)";
 
/** Warm logo / sidebar accents (optional; sidebar may override with primary blue). */
export const sidebarBrandGradient = "linear-gradient(145deg, #f97316 0%, #ea580c 55%, #c2410c 100%)";
export const sidebarBrandGlow = "0 0 20px rgba(249, 115, 22, 0.35)";
 
const sharedTypography = {
  fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  h6: { fontWeight: 600 },
  subtitle1: { fontWeight: 500 },
  body1: { fontSize: "0.875rem", lineHeight: 1.6 },
  body2: { fontSize: "0.8rem" },
  button: { textTransform: "none", fontWeight: 500 },
};
 
const sharedShape = { borderRadius: 10 };
 
const sharedComponents = {
  MuiButton: {
    styleOverrides: {
      root: { borderRadius: 8, padding: "6px 14px" },
    },
  },
  MuiPaper: {
    styleOverrides: {
      root: { backgroundImage: "none" },
    },
  },
  MuiDialog: {
    styleOverrides: {
      paper: { borderRadius: 12 },
    },
  },
};
 
export const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#818cf8", light: "#a5b4fc", dark: "#6366f1" },
    secondary: { main: "#94a3b8", light: "#cbd5e1", dark: "#64748b" },
    background: { default: "#141418", paper: "#1c1c22" },
    error: { main: "#f87171" },
    warning: { main: "#fbbf24" },
    success: { main: "#4ade80" },
    text: { primary: "#ececf1", secondary: "#9ca3af", disabled: "#6b7280" },
    divider: "#2d2f38",
    action: { hover: "rgba(129, 140, 248, 0.12)", selected: "rgba(99, 102, 241, 0.22)" },
  },
  typography: sharedTypography,
  shape: sharedShape,
  components: {
    ...sharedComponents,
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarColor: "#3f3f46 #18181b",
          "&::-webkit-scrollbar": { width: 8 },
          "&::-webkit-scrollbar-thumb": { background: "#3f3f46", borderRadius: 4 },
        },
      },
    },
  },
});
 
export const lightTheme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#2563eb", light: "#3b82f6", dark: "#1d4ed8" },
    secondary: { main: "#6366f1", light: "#818cf8", dark: "#4f46e5" },
    background: { default: "#f2f4f7", paper: "#ffffff" },
    error: { main: "#dc2626" },
    warning: { main: "#d97706" },
    success: { main: "#16a34a" },
    text: { primary: "#0f172a", secondary: "#64748b", disabled: "#94a3b8" },
    divider: "#D5D9D9",
    action: { hover: "rgba(124, 58, 237, 0.06)", selected: "rgba(124, 58, 237, 0.12)" },
  },
  typography: sharedTypography,
  shape: sharedShape,
  components: {
    ...sharedComponents,
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarColor: "#cbd5e1 #f1f5f9",
          "&::-webkit-scrollbar": { width: 8, height: 8 },
          "&::-webkit-scrollbar-thumb": { background: "#cbd5e1", borderRadius: 4 },
        },
      },
    },
  },
});
 
 
