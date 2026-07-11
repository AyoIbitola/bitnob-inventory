import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

// Backend origin to proxy to in dev (avoids CORS — the backend sends no
// Access-Control-* headers). Overridable via VITE_PROXY_TARGET.
const DEFAULT_BACKEND = "https://bitnob-inventory.onrender.com";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const target = env.VITE_PROXY_TARGET || DEFAULT_BACKEND;

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    server: {
      // In dev the app calls /api/* (same-origin); Vite forwards to the backend
      // server-side, so the browser never makes a cross-origin request.
      proxy: {
        "/api": {
          target,
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/api/, ""),
        },
      },
    },
  };
});
