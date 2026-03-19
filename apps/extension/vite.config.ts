import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { readFileSync, writeFileSync } from 'fs'

const pkg = JSON.parse(readFileSync(resolve(__dirname, '../../packages/core/package.json'), 'utf-8'))
const buildHash = Date.now().toString(36).toUpperCase()

export default defineConfig(({ mode }) => {
  // loadEnv lê o .env da pasta do app corretamente
  const env = loadEnv(mode, __dirname, '')
  const clientId    = env.VITE_GOOGLE_CLIENT_ID ?? ''
  const extensionKey = env.VITE_EXTENSION_KEY ?? ''

  function manifestPlugin() {
    return {
      name: 'generate-manifest',
      writeBundle() {
        const manifest: Record<string, unknown> = {
          manifest_version: 3,
          name: 'OTP Vault',
          version: pkg.version,
          description: 'Autenticador TOTP offline com sincronização via JSONBin e Google Drive',
          icons: { '16': 'icons/icon16.png', '48': 'icons/icon48.png', '128': 'icons/icon128.png' },
          action: {
            default_popup: 'index.html',
            default_icon: { '16': 'icons/icon16.png', '48': 'icons/icon48.png', '128': 'icons/icon128.png' },
            default_title: 'OTP Vault',
          },
          options_ui: { page: 'options.html', open_in_tab: true },
          permissions: ['storage', 'clipboardWrite', 'identity'],
          host_permissions: ['https://api.jsonbin.io/*', 'https://www.googleapis.com/*'],
          content_security_policy: {
            extension_pages: "script-src 'self'; object-src 'self'",
          },
        }

        if (extensionKey) manifest.key = extensionKey
        if (clientId) {
          manifest.oauth2 = {
            client_id: clientId,
            scopes: [
              'https://www.googleapis.com/auth/drive.file',
              'email',
              'profile',
            ],
          }
        }

        writeFileSync(
          resolve(__dirname, 'dist/manifest.json'),
          JSON.stringify(manifest, null, 2),
        )
        console.log(`✓ manifest.json gerado — oauth2: ${clientId ? 'sim' : 'não'}`)
      },
    }
  }

  return {
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
  }
})