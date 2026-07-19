import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  root: import.meta.dirname,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'BlockCast',
        short_name: 'BlockCast',
        description:
          'Plan your sport around the sky — every block of your week scored green, yellow or red from live weather data.',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#f4f6f9',
        theme_color: '#2563eb',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache the built shell; live data must never be cached — a stale
        // forecast is worse than none, so no runtime caching for API hosts.
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api\//],
        importScripts: ['push-sw.js'],
      },
    }),
  ],
  server: { port: 5173, strictPort: true },
  build: { sourcemap: true },
});
