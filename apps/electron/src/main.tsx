import React from 'react'
import ReactDOM from 'react-dom/client'
import { App, StorageProvider } from '@otp-vault/core'
import { electronStorage } from './storage'
import './global.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <StorageProvider adapter={electronStorage}>
      <App />
    </StorageProvider>
  </React.StrictMode>,
)
