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
        background_color: '#f4f0e6',
        theme_color: '#241f16',
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
        // Fonts ship as many unicode-range subsets; cache the few a client
        // actually requests instead of precaching all of them.
        runtimeCaching: [
          {
            urlPattern: /\.woff2$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'fonts',
              expiration: { maxEntries: 12, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api\//],
        importScripts: ['push-sw.js'],
      },
    }),
  ],
  server: { port: Number(process.env.PORT) || 5173 },
  build: { sourcemap: true },
});
