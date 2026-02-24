/**
 * Main Application Component
 * 
 * Root component that composes the entire application layout.
 */

import { useEffect } from 'react'
import { Layout } from '@components/Layout/Layout'
import { useEditorStore, undo, redo } from '@store/index'
import { HOTKEYS } from '@constants/index'
import { exportToSVG } from '@/utils/exportSvg'
import { importFromSVG, centerElements, cropElementsToBounds } from '@/utils/importSvgToExistingDoc'
import { DEFAULTS } from '@constants/index'
import type { SVGElement, PointElement } from '@/types-app/index'

/**
 * Global keyboard shortcuts handler
 */
const useGlobalShortcuts = () => {
  const { 
    setActiveTool, 
    zoomIn, 
    zoomOut, 
    resetView, 
    toggleGrid, 
    toggleSnap,
    toggleDebug,
    deleteElement,
    selectedIds,
    groupElements,
    ungroupElements,
    elements,
  } = useEditorStore()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      const key = e.key.toLowerCase()
      const ctrl = e.ctrlKey || e.metaKey
      const shift = e.shiftKey

      // Delete selected elements (only when NOT in input)
      if (key === 'delete') {
        if (selectedIds.length > 0) {
          e.preventDefault()
          selectedIds.forEach(id => deleteElement(id))
        }
        return
      }

      // Backspace should not delete objects - let it work normally in inputs, do nothing otherwise
      if (key === 'backspace') {
        return
      }

      // ESC switches to selection tool
      if (key === 'escape') {
        setActiveTool('selection')
        e.preventDefault()
        return
      }

      // Tool shortcuts
      if (!ctrl && !shift) {
        switch (key) {
          case HOTKEYS.TOOL_SELECTION:
            setActiveTool('selection')
            e.preventDefault()
            break
          case HOTKEYS.TOOL_DIRECT_SELECTION:
            setActiveTool('directSelection')
            e.preventDefault()
            break
          case HOTKEYS.TOOL_RECTANGLE:
            setActiveTool('rectangle')
            e.preventDefault()
            break
          case HOTKEYS.TOOL_ELLIPSE:
            setActiveTool('ellipse')
            e.preventDefault()
            break
          case HOTKEYS.TOOL_LINE:
            setActiveTool('line')
            e.preventDefault()
            break
        }
      }

      // Action shortcuts with Ctrl
      if (ctrl) {
        switch (key) {
          case 'z':
            e.preventDefault()
            if (shift) {
              redo()
            } else {
              undo()
            }
            break
          case 'y':
            redo()
            e.preventDefault()
            break
          case '=':
          case '+':
            zoomIn()
            e.preventDefault()
            break
          case '-':
            zoomOut()
            e.preventDefault()
            break
          case '0':
            resetView()
            e.preventDefault()
            break
          case "'":
            toggleGrid()
            e.preventDefault()
            break
          case 's':
            if (shift) {
              toggleSnap()
              e.preventDefault()
            }
            break
          case 'd':
            if (shift && ctrl) {
              toggleDebug()
              e.preventDefault()
            }
            break
          case 'g':
            if (ctrl && shift) {
              // Ctrl+Shift+G: Ungroup
              const selectedGroups = elements.filter(
                el => selectedIds.includes(el.id) && el.type === 'group'
              )
              selectedGroups.forEach(group => ungroupElements(group.id))
              e.preventDefault()
            } else if (ctrl) {
              // Ctrl+G: Group
              if (selectedIds.length >= 2) {
                groupElements(selectedIds)
                e.preventDefault()
              }
            }
            break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setActiveTool, zoomIn, zoomOut, resetView, toggleGrid, toggleSnap, toggleDebug, deleteElement, selectedIds, groupElements, ungroupElements, elements])
}

/**
 * Menu actions handler from Electron main process
 */
