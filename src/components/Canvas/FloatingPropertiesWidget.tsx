/**
 * Floating Properties Widget
 * 
 * Widget that appears near selected objects for quick property editing.
 * All elements are now represented as PointElement with array of points.
 */

import { useMemo } from 'react'
import { useEditorStore } from '@store/index'
import { UI_STRINGS } from '@constants/index'
import type { PointElement, SVGElement } from '@/types-app/index'

/**
 * Floating Properties Widget
 */
export const FloatingPropertiesWidget: React.FC = () => {
  const { elements, selectedIds, updateElement } = useEditorStore()

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

  if (selectedIds.length === 0 || !bounds) return null

  const selectedElement = elements.find(el => el.id === selectedIds[0])
  if (!selectedElement || !('points' in selectedElement)) return null

  const pointEl = selectedElement as PointElement

  const handleXChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value)
    if (isNaN(value)) return
    
    const deltaX = value - bounds.x
    const newPoints = pointEl.points.map(p => ({
      x: p.x + deltaX,
      y: p.y,
    }))
    updateElement(selectedElement.id, { points: newPoints } as Partial<SVGElement>)
  }

  const handleYChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value)
    if (isNaN(value)) return
    
    const deltaY = value - bounds.y
    const newPoints = pointEl.points.map(p => ({
      x: p.x,
      y: p.y + deltaY,
    }))
    updateElement(selectedElement.id, { points: newPoints } as Partial<SVGElement>)
  }

  const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value)
    if (isNaN(value) || value <= 0 || bounds.width === 0) return
    
    const scaleX = value / bounds.width
    const newPoints = pointEl.points.map(p => ({
      x: bounds.x + (p.x - bounds.x) * scaleX,
      y: p.y,
    }))
    updateElement(selectedElement.id, { points: newPoints } as Partial<SVGElement>)
  }

  const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value)
    if (isNaN(value) || value <= 0 || bounds.height === 0) return
    
    const scaleY = value / bounds.height
    const newPoints = pointEl.points.map(p => ({
      x: p.x,
      y: bounds.y + (p.y - bounds.y) * scaleY,
    }))
    updateElement(selectedElement.id, { points: newPoints } as Partial<SVGElement>)
  }

  return (
    <div 
      className="absolute bg-dark-bgSecondary border border-dark-border rounded shadow-lg p-3 z-50"
      style={{
        left: '20px',
        top: '20px',
        minWidth: '180px',
      }}
    >
      <div className="text-xs font-semibold text-dark-text mb-2">
        {selectedIds.length > 1 ? `${selectedIds.length} items selected` : 'Properties'}
      </div>
      
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
    </div>
  )
}
