import React from 'react'
import ReactDOM from 'react-dom/client'
import { App, StorageProvider, JsonBinProvider, GoogleDriveProvider } from '@otp-vault/core'
import { extensionStorage } from './storage'
import { makeExtensionTokenGetter } from './googleAuth'
import './global.css'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''

const jsonbin = new JsonBinProvider(extensionStorage)
const gdrive  = new GoogleDriveProvider(extensionStorage, GOOGLE_CLIENT_ID)
gdrive.setTokenGetter(makeExtensionTokenGetter(GOOGLE_CLIENT_ID))

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <StorageProvider adapter={extensionStorage}>
      <App jsonbinProvider={jsonbin} gdriveProvider={gdrive} />
    </StorageProvider>
  </React.StrictMode>,
)