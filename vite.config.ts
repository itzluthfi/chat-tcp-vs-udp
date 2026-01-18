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
      
      proxy: {
      
        "/api": {
          target: "http://localhost:3000", // Arahkan ke Backend
          changeOrigin: true,
          secure: false,
        },
        // 2. Proxy untuk WebSocket (Penting untuk project Chat/Realtime)
        "/socket.io": {
          target: "http://localhost:3000",
          ws: true,
          changeOrigin: true,
          secure: false,
        },
        
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
