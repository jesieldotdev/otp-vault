import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'OTP Vault',
        short_name: 'OTP Vault',
        theme_color: '#0b0b12',
        background_color: '#0b0b12',
        display: 'standalone',
        icons: [
          { src: 'icons/icon192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@otp-vault/core': resolve(__dirname, '../../packages/core/src/index.ts'),
    },
    // Resolve all deps from the app root — fixes lucide-react not found
    // when Vite follows the alias into packages/core
    dedupe: ['react', 'react-dom', 'lucide-react'],
  },
  server: {
    fs: {
      // Allow serving files from the monorepo root
      allow: ['../..'],
    },
  },
  build: {
    outDir: 'dist',
    cssCodeSplit: false,
  },
})
