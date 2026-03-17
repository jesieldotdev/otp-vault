import { useState } from 'react'
import { Eye, EyeOff, RefreshCw, X, Check } from 'lucide-react'
import type { PasswordEntry } from '../types'
import { generatePassword, passwordStrength } from '../utils/passwordGenerator'

interface Props {
  initial?: PasswordEntry
  onSave: (data: Omit<PasswordEntry, 'id' | 'createdAt' | 'updatedAt'>) => void
  onCancel: () => void
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10, color: '#eef0f8', fontSize: 13, padding: '10px 14px', outline: 'none',
  fontFamily: 'var(--font-sans)', boxSizing: 'border-box', transition: 'border-color .2s',
}

export function PasswordForm({ initial, onSave, onCancel }: Props) {
  const [title,    setTitle]    = useState(initial?.title    ?? '')
  const [username, setUsername] = useState(initial?.username ?? '')
  const [password, setPassword] = useState(initial?.password ?? '')
  const [url,      setUrl]      = useState(initial?.url      ?? '')
  const [notes,    setNotes]    = useState(initial?.notes    ?? '')
  const [showPw,   setShowPw]   = useState(false)
  const [showGen,  setShowGen]  = useState(false)

  // Generator options
  const [genLen,     setGenLen]     = useState(16)
  const [genUpper,   setGenUpper]   = useState(true)
  const [genLower,   setGenLower]   = useState(true)
  const [genDigits,  setGenDigits]  = useState(true)
  const [genSymbols, setGenSymbols] = useState(true)

  const strength = password ? passwordStrength(password) : null

  const handleGenerate = () => {
    const pw = generatePassword({ length: genLen, upper: genUpper, lower: genLower, digits: genDigits, symbols: genSymbols })
    setPassword(pw)
    setShowPw(true)
  }

  const handleSave = () => {
    if (!title.trim() || !password) return
    onSave({ title: title.trim(), username: username.trim(), password, url: url.trim(), notes: notes.trim() })
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>{initial ? 'Editar senha' : 'Nova senha'}</span>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', padding: 4 }}>
          <X size={16} />
        </button>
      </div>

      {/* Title */}
      <input style={inputStyle} placeholder="Título (ex: GitHub)" value={title} onChange={(e) => setTitle(e.target.value)} />

      {/* Username */}
      <input style={inputStyle} placeholder="Login / e-mail" value={username} onChange={(e) => setUsername(e.target.value)} />

      {/* Password */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              style={{ ...inputStyle, paddingRight: 40 }}
              type={showPw ? 'text' : 'password'}
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button onClick={() => setShowPw(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', padding: 0 }}>
              {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <button
            onClick={() => setShowGen(v => !v)}
            title="Gerar senha"
            style={{ padding: '0 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: showGen ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)', color: '#a5b4fc', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <RefreshCw size={14} />
          </button>
        </div>

        {/* Strength bar */}
        {strength && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${(strength.score / 7) * 100}%`, background: strength.color, transition: 'width .3s, background .3s', borderRadius: 2 }} />
            </div>
            <span style={{ fontSize: 11, color: strength.color, minWidth: 36 }}>{strength.label}</span>
          </div>
        )}

        {/* Generator panel */}
        {showGen && (
          <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', flex: 1 }}>Tamanho: <strong style={{ color: '#a5b4fc' }}>{genLen}</strong></span>
              <input type="range" min={8} max={64} value={genLen} onChange={(e) => setGenLen(Number(e.target.value))} style={{ flex: 2, accentColor: '#6366f1' }} />
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {([['A–Z', genUpper, setGenUpper], ['a–z', genLower, setGenLower], ['0–9', genDigits, setGenDigits], ['!@#', genSymbols, setGenSymbols]] as [string, boolean, (v: boolean) => void][]).map(([label, val, setter]) => (
                <button key={label} onClick={() => setter(!val)} style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${val ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.1)'}`, background: val ? 'rgba(99,102,241,0.2)' : 'transparent', color: val ? '#a5b4fc' : 'rgba(255,255,255,0.3)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-mono)' }}>
                  {label}
                </button>
              ))}
            </div>
            <button onClick={handleGenerate} style={{ padding: '8px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#6366f1,#a855f7)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <RefreshCw size={12} /> Gerar senha
            </button>
          </div>
        )}
      </div>

      {/* URL */}
      <input style={inputStyle} placeholder="URL (ex: https://github.com)" value={url} onChange={(e) => setUrl(e.target.value)} />

      {/* Notes */}
      <textarea
        style={{ ...inputStyle, minHeight: 72, resize: 'vertical', lineHeight: 1.6 }}
        placeholder="Notas (opcional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onCancel} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          Cancelar
        </button>
        <button onClick={handleSave} disabled={!title.trim() || !password} style={{ flex: 2, padding: '10px', borderRadius: 10, border: 'none', background: title.trim() && password ? 'linear-gradient(135deg,#6366f1,#a855f7)' : 'rgba(255,255,255,0.07)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: title.trim() && password ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <Check size={14} /> Salvar
        </button>
      </div>
    </div>
  )
}
