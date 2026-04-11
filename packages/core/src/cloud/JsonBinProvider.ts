import type { CloudProvider } from './CloudProvider'
import { pushToBin, pullFromBin, sanitizeBinId } from '../utils/jsonbin'
import type { StorageAdapter } from '../storage/StorageAdapter'

const CONFIG_KEY = 'otp_vault_jsonbin_config'

export interface JsonBinConfig {
  apiKey: string
  binId: string | null
}

export class JsonBinProvider implements CloudProvider {
  readonly id = 'jsonbin' as const
  readonly name = 'JSONBin'

  private config: JsonBinConfig | null = null
  private storage: StorageAdapter

  constructor(storage: StorageAdapter) {
    this.storage = storage
  }

  isReady(): boolean {
    return !!this.config?.apiKey
  }

  getConfig(): JsonBinConfig | null {
    return this.config
  }

  async load(): Promise<void> {
    const raw = await this.storage.sync.get(CONFIG_KEY)
    if (!raw) return
    try {
      const cfg = JSON.parse(raw) as JsonBinConfig
      if (cfg.binId) cfg.binId = sanitizeBinId(cfg.binId)
      this.config = cfg
    } catch {}
  }

  async configure(apiKey: string, binId: string | null): Promise<void> {
    const cleanBinId = binId ? sanitizeBinId(binId) : null
    this.config = { apiKey: apiKey.trim(), binId: cleanBinId }
    await this.storage.sync.set(CONFIG_KEY, JSON.stringify(this.config))
  }

  async push(encrypted: string): Promise<{ ok: boolean; error?: string }> {
    if (!this.config?.apiKey) return { ok: false, error: 'API Key não configurada.' }
    const result = await pushToBin(this.config, encrypted)
    // Persist new binId if created
    if (result.ok && result.binId && result.binId !== this.config.binId) {
      this.config = { ...this.config, binId: result.binId }
      await this.storage.sync.set(CONFIG_KEY, JSON.stringify(this.config))
    }
    return result
  }

  async pull(): Promise<{ ok: boolean; payload?: string; error?: string }> {
    if (!this.config?.apiKey || !this.config.binId) {
      return { ok: false, error: 'Bin ID não configurado.' }
    }
    return pullFromBin(this.config)
  }

  async disconnect(): Promise<void> {
    this.config = null
    await this.storage.sync.remove(CONFIG_KEY)
  }
}
