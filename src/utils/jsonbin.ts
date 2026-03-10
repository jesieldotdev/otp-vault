/**
 * JSONBin.io v3 API wrapper.
 * Docs: https://jsonbin.io/api-reference
 */

const BASE = 'https://api.jsonbin.io/v3'

export interface JsonBinConfig {
  apiKey: string
  binId: string | null  // null = ainda não criou o bin
}

export interface SyncResult {
  ok: boolean
  binId?: string
  error?: string
}

/**
 * Sanitiza o binId — aceita tanto o ID puro quanto a URL completa.
 * Ex: "https://api.jsonbin.io/v3/b/64abc123" → "64abc123"
 */
export function sanitizeBinId(raw: string): string {
  const trimmed = raw.trim()
  // Se for URL completa, extrai só o ID (último segmento que não seja "latest")
  const match = trimmed.match(/\/b\/([a-f0-9]{24})/i)
  if (match) return match[1]
  // Se já for só o ID (24 hex chars)
  if (/^[a-f0-9]{24}$/i.test(trimmed)) return trimmed
  // Devolve como está e deixa a API retornar o erro
  return trimmed
}

/** Salva (cria ou atualiza) o conteúdo no bin. Retorna o binId. */
export async function pushToBin(
  config: JsonBinConfig,
  payload: string,  // string base64 já criptografada
): Promise<SyncResult> {
  const binId = config.binId ? sanitizeBinId(config.binId) : null
  const body = JSON.stringify({ vault: payload })

  // Criar bin novo
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
    if (!res.ok) {
      const text = await res.text()
      return { ok: false, error: `Erro ao criar bin (${res.status}). Verifique sua API Key.` }
    }
    const data = await res.json() as { metadata: { id: string } }
    return { ok: true, binId: data.metadata.id }
  }

  // Atualizar bin existente
  const res = await fetch(`${BASE}/b/${binId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Master-Key': config.apiKey,
    },
    body,
  })
  if (!res.ok) {
    return { ok: false, error: `Erro ao salvar (${res.status}). Verifique o Bin ID e a API Key.` }
  }
  return { ok: true, binId }
}

/** Lê o conteúdo do bin. Retorna a string base64 criptografada. */
export async function pullFromBin(config: JsonBinConfig): Promise<{ ok: boolean; payload?: string; error?: string }> {
  if (!config.binId) return { ok: false, error: 'Bin ID não configurado.' }

  const binId = sanitizeBinId(config.binId)
  const res = await fetch(`${BASE}/b/${binId}/latest`, {
    headers: { 'X-Master-Key': config.apiKey },
  })
  if (!res.ok) {
    return { ok: false, error: `Erro ao buscar (${res.status}). Verifique o Bin ID e a API Key.` }
  }
  const data = await res.json() as { record: { vault?: string } }
  if (!data.record?.vault) return { ok: false, error: 'Bin não contém vault válida.' }
  return { ok: true, payload: data.record.vault }
}

// ── LocalStorage persistence for config (não os segredos!) ──────────────────

const LS_KEY = 'otp_vault_jsonbin_config'

export function loadJsonBinConfig(): JsonBinConfig | null {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    const cfg = JSON.parse(raw) as JsonBinConfig
    // Sanitize binId in case an old config stored a full URL
    if (cfg.binId) cfg.binId = sanitizeBinId(cfg.binId)
    return cfg
  } catch {
    return null
  }
}

export function saveJsonBinConfig(config: JsonBinConfig): void {
  localStorage.setItem(LS_KEY, JSON.stringify(config))
}

export function clearJsonBinConfig(): void {
  localStorage.removeItem(LS_KEY)
}
