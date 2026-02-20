/**
 * Bounding Box Component
 * 
 * Renders selection bounds with resize handles for selected elements.
 * All elements are represented as PointElement with array of points.
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

/**
 * Bounding Box with resize handles
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
        stroke="#007acc"
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
          stroke="#007acc"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
          style={{ cursor: handle.cursor, pointerEvents: 'all' }}
          onMouseDown={handleMouseDown(handle.id)}
        />
      ))}
    </g>
  )
}
