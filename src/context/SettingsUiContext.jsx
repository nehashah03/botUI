 
// import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
// import SettingsDrawer from "../components/SettingsDrawer";
 
// const SettingsUiContext = createContext({
//   settingsOpen: false,
//   openSettings: () => {},
//   closeSettings: () => {},
//   toggleSettings: () => {},
// });
 
// export function SettingsUiProvider({ children }) {
//   const [settingsOpen, setSettingsOpen] = useState(false);
 
//   const openSettings = useCallback(() => setSettingsOpen(true), []);
//   const closeSettings = useCallback(() => setSettingsOpen(false), []);
//   const toggleSettings = useCallback(() => setSettingsOpen((o) => !o), []);
 
//   const value = useMemo(
//     () => ({ settingsOpen, openSettings, closeSettings, toggleSettings }),
//     [settingsOpen, openSettings, closeSettings, toggleSettings],
//   );
 
//   return (
//     <SettingsUiContext.Provider value={value}>
//       {children}
//       <SettingsDrawer open={settingsOpen} onClose={closeSettings} />
//     </SettingsUiContext.Provider>
//   );
// }
 
// export function useSettingsUi() {
//   return useContext(SettingsUiContext);
// }
 
import React, { createContext, useContext, useMemo, useState } from "react";
import SettingsDrawer from "../components/SettingsDrawer";

const SettingsUiContext = createContext(null);

export function SettingsUiProvider({ children }) {
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Simple functions (no need for useCallback unless heavy app)
  const openSettings = () => setSettingsOpen(true);
  const closeSettings = () => setSettingsOpen(false);
  const toggleSettings = () => setSettingsOpen((o) => !o);

  // Only depend on state
  const value = useMemo(() => ({
    settingsOpen,
    openSettings,
    closeSettings,
    toggleSettings
  }), [settingsOpen]);

  return (
    <SettingsUiContext.Provider value={value}>
      {children}
      <SettingsDrawer open={settingsOpen} onClose={closeSettings} />
    </SettingsUiContext.Provider>
  );
}

// Custom hook with safety check
export function useSettingsUi() {
  const context = useContext(SettingsUiContext);
  if (!context) {
    throw new Error("useSettingsUi must be used within SettingsUiProvider");
  }
  return context;
}