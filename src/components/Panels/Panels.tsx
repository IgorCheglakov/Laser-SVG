/**
 * Panels Component
 * 
 * Right-side panel area with Layers and Properties panels.
 */

import { useEditorStore } from '@store/index'
import { UI_STRINGS } from '@constants/index'
import { Square, Circle, Minus } from 'lucide-react'

/**
 * Right panel container with layers and properties
 */
export const Panels: React.FC = () => {
  const { elements, selectedIds, setSelectedIds, deleteElement } = useEditorStore()

  const getElementIcon = (type: string) => {
    switch (type) {
      case 'rect': return <Square size={14} />
      case 'ellipse': return <Circle size={14} />
      case 'line': return <Minus size={14} />
      default: return <Square size={14} />
    }
  }

  const handleElementClick = (id: string, e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      // Multi-select
      if (selectedIds.includes(id)) {
        setSelectedIds(selectedIds.filter(sid => sid !== id))
      } else {
        setSelectedIds([...selectedIds, id])
      }
    } else {
      setSelectedIds([id])
    }
  }

  const handleDelete = (e: React.KeyboardEvent) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      selectedIds.forEach(id => deleteElement(id))
    }
  }

  return (
    <div className="flex flex-col h-full" onKeyDown={handleDelete} tabIndex={0}>
      {/* Properties Panel */}
      <div className="flex-1 border-b border-dark-border min-h-0 overflow-y-auto">
        <div className="px-3 py-2 bg-dark-bgTertiary text-sm font-medium text-dark-text border-b border-dark-border">
          {UI_STRINGS.PANEL_PROPERTIES}
        </div>
        <div className="p-4">
          {selectedIds.length === 0 ? (
            <div className="text-sm text-dark-textMuted italic">
              {UI_STRINGS.PANEL_NO_SELECTION}
            </div>
          ) : (
            <div className="text-sm text-dark-text">
              {selectedIds.length} element(s) selected
            </div>
          )}
        </div>
      </div>

      {/* Layers Panel */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="px-3 py-2 bg-dark-bgTertiary text-sm font-medium text-dark-text border-b border-dark-border">
          {UI_STRINGS.PANEL_LAYERS}
        </div>
        <div className="p-0">
          {elements.length === 0 ? (
            <div className="p-4 text-sm text-dark-textMuted italic">
              No layers yet
            </div>
          ) : (
            <div className="divide-y divide-dark-border">
              {[...elements].reverse().map((element) => (
                <div
                  key={element.id}
                  onClick={(e) => handleElementClick(element.id, e)}
                  className={`
                    flex items-center gap-2 px-3 py-2 text-sm cursor-pointer
                    transition-colors duration-100
                    ${selectedIds.includes(element.id)
                      ? 'bg-dark-accent text-white'
                      : 'text-dark-text hover:bg-dark-bgTertiary'
                    }
                  `}
                >
                  <span className="text-dark-textMuted">
                    {getElementIcon(element.type)}
                  </span>
                  <span className="truncate flex-1">
                    {element.name} {elements.indexOf(element) + 1}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
