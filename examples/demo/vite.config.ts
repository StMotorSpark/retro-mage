import { defineConfig } from 'vite';

export default defineConfig({
  root: __dirname,
  server: {
    fs: {
      // Allow importing workspace packages (engine-core wasm pkg, render, input dist).
      allow: ['../..'],
    },
  },
});
