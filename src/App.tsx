import { useState, useCallback } from 'react'
import { Shield, KeyRound, RefreshCw, Plus, X } from 'lucide-react'
import type { Account, Tab } from './types'
import { AccountCard } from './components/AccountCard'
import { AddForm } from './components/AddForm'
import { SyncTab } from './components/SyncTab'
import { Toast } from './components/Toast'
import { useToast } from './hooks/useToast'

export default function App() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [adding, setAdding] = useState(false)
  const [tab, setTab] = useState<Tab>('codes')
  const [copied, setCopied] = useState<string | null>(null)
  const { message, fire } = useToast()

  const addAccount = useCallback((data: Omit<Account, 'id'>) => {
    setAccounts((prev) => [
      ...prev,
      { ...data, id: crypto.randomUUID() },
    ])
    setAdding(false)
    fire('✓ Conta adicionada!')
  }, [fire])

  const deleteAccount = useCallback((id: string) => {
    setAccounts((prev) => prev.filter((a) => a.id !== id))
  }, [])

  const copyCode = useCallback((id: string, code: string) => {
    navigator.clipboard.writeText(code).catch(() => {})
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }, [])

  const importAccounts = useCallback((incoming: Omit<Account, 'id'>[]): number => {
    const existingSecrets = new Set(accounts.map((a) => a.secret))
    const news = incoming
      .filter((a) => !existingSecrets.has(a.secret))
      .map((a) => ({ ...a, id: crypto.randomUUID() }))
    setAccounts((prev) => [...prev, ...news])
    setTab('codes')
    return news.length
  }, [accounts])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Toast message={message} />

      {/* Header */}
      <header style={{
        width: '100%',
        maxWidth: 520,
        padding: '28px 20px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16,
          }}>
            <Shield size={20} color="#fff" />
          </div>
          <span style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-.01em' }}>
            OTP Vault
          </span>
        </div>

        <button
          onClick={() => setAdding((v) => !v)}
          style={{
            background: adding
              ? 'rgba(99,102,241,.15)'
              : 'linear-gradient(135deg, #6366f1, #a855f7)',
            border: adding ? '1px solid rgba(99,102,241,.4)' : 'none',
            color: '#fff',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 15px',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            letterSpacing: '.01em',
            transition: 'all .2s',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {adding ? <X size={16} style={{ marginRight: 4 }} /> : <Plus size={16} style={{ marginRight: 4 }} />}
          {adding ? 'Cancelar' : 'Adicionar'}
        </button>
      </header>

      {/* Tabs */}
      <nav style={{ width: '100%', maxWidth: 520, padding: '0 20px 16px', display: 'flex', gap: 6 }}>
        {(['codes', 'sync'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              background: tab === t ? 'rgba(99,102,241,.18)' : 'transparent',
              border: `1px solid ${tab === t ? 'rgba(99,102,241,.45)' : 'rgba(255,255,255,.07)'}`,
              color: tab === t ? '#a5b4fc' : 'rgba(255,255,255,.32)',
              borderRadius: 9,
              padding: '6px 14px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all .2s',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {t === 'codes' ? <KeyRound size={14} style={{ marginRight: 4 }} /> : <RefreshCw size={14} style={{ marginRight: 4 }} />}
            {t === 'codes' ? 'Códigos' : 'Sincronizar'}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main style={{
        width: '100%',
        maxWidth: 520,
        padding: '0 16px 48px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        flex: 1,
      }}>
        {adding && (
          <AddForm onAdd={addAccount} onCancel={() => setAdding(false)} />
        )}

        {tab === 'codes' && (
          accounts.length === 0 && !adding ? (
            <div style={{ textAlign: 'center', padding: '64px 20px' }}>
              <div style={{ fontSize: 56, marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
                <Shield size={48} color="#a5b4fc" />
              </div>
              <div style={{
                fontWeight: 700, fontSize: 16,
                color: 'rgba(255,255,255,.35)', marginBottom: 8,
              }}>
                Nenhuma conta ainda
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>
                Clique em "Adicionar" para começar
              </div>
            </div>
          ) : (
            accounts.map((acc) => (
              <AccountCard
                key={acc.id}
                account={acc}
                onDelete={deleteAccount}
                onCopy={copyCode}
                justCopied={copied === acc.id}
              />
            ))
          )
        )}

        {tab === 'sync' && (
          <SyncTab
            accounts={accounts}
            onImport={importAccounts}
            onToast={fire}
          />
        )}
      </main>
    </div>
  )
}
