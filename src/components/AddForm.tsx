import { useState } from 'react'
import { isValidBase32 } from '../utils/totp'
import type { Account } from '../types'

interface AddFormProps {
  onAdd: (account: Omit<Account, 'id'>) => void
  onCancel: () => void
}

interface FormState {
  issuer: string
  label: string
  secret: string
  period: string
  digits: string
}

const INITIAL: FormState = { issuer: '', label: '', secret: '', period: '30', digits: '6' }

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 12,
  color: 'var(--text)',
  fontSize: 14,
  padding: '11px 15px',
  outline: 'none',
  transition: 'border-color .2s, box-shadow .2s',
}

export function AddForm({ onAdd, onCancel }: AddFormProps) {
  const [form, setForm] = useState<FormState>(INITIAL)
  const [error, setError] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = () => {
    setError('')
    if (!form.label.trim()) return setError('Label é obrigatório.')
    if (!isValidBase32(form.secret))
      return setError('Segredo Base32 inválido. Use apenas A–Z e 2–7, mínimo 8 caracteres.')

    onAdd({
      issuer: form.issuer.trim(),
      label: form.label.trim(),
      secret: form.secret.replace(/\s/g, '').toUpperCase(),
      period: Number(form.period) || 30,
      digits: Number(form.digits) || 6,
    })
  }

  return (
    <div
      style={{
        background: 'rgba(99,102,241,0.07)',
        border: '1px solid rgba(99,102,241,0.22)',
        borderRadius: 'var(--radius)',
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 14 }}>Nova conta TOTP</div>

      <input
        style={inputStyle}
        placeholder="Emissor (ex: GitHub, Google…)"
        value={form.issuer}
        onChange={set('issuer')}
        autoFocus
      />
      <input
        style={inputStyle}
        placeholder="Label / E-mail *"
        value={form.label}
        onChange={set('label')}
      />
      <input
        style={{ ...inputStyle, fontFamily: 'var(--font-mono)', fontSize: 13 }}
        placeholder="Segredo Base32 *  (ex: JBSWY3DPEHPK3PXP)"
        value={form.secret}
        onChange={set('secret')}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="characters"
      />

      {/* Advanced toggle */}
      <button
        onClick={() => setShowAdvanced((v) => !v)}
        style={{
          background: 'none',
          border: 'none',
          color: 'rgba(255,255,255,0.35)',
          fontSize: 12,
          cursor: 'pointer',
          textAlign: 'left',
          padding: '2px 0',
        }}
      >
        {showAdvanced ? '▾' : '▸'} Opções avançadas
      </button>

      {showAdvanced && (
        <div style={{ display: 'flex', gap: 10 }}>
          <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--text-muted)' }}>
            Período (s)
            <select
              style={{ ...inputStyle, fontSize: 13 }}
              value={form.period}
              onChange={set('period')}
            >
              <option value="30">30s (padrão)</option>
              <option value="60">60s</option>
            </select>
          </label>
          <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--text-muted)' }}>
            Dígitos
            <select
              style={{ ...inputStyle, fontSize: 13 }}
              value={form.digits}
              onChange={set('digits')}
            >
              <option value="6">6 (padrão)</option>
              <option value="8">8</option>
            </select>
          </label>
        </div>
      )}

      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', lineHeight: 1.7, margin: 0 }}>
        Nas configurações de 2FA do serviço escolha{' '}
        <strong style={{ color: 'rgba(255,255,255,0.5)' }}>"não consigo escanear"</strong> ou{' '}
        <strong style={{ color: 'rgba(255,255,255,0.5)' }}>"chave manual"</strong> para ver o segredo Base32.
      </p>

      {error && (
        <p style={{ color: '#f87171', fontSize: 12, margin: 0 }}>{error}</p>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
        <button
          onClick={onCancel}
          style={{
            flex: 1, padding: '11px', borderRadius: 11, border: '1px solid rgba(255,255,255,0.1)',
            background: 'transparent', color: 'rgba(255,255,255,0.45)', fontSize: 14, cursor: 'pointer',
          }}
        >
          Cancelar
        </button>
        <button
          onClick={submit}
          style={{
            flex: 2, padding: '11px', borderRadius: 11, border: 'none',
            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
            color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}
        >
          Adicionar conta
        </button>
      </div>
    </div>
  )
}
