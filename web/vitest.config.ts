import { defineConfig } from "vitest/config";

// What is tested is plain TypeScript, so the tests run in Node with none of the app's Vite
// plugins: no service worker, no generated icons, no browser
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
