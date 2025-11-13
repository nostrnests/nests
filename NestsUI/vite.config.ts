import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import tailwindcss from "@tailwindcss/vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        configFile: true,
      },
    }),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "service-worker.ts",
      devOptions: {
        enabled: false,
        type: "module",
      },
      workbox: {
        globPatterns: ["**/*.{js,html,wasm,woff,woff2,ttf,svg,png,jpg,jpeg,webp,ico,json}"],
        sourcemap: true,
      },
    }),
    tailwindcss(),
  ],
  publicDir: "public",
});
