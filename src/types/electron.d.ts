// Type declarations for Electron API

declare global {
  interface Window {
    electronAPI?: {
      getAppVersion: () => Promise<string>
      platform: string
      onMenuAction: (callback: (action: string) => void) => void
      removeMenuListener: () => void
      saveFile: (content: string, defaultPath?: string) => Promise<string | null>
      openFile: () => Promise<{ content: string; path: string; timestamp: number } | null>
      showMessageBox: (options: { type?: string; title?: string; message: string; buttons?: string[] }) => Promise<{ response: number }>
    }
  }
}

export {}
