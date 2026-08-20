import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { vitePluginKtx2 } from 'vite-plugin-ktx2';

// Every production deployment identifies itself with its immutable source revision.
// Local builds remain distinguishable without requiring a GitHub Actions environment.
const buildId = process.env.GITHUB_SHA?.slice(0, 8) ?? `local-${Date.now()}`;

export default defineConfig({
  root: __dirname,
  define: {
    __RETRO_MAGE_BUILD_ID__: JSON.stringify(buildId),
  },
  server: {
    fs: {
      // Allow importing workspace packages (engine-core wasm pkg, render, input dist).
      allow: ['../..'],
    },
  },
  plugins: [
    vitePluginKtx2({
      assetsDir: 'assets/textures',
      include: '**/*.png',
    }),
    // Task 38: Separate plugin instance to cover sprite PNGs in assets/sprites/
    // keeping the logical assets/textures vs assets/sprites directory split.
    vitePluginKtx2({
      assetsDir: 'assets/sprites',
      include: '**/*.png',
    }),
    VitePWA({
      // main.ts owns registration so it can reload exactly once after a newly
      // activated worker takes control.
      injectRegister: false,
      registerType: 'autoUpdate',
      manifest: false, // manifest.webmanifest is hand-authored in public/
      includeAssets: ['icon-192.png', 'icon-512.png'],
      strategies: 'generateSW',
      workbox: {
        // Precache the built JS/WASM/CSS/HTML app shell and compressed textures, cache-first on repeat loads.
        globPatterns: ['**/*.{js,css,html,wasm,ktx2,webmanifest}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
    }),
  ],
});