const useMenuActions = () => {
  const { 
    setActiveTool,
    deleteElement,
    deleteAllElements,
    selectedIds,
    elements,
    settings,
    view,
    zoomIn, 
    zoomOut, 
    resetView, 
    toggleGrid, 
    toggleSnap,
    toggleDebug,
    addElement,
  } = useEditorStore()

  useEffect(() => {
    // Check if we're running in Electron
    if (!window.electronAPI?.onMenuAction) {
      return
    }

    const handleMenuAction = (action: string) => {
      console.log('Menu action received:', action)
      switch (action) {
        case 'undo':
          undo()
          break
        case 'redo':
          redo()
          break
        case 'delete':
        case 'delete-element':
          if (selectedIds.length > 0) {
            selectedIds.forEach(id => deleteElement(id))
          }
          break
        case 'clear-all':
          deleteAllElements()
          break
        case 'zoom-in':
          zoomIn()
          break
        case 'zoom-out':
          zoomOut()
          break
        case 'reset-zoom':
          resetView()
          break
        case 'toggle-grid':
          toggleGrid()
          break
        case 'toggle-snap':
          toggleSnap()
          break
        case 'toggle-debug':
          toggleDebug()
          break
        case 'save':
          {
            const svgContent = exportToSVG(elements, settings.artboardWidth, settings.artboardHeight)
            window.electronAPI?.saveFile(svgContent)
          }
          break
        case 'open':
          {
            console.log('[App] Open file action triggered')
            window.electronAPI?.openFile().then(async (result) => {
              if (result) {
                console.log('[App] File opened:', result.path, 'content length:', result.content.length, 'timestamp:', result.timestamp)
                console.log('[App] Content preview:', result.content.substring(0, 200))
                
                // const isCompatible = isSvgLaserCompatible(result.content)
                /* if (!isCompatible) {
                  await window.electronAPI?.showMessageBox({
                    type: 'info',
                    title: 'LaserSVG Editor',
                    message: 'This program will adjust the file for the purposes of laser engraving in Lightburn program:\n- All fills are disabled, all strokes are enabled;\n- All colors are adjusted to match the Lightburn palette;\n- All monolithic shapes, such as monolithic circles and squares are converted into polygonal objects.\n\nDo not override the existing file if you don\'t want this data to be lost',
                    buttons: ['OK'],
                  })
                } */
                
                const importedElements = importFromSVG(result.content, result.timestamp)
                
                const croppedElements = cropElementsToBounds(importedElements, settings.artboardWidth, settings.artboardHeight)
                
                // Calculate visible center in mm coordinates using screen dimensions from store
                const centerScreenX = view.screenWidth / 2
                const centerScreenY = view.screenHeight / 2
                const visibleCenterX = (centerScreenX - view.offsetX) / view.scale / DEFAULTS.MM_TO_PX
                const visibleCenterY = (centerScreenY - view.offsetY) / view.scale / DEFAULTS.MM_TO_PX
                
                const centeredElements = centerElements(croppedElements, visibleCenterX, visibleCenterY, settings.artboardWidth, settings.artboardHeight)
                console.log('[App] Imported elements count:', centeredElements.length)
                centeredElements.forEach((element: SVGElement) => {
                  const points = 'points' in element ? (element as PointElement).points?.length : 'N/A'
                  console.log('[App] Adding element:', element.name, 'points:', points)
                  addElement(element)
                })
                console.log('[App] All elements added')
              } else {
                console.log('[App] No file result (cancelled or error)')
              }
            }).catch((err) => {
              console.error('[App] Error opening file:', err)
            })
          }
          break
      }
    }

    window.electronAPI.onMenuAction(handleMenuAction)
    
    return () => {
      window.electronAPI?.removeMenuListener()
    }
  }, [setActiveTool, deleteElement, deleteAllElements, selectedIds, elements, settings, view, zoomIn, zoomOut, resetView, toggleGrid, toggleSnap, toggleDebug, addElement])
}

/**
 * Main App component
 */
function App() {
  useGlobalShortcuts()
  useMenuActions()

  return (
    <div className="h-full w-full flex flex-col bg-dark-bg overflow-hidden">
      <Layout />
    </div>
  )
}

export default App
