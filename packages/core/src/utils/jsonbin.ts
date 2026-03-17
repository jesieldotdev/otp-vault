const BASE = 'https://api.jsonbin.io/v3'

export interface JsonBinConfig {
  apiKey: string
  binId: string | null
}

export interface SyncResult {
  ok: boolean
  binId?: string
  error?: string
}

export function sanitizeBinId(raw: string): string {
  const trimmed = raw.trim()
  const match = trimmed.match(/\/b\/([a-f0-9]{24})/i)
  if (match) return match[1]
  if (/^[a-f0-9]{24}$/i.test(trimmed)) return trimmed
  return trimmed
}

export async function pushToBin(config: JsonBinConfig, payload: string): Promise<SyncResult> {
  const binId = config.binId ? sanitizeBinId(config.binId) : null
  const body = JSON.stringify({ vault: payload })

  if (!binId) {
    const res = await fetch(`${BASE}/b`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': config.apiKey,
        'X-Bin-Name': 'otp-vault',
        'X-Bin-Private': 'true',
      },
      body,
    })
    if (!res.ok) return { ok: false, error: `Erro ao criar bin (${res.status}). Verifique sua API Key.` }
    const data = await res.json() as { metadata: { id: string } }
    return { ok: true, binId: data.metadata.id }
  }

  const res = await fetch(`${BASE}/b/${binId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Master-Key': config.apiKey },
    body,
  })
  if (!res.ok) return { ok: false, error: `Erro ao salvar (${res.status}). Verifique o Bin ID e a API Key.` }
  return { ok: true, binId }
}

export async function pullFromBin(config: JsonBinConfig): Promise<{ ok: boolean; payload?: string; error?: string }> {
  if (!config.binId) return { ok: false, error: 'Bin ID não configurado.' }
  const binId = sanitizeBinId(config.binId)
  const res = await fetch(`${BASE}/b/${binId}/latest`, {
    headers: { 'X-Master-Key': config.apiKey },
  })
  if (!res.ok) return { ok: false, error: `Erro ao buscar (${res.status}). Verifique o Bin ID e a API Key.` }
  const data = await res.json() as { record: { vault?: string } }
  if (!data.record?.vault) return { ok: false, error: 'Bin não contém vault válida.' }
  return { ok: true, payload: data.record.vault }
}
