/**
 * Canonical color tokens — documented in /constant_old.txt
 */
export const COLOR_SYSTEM = {
  light: {
    pageBg: "#f2f4f7",
    card: "#ffffff",
    divider: "#D5D9D9",
    primary: "#2563eb",
    userBubbleBg: "rgba(37, 99, 235, 0.07)",
    userBubbleBorder: "rgba(37, 99, 235, 0.2)",
    userAvatar: "#2563eb",
  },
  dark: {
    pageBg: "#141418",
    paper: "#1c1c22",
    divider: "#2d2f38",
    primary: "#818cf8",
    brandOrange: "#fb923c",
    userBubbleBg: "rgba(251, 146, 60, 0.1)",
    userBubbleBorder: "rgba(251, 146, 60, 0.28)",
    userAvatar: "#ea580c",
  },
};
 
export function getUserMessageColors(mode) {
  return mode === "dark" ? COLOR_SYSTEM.dark : COLOR_SYSTEM.light;
}
 