import { useState } from 'react'
import { Lock, Unlock, Eye, EyeOff, Plus, Search, KeyRound } from 'lucide-react'
import type { PasswordEntry } from '../types'
import { PasswordCard } from './PasswordCard'
import { PasswordForm } from './PasswordForm'
import { type PasswordVaultStatus } from '../hooks/usePasswords'

interface Props {
  entries: PasswordEntry[]
  status: PasswordVaultStatus
  error: string | null
  onUnlock: (password: string) => Promise<boolean>
  onLock: () => void
  onAdd: (data: Omit<PasswordEntry, 'id' | 'createdAt' | 'updatedAt'>) => void
  onUpdate: (id: string, data: Partial<Omit<PasswordEntry, 'id' | 'createdAt'>>) => void
  onDelete: (id: string) => void
  onToast: (msg: string) => void
}

export function PasswordTab({ entries, status, error, onUnlock, onLock, onAdd, onUpdate, onDelete, onToast }: Props) {
  const [unlockPw, setUnlockPw]   = useState('')
  const [showUnlockPw, setShowUnlockPw] = useState(false)
  const [unlocking, setUnlocking] = useState(false)
  const [adding, setAdding]       = useState(false)
  const [editing, setEditing]     = useState<PasswordEntry | null>(null)
  const [search, setSearch]       = useState('')

  const handleUnlock = async () => {
    if (!unlockPw) return
    setUnlocking(true)
    const ok = await onUnlock(unlockPw)
    if (ok) setUnlockPw('')
    setUnlocking(false)
  }

  const handleAdd = (data: Omit<PasswordEntry, 'id' | 'createdAt' | 'updatedAt'>) => {
    onAdd(data)
    setAdding(false)
    onToast('🔑 Senha salva!')
  }

  const handleUpdate = (data: Omit<PasswordEntry, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!editing) return
    onUpdate(editing.id, { ...data, updatedAt: Date.now() })
    setEditing(null)
    onToast('✓ Senha atualizada!')
  }

  const filtered = entries.filter((e) => {
    const q = search.toLowerCase()
    return e.title.toLowerCase().includes(q) || e.username.toLowerCase().includes(q) || e.url.toLowerCase().includes(q)
  })

  // Loading
  if (status === 'loading') {
    return (
      <div style={{ textAlign: 'center', padding: '64px 20px', color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>
        Carregando…
      </div>
    )
  }

  // Locked
  if (status === 'locked') {
    return (
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 24, display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
        <div style={{ width: 52, height: 52, borderRadius: 16, background: 'linear-gradient(135deg,#6366f1,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Lock size={24} color="#fff" />
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Senhas bloqueadas</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
            Use a mesma senha mestre do JSONBin para desbloquear.
          </div>
        </div>

        <div style={{ width: '100%', position: 'relative' }}>
          <input
            style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${error ? 'rgba(248,113,113,0.5)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 10, color: '#eef0f8', fontSize: 13, padding: '11px 44px 11px 14px', outline: 'none', boxSizing: 'border-box', fontFamily: 'var(--font-sans)' }}
            type={showUnlockPw ? 'text' : 'password'}
            placeholder="Senha mestre"
            value={unlockPw}
            onChange={(e) => setUnlockPw(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
            autoFocus
          />
          <button onClick={() => setShowUnlockPw(v => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', padding: 0 }}>
            {showUnlockPw ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>

        {error && <p style={{ color: '#f87171', fontSize: 12, margin: 0 }}>{error}</p>}

        <button onClick={handleUnlock} disabled={!unlockPw || unlocking} style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: unlockPw ? 'linear-gradient(135deg,#6366f1,#a855f7)' : 'rgba(255,255,255,0.07)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: unlockPw ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
          <Unlock size={14} /> {unlocking ? 'Desbloqueando…' : 'Desbloquear'}
        </button>
      </div>
    )
  }

  // Unlocked
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.25)', pointerEvents: 'none' }} />
          <input
            style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 9, color: '#eef0f8', fontSize: 13, padding: '8px 12px 8px 32px', outline: 'none', boxSizing: 'border-box' }}
            placeholder="Buscar…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button onClick={onLock} title="Bloquear" style={{ padding: '0 12px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <Lock size={14} />
        </button>
        <button onClick={() => { setAdding(true); setEditing(null) }} style={{ padding: '0 14px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg,#6366f1,#a855f7)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
          <Plus size={13} /> Nova
        </button>
      </div>

      {/* Add / Edit form */}
      {adding && <PasswordForm onSave={handleAdd} onCancel={() => setAdding(false)} />}
      {editing && <PasswordForm initial={editing} onSave={handleUpdate} onCancel={() => setEditing(null)} />}

      {/* List */}
      {filtered.length === 0 && !adding ? (
        <div style={{ textAlign: 'center', padding: '48px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
            <KeyRound size={40} color="#a5b4fc" />
          </div>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'rgba(255,255,255,.35)', marginBottom: 6 }}>
            {search ? 'Nenhum resultado' : 'Nenhuma senha ainda'}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,.18)' }}>
            {search ? 'Tente outro termo.' : 'Clique em "Nova" para adicionar.'}
          </div>
        </div>
      ) : (
        filtered.map((entry) => (
          <PasswordCard
            key={entry.id}
            entry={entry}
            onDelete={(id) => { onDelete(id); onToast('Senha removida.') }}
            onEdit={(e) => { setEditing(e); setAdding(false) }}
            onToast={onToast}
          />
        ))
      )}
    </div>
  )
}
