 
import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import SettingsDrawer from "../components/SettingsDrawer";
 
const SettingsUiContext = createContext({
  settingsOpen: false,
  openSettings: () => {},
  closeSettings: () => {},
  toggleSettings: () => {},
});
 
export function SettingsUiProvider({ children }) {
  const [settingsOpen, setSettingsOpen] = useState(false);
 
  const openSettings = useCallback(() => setSettingsOpen(true), []);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);
  const toggleSettings = useCallback(() => setSettingsOpen((o) => !o), []);
 
  const value = useMemo(
    () => ({ settingsOpen, openSettings, closeSettings, toggleSettings }),
    [settingsOpen, openSettings, closeSettings, toggleSettings],
  );
 
  return (
    <SettingsUiContext.Provider value={value}>
      {children}
      <SettingsDrawer open={settingsOpen} onClose={closeSettings} />
    </SettingsUiContext.Provider>
  );
}
 
export function useSettingsUi() {
  return useContext(SettingsUiContext);
}
 
