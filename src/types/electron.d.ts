// Type declarations for Electron API

declare global {
  interface Window {
    electronAPI?: {
      getAppVersion: () => Promise<string>
      platform: string
      onMenuAction: (callback: (action: string) => void) => void
      removeMenuListener: () => void
      saveFile: (content: string, defaultPath?: string) => Promise<string | null>
      openFile: () => Promise<{ content: string; path: string } | null>
    }
  }
}

export {}
