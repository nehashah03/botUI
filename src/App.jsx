import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ThemeModeProvider } from "./context/ThemeModeContext";
import { SettingsUiProvider } from "./context/SettingsUiContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
 
const queryClient = new QueryClient();
 
const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeModeProvider>
      <SettingsUiProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </SettingsUiProvider>
    </ThemeModeProvider>
  </QueryClientProvider>
);
 
export default App;
