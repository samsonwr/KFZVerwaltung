import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-192.png'],
      manifest: {
        name: 'KFZ Verwaltung',
        short_name: 'KFZ',
        description: 'Fahrzeug-Serviceverwaltung',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      }
    })
  ],
  server: {
    proxy: {
      '/api': 'http://localhost:5000',
      '/static': 'http://localhost:5000'
    }
  },
  build: {
    outDir: '../backend/static/frontend'
  }
})
