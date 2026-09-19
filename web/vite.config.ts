import tailwindcss from "@tailwindcss/vite";
import { minimal2023Preset } from "@vite-pwa/assets-generator/config";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// Background of the app and of the splash screen while it opens
const BACKGROUND = "#0b0f14";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // A new version activates on the next launch, without asking. Nothing is lost:
      // the workout in progress lives in IndexedDB, not in the page
      registerType: "autoUpdate",
      workbox: {
        runtimeCaching: [
          {
            // Written after the build, so it is not precached with the rest. The latest one
            // when there is signal; the last one seen when there is none, or it is too slow,
            // so the app still opens at the gym
            urlPattern: ({ url }) => url.pathname === "/config.json",
            handler: "NetworkFirst",
            options: { cacheName: "config", networkTimeoutSeconds: 3 },
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
        // Opens without browser bars, like an installed app
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
      },
    }),
  ],
});
