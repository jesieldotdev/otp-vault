import { useState } from 'react'
import { Cloud, CloudOff, RefreshCw, Upload, Download, Eye, EyeOff, Unlink, ExternalLink } from 'lucide-react'
import type { Account } from '../types'
import { type UseJsonBinSyncReturn } from '../hooks/useJsonBinSync'

interface JsonBinSyncProps {
  sync: UseJsonBinSyncReturn
  accounts: Account[]
  onPullSuccess: (accounts: Account[]) => void
  onToast: (msg: string) => void
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10,
  color: '#eef0f8',
  fontSize: 13,
  padding: '10px 14px',
  outline: 'none',
  fontFamily: 'var(--font-mono)',
  transition: 'border-color .2s, box-shadow .2s',
  boxSizing: 'border-box',
}

const cardStyle: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  padding: 20,
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
}

function StatusBadge({ status, lastSyncedAt }: { status: UseJsonBinSyncReturn['status']; lastSyncedAt: Date | null }) {
  const map = {
    idle: { color: 'rgba(255,255,255,0.3)', bg: 'rgba(255,255,255,0.06)', label: 'Aguardando' },
    syncing: { color: '#60a5fa', bg: 'rgba(96,165,250,0.12)', label: 'Sincronizando…' },
    ok: { color: '#34d399', bg: 'rgba(52,211,153,0.12)', label: lastSyncedAt ? `Sincronizado ${lastSyncedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : 'Sincronizado' },
    error: { color: '#f87171', bg: 'rgba(248,113,113,0.12)', label: 'Erro' },
  }
  const s = map[status]
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
      color: s.color, background: s.bg,
      display: 'inline-flex', alignItems: 'center', gap: 5,
    }}>
      {status === 'syncing' && <RefreshCw size={10} style={{ animation: 'spin 1s linear infinite' }} />}
      {status === 'ok' && <Cloud size={10} />}
      {s.label}
    </span>
  )
}

export function JsonBinSync({ sync, accounts, onPullSuccess, onToast }: JsonBinSyncProps) {
  const { config, status, lastSyncedAt, errorMsg, configure, disconnect, push, pull } = sync

  // Setup form state
  const [apiKey, setApiKey] = useState(config?.apiKey ?? '')
  const [binId, setBinId] = useState(config?.binId ?? '')
  const [showKey, setShowKey] = useState(false)
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [isSetup, setIsSetup] = useState(!config)

  const handleConnect = () => {
    if (!apiKey.trim()) return
    configure(apiKey.trim(), binId.trim() || null)
    setIsSetup(false)
  }

  const handlePush = async () => {
    if (!password) return
    const ok = await push(accounts, password)
    if (ok) {
      onToast('☁️ Vault enviada para o JSONBin!')
      setPassword('')
    }
  }

  const handlePull = async () => {
    if (!password) return
    const pulled = await pull(password)
    if (pulled) {
      onPullSuccess(pulled)
      onToast(`☁️ ${pulled.length} conta(s) carregadas do JSONBin!`)
      setPassword('')
    }
  }

  // Not configured yet
  if (isSetup || !config) {
    return (
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Cloud size={16} color="#a5b4fc" />
          <span style={{ fontWeight: 700, fontSize: 14 }}>Sincronização via JSONBin</span>
        </div>

        <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7, margin: 0 }}>
          Armazene sua vault criptografada na nuvem e acesse de qualquer dispositivo.
          Crie uma conta gratuita em{' '}
          <a href="https://jsonbin.io" target="_blank" rel="noreferrer"
            style={{ color: '#a5b4fc', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            jsonbin.io <ExternalLink size={10} />
          </a>
          {' '}e copie sua <strong style={{ color: 'rgba(255,255,255,0.6)' }}>Master Key</strong>.
        </p>

        <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: 5 }}>
          API Key (Master Key) *
          <div style={{ position: 'relative' }}>
            <input
              style={{ ...inputStyle, paddingRight: 40 }}
              type={showKey ? 'text' : 'password'}
              placeholder="$2a$10$..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <button onClick={() => setShowKey(v => !v)} style={{
              position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', padding: 0,
            }}>
              {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </label>

        <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: 5 }}>
          Bin ID <span style={{ opacity: 0.5 }}>(deixe vazio para criar automaticamente)</span>
          <input
            style={inputStyle}
            type="text"
            placeholder="64abc123def456… ou a URL completa do bin"
            value={binId}
            onChange={(e) => setBinId(e.target.value)}
          />
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', lineHeight: 1.5 }}>
            Pode colar o ID puro <em>ou</em> a URL completa — extraímos o ID automaticamente.
          </span>
        </label>

        <button
          onClick={handleConnect}
          disabled={!apiKey.trim()}
          style={{
            width: '100%', padding: '11px', borderRadius: 10, border: 'none',
            background: apiKey.trim() ? 'linear-gradient(135deg, #6366f1, #a855f7)' : 'rgba(255,255,255,0.07)',
            color: '#fff', fontSize: 13, fontWeight: 700, cursor: apiKey.trim() ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          <Cloud size={14} /> Conectar
        </button>
      </div>
    )
  }

  // Connected view
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Status card */}
      <div style={{ ...cardStyle, gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Cloud size={15} color="#a5b4fc" />
            <span style={{ fontWeight: 700, fontSize: 13 }}>JSONBin conectado</span>
          </div>
          <StatusBadge status={status} lastSyncedAt={lastSyncedAt} />
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '8px 12px',
          display: 'flex', flexDirection: 'column', gap: 4,
        }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Bin ID: <span style={{ fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.6)', wordBreak: 'break-all' }}>
              {config.binId ?? <em style={{ opacity: 0.5 }}>será criado no primeiro push</em>}
            </span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            API Key: <span style={{ fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.4)' }}>
              {config.apiKey.slice(0, 12)}••••••••
            </span>
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 2 }}>
            localStorage: {(() => { try { return localStorage.getItem('otp_vault_jsonbin_config') ? '✓ salvo' : '✗ vazio' } catch { return '✗ indisponível' } })()}
          </div>
        </div>

        <button
          onClick={() => { disconnect(); setIsSetup(true); setApiKey(''); setBinId(''); setPassword(''); }}
          style={{
            background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)',
            color: 'rgba(244,63,94,0.7)', borderRadius: 8, padding: '6px 12px',
            fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, alignSelf: 'flex-start',
          }}
        >
          <Unlink size={12} /> Desconectar
        </button>
      </div>

      {/* Password + actions */}
      <div style={cardStyle}>
        <div style={{ fontWeight: 700, fontSize: 13 }}>Senha mestre</div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>
          Os segredos são criptografados com AES-256-GCM antes de sair do dispositivo.
          Sem a senha correta, ninguém consegue ler seus tokens.
        </p>

        <div style={{ position: 'relative' }}>
          <input
            style={{ ...inputStyle, paddingRight: 40, fontFamily: 'var(--font-sans)' }}
            type={showPw ? 'text' : 'password'}
            placeholder="Senha mestre para criptografia"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handlePush()}
          />
          <button onClick={() => setShowPw(v => !v)} style={{
            position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', padding: 0,
          }}>
            {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>

        {errorMsg && (
          <p style={{ color: '#f87171', fontSize: 12, margin: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
            <CloudOff size={13} /> {errorMsg}
          </p>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handlePush}
            disabled={!password || status === 'syncing' || accounts.length === 0}
            style={{
              flex: 1, padding: '11px', borderRadius: 10, border: 'none',
              background: password && accounts.length ? 'linear-gradient(135deg, #10b981, #059669)' : 'rgba(255,255,255,0.07)',
              color: '#fff', fontSize: 13, fontWeight: 700,
              cursor: password && accounts.length ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              opacity: status === 'syncing' ? 0.6 : 1,
            }}
          >
            {status === 'syncing'
              ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
              : <Upload size={13} />}
            Enviar
          </button>

          <button
            onClick={handlePull}
            disabled={!password || !config.binId || status === 'syncing'}
            style={{
              flex: 1, padding: '11px', borderRadius: 10, border: 'none',
              background: password && config.binId ? 'linear-gradient(135deg, #6366f1, #a855f7)' : 'rgba(255,255,255,0.07)',
              color: '#fff', fontSize: 13, fontWeight: 700,
              cursor: password && config.binId ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              opacity: status === 'syncing' ? 0.6 : 1,
            }}
          >
            {status === 'syncing'
              ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
              : <Download size={13} />}
            Receber
          </button>
        </div>

        <p style={{ fontSize: 11, color: 'var(--text-dim)', margin: 0, lineHeight: 1.7 }}>
          <strong style={{ color: 'rgba(255,255,255,0.4)' }}>Enviar</strong> — cifra e sobe sua vault atual para o JSONBin.<br />
          <strong style={{ color: 'rgba(255,255,255,0.4)' }}>Receber</strong> — baixa e decifra a vault do JSONBin, substituindo a local.
        </p>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
