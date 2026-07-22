import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { vitePluginKtx2 } from 'vite-plugin-ktx2';

export default defineConfig({
  root: __dirname,
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
    VitePWA({
      // We register the service worker ourselves in src/main.ts.
      injectRegister: false,
      manifest: false, // manifest.webmanifest is hand-authored in public/
      includeAssets: ['icon-192.png', 'icon-512.png'],
      strategies: 'generateSW',
      workbox: {
        // Precache the built JS/WASM/CSS/HTML app shell and compressed textures, cache-first on repeat loads.
        globPatterns: ['**/*.{js,css,html,wasm,ktx2}'],
      },
    }),
  ],
});
