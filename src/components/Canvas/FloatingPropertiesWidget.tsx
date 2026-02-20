/**
 * Floating Properties Widget
 * 
 * Minimal placeholder widget that appears near selected objects.
 * Display only - actual property editing is in the Properties panel.
 */

import { useMemo } from 'react'
import { useEditorStore } from '@store/index'
import { DEFAULTS } from '@constants/index'

interface FloatingPropertiesWidgetProps {
  scale: number
  offsetX: number
  offsetY: number
  containerWidth: number
  containerHeight: number
}

/**
 * Floating Properties Widget - minimal placeholder
 */
export const FloatingPropertiesWidget: React.FC<FloatingPropertiesWidgetProps> = ({
  scale,
  offsetX,
  offsetY,
  containerWidth,
  containerHeight,
}) => {
  const { elements, selectedIds } = useEditorStore()

  const screenPosition = useMemo(() => {
    if (selectedIds.length === 0) return null
    
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
    
    if (minX === Infinity) return null
    
    const left = minX * DEFAULTS.MM_TO_PX * scale + offsetX
    const top = minY * DEFAULTS.MM_TO_PX * scale + offsetY
    const width = (maxX - minX) * DEFAULTS.MM_TO_PX * scale
    const height = (maxY - minY) * DEFAULTS.MM_TO_PX * scale
    
    return { left, top, width, height }
  }, [elements, selectedIds, scale, offsetX, offsetY])

  const positionedStyle = useMemo(() => {
    if (!screenPosition) return null
    
    const widgetWidth = 40
    const widgetHeight = 20
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

  if (selectedIds.length === 0 || !positionedStyle) return null

  return (
    <div 
      className="absolute bg-dark-accent/30 border border-dark-accent rounded z-40"
      style={{
        left: positionedStyle.left,
        top: positionedStyle.top,
        minWidth: '40px',
        minHeight: '20px',
        width: '40px',
        height: '20px',
      }}
    />
  )
}
