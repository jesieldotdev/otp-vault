import React from 'react'
import ReactDOM from 'react-dom/client'
import { StorageProvider } from '@otp-vault/core'
import { extensionStorage } from './storage'
import OptionsPage from './OptionsPage'
import './global.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <StorageProvider adapter={extensionStorage}>
      <OptionsPage />
    </StorageProvider>
  </React.StrictMode>,
)
