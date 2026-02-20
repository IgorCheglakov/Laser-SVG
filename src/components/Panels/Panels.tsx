/**
 * Panels Component
 * 
 * Right-side panel area with Layers and Properties panels.
 */

import { useMemo } from 'react'
import { useEditorStore } from '@store/index'
import { UI_STRINGS } from '@constants/index'
import { Square, Circle, Minus } from 'lucide-react'
import type { PointElement, SVGElement } from '@/types-app/index'

/**
 * Right panel container with layers and properties
 */
export const Panels: React.FC = () => {
  const { elements, selectedIds, setSelectedIds, deleteElement, updateElement } = useEditorStore()

  const bounds = useMemo(() => {
    if (selectedIds.length === 0) return null
    
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    
    selectedIds.forEach(id => {
      const element = elements.find(el => el.id === id)
      if (!element || !('points' in element)) return
      
      const pointEl = element as PointElement
      for (const p of pointEl.points) {
        minX = Math.min(minX, p.x)
        minY = Math.min(minY, p.y)
        maxX = Math.max(maxX, p.x)
        maxY = Math.max(maxY, p.y)
      }
    })
    
    if (minX === Infinity) return null
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    }
  }, [elements, selectedIds])

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

  const handleXChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!bounds || selectedIds.length === 0) return
    const value = parseFloat(e.target.value)
    if (isNaN(value)) return
    
    const deltaX = value - bounds.x
    const selectedElement = elements.find(el => el.id === selectedIds[0])
    if (!selectedElement || !('points' in selectedElement)) return
    
    const pointEl = selectedElement as PointElement
    const newPoints = pointEl.points.map(p => ({
      x: p.x + deltaX,
      y: p.y,
    }))
    updateElement(selectedElement.id, { points: newPoints } as Partial<SVGElement>)
  }

  const handleYChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!bounds || selectedIds.length === 0) return
    const value = parseFloat(e.target.value)
    if (isNaN(value)) return
    
    const deltaY = value - bounds.y
    const selectedElement = elements.find(el => el.id === selectedIds[0])
    if (!selectedElement || !('points' in selectedElement)) return
    
    const pointEl = selectedElement as PointElement
    const newPoints = pointEl.points.map(p => ({
      x: p.x,
      y: p.y + deltaY,
    }))
    updateElement(selectedElement.id, { points: newPoints } as Partial<SVGElement>)
  }

  const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!bounds || selectedIds.length === 0 || bounds.width === 0) return
    const value = parseFloat(e.target.value)
    if (isNaN(value) || value <= 0) return
    
    const scaleX = value / bounds.width
    const selectedElement = elements.find(el => el.id === selectedIds[0])
    if (!selectedElement || !('points' in selectedElement)) return
    
    const pointEl = selectedElement as PointElement
    const newPoints = pointEl.points.map(p => ({
      x: bounds.x + (p.x - bounds.x) * scaleX,
      y: p.y,
    }))
    updateElement(selectedElement.id, { points: newPoints } as Partial<SVGElement>)
  }

  const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!bounds || selectedIds.length === 0 || bounds.height === 0) return
    const value = parseFloat(e.target.value)
    if (isNaN(value) || value <= 0) return
    
    const scaleY = value / bounds.height
    const selectedElement = elements.find(el => el.id === selectedIds[0])
    if (!selectedElement || !('points' in selectedElement)) return
    
    const pointEl = selectedElement as PointElement
    const newPoints = pointEl.points.map(p => ({
      x: p.x,
      y: bounds.y + (p.y - bounds.y) * scaleY,
    }))
    updateElement(selectedElement.id, { points: newPoints } as Partial<SVGElement>)
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
            <div className="space-y-3">
              <div className="text-sm text-dark-text">
                {selectedIds.length > 1 
                  ? `${selectedIds.length} elements selected`
                  : (() => {
                      const el = elements.find(e => e.id === selectedIds[0])
                      return el?.name || 'Unknown'
                    })()
                }
              </div>
              
              {bounds && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-dark-textMuted block mb-1">{UI_STRINGS.PROP_X}</label>
                    <input
                      type="number"
                      value={bounds.x.toFixed(1)}
                      onChange={handleXChange}
                      className="w-full bg-dark-bgTertiary text-dark-text text-xs px-2 py-1 rounded border border-dark-border"
                      step="0.1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-dark-textMuted block mb-1">{UI_STRINGS.PROP_Y}</label>
                    <input
                      type="number"
                      value={bounds.y.toFixed(1)}
                      onChange={handleYChange}
                      className="w-full bg-dark-bgTertiary text-dark-text text-xs px-2 py-1 rounded border border-dark-border"
                      step="0.1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-dark-textMuted block mb-1">{UI_STRINGS.PROP_WIDTH}</label>
                    <input
                      type="number"
                      value={bounds.width.toFixed(1)}
                      onChange={handleWidthChange}
                      className="w-full bg-dark-bgTertiary text-dark-text text-xs px-2 py-1 rounded border border-dark-border"
                      step="0.1"
                      min="0.1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-dark-textMuted block mb-1">{UI_STRINGS.PROP_HEIGHT}</label>
                    <input
                      type="number"
                      value={bounds.height.toFixed(1)}
                      onChange={handleHeightChange}
                      className="w-full bg-dark-bgTertiary text-dark-text text-xs px-2 py-1 rounded border border-dark-border"
                      step="0.1"
                      min="0.1"
                    />
                  </div>
                </div>
              )}
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
