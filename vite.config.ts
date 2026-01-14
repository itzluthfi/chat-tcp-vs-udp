import path from "path";
import { defineConfig, loadEnv } from "vite";
import basicSsl from "@vitejs/plugin-basic-ssl";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");

  return {
    server: {
      port: 5173,
      strictPort: true,
      host: true,
      // --- KONFIGURASI PROXY DI SINI ---
      proxy: {
        // 1. Proxy untuk API (HTTP Request)
        "/api": {
          target: "http://localhost:3000", // Arahkan ke Backend
          changeOrigin: true,
          secure: false, // Abaikan validasi SSL karena backend HTTP
        },
        // 2. Proxy untuk WebSocket (Penting untuk project Chat/Realtime)
        "/socket.io": {
          target: "http://localhost:3000",
          ws: true, // Aktifkan dukungan WebSocket
          changeOrigin: true,
          secure: false,
        },
        // Jika kamu tidak pakai socket.io tapi pakai raw WebSocket,
        // sesuaikan path-nya (misal '/ws')
      },
      // ---------------------------------
    },
    plugins: [react(), basicSsl()],
    define: {
      "process.env.API_KEY": JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
