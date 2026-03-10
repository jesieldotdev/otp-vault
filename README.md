# 🔐 OTP Vault

Autenticador TOTP offline, construído com Vite + React + TypeScript.

## Funcionalidades

- ✅ Gera códigos TOTP compatíveis com Google Authenticator, Authy, etc.
- ✅ 100% offline — usa apenas WebCrypto API nativa do browser
- ✅ PWA instalável (funciona como app nativo no celular/desktop)
- ✅ Export/Import JSON para sincronizar entre dispositivos
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
│   ├── AccountCard.tsx   # Card de cada conta com código + anel
│   ├── AddForm.tsx       # Formulário de adição de conta
│   ├── Ring.tsx          # SVG de progresso do timer
│   ├── SyncTab.tsx       # Aba de exportar/importar
│   └── Toast.tsx         # Notificação temporária
├── hooks/
│   ├── useTotp.ts        # Hook que gera e atualiza o código TOTP
│   └── useToast.ts       # Hook para notificações
├── utils/
│   ├── totp.ts           # Implementação TOTP (RFC 6238)
│   ├── storage.ts        # Export/import de vault JSON
│   └── color.ts          # Hash de cor por conta
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

## Sincronizar entre dispositivos

1. Vá na aba **🔄 Sincronizar → Exportar**
2. Salve o arquivo `otp-vault-YYYY-MM-DD.json`
3. No outro dispositivo, cole o conteúdo em **Importar**
