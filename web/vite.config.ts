import tailwindcss from "@tailwindcss/vite";
import { minimal2023Preset } from "@vite-pwa/assets-generator/config";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type Plugin } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import pkg from "./package.json" with { type: "json" };

// Background of the app and of the splash screen while it opens. Must match the light
// --color-surface in index.css; the manifest takes one colour, so the splash is always light
const BACKGROUND = "#f6efe4";

// npm run dev serves /art/ from ART_DIR. The pictures never pass through public/,
// so no build can carry them into a deploy
function localArt(artDir: string): Plugin {
  return {
    name: "local-art",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use((req: { url?: string }, _res: unknown, next: () => void) => {
        if (req.url?.startsWith("/art/")) req.url = `/@fs${artDir}${req.url.slice(4)}`;
        next();
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const artDir = loadEnv(mode, ".", "ART_").ART_DIR?.replace(/\/$/, "");
  return {
    // "@/" is src. Declared here for the bundler, in tsconfig.json for the type checker and
    // in vitest.config.ts for the tests: all three have to say the same thing
    resolve: {
      alias: { "@": "/src" },
    },
    server: artDir ? { fs: { allow: [".", artDir] } } : {},
    // Shown in About; package.json is the one place the web version is written
    define: {
      APP_VERSION: JSON.stringify(pkg.version),
    },
    plugins: [
      react(),
      tailwindcss(),
      artDir ? localArt(artDir) : null,
      VitePWA({
        // A new version activates on the next launch, without asking. Nothing is lost:
        // the workout in progress lives in IndexedDB, not in the page
        registerType: "autoUpdate",
        workbox: {
          // Only the Latin font file: the other scripts download on demand and never appear in the UI
          globPatterns: ["**/*.{js,css,html}", "**/inter-latin-wght-normal-*.woff2"],
          runtimeCaching: [
            {
              // Written after the build, so it is not precached with the rest. The latest one
              // when there is signal; the last one seen when there is none, or it is too slow,
              // so the app still opens at the gym
              urlPattern: ({ url }) => url.pathname === "/config.json",
              handler: "NetworkFirst",
              options: { cacheName: "config", networkTimeoutSeconds: 3 },
            },
            {
              // Uploaded apart from the build. The copy at hand at once, a fresh one for next
              // time, so the pictures work offline and a redrawn one still arrives
              urlPattern: ({ url }) => url.pathname.startsWith("/art/"),
              handler: "StaleWhileRevalidate",
              options: { cacheName: "art" },
            },
          ],
        },
        // Every icon size, plus the matching <link> tags, is generated from this one SVG
        pwaAssets: {
          image: "public/icon.svg",
          // The SVG already keeps the barbell inside the safe zone that maskable icons crop to,
          // so the generator's own padding (white by default) would only shrink it
          preset: {
            ...minimal2023Preset,
            maskable: { ...minimal2023Preset.maskable, padding: 0 },
            apple: { ...minimal2023Preset.apple, padding: 0 },
          },
          overrideManifestIcons: true,
        },
        manifest: {
          name: "Etiya",
          short_name: "Etiya",
          description: "Log your workouts, one set at a time",
          lang: "en",
          theme_color: BACKGROUND,
          background_color: BACKGROUND,
          display: "standalone",
          orientation: "portrait",
          start_url: "/",
        },
      }),
    ],
  };
});
