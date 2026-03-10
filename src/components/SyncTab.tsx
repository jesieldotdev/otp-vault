import { useState } from 'react'
import { Upload, Download, AlertTriangle } from 'lucide-react'
import type { Account } from '../types'
import { exportVault, parseVaultJSON } from '../utils/storage'

interface SyncTabProps {
  accounts: Account[]
  onImport: (accounts: Omit<Account, 'id'>[]) => number
  onToast: (msg: string) => void
}

const btnStyle = (active: boolean, color?: string): React.CSSProperties => ({
  width: '100%',
  padding: '12px',
  borderRadius: 11,
  border: 'none',
  background: active
    ? color ?? 'linear-gradient(135deg, #6366f1, #a855f7)'
    : 'rgba(255,255,255,0.07)',
  color: '#fff',
  fontSize: 14,
  fontWeight: 700,
  cursor: active ? 'pointer' : 'not-allowed',
  opacity: active ? 1 : 0.5,
  transition: 'opacity .2s',
})

const cardStyle: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  padding: 20,
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
}

export function SyncTab({ accounts, onImport, onToast }: SyncTabProps) {
  const [importText, setImportText] = useState('')
  const [importErr, setImportErr] = useState('')

  const handleExport = () => {
    exportVault(accounts)
    onToast('✓ Exportado com sucesso!')
  }

  const handleImport = () => {
    setImportErr('')
    try {
      const parsed = parseVaultJSON(importText)
      if (!parsed.length) throw new Error('nenhuma conta válida encontrada')
      const added = onImport(parsed)
      setImportText('')
      onToast(`✓ ${added} conta(s) importada(s)!`)
    } catch (e) {
      setImportErr('Erro: ' + (e instanceof Error ? e.message : String(e)))
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Export */}
      <div style={cardStyle}>
        <div style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Upload size={16} style={{ marginBottom: -2 }} /> Exportar vault
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7, margin: 0 }}>
          Baixa um arquivo JSON com todas suas contas. Para sincronizar com outro dispositivo,
          importe esse arquivo lá.
        </p>
        <button
          style={btnStyle(accounts.length > 0, 'linear-gradient(135deg, #10b981, #059669)')}
          onClick={handleExport}
          disabled={accounts.length === 0}
        >
          {accounts.length > 0
            ? <><Upload size={14} style={{ marginRight: 4, marginBottom: -2 }} />Exportar {accounts.length} conta(s)</>
            : 'Sem contas para exportar'}
        </button>
      </div>

      {/* Import */}
      <div style={cardStyle}>
        <div style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Download size={16} style={{ marginBottom: -2 }} /> Importar vault
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7, margin: 0 }}>
          Cole o conteúdo do arquivo JSON exportado anteriormente. Contas duplicadas são ignoradas.
        </p>
        <textarea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          rows={5}
          placeholder={'Cole o JSON aqui…\n[{"issuer":"GitHub","label":"user@email.com","secret":"JBSWY3DP..."}]'}
          style={{
            width: '100%',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12,
            color: 'var(--text)',
            fontSize: 12,
            padding: '11px 15px',
            outline: 'none',
            resize: 'vertical',
            fontFamily: 'var(--font-mono)',
            transition: 'border-color .2s, box-shadow .2s',
          }}
        />
        {importErr && (
          <p style={{ color: '#f87171', fontSize: 12, margin: 0 }}>{importErr}</p>
        )}
        <button
          style={btnStyle(importText.trim().length > 0, 'linear-gradient(135deg, #f59e0b, #d97706)')}
          onClick={handleImport}
          disabled={!importText.trim()}
        >
          <Download size={14} style={{ marginRight: 4, marginBottom: -2 }} />
          Importar contas
        </button>
      </div>

      <p style={{ fontSize: 11, color: 'var(--text-dim)', textAlign: 'center', lineHeight: 1.8, margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <AlertTriangle size={13} style={{ marginBottom: -2 }} />
        Os dados ficam na memória da sessão.<br />
        Exporte sempre que adicionar novas contas para não perder.
      </p>
    </div>
  )
}
