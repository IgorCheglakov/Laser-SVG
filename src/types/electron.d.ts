// Type declarations for Electron API

declare global {
  interface Window {
    electronAPI?: {
      getAppVersion: () => Promise<string>
      platform: string
      onMenuAction: (callback: (action: string) => void) => void
      removeMenuListener: () => void
    }
  }
}

export {}
