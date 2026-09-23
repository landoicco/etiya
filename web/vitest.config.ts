import { defineConfig } from "vitest/config";

// What is tested is plain TypeScript, so the tests run in Node with none of the app's Vite
// plugins: no service worker, no generated icons, no browser
export default defineConfig({
  // This config does not inherit the app's, so "@/" is declared here too. It has to agree
  // with vite.config.ts and with the paths in tsconfig.json, or tests resolve what the app
  // does not
  resolve: {
    alias: { "@": "/src" },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
