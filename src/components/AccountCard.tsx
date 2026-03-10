import { useState } from 'react'
import { Check, Copy, X } from 'lucide-react'
import type { Account } from '../types'
import { useTotp } from '../hooks/useTotp'
import { pickColor } from '../utils/color'
import { Ring } from './Ring'

interface AccountCardProps {
  account: Account
  onDelete: (id: string) => void
  onCopy: (id: string, code: string) => void
  justCopied: boolean
}

export function AccountCard({ account, onDelete, onCopy, justCopied }: AccountCardProps) {
  const { code, rem } = useTotp(account.secret, account.period, account.digits)
  const color = pickColor(account.issuer + account.label)
  const initial = (account.issuer || account.label || '?')[0].toUpperCase()
  const [hovered, setHovered] = useState(false)

  return (
    <article
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '16px 18px',
        background: hovered ? 'var(--surface-hover)' : 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        transition: 'background 0.2s',
      }}
    >
      {/* Avatar */}
      <div
        aria-hidden
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          flexShrink: 0,
          background: color + '20',
          border: `1.5px solid ${color}50`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 800,
          fontSize: 17,
          color,
          fontFamily: 'var(--font-sans)',
        }}
      >
        {initial}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 10,
          letterSpacing: '.1em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          marginBottom: 2,
        }}>
          {account.issuer || '—'}
        </div>
        <div style={{
          fontSize: 11,
          color: 'rgba(255,255,255,0.45)',
          marginBottom: 5,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {account.label}
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontWeight: 700,
          fontSize: 26,
          letterSpacing: '.12em',
          color: 'var(--text)',
          userSelect: 'all',
        }}>
          {code.slice(0, 3)}
          <span style={{ opacity: .22, margin: '0 3px' }}>·</span>
          {code.slice(3)}
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <Ring rem={rem} period={account.period} color={color} />
        <div style={{ display: 'flex', gap: 5 }}>
          <IconButton
            title="Copiar código"
            onClick={() => onCopy(account.id, code)}
            style={{
              background: justCopied ? color + '25' : 'rgba(255,255,255,0.05)',
              borderColor: justCopied ? color + '60' : 'rgba(255,255,255,0.1)',
              color: justCopied ? color : 'rgba(255,255,255,0.45)',
            }}
          >
            {justCopied ? <Check size={16} /> : <Copy size={16} />}
          </IconButton>
          <IconButton
            title="Remover conta"
            onClick={() => onDelete(account.id)}
            style={{
              background: 'rgba(244,63,94,0.08)',
              borderColor: 'rgba(244,63,94,0.2)',
              color: 'rgba(244,63,94,0.6)',
            }}
            hoverColor="var(--danger)"
          >
            <X size={16} />
          </IconButton>
        </div>
      </div>
    </article>
  )
}

interface IconButtonProps {
  onClick: () => void
  title: string
  style: React.CSSProperties
  hoverColor?: string
  children: React.ReactNode
}

function IconButton({ onClick, title, style, hoverColor, children }: IconButtonProps) {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 8,
        padding: '5px 9px',
        fontSize: 14,
        cursor: 'pointer',
        border: '1px solid',
        transition: 'all .15s',
        color: hovered && hoverColor ? hoverColor : style.color,
        background: style.background,
        borderColor: style.borderColor,
      }}
    >
      {children}
    </button>
  )
}
