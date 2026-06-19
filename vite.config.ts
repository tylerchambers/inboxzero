import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: "index.html",
    },
  },
  test: {
    environment: "node",
    globals: true,
    css: true,
  },
});
