/**
 * Electron Preload Script
 * 
 * Provides a secure bridge between the renderer process (React)
 * and the main process (Electron APIs).
 */

import { contextBridge, ipcRenderer } from 'electron'

/**
 * API exposed to the renderer process
 */
export interface ElectronAPI {
  /** Get the application version */
  getAppVersion: () => Promise<string>
  /** Platform information */
  platform: string
  /** Menu action listeners */
  onMenuAction: (callback: (action: string) => void) => void
  removeMenuListener: () => void
}

const api: ElectronAPI = {
  getAppVersion: () => ipcRenderer.invoke('app:version'),
  platform: process.platform,
  onMenuAction: (callback: (action: string) => void) => {
    ipcRenderer.on('menu:action', (_event, action) => callback(action))
  },
  removeMenuListener: () => {
    ipcRenderer.removeAllListeners('menu:action')
  },
}

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', api)

// Type declaration for the global window object
declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
