import { useState, useCallback } from 'react'
import { Shield, KeyRound, RefreshCw, Plus, X, Lock } from 'lucide-react'
import type { Tab, PasswordEntry } from './types'
import { AccountCard } from './components/AccountCard'
import { AddForm } from './components/AddForm'
import { SyncTab } from './components/SyncTab'
import { PasswordTab } from './components/PasswordTab'
import { Toast } from './components/Toast'
import { useToast } from './hooks/useToast'
import { useCloudSync } from './hooks/useCloudSync'
import { useAccounts } from './hooks/useAccounts'
import { usePasswords } from './hooks/usePasswords'
import type { JsonBinProvider } from './cloud/JsonBinProvider'
import type { GoogleDriveProvider } from './cloud/GoogleDriveProvider'

interface AppProps {
  jsonbinProvider?: JsonBinProvider | null
  gdriveProvider?:  GoogleDriveProvider | null
}

export default function App({ jsonbinProvider = null, gdriveProvider = null }: AppProps) {
  const { accounts, loaded, addAccount, deleteAccount, importAccounts, replaceAccounts } = useAccounts()
  const passwords = usePasswords()
  const sync      = useCloudSync(jsonbinProvider, gdriveProvider)

  const [adding, setAdding] = useState(false)
  const [tab,    setTab]    = useState<Tab>('codes')
  const [copied, setCopied] = useState<string | null>(null)
  const { message, fire }   = useToast()

  const handleAdd = useCallback((data: Parameters<typeof addAccount>[0]) => {
    addAccount(data)
    setAdding(false)
    fire('✓ Conta adicionada!')
    sync.markLocalChanges()
  }, [addAccount, fire, sync])

  const handleDelete = useCallback((id: string) => {
    deleteAccount(id)
    sync.markLocalChanges()
  }, [deleteAccount, sync])

  const handleImport = useCallback((incoming: Parameters<typeof importAccounts>[0]): number => {
    const count = importAccounts(incoming)
    if (count > 0) sync.markLocalChanges()
    setTab('codes')
    return count
  }, [importAccounts, sync])

  const handleReplace = useCallback((incoming: Parameters<typeof replaceAccounts>[0]) => {
    replaceAccounts(incoming)
    setTab('codes')
  }, [replaceAccounts])

  const handleImportPasswords = useCallback(async (incoming: Omit<PasswordEntry, 'id'>[], masterPassword?: string): Promise<number> => {
    if (passwords.status !== 'unlocked' && masterPassword) {
      const ok = await passwords.unlock(masterPassword)
      if (!ok) return 0
    }
    if (passwords.status !== 'unlocked') return 0
    const count = passwords.importEntries(incoming)
    if (count > 0) sync.markLocalChanges()
    return count
  }, [passwords, sync])

  const handleReplacePasswords = useCallback(async (incoming: PasswordEntry[], masterPassword: string) => {
    if (passwords.status !== 'unlocked') {
      const ok = await passwords.unlock(masterPassword)
      if (!ok) return
    }
    passwords.replaceEntries(incoming)
  }, [passwords])

  const handleAddPassword = useCallback((data: Parameters<typeof passwords.addEntry>[0]) => {
    passwords.addEntry(data)
    sync.markLocalChanges()
  }, [passwords, sync])

  const handleUpdatePassword = useCallback((id: string, data: Parameters<typeof passwords.updateEntry>[1]) => {
    passwords.updateEntry(id, data)
    sync.markLocalChanges()
  }, [passwords, sync])

  const handleDeletePassword = useCallback((id: string) => {
    passwords.deleteEntry(id)
    sync.markLocalChanges()
  }, [passwords, sync])

  const copyCode = useCallback((id: string, code: string) => {
    navigator.clipboard.writeText(code).catch(() => {})
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }, [])

  if (!loaded) return null

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'codes',     label: 'Códigos',     icon: <KeyRound size={14} /> },
    { id: 'passwords', label: 'Senhas',      icon: <Lock size={14} /> },
    { id: 'sync',      label: 'Sincronizar', icon: <RefreshCw size={14} style={sync.status === 'syncing' ? { animation: 'spin 1s linear infinite' } : {}} /> },
  ]

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Toast message={message} />

      {/* Header */}
      <header style={{ width: '100%', maxWidth: 520, padding: '28px 20px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, #6366f1, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={20} color="#fff" />
          </div>
          <span style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-.01em' }}>OTP Vault</span>
        </div>

        {tab === 'codes' && (
          <button onClick={() => setAdding((v) => !v)} style={{
            background: adding ? 'rgba(99,102,241,.15)' : 'linear-gradient(135deg, #6366f1, #a855f7)',
            border: adding ? '1px solid rgba(99,102,241,.4)' : 'none',
            color: '#fff', borderRadius: 'var(--radius-sm)', padding: '8px 15px',
            fontSize: 13, fontWeight: 700, cursor: 'pointer', letterSpacing: '.01em',
            transition: 'all .2s', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            {adding ? <X size={16} /> : <Plus size={16} />}
            {adding ? 'Cancelar' : 'Adicionar'}
          </button>
        )}
      </header>

      {/* Tabs */}
      <nav style={{ width: '100%', maxWidth: 520, padding: '0 20px 16px', display: 'flex', gap: 6 }}>
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            background: tab === t.id ? 'rgba(99,102,241,.18)' : 'transparent',
            border: `1px solid ${tab === t.id ? 'rgba(99,102,241,.45)' : 'rgba(255,255,255,.07)'}`,
            color: tab === t.id ? '#a5b4fc' : 'rgba(255,255,255,.32)',
            borderRadius: 9, padding: '6px 14px', fontSize: 12, fontWeight: 600,
            cursor: 'pointer', transition: 'all .2s',
            display: 'flex', alignItems: 'center', gap: 6, position: 'relative',
          }}>
            {t.icon}
            {t.label}
            {t.id === 'sync' && sync.activeProvider && (
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: sync.status === 'error' ? '#f43f5e' : '#10b981', flexShrink: 0 }} />
            )}
            {t.id === 'passwords' && passwords.status === 'unlocked' && passwords.entries.length > 0 && (
              <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(99,102,241,0.3)', color: '#a5b4fc', borderRadius: 10, padding: '1px 6px' }}>
                {passwords.entries.length}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main style={{ width: '100%', maxWidth: 520, padding: '0 16px 48px', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>

        {tab === 'codes' && (
          <>
            {adding && <AddForm onAdd={handleAdd} onCancel={() => setAdding(false)} />}
            {accounts.length === 0 && !adding ? (
              <div style={{ textAlign: 'center', padding: '64px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                  <Shield size={48} color="#a5b4fc" />
                </div>
                <div style={{ fontWeight: 700, fontSize: 16, color: 'rgba(255,255,255,.35)', marginBottom: 8 }}>Nenhuma conta ainda</div>
                <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>Clique em "Adicionar" para começar</div>
              </div>
            ) : (
              accounts.map((acc) => (
                <AccountCard key={acc.id} account={acc} onDelete={handleDelete} onCopy={copyCode} justCopied={copied === acc.id} />
              ))
            )}
          </>
        )}

        {tab === 'passwords' && (
          <PasswordTab
            entries={passwords.entries}
            status={passwords.status}
            error={passwords.error}
            onUnlock={passwords.unlock}
            onLock={passwords.lock}
            onAdd={handleAddPassword}
            onUpdate={handleUpdatePassword}
            onDelete={handleDeletePassword}
            onToast={fire}
          />
        )}

        {tab === 'sync' && (
          <SyncTab
            accounts={accounts}
            passwords={passwords.entries}
            onImportAccounts={handleImport}
            onImportPasswords={handleImportPasswords}
            onReplaceAccounts={handleReplace}
            onReplacePasswords={handleReplacePasswords}
            onToast={fire}
            sync={sync}
          />
        )}
      </main>

      <div style={{ width: '100%', maxWidth: 520, padding: '12px 16px 20px', display: 'flex', justifyContent: 'center' }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}>
          OTP Vault v{__APP_VERSION__}
        </span>
      </div>

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  )
}
