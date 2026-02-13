import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "127.0.0.1",
    port: 8081,
    strictPort: true, // fail if 8081 is in use instead of trying another port
    hmr: {
      host: "127.0.0.1",
      protocol: "ws",
    },
    watch: {
      usePolling: false,
      // Avoid restarts when config/lockfiles are touched (stops "restart failed" from tsconfig corruption)
      ignored: [
        "**/src/components/ui/**",
        "**/node_modules/**",
        "**/tsconfig.json",
        "**/tsconfig.*.json",
        "**/package-lock.json",
        "**/bun.lockb",
      ],
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    include: [
      "firebase/app",
      "firebase/auth",
      "firebase/firestore",
      "react",
      "react-dom",
      "react-router-dom",
      "clsx",
      "tailwind-merge",
    ],
  },
});