/**
 * Direct Selection Box Component
 * 
 * Renders selection handles on individual vertices for direct selection tool.
 * Shows path outline following the element shape, not bounding box.
 * Vertices are shown as squares with dark blue fill.
 * Selected vertices change to dark purple.
 * Supports multiple vertex selection via Ctrl+Click.
 * Shows Bezier control handles for corner vertices.
 */

import { useMemo, useState, useEffect } from 'react'
import type { SVGElement, PointElement, Point } from '@/types-app/index'
import { DEFAULTS } from '@constants/index'

export interface DirectSelectionBoxProps {
  elements: SVGElement[]
  selectedIds: string[]
  scale: number
  onVertexDragStart?: (elementId: string, vertexIndices: number[], startPoint: Point) => void
  onControlDragStart?: (elementId: string, vertexIndex: number, controlType: 'cp1' | 'cp2', startPoint: Point) => void
  selectedVertices?: Set<string>
  onVertexSelect?: (elementId: string, vertexIndex: number, addToSelection: boolean) => void
}

const HANDLE_COLOR = '#0047AB'
const BEZIER_HANDLE_COLOR = '#FF6B35'
const HANDLE_SIZE = 10
const CONTROL_HANDLE_SIZE = 8

function vertexKey(elementId: string, vertexIndex: number): string {
  return `${elementId}:${vertexIndex}`
}

export const DirectSelectionBox: React.FC<DirectSelectionBoxProps> = ({ 
  elements, 
  selectedIds,
  scale,
  onVertexDragStart,
  onControlDragStart,
  selectedVertices,
  onVertexSelect,
}) => {
  const [internalSelectedVertices, setInternalSelectedVertices] = useState<Set<string>>(new Set())
  
  const isExternalSelection = selectedVertices !== undefined
  const currentSelectedVertices = isExternalSelection ? selectedVertices : internalSelectedVertices
  
  const handleSize = HANDLE_SIZE / Math.max(scale, 0.5)
  const halfHandle = handleSize / 2
  const controlHandleSize = CONTROL_HANDLE_SIZE / Math.max(scale, 0.5)
  const halfControlHandle = controlHandleSize / 2

  const selectedElements = useMemo(() => {
    return elements.filter(el => selectedIds.includes(el.id) && 'points' in el) as PointElement[]
  }, [elements, selectedIds])

  useEffect(() => {
    if (isExternalSelection) {
      setInternalSelectedVertices(new Set())
    }
  }, [isExternalSelection, selectedIds])

  if (selectedElements.length === 0) return null

  const handleVertexClick = (elementId: string, vertexIndex: number) => (e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (onVertexSelect) {
      onVertexSelect(elementId, vertexIndex, e.ctrlKey || e.metaKey)
    } else {
      const key = vertexKey(elementId, vertexIndex)
      setInternalSelectedVertices(prev => {
        const next = new Set(prev)
        if (e.ctrlKey || e.metaKey) {
          if (next.has(key)) {
            next.delete(key)
          } else {
            next.add(key)
          }
        } else {
          next.clear()
          next.add(key)
        }
        return next
      })
    }
  }

  const handleVertexMouseDown = (elementId: string, vertexIndex: number) => (e: React.MouseEvent) => {
    e.stopPropagation()
    
    const key = vertexKey(elementId, vertexIndex)
    let indices: number[]
    
    if (currentSelectedVertices.has(key)) {
      indices = Array.from(currentSelectedVertices)
        .filter(k => k.startsWith(elementId + ':'))
        .filter(k => !k.includes(':cp'))
        .map(k => parseInt(k.split(':')[1], 10))
    } else {
      indices = [vertexIndex]
    }
    
    onVertexDragStart?.(elementId, indices, { x: e.clientX, y: e.clientY })
  }

  const handleControlMouseDown = (elementId: string, vertexIndex: number, controlType: 'cp1' | 'cp2') => (e: React.MouseEvent) => {
    e.stopPropagation()
    onControlDragStart?.(elementId, vertexIndex, controlType, { x: e.clientX, y: e.clientY })
  }

  const isVertexSelected = (elementId: string, vertexIndex: number) => {
    return currentSelectedVertices.has(vertexKey(elementId, vertexIndex))
  }

  return (
    <g pointerEvents="none">
      {selectedElements.map(element => {
        const points = element.points
        
        return (
          <g key={element.id}>
            {points.map((p, index) => {
              const isSelected = isVertexSelected(element.id, index)
              const px = p.x * DEFAULTS.MM_TO_PX
              const py = p.y * DEFAULTS.MM_TO_PX
              const showHandles = p.vertexType === 'corner' || p.vertexType === 'smooth'
              
              return (
                <g key={`vertex-${index}`}>
                  {showHandles && p.cp1 && p.cp1.targetVertexIndex !== null && (
                    <>
                      <line
                        x1={px}
                        y1={py}
                        x2={p.cp1.x * DEFAULTS.MM_TO_PX}
                        y2={p.cp1.y * DEFAULTS.MM_TO_PX}
                        stroke={BEZIER_HANDLE_COLOR}
                        strokeWidth={0.3}
                        vectorEffect="non-scaling-stroke"
                        style={{ pointerEvents: 'none' }}
                      />
                      <rect
                        x={p.cp1.x * DEFAULTS.MM_TO_PX - halfControlHandle}
                        y={p.cp1.y * DEFAULTS.MM_TO_PX - halfControlHandle}
                        width={controlHandleSize}
                        height={controlHandleSize}
                        fill={BEZIER_HANDLE_COLOR}
                        style={{ pointerEvents: 'all', cursor: 'move' }}
                        onMouseDown={handleControlMouseDown(element.id, index, 'cp1')}
                      />
                    </>
                  )}
                  
                  {showHandles && p.cp2 && p.cp2.targetVertexIndex !== null && (
                    <>
                      <line
                        x1={px}
                        y1={py}
                        x2={p.cp2.x * DEFAULTS.MM_TO_PX}
                        y2={p.cp2.y * DEFAULTS.MM_TO_PX}
                        stroke={BEZIER_HANDLE_COLOR}
                        strokeWidth={0.3}
                        vectorEffect="non-scaling-stroke"
                        style={{ pointerEvents: 'none' }}
                      />
                      <rect
                        x={p.cp2.x * DEFAULTS.MM_TO_PX - halfControlHandle}
                        y={p.cp2.y * DEFAULTS.MM_TO_PX - halfControlHandle}
                        width={controlHandleSize}
                        height={controlHandleSize}
                        fill={BEZIER_HANDLE_COLOR}
                        style={{ pointerEvents: 'all', cursor: 'move' }}
                        onMouseDown={handleControlMouseDown(element.id, index, 'cp2')}
                      />
                    </>
                  )}
                  
                  <rect
                    x={px - halfHandle}
                    y={py - halfHandle}
                    width={handleSize}
                    height={handleSize}
                    fill={isSelected ? '#6B238E' : HANDLE_COLOR}
                    style={{ pointerEvents: 'all', cursor: 'move' }}
                    onClick={handleVertexClick(element.id, index)}
                    onMouseDown={handleVertexMouseDown(element.id, index)}
                  />
                </g>
              )
            })}
          </g>
        )
      })}
    </g>
  )
}
