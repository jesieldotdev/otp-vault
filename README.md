# OTP Vault — Monorepo

Autenticador TOTP com três targets a partir de uma única base de código.

## Estrutura

```
otp-vault/
├── packages/
│   └── core/               # Lógica compartilhada (componentes, hooks, utils)
│       └── src/
│           ├── components/ # AccountCard, AddForm, SyncTab, Toast, Ring
│           ├── hooks/      # useAccounts, useJsonBinSync, useTotp, useToast
│           ├── utils/      # totp, crypto, jsonbin, storage, color
│           ├── storage/    # StorageAdapter interface + StorageContext
│           ├── App.tsx     # App compartilhado
│           └── index.ts    # Barrel exports
│
└── apps/
    ├── web/                # PWA → deploy no Vercel
    │   └── src/
    │       ├── storage.ts  # Adapter: localStorage
    │       └── main.tsx    # <StorageProvider adapter={webStorage}>
    │
    └── extension/          # Chrome Extension
        ├── public/
        │   ├── manifest.json
        │   └── icons/
        └── src/
            ├── storage.ts  # Adapter: chrome.storage.local + sync
            ├── main.tsx    # <StorageProvider adapter={extensionStorage}>
            ├── options.tsx # Entry da página de configurações
            └── OptionsPage.tsx
```

## Como funciona

O `@otp-vault/core` exporta tudo sem saber onde está rodando.
Cada app injeta sua implementação de storage via `<StorageProvider>`:

```tsx
// web/src/main.tsx
<StorageProvider adapter={webStorage}>   {/* localStorage */}
  <App />
</StorageProvider>

// extension/src/main.tsx
<StorageProvider adapter={extensionStorage}>  {/* chrome.storage */}
  <App />
</StorageProvider>
```

O `StorageAdapter` tem dois canais:
- **local** — dados grandes (contas TOTP). Na extensão: `chrome.storage.local` (5MB).
- **sync** — config pequena (API Key JSONBin). Na extensão: `chrome.storage.sync` (sincroniza entre PCs via Google).

## Comandos

```bash
# Instalar tudo
yarn install

# Desenvolvimento
yarn dev:web     # http://localhost:5173 (PWA)
yarn dev:ext     # http://localhost:5174 (extensão em dev mode)

# Build
yarn build:web   # → apps/web/dist/
yarn build:ext   # → apps/extension/dist/
yarn build       # ambos

# Carregar extensão no Chrome
# 1. yarn build:ext
# 2. chrome://extensions → Modo desenvolvedor → Carregar sem compactação → apps/extension/dist/
```

## Deploy web (Vercel)

```bash
# Na raiz do monorepo:
vercel --cwd apps/web
```

Ou configure no Vercel:
- **Root Directory**: `apps/web`
- **Build Command**: `cd ../.. && yarn build:web`
- **Output Directory**: `dist`

## Adicionar nova plataforma

1. Crie `apps/nova-plataforma/src/storage.ts` implementando `StorageAdapter`
2. Crie `apps/nova-plataforma/src/main.tsx` com `<StorageProvider adapter={...}>`
3. Pronto — todo o resto vem do `@otp-vault/core`
