import React from 'react'
import ReactDOM from 'react-dom/client'
import { App, StorageProvider } from '@otp-vault/core'
import { extensionStorage } from './storage'
import './global.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <StorageProvider adapter={extensionStorage}>
      <App />
    </StorageProvider>
  </React.StrictMode>,
)
