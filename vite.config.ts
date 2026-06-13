import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    host: "0.0.0.0", // <-- Ajoutez cette ligne
    proxy: {
      "/api": {
        target: "http://197.159.195.207:5000", // Backend FDP (port 5000)
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
