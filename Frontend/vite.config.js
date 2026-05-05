import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(() => {
  const target = process.env.VITE_PROXY_TARGET || "http://localhost:5000";
  const base = process.env.VITE_BASE_PATH || "/";

  return {
    base,
    plugins: [react()],
    server: {
      proxy: {
        "/api": target,
        "/api-docs": target,
        "/api-docs.json": target,
      },
    },
  };
});
