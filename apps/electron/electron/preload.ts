import { contextBridge, ipcRenderer } from 'electron'

function makeStorageArea(prefix: string) {
  return {
    get: (key: string): Promise<string | null> => ipcRenderer.invoke(`${prefix}:get`, key),
    set: (key: string, value: string): Promise<void> => ipcRenderer.invoke(`${prefix}:set`, key, value),
    remove: (key: string): Promise<void> => ipcRenderer.invoke(`${prefix}:remove`, key),
  }
}

contextBridge.exposeInMainWorld('electronStorage', {
  local: makeStorageArea('storage:local'),
  sync: makeStorageArea('storage:sync'),
  session: makeStorageArea('storage:session'),
})
