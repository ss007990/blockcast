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
        background_color: '#f1f1ec',
        theme_color: '#131417',
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
        // The static landing pages (scripts/landing) are for search engines and
        // link previews; app users never need them offline.
        globIgnores: [
          '**/*-weather/**',
          'fr/**',
          'img/**',
          'fonts/**',
          'landing.css',
          'favicon.svg',
        ],
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
        // only the app's own entry falls back to the shell; every other path
        // (privacy, the landing pages, sitemap) is a real file on the server
        navigateFallbackAllowlist: [/^\/(index\.html)?(\?.*)?$/],
        importScripts: ['push-sw.js'],
      },
    }),
  ],
  server: { port: Number(process.env.PORT) || 5173 },
  // maplibre-gl spawns its worker from a module the dep optimizer does not
  // copy (maplibre-gl-worker.mjs), leaving the map without vector tiles in
  // dev; excluding it makes dev serve the package as-is, like the build.
  optimizeDeps: { exclude: ['maplibre-gl'] },
  build: { sourcemap: true },
});
