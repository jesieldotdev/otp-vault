import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join } from 'path'
import Store from 'electron-store'

const localStore = new Store({ name: 'local' })
const syncStore = new Store({ name: 'sync' })
const sessionMap = new Map<string, string>()

function createWindow() {
  const win = new BrowserWindow({
    width: 420,
    height: 700,
    minWidth: 360,
    minHeight: 600,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: '#0b0b12',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    show: false,
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(join(__dirname, '../dist/index.html'))
  }

  win.on('ready-to-show', () => win.show())

  // Open external links in the default browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

app.whenReady().then(() => {
  registerIpcHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  sessionMap.clear()
  if (process.platform !== 'darwin') app.quit()
})

function registerIpcHandlers() {
  ipcMain.handle('storage:local:get', (_, key: string) => localStore.get(key, null) as string | null)
  ipcMain.handle('storage:local:set', (_, key: string, value: string) => { localStore.set(key, value) })
  ipcMain.handle('storage:local:remove', (_, key: string) => { localStore.delete(key) })

  ipcMain.handle('storage:sync:get', (_, key: string) => syncStore.get(key, null) as string | null)
  ipcMain.handle('storage:sync:set', (_, key: string, value: string) => { syncStore.set(key, value) })
  ipcMain.handle('storage:sync:remove', (_, key: string) => { syncStore.delete(key) })

  ipcMain.handle('storage:session:get', (_, key: string) => sessionMap.get(key) ?? null)
  ipcMain.handle('storage:session:set', (_, key: string, value: string) => { sessionMap.set(key, value) })
  ipcMain.handle('storage:session:remove', (_, key: string) => { sessionMap.delete(key) })
}
