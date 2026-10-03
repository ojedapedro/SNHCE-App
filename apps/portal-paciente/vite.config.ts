import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt', // Pide confirmación antes de actualizar
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'SNHCE — Portal del Paciente',
        short_name: 'SNHCE',
        description: 'Portal de citas e historia clínica del Sistema Nacional de Salud de Venezuela',
        theme_color: '#1d4ed8',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'any',
        lang: 'es-VE',
        start_url: '/',
        icons: [
          {
            src: 'icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        categories: ['health', 'medical', 'government'],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Estrategia de caché para llamadas a la API
        runtimeCaching: [
          {
            // Citas próximas — cache first, actualiza en background
            urlPattern: /\/api\/v1\/citas\/mis-citas/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-citas',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24, // 24 horas
              },
            },
          },
          {
            // Datos del paciente — network first con fallback
            urlPattern: /\/api\/v1\/pacientes\/me/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-paciente',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60, // 1 hora
              },
              networkTimeoutSeconds: 5,
            },
          },
          {
            // Catálogos (establecimientos, especialidades) — cache largo
            urlPattern: /\/api\/v1\/(establecimientos|especialidades|catalogos)/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'api-catalogos',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 días
              },
            },
          },
        ],
        // NO cachear endpoints de escritura ni datos clínicos
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/],
      },
      devOptions: {
        enabled: true, // Habilitar PWA en desarrollo para pruebas
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          query: ['@tanstack/react-query'],
          i18n: ['i18next', 'react-i18next'],
        },
      },
    },
  },
});
