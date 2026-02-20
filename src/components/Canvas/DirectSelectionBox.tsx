/**
 * Direct Selection Box Component
 * 
 * Renders selection handles on individual vertices for direct selection tool.
 * Shows path outline following the element shape, not bounding box.
 * Vertices are shown as rounded squares with dark blue outline, no fill.
 * Selected vertex changes to dark purple.
 */

import { useMemo, useState } from 'react'
import type { SVGElement, PointElement, Point } from '@/types-app/index'
import { DEFAULTS } from '@constants/index'

export interface DirectSelectionBoxProps {
  elements: SVGElement[]
  selectedIds: string[]
  scale: number
  onVertexDragStart?: (elementId: string, vertexIndex: number, startPoint: Point) => void
}

const HANDLE_COLOR = '#0047AB'
const HANDLE_SIZE = 6

/**
 * Direct Selection Box with vertex handles
 */
export const DirectSelectionBox: React.FC<DirectSelectionBoxProps> = ({ 
  elements, 
  selectedIds,
  scale,
  onVertexDragStart,
}) => {
  const [selectedVertex, setSelectedVertex] = useState<{ elementId: string; vertexIndex: number } | null>(null)
  const handleSize = HANDLE_SIZE / Math.max(scale, 0.5)
  const halfHandle = handleSize / 2

  const selectedElements = useMemo(() => {
    return elements.filter(el => selectedIds.includes(el.id) && 'points' in el) as PointElement[]
  }, [elements, selectedIds])

  if (selectedElements.length === 0) return null

  const handleVertexMouseDown = (elementId: string, vertexIndex: number) => (e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedVertex({ elementId, vertexIndex })
    onVertexDragStart?.(elementId, vertexIndex, { x: e.clientX, y: e.clientY })
  }

  const isVertexSelected = (elementId: string, vertexIndex: number) => {
    return selectedVertex?.elementId === elementId && selectedVertex?.vertexIndex === vertexIndex
  }

  return (
    <g pointerEvents="none">
      {selectedElements.map(element => {
        const points = element.points
        
        const pathPoints = points.map(p => ({
          x: p.x * DEFAULTS.MM_TO_PX,
          y: p.y * DEFAULTS.MM_TO_PX,
        }))
        
        let pathD = ''
        for (let i = 0; i < pathPoints.length; i++) {
          const p = pathPoints[i]
          if (i === 0) {
            pathD += `M ${p.x} ${p.y}`
          } else {
            if (points[i].cp1 || points[i].cp2) {
              const prev = pathPoints[i - 1]
              const cp1 = points[i].cp1 ? { x: points[i].cp1!.x * DEFAULTS.MM_TO_PX, y: points[i].cp1!.y * DEFAULTS.MM_TO_PX } : prev
              const cp2 = points[i].cp2 ? { x: points[i].cp2!.x * DEFAULTS.MM_TO_PX, y: points[i].cp2!.y * DEFAULTS.MM_TO_PX } : p
              pathD += ` C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${p.x} ${p.y}`
            } else {
              pathD += ` L ${p.x} ${p.y}`
            }
          }
        }
        
        if (element.isClosedShape) {
          pathD += ' Z'
        }

        return (
          <g key={element.id}>
            <path
              d={pathD}
              fill="none"
              stroke="#007acc"
              strokeWidth={0.5}
              strokeDasharray="4,4"
              vectorEffect="non-scaling-stroke"
              style={{ pointerEvents: 'none', animation: 'selectionPulse 2s ease-in-out infinite' }}
            />
            
            {pathPoints.map((p, index) => {
              const isSelected = isVertexSelected(element.id, index)
              return (
                <rect
                  key={`vertex-${index}`}
                  x={p.x - halfHandle}
                  y={p.y - halfHandle}
                  width={handleSize}
                  height={handleSize}
                  rx={1.5}
                  fill="none"
                  stroke={isSelected ? '#6B238E' : HANDLE_COLOR}
                  strokeWidth={0.5}
                  vectorEffect="non-scaling-stroke"
                  style={{ pointerEvents: 'all', cursor: 'move' }}
                  onMouseDown={handleVertexMouseDown(element.id, index)}
                />
              )
            })}
          </g>
        )
      })}
    </g>
  )
}
