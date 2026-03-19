// App
export { default as App } from './App'

// Storage
export { StorageProvider, useStorage } from './storage/StorageContext'
export type { StorageAdapter } from './storage/StorageAdapter'

// Components
export { AccountCard } from './components/AccountCard'
export { AddForm } from './components/AddForm'
export { Ring } from './components/Ring'
export { Toast } from './components/Toast'
export { SyncTab } from './components/SyncTab'
export { PasswordTab } from './components/PasswordTab'
export { PasswordCard } from './components/PasswordCard'
export { PasswordForm } from './components/PasswordForm'

// Hooks
export { useAccounts } from './hooks/useAccounts'
export { useJsonBinSync } from './hooks/useJsonBinSync'
export { useToast } from './hooks/useToast'
export { useTotp } from './hooks/useTotp'
export { usePasswords } from './hooks/usePasswords'

// Utils
export { pushToBin, pullFromBin, sanitizeBinId } from './utils/jsonbin'
export { encryptVault, decryptVault } from './utils/crypto'
export { generateTOTP, secondsRemaining, isValidBase32 } from './utils/totp'
export { exportVault, parseVaultJSON } from './utils/storage'
export { pickColor } from './utils/color'
export { generatePassword, passwordStrength } from './utils/passwordGenerator'

// Types
export type { Account, PasswordEntry, Tab, VaultPayload, SyncVersionInfo } from './types'
export type { JsonBinConfig } from './cloud/JsonBinProvider'
export type { PasswordVaultStatus } from './hooks/usePasswords'
export type { GeneratorOptions } from './utils/passwordGenerator'
export type { ParsedVault } from './utils/storage'

// Cloud providers
export { JsonBinProvider } from './cloud/JsonBinProvider'
export { GoogleDriveProvider } from './cloud/GoogleDriveProvider'
export type { CloudProvider } from './cloud/CloudProvider'

// Cloud sync hook
export { useCloudSync } from './hooks/useCloudSync'
export type { UseCloudSyncReturn, SyncStatus, ActiveProvider, PulledVault } from './hooks/useCloudSync'

// Sync UI
export { SyncProviderPicker, ActiveProviderBadge } from './components/SyncProviderPicker'
