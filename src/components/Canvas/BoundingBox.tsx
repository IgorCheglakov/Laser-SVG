/**
 * Bounding Box Component
 * 
 * Renders selection bounds with resize handles for selected elements.
 */

import { useMemo } from 'react'
import type { SVGElement, RectElement, EllipseElement, LineElement, PolygonElement } from '@/types-app/index'
import { DEFAULTS } from '@constants/index'

interface BoundingBoxProps {
  elements: SVGElement[]
  selectedIds: string[]
  scale: number
  onResizeStart?: (handle: string, startPoint: { x: number; y: number }, startBox: { x: number; y: number; width: number; height: number }) => void
}

/**
 * Calculate bounding box for selected elements
 */
// eslint-disable-next-line react-refresh/only-export-components
export function calculateBoundingBox(elements: SVGElement[], selectedIds: string[]): { x: number; y: number; width: number; height: number } | null {
  if (selectedIds.length === 0) return null

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  selectedIds.forEach(id => {
    const element = elements.find(el => el.id === id)
    if (!element) return

    switch (element.type) {
      case 'rect': {
        const rect = element as RectElement
        minX = Math.min(minX, rect.x)
        minY = Math.min(minY, rect.y)
        maxX = Math.max(maxX, rect.x + rect.width)
        maxY = Math.max(maxY, rect.y + rect.height)
        break
      }
      case 'ellipse': {
        const ellipse = element as EllipseElement
        minX = Math.min(minX, ellipse.cx - ellipse.rx)
        minY = Math.min(minY, ellipse.cy - ellipse.ry)
        maxX = Math.max(maxX, ellipse.cx + ellipse.rx)
        maxY = Math.max(maxY, ellipse.cy + ellipse.ry)
        break
      }
      case 'line': {
        const line = element as LineElement
        minX = Math.min(minX, line.x1, line.x2)
        minY = Math.min(minY, line.y1, line.y2)
        maxX = Math.max(maxX, line.x1, line.x2)
        maxY = Math.max(maxY, line.y1, line.y2)
        break
      }
      case 'polygon': {
        const polygon = element as PolygonElement
        for (const p of polygon.points) {
          minX = Math.min(minX, p.x)
          minY = Math.min(minY, p.y)
          maxX = Math.max(maxX, p.x)
          maxY = Math.max(maxY, p.y)
        }
        break
      }
    }
  })

  if (minX === Infinity) return null

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

/**
 * Bounding Box with resize handles
 */
export const BoundingBox: React.FC<BoundingBoxProps> = ({ elements, selectedIds, scale, onResizeStart }) => {
  const box = useMemo(() => calculateBoundingBox(elements, selectedIds), [elements, selectedIds])

  if (!box) return null

  // Convert to pixels for rendering
  const x = box.x * DEFAULTS.MM_TO_PX
  const y = box.y * DEFAULTS.MM_TO_PX
  const width = box.width * DEFAULTS.MM_TO_PX
  const height = box.height * DEFAULTS.MM_TO_PX

  // Handle size in pixels (fixed size regardless of zoom)
  const handleSize = 8 / Math.max(scale, 0.5)
  const halfHandle = handleSize / 2

  // Handle positions
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
    if (onResizeStart) {
      onResizeStart(handleId, { x: e.clientX, y: e.clientY }, box)
    }
  }

  return (
    <g pointerEvents="none">
      {/* Bounding box outline */}
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
        pointerEvents="none"
      />

      {/* Resize handles */}
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
