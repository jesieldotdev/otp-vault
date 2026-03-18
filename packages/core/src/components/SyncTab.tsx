import { useState } from 'react'
import { Upload, Download, AlertTriangle, Cloud, CloudOff, RefreshCw, Loader, CheckCircle, XCircle, Unlink, Eye, EyeOff } from 'lucide-react'
import type { Account, PasswordEntry } from '../types'
import { exportVault, parseVaultJSON } from '../utils/storage'
import type { UseJsonBinSyncReturn } from '../hooks/useJsonBinSync'

interface SyncTabProps {
  accounts: Account[]
  passwords: PasswordEntry[]
  onImportAccounts: (accounts: Omit<Account, 'id'>[]) => number
  onImportPasswords: (passwords: Omit<PasswordEntry, 'id'>[]) => number
  onReplaceAccounts: (accounts: Account[]) => void
  onReplacePasswords: (passwords: PasswordEntry[]) => void
  onToast: (msg: string) => void
  sync: UseJsonBinSyncReturn
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

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 12,
  color: 'var(--text)',
  fontSize: 13,
  padding: '10px 14px',
  outline: 'none',
  fontFamily: 'var(--font-sans)',
  transition: 'border-color .2s, box-shadow .2s',
}

const btn = (active: boolean, gradient?: string): React.CSSProperties => ({
  width: '100%',
  padding: '11px',
  borderRadius: 11,
  border: 'none',
  background: active ? (gradient ?? 'linear-gradient(135deg, #6366f1, #a855f7)') : 'rgba(255,255,255,0.07)',
  color: '#fff',
  fontSize: 13,
  fontWeight: 700,
  cursor: active ? 'pointer' : 'not-allowed',
  opacity: active ? 1 : 0.45,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 7,
  transition: 'opacity .2s',
})

function StatusBadge({ status, errorMsg }: { status: UseJsonBinSyncReturn['status']; errorMsg: string | null }) {
  if (status === 'idle') return null
  const map: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
    syncing:  { icon: <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} />, label: 'Sincronizando…', color: '#a5b4fc' },
    checking: { icon: <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} />, label: 'Verificando…', color: '#a5b4fc' },
    ok:       { icon: <CheckCircle size={12} />, label: 'Sincronizado', color: '#10b981' },
    error:    { icon: <XCircle size={12} />, label: errorMsg ?? 'Erro', color: '#f87171' },
  }
  const s = map[status]
  if (!s) return null
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: s.color, background: s.color + '15', borderRadius: 20, padding: '3px 10px' }}>
      {s.icon} {s.label}
    </span>
  )
}

function VersionBadge({ versionInfo }: { versionInfo: UseJsonBinSyncReturn['versionInfo'] }) {
  if (!versionInfo) return null
  
  const { localVersion, remoteSyncedAt, isOutdated, hasLocalChanges } = versionInfo
  
  if (isOutdated) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: '#f59e0b', background: 'rgba(245,158,11,0.15)', borderRadius: 20, padding: '3px 10px' }}>
        <AlertTriangle size={12} /> Nova versão disponível
      </span>
    )
  }
  
  if (hasLocalChanges) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: '#a5b4fc', background: 'rgba(165,180,252,0.15)', borderRadius: 20, padding: '3px 10px' }}>
        Alterações não sincronizadas
      </span>
    )
  }
  
  if (localVersion && remoteSyncedAt) {
    const date = new Date(remoteSyncedAt)
    return (
      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
        v{localVersion} · {date.toLocaleDateString('pt-BR')} {date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
      </span>
    )
  }
  
  return null
}

