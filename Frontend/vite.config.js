import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const target = "http://localhost:5000";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": target,
      "/api-docs": target,
      "/api-docs.json": target,
    },
  },
});
