/**
 * Electron Main Process
 * 
 * Responsible for creating the application window and managing
 * system-level interactions.
 */

import { app, BrowserWindow, ipcMain, Menu, dialog } from 'electron'
import path from 'path'
import fs from 'fs'

/**
 * Get the preload script path based on environment
 */
const getPreloadPath = () => {
  if (process.env.NODE_ENV === 'development') {
    return path.join(__dirname, '../../dist-electron/preload/preload.cjs')
  }
  return path.join(__dirname, '../preload/preload.cjs')
}

/**
 * Get the HTML file path based on environment
 */
const getHtmlPath = () => {
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:5173'
  }
  return path.join(__dirname, '../../dist/index.html')
}

/**
 * Create application menu
 */
const createMenu = (mainWindow: BrowserWindow): Menu => {
  const sendMenuAction = (action: string) => {
    mainWindow.webContents.send('menu:action', action)
  }

  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        { label: 'New', accelerator: 'CmdOrCtrl+N', click: () => sendMenuAction('new') },
        { label: 'Add to current document', accelerator: 'CmdOrCtrl+Shift+O', click: () => sendMenuAction('open') },
        { label: 'Save', accelerator: 'CmdOrCtrl+S', click: () => sendMenuAction('save') },
        { type: 'separator' },
        { label: 'Exit', click: () => app.quit() },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { label: 'Undo', accelerator: 'CmdOrCtrl+Z', click: () => sendMenuAction('undo') },
        { label: 'Redo', accelerator: 'CmdOrCtrl+Y', click: () => sendMenuAction('redo') },
        { label: 'Redo', accelerator: 'CmdOrCtrl+Shift+Z', click: () => sendMenuAction('redo'), visible: false },
        { type: 'separator' },
        { label: 'Cut', accelerator: 'CmdOrCtrl+X', click: () => sendMenuAction('cut') },
        { label: 'Copy', accelerator: 'CmdOrCtrl+C', click: () => sendMenuAction('copy') },
        { label: 'Paste', accelerator: 'CmdOrCtrl+V', click: () => sendMenuAction('paste') },
        { label: 'Delete', accelerator: 'Delete', click: () => sendMenuAction('delete') },
        { type: 'separator' },
        { label: 'Clear All', accelerator: 'CmdOrCtrl+Shift+A', click: () => sendMenuAction('clear-all') },
      ],
    },
    {
      label: 'View',
      submenu: [
        { label: 'Zoom In', accelerator: 'CmdOrCtrl+=', click: () => sendMenuAction('zoom-in') },
        { label: 'Zoom Out', accelerator: 'CmdOrCtrl+-', click: () => sendMenuAction('zoom-out') },
        { label: 'Reset Zoom', accelerator: 'CmdOrCtrl+0', click: () => sendMenuAction('reset-zoom') },
        { type: 'separator' },
        { label: 'Toggle Grid', accelerator: "Ctrl+'", click: () => sendMenuAction('toggle-grid') },
        { label: 'Toggle Snap', accelerator: 'Ctrl+Shift+S', click: () => sendMenuAction('toggle-snap') },
        { type: 'separator' },
        { label: 'Toggle Debug Mode', accelerator: 'Ctrl+Shift+D', click: () => sendMenuAction('toggle-debug') },
      ],
    },
  ]

  return Menu.buildFromTemplate(template)
}

/**
 * Create the main application window
 */
const createWindow = (): void => {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    title: 'LaserSVG Editor',
    backgroundColor: '#1e1e1e',
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    show: false,
  })

  // Set application menu
  const menu = createMenu(mainWindow)
  Menu.setApplicationMenu(menu)

  // Load the app
  const htmlPath = getHtmlPath()
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL(htmlPath)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(htmlPath)
  }

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  // Handle window closed
  mainWindow.on('closed', () => {
    // Cleanup if needed
  })
}

// App event handlers
app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    // On macOS, recreate window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  // On Windows/Linux, quit when all windows are closed
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// IPC handlers for future file operations
ipcMain.handle('app:version', () => {
  return app.getVersion()
})

// Save file handler
ipcMain.handle('file:save', async (_event, content: string, defaultPath?: string) => {
  const result = await dialog.showSaveDialog({
    defaultPath: defaultPath || 'design.svg',
    filters: [
      { name: 'SVG Files', extensions: ['svg'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  })
  
  if (result.canceled || !result.filePath) {
    return null
  }
  
  try {
    fs.writeFileSync(result.filePath, content, 'utf-8')
    return result.filePath
  } catch (error) {
    console.error('Error saving file:', error)
    return null
  }
})

// Open file handler
ipcMain.handle('file:open', async () => {
  const result = await dialog.showOpenDialog({
    filters: [
      { name: 'SVG Files', extensions: ['svg'] },
      { name: 'All Files', extensions: ['*'] },
    ],
    properties: ['openFile'],
  })
  
  if (result.canceled || result.filePaths.length === 0) {
    return null
  }
  
  const filePath = result.filePaths[0]
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    const stats = fs.statSync(filePath)
    const timestamp = Math.floor(stats.mtimeMs)
    return { content, path: filePath, timestamp }
  } catch (error) {
    console.error('Error opening file:', error)
    return null
  }
})

// Show message box handler
ipcMain.handle('dialog:showMessageBox', async (_event, options: { type?: 'none' | 'info' | 'error' | 'question' | 'warning'; title?: string; message: string; buttons?: string[] }) => {
  const result = await dialog.showMessageBox({
    type: 'none',
    title: options.title || 'LaserSVG Editor',
    message: options.message,
    buttons: options.buttons || ['OK'],
  })
  return { response: result.response }
})
