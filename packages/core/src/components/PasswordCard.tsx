import { useState } from 'react'
import { Eye, EyeOff, Copy, Check, ExternalLink, Trash2, Pencil, ChevronDown, ChevronUp } from 'lucide-react'
import type { PasswordEntry } from '../types'
import { pickColor } from '../utils/color'

interface Props {
  entry: PasswordEntry
  onDelete: (id: string) => void
  onEdit: (entry: PasswordEntry) => void
  onToast: (msg: string) => void
}

export function PasswordCard({ entry, onDelete, onEdit, onToast }: Props) {
  const [showPw,    setShowPw]    = useState(false)
  const [expanded,  setExpanded]  = useState(false)
  const [copiedPw,  setCopiedPw]  = useState(false)
  const [copiedUser, setCopiedUser] = useState(false)

  const color = pickColor(entry.title)

  const copy = async (text: string, which: 'pw' | 'user') => {
    await navigator.clipboard.writeText(text).catch(() => {})
    if (which === 'pw') { setCopiedPw(true); setTimeout(() => setCopiedPw(false), 2000) }
    else { setCopiedUser(true); setTimeout(() => setCopiedUser(false), 2000) }
    onToast(which === 'pw' ? '🔑 Senha copiada!' : '👤 Login copiado!')
  }

  const masked = '•'.repeat(Math.min(entry.password.length, 14))

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
      {/* Color bar */}
      <div style={{ height: 3, background: color }} />

      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Avatar */}
          <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}22`, border: `1px solid ${color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {entry.url ? (
              <img
                src={`https://www.google.com/s2/favicons?domain=${entry.url}&sz=32`}
                alt=""
                style={{ width: 20, height: 20, borderRadius: 4 }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            ) : (
              <span style={{ fontSize: 15, fontWeight: 700, color }}>{entry.title[0]?.toUpperCase()}</span>
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#eef0f8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.title}</div>
            {entry.username && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.username}</div>}
          </div>

          {/* Quick actions */}
          <div style={{ display: 'flex', gap: 4 }}>
            {entry.username && (
              <button onClick={() => copy(entry.username, 'user')} title="Copiar login" style={iconBtn}>
                {copiedUser ? <Check size={13} color="#34d399" /> : <Copy size={13} />}
              </button>
            )}
            <button onClick={() => copy(entry.password, 'pw')} title="Copiar senha" style={{ ...iconBtn, background: copiedPw ? 'rgba(52,211,153,0.12)' : undefined }}>
              {copiedPw ? <Check size={13} color="#34d399" /> : <Copy size={13} color="#a5b4fc" />}
            </button>
            <button onClick={() => setExpanded(v => !v)} style={iconBtn}>
              {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          </div>
        </div>

        {/* Password row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '7px 10px' }}>
          <span style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: 13, color: showPw ? '#eef0f8' : 'rgba(255,255,255,0.3)', letterSpacing: showPw ? 'normal' : '0.1em', userSelect: showPw ? 'text' : 'none' }}>
            {showPw ? entry.password : masked}
          </span>
          <button onClick={() => setShowPw(v => !v)} style={iconBtn}>
            {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        </div>

        {/* Expanded details */}
        {expanded && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            {entry.url && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', minWidth: 36 }}>URL</span>
                <a href={entry.url} target="_blank" rel="noreferrer"
                  style={{ fontSize: 12, color: '#a5b4fc', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {entry.url.replace(/^https?:\/\//, '')} <ExternalLink size={10} style={{ flexShrink: 0 }} />
                </a>
              </div>
            )}
            {entry.notes && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Notas</span>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>{entry.notes}</p>
              </div>
            )}
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.18)' }}>
              Atualizado em {new Date(entry.updatedAt).toLocaleDateString('pt-BR')}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => onEdit(entry)} style={{ ...actionBtn, color: '#a5b4fc', borderColor: 'rgba(99,102,241,0.3)' }}>
                <Pencil size={12} /> Editar
              </button>
              <button onClick={() => onDelete(entry.id)} style={{ ...actionBtn, color: 'rgba(244,63,94,0.7)', borderColor: 'rgba(244,63,94,0.2)', background: 'rgba(244,63,94,0.06)' }}>
                <Trash2 size={12} /> Excluir
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const iconBtn: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 7, padding: '5px', cursor: 'pointer', color: 'rgba(255,255,255,0.4)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}

const actionBtn: React.CSSProperties = {
  padding: '5px 10px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.03)', fontSize: 12, fontWeight: 600,
  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
}
