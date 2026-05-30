import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

/** GitHub Pages project site: https://cabrera-research-lab.github.io/Teaming/ */
const pagesBase = '/Teaming/';

export default defineConfig({
  base: pagesBase,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'TE∆M',
        short_name: 'TEAM',
        description: 'Build experiences people rave about and refer.',
        theme_color: '#0075ff',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: pagesBase,
        icons: [
          { src: `${pagesBase}favicon.svg`, sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      workbox: {
        navigateFallback: `${pagesBase}index.html`,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api',
              expiration: { maxEntries: 50, maxAgeSeconds: 300 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
});
