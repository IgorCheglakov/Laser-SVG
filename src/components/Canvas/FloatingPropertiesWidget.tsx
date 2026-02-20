/**
 * Floating Properties Widget
 * 
 * Widget that appears near selected objects with flip controls.
 * Dark theme with 70% opacity.
 */

import { useMemo } from 'react'
import { useEditorStore, saveToHistory } from '@store/index'
import { DEFAULTS } from '@constants/index'
import { flipPointsHorizontal, flipPointsVertical } from '@/utils/transform'
import { FlipHorizontal, FlipVertical } from 'lucide-react'
import type { PointElement, SVGElement } from '@/types-app/index'

interface FloatingPropertiesWidgetProps {
  scale: number
  offsetX: number
  offsetY: number
  containerWidth: number
  containerHeight: number
}

/**
 * Floating Properties Widget with flip controls
 */
export const FloatingPropertiesWidget: React.FC<FloatingPropertiesWidgetProps> = ({
  scale,
  offsetX,
  offsetY,
  containerWidth,
  containerHeight,
}) => {
  const { elements, selectedIds, updateElement } = useEditorStore()

  const { bounds, screenPosition } = useMemo(() => {
    if (selectedIds.length === 0) return { bounds: null, screenPosition: null }
    
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    
    selectedIds.forEach(id => {
      const element = elements.find(el => el.id === id)
      if (!element || !('points' in element)) return
      
      for (const p of element.points) {
        minX = Math.min(minX, p.x)
        minY = Math.min(minY, p.y)
        maxX = Math.max(maxX, p.x)
        maxY = Math.max(maxY, p.y)
      }
    })
    
    if (minX === Infinity) return { bounds: null, screenPosition: null }
    
    const boundsVal = {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    }
    
    const left = minX * DEFAULTS.MM_TO_PX * scale + offsetX
    const top = minY * DEFAULTS.MM_TO_PX * scale + offsetY
    const width = (maxX - minX) * DEFAULTS.MM_TO_PX * scale
    const height = (maxY - minY) * DEFAULTS.MM_TO_PX * scale
    
    return { 
      bounds: boundsVal, 
      screenPosition: { left, top, width, height } 
    }
  }, [elements, selectedIds, scale, offsetX, offsetY])

  const positionedStyle = useMemo(() => {
    if (!screenPosition) return null
    
    const widgetWidth = 70
    const widgetHeight = 28
    const padding = 10
    
    let left = screenPosition.left + screenPosition.width + padding
    let top = screenPosition.top
    
    const rightEdge = left + widgetWidth
    const bottomEdge = top + widgetHeight
    
    if (rightEdge > containerWidth) {
      left = screenPosition.left - widgetWidth - padding
    }
    
    if (bottomEdge > containerHeight) {
      top = containerHeight - widgetHeight - padding
    }
    
    if (left < padding) {
      left = screenPosition.left + screenPosition.width / 2 - widgetWidth / 2
    }
    
    if (top < padding) {
      top = padding
    }
    
    return {
      left: Math.max(padding, left),
      top: Math.max(padding, top),
    }
  }, [screenPosition, containerWidth, containerHeight])

  const handleFlipHorizontal = () => {
    if (!bounds || selectedIds.length === 0) return
    saveToHistory()
    
    selectedIds.forEach(id => {
      const element = elements.find(el => el.id === id)
      if (!element || !('points' in element)) return
      
      const pointEl = element as PointElement
      const newPoints = flipPointsHorizontal(pointEl.points, bounds)
      updateElement(id, { points: newPoints } as Partial<SVGElement>)
    })
  }

  const handleFlipVertical = () => {
    if (!bounds || selectedIds.length === 0) return
    saveToHistory()
    
    selectedIds.forEach(id => {
      const element = elements.find(el => el.id === id)
      if (!element || !('points' in element)) return
      
      const pointEl = element as PointElement
      const newPoints = flipPointsVertical(pointEl.points, bounds)
      updateElement(id, { points: newPoints } as Partial<SVGElement>)
    })
  }

  if (selectedIds.length === 0 || !positionedStyle) return null

  return (
    <div 
      className="absolute flex gap-1 items-center justify-center px-2 py-1 bg-dark-bgSecondary border border-dark-border rounded shadow-lg z-40"
      style={{
        left: positionedStyle.left,
        top: positionedStyle.top,
        minWidth: '70px',
        minHeight: '28px',
        opacity: 0.7,
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <button
        onClick={handleFlipHorizontal}
        className="p-1 hover:bg-dark-bgTertiary rounded text-dark-textMuted hover:text-dark-text transition-colors focus:outline-none"
        title="Flip Horizontal"
      >
        <FlipHorizontal size={14} />
      </button>
      <button
        onClick={handleFlipVertical}
        className="p-1 hover:bg-dark-bgTertiary rounded text-dark-textMuted hover:text-dark-text transition-colors focus:outline-none"
        title="Flip Vertical"
      >
        <FlipVertical size={14} />
      </button>
    </div>
  )
}
