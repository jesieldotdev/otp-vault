import { useState } from 'react'
import { Cloud, HardDrive, Eye, EyeOff, ExternalLink, Check } from 'lucide-react'
import type { UseCloudSyncReturn } from '../hooks/useCloudSync'
import { sanitizeBinId } from '../utils/jsonbin'

interface Props {
  sync: UseCloudSyncReturn
}

const cardStyle: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius)', padding: 20,
  display: 'flex', flexDirection: 'column', gap: 12,
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10, color: '#eef0f8', fontSize: 13, padding: '10px 14px', outline: 'none',
  fontFamily: 'var(--font-mono)', boxSizing: 'border-box', transition: 'border-color .2s',
}

export function SyncProviderPicker({ sync }: Props) {
  const [selected, setSelected] = useState<'jsonbin' | 'gdrive'>('jsonbin')

  // JSONBin form state
  const [apiKey,  setApiKey]  = useState(sync.jsonbin?.getConfig()?.apiKey ?? '')
  const [binId,   setBinId]   = useState(sync.jsonbin?.getConfig()?.binId  ?? '')
  const [showKey, setShowKey] = useState(false)

  // Google state
  const [signingIn, setSigningIn] = useState(false)
  const [googleErr, setGoogleErr] = useState('')

  const handleConnectJsonBin = async () => {
    if (!apiKey.trim()) return
    await sync.configureJsonBin(apiKey.trim(), binId.trim() || null)
  }

  const handleSignInGoogle = async () => {
    setSigningIn(true)
    setGoogleErr('')
    const ok = await sync.signInGoogle()
    if (!ok) setGoogleErr('Login cancelado ou falhou. Tente novamente.')
    setSigningIn(false)
  }

  return (
    <div style={cardStyle}>
      <div style={{ fontWeight: 700, fontSize: 14 }}>Conectar sincronização</div>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0, lineHeight: 1.7 }}>
        Escolha onde guardar sua vault criptografada. Os dados são cifrados com AES-256 antes de sair do dispositivo.
      </p>

      {/* Provider tabs */}
      <div style={{ display: 'flex', gap: 6 }}>
        {(['jsonbin', 'gdrive'] as const).map((p) => (
          <button key={p} onClick={() => setSelected(p)} style={{
            flex: 1, padding: '10px', borderRadius: 10,
            border: `1px solid ${selected === p ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.08)'}`,
            background: selected === p ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
            color: selected === p ? '#a5b4fc' : 'rgba(255,255,255,0.4)',
            cursor: 'pointer', fontSize: 12, fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            {p === 'jsonbin' ? <Cloud size={14} /> : <HardDrive size={14} />}
            {p === 'jsonbin' ? 'JSONBin' : 'Google Drive'}
          </button>
        ))}
      </div>

      {/* JSONBin form */}
      {selected === 'jsonbin' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: 0, lineHeight: 1.6 }}>
            Armazenamento gratuito via{' '}
            <a href="https://jsonbin.io" target="_blank" rel="noreferrer"
              style={{ color: '#a5b4fc', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              jsonbin.io <ExternalLink size={10} />
            </a>. Copie sua <strong style={{ color: 'rgba(255,255,255,0.55)' }}>Master Key</strong>.
          </p>

          <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: 5 }}>
            API Key *
            <div style={{ position: 'relative' }}>
              <input style={{ ...inputStyle, paddingRight: 40 }} type={showKey ? 'text' : 'password'}
                placeholder="$2a$10$..." value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
              <button onClick={() => setShowKey(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', padding: 0 }}>
                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </label>

          <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: 5 }}>
            Bin ID <span style={{ opacity: 0.5 }}>(vazio = cria automaticamente)</span>
            <input style={inputStyle} type="text" placeholder="64abc123… ou URL completa"
              value={binId} onChange={(e) => setBinId(e.target.value)} />
          </label>

          <button onClick={handleConnectJsonBin} disabled={!apiKey.trim()} style={{
            width: '100%', padding: '11px', borderRadius: 10, border: 'none',
            background: apiKey.trim() ? 'linear-gradient(135deg,#6366f1,#a855f7)' : 'rgba(255,255,255,0.07)',
            color: '#fff', fontSize: 13, fontWeight: 700, cursor: apiKey.trim() ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <Cloud size={14} /> Conectar JSONBin
          </button>
        </div>
      )}

      {/* Google Drive form */}
      {selected === 'gdrive' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: 0, lineHeight: 1.6 }}>
            Salva a vault criptografada na sua conta Google Drive em uma pasta chamada <strong style={{ color: 'rgba(255,255,255,0.55)' }}>OTP Vault</strong>. Nenhum dado é lido pelo Google.
          </p>

          {googleErr && (
            <p style={{ fontSize: 12, color: '#f87171', margin: 0 }}>{googleErr}</p>
          )}

          <button onClick={handleSignInGoogle} disabled={signingIn} style={{
            width: '100%', padding: '11px', borderRadius: 10, border: 'none',
            background: 'linear-gradient(135deg,#4285f4,#34a853)',
            color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            opacity: signingIn ? 0.7 : 1,
          }}>
            {/* Google logo */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {signingIn ? 'Aguardando login…' : 'Entrar com Google'}
          </button>
        </div>
      )}
    </div>
  )
}

/** Compact badge showing active provider */
export function ActiveProviderBadge({ sync, onDisconnect }: { sync: UseCloudSyncReturn; onDisconnect: () => void }) {
  const ap = sync.activeProvider
  if (!ap) return null

  const isGdrive   = ap === 'gdrive'
  const email      = isGdrive ? sync.gdrive?.getToken()?.email : undefined
  const binId      = !isGdrive ? sync.jsonbin?.getConfig()?.binId : undefined

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '6px 10px' }}>
      {isGdrive ? <HardDrive size={13} color="#34a853" /> : <Cloud size={13} color="#a5b4fc" />}
      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {isGdrive
          ? (email ?? 'Google Drive')
          : (binId ? `JSONBin ···${binId.slice(-6)}` : 'JSONBin (novo bin)')}
      </span>
      {sync.status === 'ok' && <Check size={11} color="#34d399" />}
    </div>
  )
}
