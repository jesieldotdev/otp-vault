/**
 * Abstract interface for cloud vault storage providers.
 * Implement this to add new sync backends (JSONBin, Google Drive, etc.)
 */
export interface CloudProvider {
  readonly id: 'jsonbin' | 'gdrive'
  readonly name: string

  /** Whether the provider is configured and ready to use */
  isReady(): boolean

  /** Push encrypted vault payload to the cloud */
  push(encrypted: string): Promise<{ ok: boolean; error?: string }>

  /** Pull encrypted vault payload from the cloud */
  pull(): Promise<{ ok: boolean; payload?: string; error?: string }>

  /** Disconnect / clear credentials */
  disconnect(): Promise<void>
}
