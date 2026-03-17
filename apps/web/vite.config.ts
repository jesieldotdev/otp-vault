import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { resolve } from 'path'
import { readFileSync } from 'fs'

const pkg = JSON.parse(readFileSync(resolve(__dirname, '../../packages/core/package.json'), 'utf-8'))
const buildHash = Date.now().toString(36).toUpperCase()

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_HASH__:  JSON.stringify(buildHash),
  },
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
    dedupe: ['react', 'react-dom', 'lucide-react'],
  },
  server: {
    fs: { allow: ['../..'] },
  },
  build: {
    outDir: 'dist',
    cssCodeSplit: false,
  },
})
