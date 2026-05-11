import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(() => {
  const target = process.env.VITE_PROXY_TARGET || "http://localhost:5000";
  const base = process.env.VITE_BASE_PATH || "/";
  const allowedHosts = (
    process.env.VITE_ALLOWED_HOSTS || "localhost,127.0.0.1,app.brokod.com"
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
        "/api-docs": target,
        "/api-docs.json": target,
      },
    },
  };
});
