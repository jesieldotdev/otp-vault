import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
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
    electron([
      {
        entry: 'electron/main.ts',
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['electron', 'electron-store'],
            },
          },
        },
      },
      {
        entry: 'electron/preload.ts',
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['electron'],
            },
          },
        },
        onstart(options) {
          options.reload()
        },
      },
    ]),
    renderer(),
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
