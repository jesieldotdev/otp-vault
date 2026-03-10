# 🔐 OTP Vault

Autenticador TOTP offline com sincronização via JSONBin, construído com Vite + React + TypeScript.

## Funcionalidades

- ✅ Gera códigos TOTP compatíveis com Google Authenticator, Authy, etc.
- ✅ 100% offline — usa apenas WebCrypto API nativa do browser
- ✅ PWA instalável (funciona como app nativo no celular/desktop)
- ✅ Sincronização na nuvem via JSONBin com criptografia AES-256-GCM
- ✅ Export/Import JSON manual para sincronizar entre dispositivos
- ✅ Suporte a período customizado (30s / 60s) e 6 ou 8 dígitos
- ✅ Zero dependências de runtime além do React

## Como usar

```bash
npm install
npm run dev       # desenvolvimento
npm run build     # produção
npm run preview   # preview do build
```

## Deploy

O build gera uma pasta `dist/` com arquivos estáticos. Pode hospedar em:

- **Vercel**: `vercel --prod`
- **Netlify**: arraste a pasta `dist/`
- **GitHub Pages**: use `gh-pages -d dist`
- **Servidor próprio**: sirva a pasta `dist/` com qualquer servidor HTTP

## Estrutura

```
src/
├── components/
│   ├── AccountCard.tsx     # Card de cada conta com código + anel de tempo
│   ├── AddForm.tsx         # Formulário de adição de conta
│   ├── JsonBinSync.tsx     # UI de configuração e sync com JSONBin
│   ├── Ring.tsx            # SVG de progresso do timer
│   ├── SyncTab.tsx         # Aba de sincronização (JSONBin + arquivo)
│   └── Toast.tsx           # Notificação temporária
├── hooks/
│   ├── useJsonBinSync.ts   # Hook de sync com JSONBin (push/pull/status)
│   ├── useTotp.ts          # Hook que gera e atualiza o código TOTP
│   └── useToast.ts         # Hook para notificações
├── utils/
│   ├── crypto.ts           # Criptografia AES-256-GCM com PBKDF2
│   ├── totp.ts             # Implementação TOTP (RFC 6238)
│   ├── jsonbin.ts          # Wrapper para a API JSONBin v3
│   ├── storage.ts          # Export/import de vault JSON
│   └── color.ts            # Hash de cor por conta
├── types.ts
├── App.tsx
├── main.tsx
└── index.css
```

## Como adicionar uma conta

1. Clique em **+ Adicionar**
2. Preencha o emissor (ex: GitHub) e o label (seu e-mail)
3. No serviço, escolha **"não consigo escanear"** ou **"chave manual"** para ver o segredo Base32
4. Cole o segredo e clique em **Adicionar conta**

## Sincronização via JSONBin (recomendado)

A vault é criptografada com **AES-256-GCM + PBKDF2** antes de sair do dispositivo — nem o JSONBin consegue ler seus tokens.

### Configuração

1. Crie uma conta gratuita em [jsonbin.io](https://jsonbin.io)
2. Vá em **API Keys** e copie sua **Master Key**
3. No app, vá em **Sincronizar → Sync via JSONBin**
4. Cole a API Key (o Bin ID pode ficar vazio — será criado automaticamente no primeiro envio)
5. Clique em **Conectar**

### Uso

- **Enviar** — criptografa e sobe a vault atual para o JSONBin
- **Receber** — baixa e descriptografa a vault do JSONBin, substituindo a local
- A API Key é salva no `localStorage` do dispositivo; os segredos TOTP **nunca** ficam armazenados localmente

### Sincronizar entre dispositivos

1. No dispositivo A: configure o JSONBin e clique em **Enviar**
2. No dispositivo B: configure com a mesma API Key + Bin ID e clique em **Receber**
3. Use a mesma senha mestre nos dois dispositivos

## Sincronização manual (alternativa)

1. Vá em **Sincronizar → Exportar** para baixar um `otp-vault-YYYY-MM-DD.json`
2. No outro dispositivo, vá em **Importar** e cole o conteúdo do arquivo

## Instalar como PWA

**Android (Chrome):** menu ⋮ → Adicionar à tela inicial

**iPhone/iPad (Safari):** botão compartilhar ⎋ → Adicionar à Tela de Início

**Desktop (Chrome/Edge):** ícone de instalar na barra de endereço → Instalar
