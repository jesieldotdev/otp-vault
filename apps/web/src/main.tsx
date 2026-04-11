import React from 'react'
import ReactDOM from 'react-dom/client'
import { App, StorageProvider, JsonBinProvider, GoogleDriveProvider } from '@otp-vault/core'
import { webStorage } from './storage'
import { makeWebTokenGetter } from './googleAuth'
import './global.css'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''

const jsonbin = new JsonBinProvider(webStorage)
const gdrive  = new GoogleDriveProvider(webStorage, GOOGLE_CLIENT_ID)
gdrive.setTokenGetter(makeWebTokenGetter(GOOGLE_CLIENT_ID))

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <StorageProvider adapter={webStorage}>
      <App jsonbinProvider={jsonbin} gdriveProvider={gdrive} />
    </StorageProvider>
  </React.StrictMode>,
)