export function SyncTab({ accounts, passwords, onImportAccounts, onImportPasswords, onReplaceAccounts, onReplacePasswords, onToast, sync }: SyncTabProps) {
  // ── Local JSON ──
  const [importText, setImportText] = useState('')
  const [importErr, setImportErr] = useState('')

  // ── JSONBin config form ──
  const [apiKeyInput, setApiKeyInput] = useState(sync.config?.apiKey ?? '')
  const [binIdInput, setBinIdInput] = useState(sync.config?.binId ?? '')
  const [showApiKey, setShowApiKey] = useState(false)
  const [configErr, setConfigErr] = useState('')

  // ── Password for push/pull ──
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleExport = () => {
    exportVault(accounts, passwords)
    onToast('✓ Exportado com sucesso!')
  }

  const handleImport = () => {
    setImportErr('')
    try {
      const parsed = parseVaultJSON(importText)
      if (!parsed.accounts.length && !parsed.passwords.length) {
        throw new Error('nenhuma conta ou senha válida encontrada')
      }
      const addedAccounts = parsed.accounts.length > 0 ? onImportAccounts(parsed.accounts) : 0
      const addedPasswords = parsed.passwords.length > 0 ? onImportPasswords(parsed.passwords) : 0
      setImportText('')
      const msgs: string[] = []
      if (addedAccounts > 0) msgs.push(`${addedAccounts} conta(s)`)
      if (addedPasswords > 0) msgs.push(`${addedPasswords} senha(s)`)
      onToast(`✓ Importado: ${msgs.join(' e ') || 'nenhum item novo'}`)
    } catch (e) {
      setImportErr('Erro: ' + (e instanceof Error ? e.message : String(e)))
    }
  }

  const handleConfigure = () => {
    setConfigErr('')
    if (!apiKeyInput.trim()) return setConfigErr('API Key é obrigatória.')
    sync.configure(apiKeyInput.trim(), binIdInput.trim() || null)
    onToast('✓ JSONBin configurado!')
  }

  const handlePush = async () => {
    if (!password) return setConfigErr('Digite a senha mestre para criptografar.')
    setConfigErr('')
    const ok = await sync.push(accounts, passwords, password)
    if (ok) {
      onToast(`✓ Vault enviada (${accounts.length} conta(s), ${passwords.length} senha(s))!`)
    }
  }

  const handlePull = async () => {
    if (!password) return setConfigErr('Digite a senha mestre para descriptografar.')
    setConfigErr('')
    const pulled = await sync.pull(password)
    if (pulled) {
      onReplaceAccounts(pulled.accounts)
      onReplacePasswords(pulled.passwords)
      onToast(`✓ Carregado: ${pulled.accounts.length} conta(s), ${pulled.passwords.length} senha(s)!`)
    }
  }

  const handleCheckVersion = async () => {
    if (!password) return setConfigErr('Digite a senha mestre para verificar.')
    setConfigErr('')
    await sync.checkRemoteVersion(password)
  }

  const isConfigured = !!sync.config?.apiKey
  const hasData = accounts.length > 0 || passwords.length > 0
  const canSync = isConfigured && hasData
  const hasBinId = !!sync.config?.binId

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* ── JSONBin Cloud Sync ── */}
      <div style={{ ...cardStyle, border: isConfigured ? '1px solid rgba(99,102,241,0.35)' : '1px solid var(--border)', background: isConfigured ? 'rgba(99,102,241,0.06)' : 'var(--surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 7 }}>
            {isConfigured ? <Cloud size={16} color="#a5b4fc" /> : <CloudOff size={16} color="rgba(255,255,255,0.35)" />}
            Sync via JSONBin
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <StatusBadge status={sync.status} errorMsg={sync.errorMsg} />
            <VersionBadge versionInfo={sync.versionInfo} />
            {isConfigured && (
              <button
                onClick={() => { sync.disconnect(); setApiKeyInput(''); setBinIdInput('') }}
                title="Desconectar"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', padding: 2 }}
              >
                <Unlink size={14} />
              </button>
            )}
          </div>
        </div>

        {sync.lastSyncedAt && (
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', margin: 0 }}>
            Última sync: {sync.lastSyncedAt.toLocaleTimeString('pt-BR')}
          </p>
        )}

        {/* Config fields */}
        {!isConfigured && (
          <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7, margin: 0 }}>
            Sincronize sua vault criptografada (AES-256) entre dispositivos via <strong style={{ color: 'rgba(255,255,255,0.6)' }}>jsonbin.io</strong>. Crie uma conta gratuita e gere uma Master Key.
          </p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* API Key */}
          <div style={{ position: 'relative' }}>
            <input
              style={{ ...inputStyle, paddingRight: 40, fontFamily: 'var(--font-mono)', fontSize: 12 }}
              type={showApiKey ? 'text' : 'password'}
              placeholder="Master Key  ($2a$10$...)"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              spellCheck={false}
            />
            <button
              onClick={() => setShowApiKey(v => !v)}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', padding: 0 }}
            >
              {showApiKey ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>

          {/* Bin ID */}
          <input
            style={{ ...inputStyle, fontFamily: 'var(--font-mono)', fontSize: 12 }}
            placeholder="Bin ID (opcional — deixe em branco para criar novo)"
            value={binIdInput}
            onChange={(e) => setBinIdInput(e.target.value)}
            spellCheck={false}
          />

          {!isConfigured && (
            <button style={btn(!!apiKeyInput.trim())} onClick={handleConfigure} disabled={!apiKeyInput.trim()}>
              <Cloud size={14} /> Conectar
            </button>
          )}

          {isConfigured && (
            <>
              {/* Senha mestre */}
              <div style={{ position: 'relative' }}>
                <input
                  style={{ ...inputStyle, paddingRight: 40 }}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Senha mestre (para criptografar/descriptografar)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  onClick={() => setShowPassword(v => !v)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', padding: 0 }}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  style={{ ...btn(canSync && !!password, 'linear-gradient(135deg,#6366f1,#a855f7)'), flex: 1 }}
                  onClick={handlePush}
                  disabled={!canSync || !password || sync.status === 'syncing' || sync.status === 'checking'}
                >
                  {sync.status === 'syncing'
                    ? <><Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> Enviando…</>
                    : <><Upload size={14} /> Enviar vault</>
                  }
                </button>
                <button
                  style={{ ...btn(hasBinId && !!password, 'linear-gradient(135deg,#06b6d4,#0891b2)'), flex: 1 }}
                  onClick={handlePull}
                  disabled={!hasBinId || !password || sync.status === 'syncing' || sync.status === 'checking'}
                >
                  {sync.status === 'syncing'
                    ? <><Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> Buscando…</>
                    : <><RefreshCw size={14} /> Buscar vault</>
                  }
                </button>
              </div>

              {/* Botão verificar versão */}
              {hasBinId && (
                <button
                  style={{ ...btn(!!password, 'transparent'), border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.03)' }}
                  onClick={handleCheckVersion}
                  disabled={!password || sync.status === 'syncing' || sync.status === 'checking'}
                >
                  {sync.status === 'checking'
                    ? <><Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> Verificando…</>
                    : <><RefreshCw size={14} /> Verificar atualizações</>
                  }
                </button>
              )}

              {sync.config?.binId && (
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', margin: 0, fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>
                  Bin ID: {sync.config.binId}
                </p>
              )}
            </>
          )}
        </div>

        {configErr && <p style={{ color: '#f87171', fontSize: 12, margin: 0 }}>{configErr}</p>}
        {sync.status === 'error' && sync.errorMsg && (
          <p style={{ color: '#f87171', fontSize: 12, margin: 0 }}>{sync.errorMsg}</p>
        )}
      </div>

      {/* ── Divider ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>ou via arquivo</span>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>

      {/* ── Export JSON ── */}
      <div style={cardStyle}>
        <div style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Upload size={16} style={{ marginBottom: -2 }} /> Exportar vault
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7, margin: 0 }}>
          Baixa um arquivo JSON com todas suas contas e senhas.
        </p>
        <button
          style={btn(hasData, 'linear-gradient(135deg, #10b981, #059669)')}
          onClick={handleExport}
          disabled={!hasData}
        >
          <Upload size={14} />
          {hasData ? `Exportar ${accounts.length} conta(s) + ${passwords.length} senha(s)` : 'Sem dados para exportar'}
        </button>
      </div>

      {/* ── Import JSON ── */}
      <div style={cardStyle}>
        <div style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Download size={16} style={{ marginBottom: -2 }} /> Importar vault
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7, margin: 0 }}>
          Cole o conteúdo do arquivo JSON exportado anteriormente.
        </p>
        <textarea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          rows={4}
          placeholder={'Cole o JSON aqui…\n[{"issuer":"GitHub","label":"user@email.com","secret":"JBSWY3DP..."}]'}
          style={{ ...inputStyle, resize: 'vertical', fontFamily: 'var(--font-mono)', fontSize: 12 }}
        />
        {importErr && <p style={{ color: '#f87171', fontSize: 12, margin: 0 }}>{importErr}</p>}
        <button
          style={btn(importText.trim().length > 0, 'linear-gradient(135deg, #f59e0b, #d97706)')}
          onClick={handleImport}
          disabled={!importText.trim()}
        >
          <Download size={14} /> Importar contas
        </button>
      </div>

      <p style={{ fontSize: 11, color: 'var(--text-dim)', textAlign: 'center', lineHeight: 1.8, margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
        <AlertTriangle size={12} />
        Dados na memória da sessão. Exporte ou sincronize para não perder.
      </p>

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  )
}
