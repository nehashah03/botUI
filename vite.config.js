/**
 * Vite config — React (SWC), path alias `@` → `./src`.
 * Optional: proxy `/api` to dummy backend during integration (see README).
 */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { fileURLToPath } from "url";
 
const __dirname = path.dirname(fileURLToPath(import.meta.url));
 
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    // Forwards `/api` and `/ws` to the Python backend (`npm run server` on port 3001). SPA shows errors if it is down.
    proxy: {
      "/api": { target: "http://127.0.0.1:3001", changeOrigin: true },
      "/ws": { target: "http://127.0.0.1:3001", ws: true, changeOrigin: true },
    },
  },
  plugins: [react()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));