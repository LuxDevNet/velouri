import { fileURLToPath, URL } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// envDir points at the repo root so the existing top-level .env / .env.example
// (owned outside sites/www) supplies VITE_* values without duplicating them
// inside this package.
export default defineConfig({
  plugins: [react()],
  envDir: fileURLToPath(new URL("../../", import.meta.url)),
  server: {
    port: 5173,
  },
  build: {
    outDir: "dist",
  },
});
