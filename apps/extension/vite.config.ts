import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { readFileSync } from 'fs'

const pkg = JSON.parse(readFileSync(resolve(__dirname, '../../packages/core/package.json'), 'utf-8'))
const buildHash = Date.now().toString(36).toUpperCase()

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_HASH__:  JSON.stringify(buildHash),
  },
  plugins: [react()],
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
    emptyOutDir: false,
    cssCodeSplit: false,
    target: 'es2020',
    rollupOptions: {
      input: {
        index:   resolve(__dirname, 'index.html'),
        options: resolve(__dirname, 'options.html'),
      },
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
})
