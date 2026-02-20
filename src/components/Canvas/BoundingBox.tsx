/**
 * Bounding Box Component
 * 
 * Renders selection bounds with resize handles for selected elements.
 * Also renders rotation center indicators: point for each element and crosshair for selection.
 */

import { useMemo } from 'react'
import type { SVGElement, PointElement, Point } from '@/types-app/index'
import { DEFAULTS } from '@constants/index'
import { calculateBoundingBox } from '@/utils/bounds'

export interface BoundingBoxProps {
  elements: SVGElement[]
  selectedIds: string[]
  scale: number
  onHandleDragStart?: (handle: string, startPoint: Point, altKey: boolean) => void
}

const SELECTION_COLOR = '#007acc'

/**
 * Calculate center point of a single element's bounding box
 */
function calculateElementCenter(element: PointElement): { x: number; y: number } {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  
  for (const p of element.points) {
    minX = Math.min(minX, p.x)
    minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x)
    maxY = Math.max(maxY, p.y)
  }
  
  return {
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2,
  }
}

/**
 * Bounding Box with resize handles and rotation center indicators
 */
export const BoundingBox: React.FC<BoundingBoxProps> = ({ 
  elements, 
  selectedIds, 
  scale,
  onHandleDragStart,
}) => {
  const pointElements = useMemo(() => {
    return elements.filter(el => 'points' in el) as PointElement[]
  }, [elements])

  const box = useMemo(() => calculateBoundingBox(pointElements, selectedIds), [pointElements, selectedIds])

  const elementCenters = useMemo(() => {
    return selectedIds.map(id => {
      const element = elements.find(el => el.id === id)
      if (!element || !('points' in element)) return null
      const pointEl = element as PointElement
      const center = calculateElementCenter(pointEl)
      return {
        id,
        center,
        screenX: center.x * DEFAULTS.MM_TO_PX,
        screenY: center.y * DEFAULTS.MM_TO_PX,
      }
    }).filter(Boolean) as { id: string; center: Point; screenX: number; screenY: number }[]
  }, [elements, selectedIds])

  const selectionCenter = useMemo(() => {
    if (!box) return null
    return {
      x: (box.x + box.width / 2) * DEFAULTS.MM_TO_PX,
      y: (box.y + box.height / 2) * DEFAULTS.MM_TO_PX,
    }
  }, [box])

  if (!box) return null

  const x = box.x * DEFAULTS.MM_TO_PX
  const y = box.y * DEFAULTS.MM_TO_PX
  const width = box.width * DEFAULTS.MM_TO_PX
  const height = box.height * DEFAULTS.MM_TO_PX

  const handleSize = 8 / Math.max(scale, 0.5)
  const halfHandle = handleSize / 2

  const handles = [
    { id: 'nw', x: x - halfHandle, y: y - halfHandle, cursor: 'nw-resize' },
    { id: 'n', x: x + width / 2 - halfHandle, y: y - halfHandle, cursor: 'n-resize' },
    { id: 'ne', x: x + width - halfHandle, y: y - halfHandle, cursor: 'ne-resize' },
    { id: 'e', x: x + width - halfHandle, y: y + height / 2 - halfHandle, cursor: 'e-resize' },
    { id: 'se', x: x + width - halfHandle, y: y + height - halfHandle, cursor: 'se-resize' },
    { id: 's', x: x + width / 2 - halfHandle, y: y + height - halfHandle, cursor: 's-resize' },
    { id: 'sw', x: x - halfHandle, y: y + height - halfHandle, cursor: 'sw-resize' },
    { id: 'w', x: x - halfHandle, y: y + height / 2 - halfHandle, cursor: 'w-resize' },
  ]

  const crosshairLength = 7 * DEFAULTS.MM_TO_PX
  const crosshairThickness = 1

  const handleMouseDown = (handleId: string) => (e: React.MouseEvent) => {
    e.stopPropagation()
    onHandleDragStart?.(handleId, { x: e.clientX, y: e.clientY }, e.altKey)
  }

  return (
    <g pointerEvents="none">
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="none"
        stroke={SELECTION_COLOR}
        strokeWidth={1}
        strokeDasharray="4,4"
        vectorEffect="non-scaling-stroke"
        style={{ pointerEvents: 'all' }}
        onMouseDown={(e) => e.stopPropagation()}
      />

      {handles.map(handle => (
        <rect
          key={handle.id}
          x={handle.x}
          y={handle.y}
          width={handleSize}
          height={handleSize}
          fill="#ffffff"
          stroke={SELECTION_COLOR}
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
          style={{ cursor: handle.cursor, pointerEvents: 'all' }}
          onMouseDown={handleMouseDown(handle.id)}
        />
      ))}

      {elementCenters.map(({ id, screenX, screenY }) => (
        <circle
          key={`center-${id}`}
          cx={screenX}
          cy={screenY}
          r={2.5}
          fill={SELECTION_COLOR}
        />
      ))}

      {selectionCenter && (
        <>
          <line
            x1={selectionCenter.x - crosshairLength / 2}
            y1={selectionCenter.y}
            x2={selectionCenter.x + crosshairLength / 2}
            y2={selectionCenter.y}
            stroke={SELECTION_COLOR}
            strokeWidth={crosshairThickness}
            strokeLinecap="round"
          />
          <line
            x1={selectionCenter.x}
            y1={selectionCenter.y - crosshairLength / 2}
            x2={selectionCenter.x}
            y2={selectionCenter.y + crosshairLength / 2}
            stroke={SELECTION_COLOR}
            strokeWidth={crosshairThickness}
            strokeLinecap="round"
          />
        </>
      )}
    </g>
  )
}
