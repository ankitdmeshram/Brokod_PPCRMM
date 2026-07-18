import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(() => {
  const environment = globalThis.process?.env || {};
  const target = environment.VITE_PROXY_TARGET || "http://localhost:6000";
  const base = environment.VITE_BASE_PATH || "/";
  const allowedHosts = (
    environment.VITE_ALLOWED_HOSTS || "localhost,127.0.0.1,app.brokod.com"
  )
    .split(",")
    .map((host) => host.trim())
    .filter(Boolean);

  return {
    base,
    plugins: [react()],
    server: {
      allowedHosts,
      proxy: {
        "/api": target,
      },
    },
  };
});
