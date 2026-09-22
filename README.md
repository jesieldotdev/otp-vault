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

## Login com Google (sincronização via Google Drive)

O login com Google só serve para autorizar o app a salvar a vault criptografada
no Google Drive — não existe conta/sessão dentro do app em si.

1. Crie um projeto em https://console.cloud.google.com/apis/credentials
2. Configure a "OAuth consent screen" e adicione seu e-mail como usuário de teste
   (enquanto o app estiver em modo "Testing", só esses e-mails conseguem logar)
3. Crie um **OAuth Client ID**:
   - **Web application** (para `apps/web`): adicione a URL do deploy (e
     `http://localhost:5173` para dev) em "Authorized JavaScript origins"
   - **Chrome Extension** (para `apps/extension`): o "Application ID" precisa
     bater com o ID real da extensão. Como o ID muda a cada rebuild se a
     extensão não tiver uma chave fixa, defina `VITE_EXTENSION_KEY` (veja
     `.env.example`) — use a mesma extensão publicada/carregada sempre que
     possível para não invalidar o Client ID
4. Copie o Client ID (mesmo valor pode ser usado nos dois apps) para
   `VITE_GOOGLE_CLIENT_ID` no `.env` de cada app (`apps/web/.env`,
   `apps/extension/.env`) ou nas env vars do Vercel

**Extensão:** o bloco `oauth2` e a permissão `identity` só são adicionados ao
`manifest.json` durante `yarn build:ext`, e apenas se `VITE_GOOGLE_CLIENT_ID`
estiver definido nesse momento (veja `apps/extension/vite.config.ts`). O
`apps/extension/public/manifest.json` (usado em `yarn dev:ext`) não tem esse
bloco — por isso o login com Google não funciona rodando a extensão em modo
dev, apenas com `yarn build:ext` + carregar `apps/extension/dist/`.

Se o login falhar, o erro real (client ID ausente, origem não autorizada,
`chrome.runtime.lastError`, etc.) aparece no console do navegador e também
na mensagem de erro exibida na tela.

## Adicionar nova plataforma

1. Crie `apps/nova-plataforma/src/storage.ts` implementando `StorageAdapter`
2. Crie `apps/nova-plataforma/src/main.tsx` com `<StorageProvider adapter={...}>`
3. Pronto — todo o resto vem do `@otp-vault/core`
