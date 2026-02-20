/**
 * Bounding Box Component
 * 
 * Renders selection bounds with resize handles for selected elements.
 * Also renders rotation center indicators: point for each element and crosshair for selection.
 * For simple lines (2 points), shows special selection: 2 endpoint handles and line overlay.
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
  onRotateStart?: (startPoint: Point, shiftKey: boolean) => void
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
 * Check if element is a simple line (2 points)
 */
function isSimpleLineElement(element: PointElement): boolean {
  return element.isSimpleLine === true && element.points.length === 2
}

/**
 * Bounding Box with resize handles and rotation center indicators
 */
export const BoundingBox: React.FC<BoundingBoxProps> = ({ 
  elements, 
  selectedIds, 
  scale,
  onHandleDragStart,
  onRotateStart,
}) => {
  const pointElements = useMemo(() => {
    return elements.filter(el => 'points' in el) as PointElement[]
  }, [elements])

  const box = useMemo(() => calculateBoundingBox(pointElements, selectedIds), [pointElements, selectedIds])

  const simpleLineElement = useMemo(() => {
    if (selectedIds.length !== 1) return null
    const element = elements.find(el => el.id === selectedIds[0])
    if (!element || !('points' in element)) return null
    const pointEl = element as PointElement
    if (isSimpleLineElement(pointEl)) {
      return pointEl
    }
    return null
  }, [elements, selectedIds])

  const simpleLineEndpoints = useMemo(() => {
    if (!simpleLineElement) return null
    const p1 = simpleLineElement.points[0]
    const p2 = simpleLineElement.points[1]
    return {
      x1: p1.x * DEFAULTS.MM_TO_PX,
      y1: p1.y * DEFAULTS.MM_TO_PX,
      x2: p2.x * DEFAULTS.MM_TO_PX,
      y2: p2.y * DEFAULTS.MM_TO_PX,
    }
  }, [simpleLineElement])

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

  const rotationHandleSize = 42 / Math.max(scale, 0.5)
  const halfRotation = rotationHandleSize / 2

  const lineRotationSize = 60 / Math.max(scale, 0.5)
  const halfLineRotation = lineRotationSize / 2

  const cornerHandles = [
    { id: 'nw', x: x - halfHandle, y: y - halfHandle },
    { id: 'ne', x: x + width - halfHandle, y: y - halfHandle },
    { id: 'se', x: x + width - halfHandle, y: y + height - halfHandle },
    { id: 'sw', x: x - halfHandle, y: y + height - halfHandle },
  ]

  const rotationHandles = [
    { id: 'nw', x: x - halfRotation, y: y - halfRotation },
    { id: 'ne', x: x + width - halfRotation, y: y - halfRotation },
    { id: 'se', x: x + width - halfRotation, y: y + height - halfRotation },
    { id: 'sw', x: x - halfRotation, y: y + halfRotation },
  ]

  const edgeHandles = [
    { id: 'n', x: x + width / 2 - halfHandle, y: y - halfHandle, cursor: 'n-resize' },
    { id: 'e', x: x + width - halfHandle, y: y + height / 2 - halfHandle, cursor: 'e-resize' },
    { id: 's', x: x + width / 2 - halfHandle, y: y + height - halfHandle, cursor: 's-resize' },
    { id: 'w', x: x - halfHandle, y: y + height / 2 - halfHandle, cursor: 'w-resize' },
  ]

  const crosshairLength = 3.5 * DEFAULTS.MM_TO_PX
  const crosshairThickness = 0.5

  const handleMouseDown = (handleId: string) => (e: React.MouseEvent) => {
    e.stopPropagation()
    onHandleDragStart?.(handleId, { x: e.clientX, y: e.clientY }, e.altKey)
  }

  const handleRotateMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation()
    onRotateStart?.({ x: e.clientX, y: e.clientY }, e.shiftKey)
  }

  if (simpleLineElement && simpleLineEndpoints) {
    return (
      <g pointerEvents="none">
        <line
          x1={simpleLineEndpoints.x1}
          y1={simpleLineEndpoints.y1}
          x2={simpleLineEndpoints.x2}
          y2={simpleLineEndpoints.y2}
          stroke={SELECTION_COLOR}
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
          style={{ pointerEvents: 'none' }}
        />
        
        <rect
          x={simpleLineEndpoints.x1 - halfLineRotation}
          y={simpleLineEndpoints.y1 - halfLineRotation}
          width={lineRotationSize}
          height={lineRotationSize}
          fill="transparent"
          style={{ cursor: 'grab', pointerEvents: 'all' }}
          onMouseDown={handleRotateMouseDown}
        />
        
        <rect
          x={simpleLineEndpoints.x2 - halfLineRotation}
          y={simpleLineEndpoints.y2 - halfLineRotation}
          width={lineRotationSize}
          height={lineRotationSize}
          fill="transparent"
          style={{ cursor: 'grab', pointerEvents: 'all' }}
          onMouseDown={handleRotateMouseDown}
        />
        
        <rect
          x={simpleLineEndpoints.x1 - halfRotation}
          y={simpleLineEndpoints.y1 - halfRotation}
          width={rotationHandleSize}
          height={rotationHandleSize}
          fill="transparent"
          style={{ cursor: 'nwse-resize', pointerEvents: 'all' }}
          onMouseDown={handleMouseDown('w')}
        />
        
        <rect
          x={simpleLineEndpoints.x2 - halfRotation}
          y={simpleLineEndpoints.y2 - halfRotation}
          width={rotationHandleSize}
          height={rotationHandleSize}
          fill="transparent"
          style={{ cursor: 'nwse-resize', pointerEvents: 'all' }}
          onMouseDown={handleMouseDown('e')}
        />
        
        <rect
          x={simpleLineEndpoints.x1 - halfHandle}
          y={simpleLineEndpoints.y1 - halfHandle}
          width={handleSize}
          height={handleSize}
          fill="#ffffff"
          stroke={SELECTION_COLOR}
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
          style={{ pointerEvents: 'none' }}
        />
        
        <rect
          x={simpleLineEndpoints.x2 - halfHandle}
          y={simpleLineEndpoints.y2 - halfHandle}
          width={handleSize}
          height={handleSize}
          fill="#ffffff"
          stroke={SELECTION_COLOR}
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
          style={{ pointerEvents: 'none' }}
        />
        
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

  return (
    <g pointerEvents="none">
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="none"
        stroke={SELECTION_COLOR}
        strokeWidth={0.5}
        vectorEffect="non-scaling-stroke"
        style={{ pointerEvents: 'all', animation: 'selectionPulse 2s ease-in-out infinite' }}
        onMouseDown={(e) => e.stopPropagation()}
      />

      {rotationHandles.map(handle => (
        <rect
          key={`rotation-${handle.id}`}
          x={handle.x}
          y={handle.y}
          width={rotationHandleSize}
          height={rotationHandleSize}
          fill="transparent"
          style={{ cursor: 'grab', pointerEvents: 'all' }}
          onMouseDown={handleRotateMouseDown}
        />
      ))}

      {cornerHandles.map(handle => (
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
          style={{ cursor: `${handle.id}-resize`, pointerEvents: 'all' }}
          onMouseDown={handleMouseDown(handle.id)}
        />
      ))}

      {edgeHandles.map(handle => (
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
