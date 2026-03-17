import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { readFileSync, writeFileSync } from 'fs'

const pkg = JSON.parse(readFileSync(resolve(__dirname, '../../packages/core/package.json'), 'utf-8'))
const buildHash = Date.now().toString(36).toUpperCase()

// Plugin que gera o manifest.json com a versão atual
function manifestPlugin() {
  return {
    name: 'generate-manifest',
    writeBundle() {
      const manifest = {
        manifest_version: 3,
        name: 'OTP Vault',
        version: pkg.version,
        description: 'Autenticador TOTP offline com sincronização via JSONBin',
        icons: { '16': 'icons/icon16.png', '48': 'icons/icon48.png', '128': 'icons/icon128.png' },
        action: {
          default_popup: 'index.html',
          default_icon: { '16': 'icons/icon16.png', '48': 'icons/icon48.png', '128': 'icons/icon128.png' },
          default_title: 'OTP Vault',
        },
        options_ui: { page: 'options.html', open_in_tab: true },
        permissions: ['storage', 'clipboardWrite'],
        host_permissions: ['https://api.jsonbin.io/*'],
        content_security_policy: {
          extension_pages: "script-src 'self'; object-src 'self'",
        },
      }
      writeFileSync(
        resolve(__dirname, 'dist/manifest.json'),
        JSON.stringify(manifest, null, 2),
      )
    },
  }
}

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_HASH__:  JSON.stringify(buildHash),
  },
  plugins: [react(), manifestPlugin()],
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