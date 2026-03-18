import { useState, useEffect } from 'react'
import { Cloud, CloudOff, RefreshCw, Upload, Download, Eye, EyeOff, Unlink, ExternalLink, Check, Shield } from 'lucide-react'
import { useStorage, useToast, pushToBin, pullFromBin, encryptVault, decryptVault, sanitizeBinId } from '@otp-vault/core'
import { Toast } from '@otp-vault/core'
import type { Account, PasswordEntry, JsonBinConfig, VaultPayload } from '@otp-vault/core'

const ACCOUNTS_KEY  = 'otp_vault_accounts'
const PASSWORDS_KEY = 'otp_vault_passwords_enc'
const CONFIG_KEY    = 'otp_vault_jsonbin_config'

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 12, color: '#eef0f8', fontSize: 14, padding: '12px 16px', outline: 'none',
  fontFamily: 'var(--font-mono)', transition: 'border-color .2s', boxSizing: 'border-box',
}

const sectionStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: 18, padding: 28, display: 'flex', flexDirection: 'column', gap: 16,
}

export default function OptionsPage() {
  const storage = useStorage()
  const { message, fire } = useToast()

  const [apiKey, setApiKey]         = useState('')
  const [binId, setBinId]           = useState('')
  const [savedConfig, setSavedConfig] = useState<JsonBinConfig | null>(null)
  const [showKey, setShowKey]       = useState(false)
  const [loadingConfig, setLoadingConfig] = useState(true)
  const [password, setPassword]     = useState('')
  const [showPw, setShowPw]         = useState(false)
  const [syncing, setSyncing]       = useState(false)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'ok' | 'error'>('idle')
  const [syncError, setSyncError]   = useState('')
  const [testing, setTesting]       = useState(false)
  const [testResult, setTestResult] = useState<'idle' | 'ok' | 'error'>('idle')

  useEffect(() => {
    storage.sync.get(CONFIG_KEY).then((raw) => {
      if (raw) {
        try {
          const cfg = JSON.parse(raw) as JsonBinConfig
          if (cfg.binId) cfg.binId = sanitizeBinId(cfg.binId)
          setSavedConfig(cfg)
          setApiKey(cfg.apiKey)
          setBinId(cfg.binId ?? '')
        } catch {}
      }
      setLoadingConfig(false)
    })
  }, [storage])

  const handleSave = async () => {
    if (!apiKey.trim()) return
    const cleanBinId = binId.trim() ? sanitizeBinId(binId.trim()) : null
    const cfg: JsonBinConfig = { apiKey: apiKey.trim(), binId: cleanBinId }
    await storage.sync.set(CONFIG_KEY, JSON.stringify(cfg))
    setSavedConfig(cfg)
    setBinId(cleanBinId ?? '')
    fire('✓ Configuração salva!')
    setTestResult('idle')
  }

  const handleDisconnect = async () => {
    await storage.sync.remove(CONFIG_KEY)
    setSavedConfig(null); setApiKey(''); setBinId(''); setPassword('')
    setSyncStatus('idle'); setTestResult('idle')
    fire('Desconectado.')
  }

  const handleTest = async () => {
    if (!apiKey.trim()) return
    setTesting(true); setTestResult('idle')
    try {
      const cfg: JsonBinConfig = { apiKey: apiKey.trim(), binId: binId.trim() ? sanitizeBinId(binId.trim()) : null }
      if (!cfg.binId) {
        setTestResult(apiKey.startsWith('$2a$') ? 'ok' : 'error')
      } else {
        const res = await pullFromBin(cfg)
        setTestResult(res.ok || res.error?.includes('vault') ? 'ok' : 'error')
      }
    } catch { setTestResult('error') }
    setTesting(false)
  }

  const handlePush = async () => {
    if (!password || !savedConfig) return
    setSyncing(true); setSyncStatus('idle'); setSyncError('')
    try {
      // Carregar contas
      const rawAccounts = await storage.local.get(ACCOUNTS_KEY)
      const accounts: Account[] = rawAccounts ? JSON.parse(rawAccounts) : []
      
      // Carregar senhas (já criptografadas - precisamos descriptografar primeiro)
      let passwords: PasswordEntry[] = []
      const rawPasswords = await storage.local.get(PASSWORDS_KEY)
      if (rawPasswords) {
        try {
          const decryptedPw = await decryptVault(rawPasswords, password)
          if (Array.isArray(decryptedPw)) {
            passwords = decryptedPw as PasswordEntry[]
          }
        } catch {
          // Senha errada para as senhas locais - ignorar ou avisar
        }
      }
      
      // Criar payload combinado
      const payload: VaultPayload = {
        accounts: accounts.map(({ id: _id, ...r }) => r),
        passwords: passwords.map(({ id: _id, ...r }) => r),
      }
      
      const encrypted = await encryptVault(payload, password)
      const result = await pushToBin(savedConfig, encrypted)
      if (!result.ok) throw new Error(result.error)
      if (result.binId && result.binId !== savedConfig.binId) {
        const updated = { ...savedConfig, binId: result.binId }
        await storage.sync.set(CONFIG_KEY, JSON.stringify(updated))
        setSavedConfig(updated); setBinId(result.binId)
      }
      setSyncStatus('ok'); fire(`☁️ Vault enviada (${accounts.length} contas, ${passwords.length} senhas)!`)
    } catch (e) { setSyncError(e instanceof Error ? e.message : 'Erro'); setSyncStatus('error') }
    setSyncing(false)
  }

  const handlePull = async () => {
    if (!password || !savedConfig?.binId) return
    setSyncing(true); setSyncStatus('idle'); setSyncError('')
    try {
      const result = await pullFromBin(savedConfig)
      if (!result.ok || !result.payload) throw new Error(result.error)
      const decrypted = await decryptVault(result.payload, password)
      
      // Compatibilidade: formato antigo (array) vs novo (VaultPayload)
      let rawAccounts: Record<string, unknown>[]
      let rawPasswords: Record<string, unknown>[] = []
      
      if (Array.isArray(decrypted)) {
        // Formato antigo
        rawAccounts = decrypted as Record<string, unknown>[]
      } else if (typeof decrypted === 'object' && decrypted !== null) {
        // Formato novo
        const payload = decrypted as { accounts?: unknown[]; passwords?: unknown[] }
        rawAccounts = (payload.accounts ?? []) as Record<string, unknown>[]
        rawPasswords = (payload.passwords ?? []) as Record<string, unknown>[]
      } else {
        throw new Error('Formato inválido')
      }
      
      // Processar contas
      const accounts = rawAccounts.map((a) => ({
        id: crypto.randomUUID(),
        issuer: String(a.issuer ?? ''), label: String(a.label ?? ''),
        secret: String(a.secret ?? ''), period: Number(a.period ?? 30), digits: Number(a.digits ?? 6),
      }))
      await storage.local.set(ACCOUNTS_KEY, JSON.stringify(accounts))
      
      // Processar senhas (re-criptografar para salvar localmente)
      if (rawPasswords.length > 0) {
        const passwords = rawPasswords.map((p) => ({
          id: crypto.randomUUID(),
          title: String(p.title ?? ''),
          username: String(p.username ?? ''),
          password: String(p.password ?? ''),
          url: String(p.url ?? ''),
          notes: String(p.notes ?? ''),
          createdAt: Number(p.createdAt ?? Date.now()),
          updatedAt: Number(p.updatedAt ?? Date.now()),
        }))
        const encryptedPw = await encryptVault(passwords, password)
        await storage.local.set(PASSWORDS_KEY, encryptedPw)
      }
      
      setSyncStatus('ok'); fire(`☁️ ${accounts.length} conta(s) + ${rawPasswords.length} senha(s) carregadas! Reabra o popup.`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro'
      setSyncError(msg.includes('decrypt') || msg.includes('operation') ? 'Senha incorreta.' : msg)
      setSyncStatus('error')
    }
    setSyncing(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0b0b12', color: '#eef0f8', fontFamily: 'var(--font-sans)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px 60px' }}>
      <Toast message={message} />

      <div style={{ width: '100%', maxWidth: 560, marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{ width: 38, height: 38, borderRadius: 11, background: 'linear-gradient(135deg,#6366f1,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={20} color="#fff" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>OTP Vault</h1>
            <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>Configurações de sincronização</p>
          </div>
        </div>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', lineHeight: 1.7 }}>
          Esta página abre numa aba separada para você copiar a API Key do JSONBin sem fechar o popup.
        </p>
      </div>

      <div style={{ width: '100%', maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Credentials */}
        <div style={sectionStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Cloud size={17} color="#a5b4fc" />
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Credenciais JSONBin</h2>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7 }}>
            Crie conta em{' '}
            <a href="https://jsonbin.io" target="_blank" rel="noreferrer" style={{ color: '#a5b4fc', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              jsonbin.io <ExternalLink size={11} />
            </a>{' '}→ <strong style={{ color: 'rgba(255,255,255,0.55)' }}>API Keys</strong> → copie a <strong style={{ color: 'rgba(255,255,255,0.55)' }}>Master Key</strong>.
          </p>

          <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', display: 'flex', flexDirection: 'column', gap: 6 }}>
            API Key *
            <div style={{ position: 'relative' }}>
              <input style={{ ...inputStyle, paddingRight: 44 }} type={showKey ? 'text' : 'password'} placeholder="$2a$10$..." value={apiKey} onChange={(e) => setApiKey(e.target.value)} autoComplete="off" />
              <button onClick={() => setShowKey(v => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: 0 }}>
                {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </label>

          <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', display: 'flex', flexDirection: 'column', gap: 6 }}>
            Bin ID <span style={{ opacity: 0.5 }}>(vazio = cria automaticamente)</span>
            <input style={inputStyle} type="text" placeholder="64abc123… ou URL completa" value={binId} onChange={(e) => setBinId(e.target.value)} autoComplete="off" />
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>Pode colar o ID puro ou a URL completa.</span>
          </label>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleSave} disabled={!apiKey.trim()} style={{ flex: 2, padding: '12px', borderRadius: 11, border: 'none', background: apiKey.trim() ? 'linear-gradient(135deg,#6366f1,#a855f7)' : 'rgba(255,255,255,0.07)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: apiKey.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Cloud size={15} /> Salvar
            </button>
            <button onClick={handleTest} disabled={!apiKey.trim() || testing} style={{ flex: 1, padding: '12px', borderRadius: 11, border: `1px solid ${testResult === 'ok' ? 'rgba(52,211,153,0.4)' : testResult === 'error' ? 'rgba(248,113,113,0.4)' : 'rgba(255,255,255,0.1)'}`, background: testResult === 'ok' ? 'rgba(52,211,153,0.1)' : testResult === 'error' ? 'rgba(248,113,113,0.1)' : 'rgba(255,255,255,0.05)', color: testResult === 'ok' ? '#34d399' : testResult === 'error' ? '#f87171' : 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              {testing ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : testResult === 'ok' ? <Check size={13} /> : testResult === 'error' ? <CloudOff size={13} /> : <Cloud size={13} />}
              {testing ? '…' : testResult === 'ok' ? 'OK!' : testResult === 'error' ? 'Falhou' : 'Testar'}
            </button>
          </div>

          {savedConfig && (
            <button onClick={handleDisconnect} style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)', color: 'rgba(244,63,94,0.7)', borderRadius: 9, padding: '7px 14px', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, alignSelf: 'flex-start' }}>
              <Unlink size={12} /> Desconectar
            </button>
          )}
        </div>

        {/* Sync */}
        <div style={sectionStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <RefreshCw size={16} color="#a5b4fc" />
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Sincronizar vault</h2>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7 }}>
            Criptografia <strong style={{ color: 'rgba(255,255,255,0.55)' }}>AES-256-GCM</strong> — os tokens nunca saem sem criptografia.
          </p>

          <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', display: 'flex', flexDirection: 'column', gap: 6 }}>
            Senha mestre
            <div style={{ position: 'relative' }}>
              <input style={{ ...inputStyle, paddingRight: 44, fontFamily: 'var(--font-sans)' }} type={showPw ? 'text' : 'password'} placeholder="Senha para criptografia" value={password} onChange={(e) => setPassword(e.target.value)} />
              <button onClick={() => setShowPw(v => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: 0 }}>
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </label>

          {syncStatus === 'error' && <p style={{ color: '#f87171', fontSize: 13, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}><CloudOff size={14} /> {syncError}</p>}
          {syncStatus === 'ok'    && <p style={{ color: '#34d399', fontSize: 13, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}><Check size={14} /> Operação concluída!</p>}

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={handlePush} disabled={!password || !savedConfig || syncing} style={{ flex: 1, padding: '13px', borderRadius: 12, border: 'none', background: password && savedConfig ? 'linear-gradient(135deg,#10b981,#059669)' : 'rgba(255,255,255,0.07)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: password && savedConfig ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, opacity: syncing ? 0.6 : 1 }}>
              {syncing ? <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={15} />} Enviar vault
            </button>
            <button onClick={handlePull} disabled={!password || !savedConfig?.binId || syncing} style={{ flex: 1, padding: '13px', borderRadius: 12, border: 'none', background: password && savedConfig?.binId ? 'linear-gradient(135deg,#6366f1,#a855f7)' : 'rgba(255,255,255,0.07)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: password && savedConfig?.binId ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, opacity: syncing ? 0.6 : 1 }}>
              {syncing ? <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={15} />} Receber vault
            </button>
          </div>
        </div>
      </div>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        :root { --font-sans: 'Sora', system-ui, sans-serif; --font-mono: 'JetBrains Mono', monospace; }
        input:focus { border-color: rgba(99,102,241,.6) !important; box-shadow: 0 0 0 3px rgba(99,102,241,.1) !important; }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </div>
  )
}
