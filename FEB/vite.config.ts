import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    strictPort: true,
    host: "0.0.0.0", // <-- Ajoutez cette ligne
    proxy: {
      "/api": {
        target: "http://197.159.195.207:5001", // Backend FEB (port 5001)
        changeOrigin: true,
        secure: false,
      },
    },
  },
  optimizeDeps: {
    exclude: ["lucide-react"],
  },
});

