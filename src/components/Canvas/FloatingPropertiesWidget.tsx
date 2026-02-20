/**
 * Floating Properties Widget
 * 
 * Widget that appears near selected objects for quick property editing.
 */

import { useEffect } from 'react'
import { useEditorStore } from '@store/index'
import { UI_STRINGS } from '@constants/index'
import type { RectElement, EllipseElement, LineElement } from '@/types-app/index'

/**
 * Floating Properties Widget
 */
export const FloatingPropertiesWidget: React.FC = () => {
  const { elements, selectedIds, updateElement } = useEditorStore()

  // Calculate widget position based on selected elements
  useEffect(() => {
    if (selectedIds.length === 0) return

    let minX = Infinity
    let minY = Infinity

    selectedIds.forEach(id => {
      const element = elements.find(el => el.id === id)
      if (!element) return

      switch (element.type) {
        case 'rect': {
          const rect = element as RectElement
          minX = Math.min(minX, rect.x)
          minY = Math.min(minY, rect.y)
          break
        }
        case 'ellipse': {
          const ellipse = element as EllipseElement
          minX = Math.min(minX, ellipse.cx - ellipse.rx)
          minY = Math.min(minY, ellipse.cy - ellipse.ry)
          break
        }
        case 'line': {
          const line = element as LineElement
          minX = Math.min(minX, line.x1, line.x2)
          minY = Math.min(minY, line.y1, line.y2)
          break
        }
      }
    })

  }, [elements, selectedIds])

  if (selectedIds.length === 0) return null

  // Get first selected element for editing
  const selectedElement = elements.find(el => el.id === selectedIds[0])
  if (!selectedElement) return null

  const handleXChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value)
    if (isNaN(value)) return

    if (selectedElement.type === 'rect') {
      updateElement(selectedElement.id, { x: value })
    } else if (selectedElement.type === 'ellipse') {
      updateElement(selectedElement.id, { cx: value })
    } else if (selectedElement.type === 'line') {
      const line = selectedElement as LineElement
      const dx = line.x2 - line.x1
      updateElement(selectedElement.id, { x1: value, x2: value + dx })
    }
  }

  const handleYChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value)
    if (isNaN(value)) return

    if (selectedElement.type === 'rect') {
      updateElement(selectedElement.id, { y: value })
    } else if (selectedElement.type === 'ellipse') {
      updateElement(selectedElement.id, { cy: value })
    } else if (selectedElement.type === 'line') {
      const line = selectedElement as LineElement
      const dy = line.y2 - line.y1
      updateElement(selectedElement.id, { y1: value, y2: value + dy })
    }
  }

  const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value)
    if (isNaN(value) || value <= 0) return

    if (selectedElement.type === 'rect') {
      updateElement(selectedElement.id, { width: value })
    } else if (selectedElement.type === 'ellipse') {
      updateElement(selectedElement.id, { rx: value / 2 })
    }
  }

  const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value)
    if (isNaN(value) || value <= 0) return

    if (selectedElement.type === 'rect') {
      updateElement(selectedElement.id, { height: value })
    } else if (selectedElement.type === 'ellipse') {
      updateElement(selectedElement.id, { ry: value / 2 })
    }
  }

  // Get current values
  let x = 0, y = 0, width = 0, height = 0

  if (selectedElement.type === 'rect') {
    const rect = selectedElement as RectElement
    x = rect.x
    y = rect.y
    width = rect.width
    height = rect.height
  } else if (selectedElement.type === 'ellipse') {
    const ellipse = selectedElement as EllipseElement
    x = ellipse.cx - ellipse.rx
    y = ellipse.cy - ellipse.ry
    width = ellipse.rx * 2
    height = ellipse.ry * 2
  } else if (selectedElement.type === 'line') {
    const line = selectedElement as LineElement
    x = Math.min(line.x1, line.x2)
    y = Math.min(line.y1, line.y2)
    width = Math.abs(line.x2 - line.x1)
    height = Math.abs(line.y2 - line.y1)
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
            value={x.toFixed(1)}
            onChange={handleXChange}
            className="w-full bg-dark-bgTertiary text-dark-text text-xs px-2 py-1 rounded border border-dark-border"
            step="0.1"
          />
        </div>
        <div>
          <label className="text-xs text-dark-textMuted block mb-1">{UI_STRINGS.PROP_Y}</label>
          <input
            type="number"
            value={y.toFixed(1)}
            onChange={handleYChange}
            className="w-full bg-dark-bgTertiary text-dark-text text-xs px-2 py-1 rounded border border-dark-border"
            step="0.1"
          />
        </div>
        <div>
          <label className="text-xs text-dark-textMuted block mb-1">{UI_STRINGS.PROP_WIDTH}</label>
          <input
            type="number"
            value={width.toFixed(1)}
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
            value={height.toFixed(1)}
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
