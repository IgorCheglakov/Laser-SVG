/**
 * Canvas Component
 * 
 * Main drawing area with white artboard, zoom, and pan functionality.
 * All elements are represented as PointElement with array of points.
 */

import { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import { useEditorStore, saveToHistory } from '../../store/index'
import { getTool } from '@/tools/index'
import type { ToolContext } from '@/tools/types'
import type { Point, SVGElement, PointElement } from '@/types-app/index'
import { snapPoint } from '@/utils/snap'
import { generateId } from '@/utils/id'
import { DEFAULTS } from '@constants/index'
import { BoundingBox } from './BoundingBox'
import { DirectSelectionBox } from './DirectSelectionBox'
import { FloatingPropertiesWidget } from './FloatingPropertiesWidget'
import { transformPoints, parseHandle, rotatePoints, type InitialSize } from '@/utils/transform'

/**
 * Canvas component with artboard, zoom, and tool integration
 */
export const Canvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<SVGSVGElement>(null)
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState<Point>({ x: 0, y: 0 })
  const [previewElement, setPreviewElement] = useState<PointElement | null>(null)
  const startPointRef = useRef<Point>({ x: 0, y: 0 })
  const isDrawingRef = useRef(false)
  const isMovingRef = useRef(false)
  const isResizingRef = useRef(false)
  const resizeHandleRef = useRef<string>('')
  const resizeStartRef = useRef<Point>({ x: 0, y: 0 })
  const resizeFromCenterRef = useRef(false)
  const initialBoxRef = useRef<InitialSize | null>(null)
  const moveStartRef = useRef<Point>({ x: 0, y: 0 })
  const initialElementPositionsRef = useRef<Map<string, Point[]>>(new Map())
  const isFirstMoveRef = useRef(true)
  const isRotatingRef = useRef(false)
  const rotationStartRef = useRef<Point>({ x: 0, y: 0 })
  const rotationShiftRef = useRef(false)
  const isVertexMovingRef = useRef(false)
  const vertexMoveStartRef = useRef<Point>({ x: 0, y: 0 })
  const vertexMoveElementIdRef = useRef<string>('')
  const vertexMoveIndicesRef = useRef<number[]>([])
  const initialVertexPositionsRef = useRef<Map<string, Point[]>>(new Map())
  const isControlMovingRef = useRef(false)
  const controlMoveElementIdRef = useRef<string>('')
  const controlMoveVertexIndexRef = useRef<number>(0)
  const controlMoveTypeRef = useRef<'cp1' | 'cp2'>('cp1')
  const controlMoveStartRef = useRef<Point>({ x: 0, y: 0 })
  const initialControlPositionsRef = useRef<Map<string, Point[]>>(new Map())
  
  const { 
    view, 
    settings, 
    setView, 
    pan,
    elements,
    selectedIds,
    setSelectedIds,
    addElement,
    updateElementNoHistory,
    activeTool,
    selectedVertices,
    setSelectedVertices,
  } = useEditorStore()

  const tool = useMemo(() => getTool(activeTool), [activeTool])

  /**
   * Convert screen coordinates to canvas coordinates (in mm)
   */
  const screenToCanvas = useCallback((screenX: number, screenY: number): Point => {
    if (!containerRef.current) return { x: 0, y: 0 }
    
    const rect = containerRef.current.getBoundingClientRect()
    const x = (screenX - rect.left - view.offsetX) / view.scale / DEFAULTS.MM_TO_PX
    const y = (screenY - rect.top - view.offsetY) / view.scale / DEFAULTS.MM_TO_PX
    
    return { x, y }
  }, [view.offsetX, view.offsetY, view.scale])

  /**
   * Snap point to grid if enabled
   */
  const snapToGrid = useCallback((point: Point): Point => {
    return snapPoint(point, settings.gridSize, settings.snapToGrid)
  }, [settings.gridSize, settings.snapToGrid])

  /**
   * Calculate bounding box for a set of points
   */
  const calculateBounds = useCallback((points: Point[]): { x: number; y: number; width: number; height: number } => {
    if (points.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0 }
    }
    
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    
    for (const p of points) {
      minX = Math.min(minX, p.x)
      minY = Math.min(minY, p.y)
      maxX = Math.max(maxX, p.x)
      maxY = Math.max(maxY, p.y)
    }
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    }
  }, [])

  /**
   * Hit test - find element at point
   */
  const findElementAtPoint = useCallback((point: Point): SVGElement | null => {
    const hitThreshold = 3 / view.scale
    
    for (let i = elements.length - 1; i >= 0; i--) {
      const element = elements[i]
      
      const el = element as PointElement
      if (!el.points) continue
      
      const bounds = calculateBounds(el.points)
      
      if (
        point.x >= bounds.x - hitThreshold &&
        point.x <= bounds.x + bounds.width + hitThreshold &&
        point.y >= bounds.y - hitThreshold &&
        point.y <= bounds.y + bounds.height + hitThreshold
      ) {
        // Check edges
        for (let j = 0; j < el.points.length; j++) {
          const p1 = el.points[j]
          const p2 = el.points[(j + 1) % el.points.length]
          const dist = distanceToLineSegment(point, p1, p2)
          if (dist <= hitThreshold) {
            return element
          }
        }
      }
    }
    
    return null
  }, [elements, view.scale, calculateBounds])

  /**
   * Tool context for passing to tools
   */
  const toolContext: ToolContext = useMemo(() => ({
    view,
    settings,
    screenToCanvas,
    snapPoint: snapToGrid,
    addElement: (element) => {
      addElement(element)
      setPreviewElement(null)
    },
  }), [view, settings, screenToCanvas, snapToGrid, addElement])

  /**
   * Handle mouse wheel for zooming (centered on cursor)
   */
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    
    if (!containerRef.current) return
    
    const rect = containerRef.current.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    
    const delta = e.deltaY > 0 ? -DEFAULTS.ZOOM_STEP : DEFAULTS.ZOOM_STEP
    const newScale = Math.max(
      DEFAULTS.MIN_ZOOM,
      Math.min(DEFAULTS.MAX_ZOOM, view.scale + delta)
    )
    
    const scaleRatio = newScale / view.scale
    const newOffsetX = mouseX - (mouseX - view.offsetX) * scaleRatio
    const newOffsetY = mouseY - (mouseY - view.offsetY) * scaleRatio
    
    setView({
      scale: newScale,
      offsetX: newOffsetX,
      offsetY: newOffsetY,
    })
  }, [view.scale, view.offsetX, view.offsetY, setView])

  /**
   * Calculate bounding box for selected elements
   */
  const calculateBoundsForSelected = useCallback((): InitialSize | null => {
    if (selectedIds.length === 0) return null
    
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    
    selectedIds.forEach(id => {
      const el = elements.find(el => el.id === id)
      if (el && 'points' in el) {
        const pointEl = el as PointElement
        for (const p of pointEl.points) {
          minX = Math.min(minX, p.x)
          minY = Math.min(minY, p.y)
          maxX = Math.max(maxX, p.x)
          maxY = Math.max(maxY, p.y)
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
  }, [elements, selectedIds])

  /**
   * Handle resize start from BoundingBox handle
   */
  const handleResizeStart = useCallback((handle: string, clientPoint: Point, altKey: boolean) => {
    isResizingRef.current = true
    resizeHandleRef.current = handle
    resizeFromCenterRef.current = altKey
    
    const point = screenToCanvas(clientPoint.x, clientPoint.y)
    resizeStartRef.current = point
    
    const box = calculateBoundsForSelected()
    if (box) {
      initialBoxRef.current = box
    }
    
    initialElementPositionsRef.current.clear()
    selectedIds.forEach(id => {
      const el = elements.find(el => el.id === id)
      if (el && 'points' in el) {
        const pointEl = el as PointElement
        initialElementPositionsRef.current.set(id, JSON.parse(JSON.stringify(pointEl.points)))
      }
    })
    
    saveToHistory()
  }, [elements, selectedIds, screenToCanvas, calculateBoundsForSelected])

  /**
   * Handle rotation start from BoundingBox rotation handle
   */
  const handleRotateStart = useCallback((clientPoint: Point, shiftKey: boolean) => {
    isRotatingRef.current = true
    rotationStartRef.current = clientPoint
    rotationShiftRef.current = shiftKey
    
    const box = calculateBoundsForSelected()
    if (box) {
      initialBoxRef.current = box
    }
    
    initialElementPositionsRef.current.clear()
    selectedIds.forEach(id => {
      const el = elements.find(el => el.id === id)
      if (el && 'points' in el) {
        const pointEl = el as PointElement
        initialElementPositionsRef.current.set(id, JSON.parse(JSON.stringify(pointEl.points)))
      }
    })
    
    saveToHistory()
  }, [elements, selectedIds, calculateBoundsForSelected])

  /**
   * Handle vertex selection for direct selection tool
   */
  const handleVertexSelect = useCallback((elementId: string, vertexIndex: number, addToSelection: boolean) => {
    const key = `${elementId}:${vertexIndex}`
    const current = selectedVertices
    const next = new Set(current)
    if (addToSelection) {
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
    } else {
      next.clear()
      next.add(key)
    }
    setSelectedVertices(next)
  }, [selectedVertices, setSelectedVertices])

  /**
   * Handle vertex drag start
   */
  const handleVertexDragStart = useCallback((elementId: string, vertexIndices: number[], clientPoint: Point) => {
    isVertexMovingRef.current = true
    vertexMoveElementIdRef.current = elementId
    vertexMoveIndicesRef.current = vertexIndices
    vertexMoveStartRef.current = clientPoint
    
    const el = elements.find(el => el.id === elementId)
    if (el && 'points' in el) {
      const pointEl = el as PointElement
      initialVertexPositionsRef.current.set(elementId, JSON.parse(JSON.stringify(pointEl.points)))
    }
    
    saveToHistory()
  }, [elements])

  /**
   * Handle control point drag start
   */
  const handleControlDragStart = useCallback((elementId: string, vertexIndex: number, controlType: 'cp1' | 'cp2', clientPoint: Point) => {
    isControlMovingRef.current = true
    controlMoveElementIdRef.current = elementId
    controlMoveVertexIndexRef.current = vertexIndex
    controlMoveTypeRef.current = controlType
    controlMoveStartRef.current = clientPoint
    
    const el = elements.find(el => el.id === elementId)
    if (el && 'points' in el) {
      const pointEl = el as PointElement
      initialControlPositionsRef.current.set(elementId, JSON.parse(JSON.stringify(pointEl.points)))
    }
    
    saveToHistory()
  }, [elements])

  /**
   * Calculate angle from center to point (in degrees)
   */
  const calculateAngle = useCallback((point: Point, center: Point): number => {
    return Math.atan2(point.y - center.y, point.x - center.x) * 180 / Math.PI
  }, [])

  /**
   * Handle mouse down
   */
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1) {
      e.preventDefault()
      setIsPanning(true)
      setPanStart({ x: e.clientX, y: e.clientY })
      return
    }
    
    if (e.button === 0) {
      const target = e.target as HTMLElement
      if (target.tagName !== 'INPUT') {
        const active = document.activeElement as HTMLElement
        if (active) active.blur()
      }

      const point = screenToCanvas(e.clientX, e.clientY)
      
      if (activeTool === 'selection') {
        const clickedElement = findElementAtPoint(point)
        
        if (clickedElement) {
          if (e.ctrlKey || e.metaKey) {
            if (selectedIds.includes(clickedElement.id)) {
              setSelectedIds(selectedIds.filter(id => id !== clickedElement.id))
            } else {
              setSelectedIds([...selectedIds, clickedElement.id])
            }
          } else {
            if (!selectedIds.includes(clickedElement.id)) {
              setSelectedIds([clickedElement.id])
            }
            
            isMovingRef.current = true
            moveStartRef.current = point
            isFirstMoveRef.current = true
            
            initialElementPositionsRef.current.clear()
            selectedIds.forEach(id => {
              const el = elements.find(el => el.id === id)
              if (el && 'points' in el) {
                const pointEl = el as PointElement
                initialElementPositionsRef.current.set(id, [...pointEl.points])
              }
            })
          }
        } else {
          if (!e.ctrlKey && !e.metaKey) {
            setSelectedIds([])
          }
        }
      } else if (activeTool === 'directSelection') {
        const clickedElement = findElementAtPoint(point)
        
        if (clickedElement) {
          if (e.ctrlKey || e.metaKey) {
            if (selectedIds.includes(clickedElement.id)) {
              setSelectedIds(selectedIds.filter(id => id !== clickedElement.id))
            } else {
              setSelectedIds([...selectedIds, clickedElement.id])
            }
          } else {
            if (!selectedIds.includes(clickedElement.id)) {
              setSelectedIds([clickedElement.id])
            }
          }
        } else {
          if (!e.ctrlKey && !e.metaKey) {
            setSelectedIds([])
          }
        }
      } else if (activeTool === 'rectangle' || activeTool === 'line' || activeTool === 'trapezoid') {
        isMovingRef.current = false
        initialElementPositionsRef.current.clear()
        
        const snappedPoint = snapToGrid(point)
        startPointRef.current = snappedPoint
        isDrawingRef.current = true
        
        if (activeTool === 'rectangle') {
          setPreviewElement({
            id: 'preview',
            type: 'point',
            name: 'Rectangle',
            points: [
              { x: snappedPoint.x, y: snappedPoint.y },
              { x: snappedPoint.x, y: snappedPoint.y },
              { x: snappedPoint.x, y: snappedPoint.y },
              { x: snappedPoint.x, y: snappedPoint.y },
            ],
            stroke: '#000000',
              strokeWidth: 1,
            visible: true,
            locked: false,
            isClosedShape: true,
          })
        } else if (activeTool === 'line') {
          setPreviewElement({
            id: 'preview',
            type: 'point',
            name: 'Line',
            points: [
              { x: snappedPoint.x, y: snappedPoint.y },
              { x: snappedPoint.x, y: snappedPoint.y },
            ],
            stroke: '#000000',
              strokeWidth: 1,
            visible: true,
            locked: false,
            isClosedShape: false,
            isSimpleLine: true,
          })
        } else if (activeTool === 'trapezoid') {
          setPreviewElement({
            id: 'preview',
            type: 'point',
            name: 'Trapezoid',
            points: [
              { x: snappedPoint.x, y: snappedPoint.y },
              { x: snappedPoint.x, y: snappedPoint.y },
              { x: snappedPoint.x, y: snappedPoint.y },
              { x: snappedPoint.x, y: snappedPoint.y },
            ],
            stroke: '#000000',
              strokeWidth: 1,
            visible: true,
            locked: false,
            isClosedShape: true,
          })
        }
      }
      
      tool.onMouseDown(e, toolContext)
    }
  }, [activeTool, tool, toolContext, screenToCanvas, snapToGrid, findElementAtPoint, selectedIds, setSelectedIds, elements])

  /**
   * Handle mouse move
   */
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      const deltaX = e.clientX - panStart.x
      const deltaY = e.clientY - panStart.y
      
      pan(deltaX, deltaY)
      setPanStart({ x: e.clientX, y: e.clientY })
      return
    }
    
    if (isMovingRef.current && (e.buttons & 1)) {
      let point = screenToCanvas(e.clientX, e.clientY)
      
      if (settings.snapToGrid) {
        point = snapToGrid(point)
      }
      
      const deltaX = point.x - moveStartRef.current.x
      const deltaY = point.y - moveStartRef.current.y
      
      if (isFirstMoveRef.current) {
        saveToHistory()
        isFirstMoveRef.current = false
      }
      
      selectedIds.forEach(id => {
        const initialPoints = initialElementPositionsRef.current.get(id)
        if (!initialPoints) return
        
        const newPoints = initialPoints.map(p => ({
          x: p.x + deltaX,
          y: p.y + deltaY
        }))
        
        updateElementNoHistory(id, { points: newPoints } as Partial<SVGElement>)
      })
    }

    if (isVertexMovingRef.current && (e.buttons & 1)) {
      const currentPoint = screenToCanvas(e.clientX, e.clientY)
      let dx = currentPoint.x - screenToCanvas(vertexMoveStartRef.current.x, vertexMoveStartRef.current.y).x
      let dy = currentPoint.y - screenToCanvas(vertexMoveStartRef.current.x, vertexMoveStartRef.current.y).y
      
      if (settings.snapToGrid) {
        const startPoint = screenToCanvas(vertexMoveStartRef.current.x, vertexMoveStartRef.current.y)
        const snappedStart = snapToGrid(startPoint)
        const snappedCurrent = snapToGrid(currentPoint)
        dx = snappedCurrent.x - snappedStart.x
        dy = snappedCurrent.y - snappedStart.y
      }
      
      const elementId = vertexMoveElementIdRef.current
      const indices = vertexMoveIndicesRef.current
      const initialPositions = initialVertexPositionsRef.current.get(elementId)
      
      if (!initialPositions) return
      
      const el = elements.find(el => el.id === elementId)
      if (!el || !('points' in el)) return
      
      const pointEl = el as PointElement
      const newPoints = [...pointEl.points]
      
      for (const index of indices) {
        if (index >= 0 && index < newPoints.length) {
          newPoints[index] = {
            x: initialPositions[index].x + dx,
            y: initialPositions[index].y + dy,
          }
        }
      }
      
      updateElementNoHistory(elementId, { points: newPoints } as Partial<SVGElement>)
    }

    if (isControlMovingRef.current && (e.buttons & 1)) {
      const currentPoint = screenToCanvas(e.clientX, e.clientY)
      let dx = currentPoint.x - screenToCanvas(controlMoveStartRef.current.x, controlMoveStartRef.current.y).x
      let dy = currentPoint.y - screenToCanvas(controlMoveStartRef.current.x, controlMoveStartRef.current.y).y
      
      if (settings.snapToGrid) {
        const startPoint = screenToCanvas(controlMoveStartRef.current.x, controlMoveStartRef.current.y)
        const snappedStart = snapToGrid(startPoint)
        const snappedCurrent = snapToGrid(currentPoint)
        dx = snappedCurrent.x - snappedStart.x
        dy = snappedCurrent.y - snappedStart.y
      }
      
      const elementId = controlMoveElementIdRef.current
      const vertexIndex = controlMoveVertexIndexRef.current
      const controlType = controlMoveTypeRef.current
      const initialPositions = initialControlPositionsRef.current.get(elementId)
      
      if (!initialPositions) return
      
      const el = elements.find(el => el.id === elementId)
      if (!el || !('points' in el)) return
      
      const pointEl = el as PointElement
      const newPoints = [...pointEl.points]
      
      if (vertexIndex >= 0 && vertexIndex < newPoints.length) {
        const initialPoint = initialPositions[vertexIndex]
        const targetCp = controlType === 'cp1' ? initialPoint.cp1 : initialPoint.cp2
        
        if (targetCp) {
          if (controlType === 'cp1') {
            newPoints[vertexIndex] = {
              ...newPoints[vertexIndex],
              cp1: {
                x: targetCp.x + dx,
                y: targetCp.y + dy,
                targetVertexIndex: targetCp.targetVertexIndex,
              },
            }
          } else {
            newPoints[vertexIndex] = {
              ...newPoints[vertexIndex],
              cp2: {
                x: targetCp.x + dx,
                y: targetCp.y + dy,
                targetVertexIndex: targetCp.targetVertexIndex,
              },
            }
          }
        }
      }
      
      updateElementNoHistory(elementId, { points: newPoints } as Partial<SVGElement>)
    }

    if (isResizingRef.current && (e.buttons & 1)) {
      const currentPoint = screenToCanvas(e.clientX, e.clientY)
      let dx = currentPoint.x - resizeStartRef.current.x
      let dy = currentPoint.y - resizeStartRef.current.y
      
      if (settings.snapToGrid) {
        const snappedPoint = snapToGrid(currentPoint)
        const startSnapped = snapToGrid(resizeStartRef.current)
        dx = snappedPoint.x - startSnapped.x
        dy = snappedPoint.y - startSnapped.y
      }
      
      const handle = parseHandle(resizeHandleRef.current)
      const initialBox = initialBoxRef.current
      
      if (!initialBox) return
      
      const isSimpleLine = selectedIds.length === 1 && (() => {
        const el = elements.find(el => el.id === selectedIds[0])
        const pointEl = el as PointElement | undefined
        return pointEl && 'points' in pointEl && pointEl.points.length === 2 && pointEl.isSimpleLine === true
      })()

      if (isSimpleLine) {
        const initialPoints = initialElementPositionsRef.current.get(selectedIds[0])
        if (!initialPoints || initialPoints.length !== 2) return

        const pointIndex = resizeHandleRef.current === 'w' ? 0 : 1
        const newPoints = [...initialPoints]
        
        if (settings.snapToGrid) {
          newPoints[pointIndex] = {
            x: Math.round(initialPoints[pointIndex].x / settings.gridSize) * settings.gridSize + dx,
            y: Math.round(initialPoints[pointIndex].y / settings.gridSize) * settings.gridSize + dy,
          }
        } else {
          newPoints[pointIndex] = {
            x: initialPoints[pointIndex].x + dx,
            y: initialPoints[pointIndex].y + dy,
          }
        }
        
        updateElementNoHistory(selectedIds[0], { points: newPoints } as Partial<SVGElement>)
      } else {
        selectedIds.forEach(id => {
          const initialPoints = initialElementPositionsRef.current.get(id)
          if (!initialPoints) return
          
          const newPoints = transformPoints(
            initialPoints,
            initialBox,
            { dx, dy },
            handle,
            resizeFromCenterRef.current
          )
          
          updateElementNoHistory(id, { points: newPoints } as Partial<SVGElement>)
        })
      }
    }

    if (isRotatingRef.current && (e.buttons & 1)) {
      const initialBox = initialBoxRef.current
      if (!initialBox) return

      const centerX = initialBox.x + initialBox.width / 2
      const centerY = initialBox.y + initialBox.height / 2

      const startPoint = screenToCanvas(rotationStartRef.current.x, rotationStartRef.current.y)
      const currentPoint = screenToCanvas(e.clientX, e.clientY)

      const startAngle = calculateAngle(startPoint, { x: centerX, y: centerY })
      const currentAngle = calculateAngle(currentPoint, { x: centerX, y: centerY })

      let angleDelta = currentAngle - startAngle

      const isSimpleLineRotation = selectedIds.length === 1 && (() => {
        const el = elements.find(el => el.id === selectedIds[0])
        const pointEl = el as PointElement | undefined
        return pointEl && 'points' in pointEl && pointEl.points.length === 2 && pointEl.isSimpleLine === true
      })()

      if (isSimpleLineRotation) {
        if (rotationShiftRef.current) {
          const snapStep = 45
          angleDelta = Math.round(angleDelta / snapStep) * snapStep
        }
      } else {
        if (!rotationShiftRef.current) {
          const snapStep = 45
          angleDelta = Math.round(angleDelta / snapStep) * snapStep
        }
      }

      selectedIds.forEach(id => {
        const initialPoints = initialElementPositionsRef.current.get(id)
        if (!initialPoints) return

        const newPoints = rotatePoints(
          initialPoints,
          { x: centerX, y: centerY },
          angleDelta
        )

        updateElementNoHistory(id, { points: newPoints } as Partial<SVGElement>)
      })
    }
    
    if (isDrawingRef.current && previewElement && (e.buttons & 1)) {
      const currentPoint = screenToCanvas(e.clientX, e.clientY)
      const snappedPoint = snapToGrid(currentPoint)
      const startPoint = startPointRef.current
      
      setPreviewElement(prev => {
        if (!prev || !prev.points) return prev
        
        if (activeTool === 'rectangle') {
          const x = Math.min(startPoint.x, snappedPoint.x)
          const y = Math.min(startPoint.y, snappedPoint.y)
          const width = Math.abs(snappedPoint.x - startPoint.x)
          const height = Math.abs(snappedPoint.y - startPoint.y)
          
          return {
            ...prev,
            points: [
              { x, y },
              { x: x + width, y },
              { x: x + width, y: y + height },
              { x, y: y + height },
            ]
          }
        }
        
        if (activeTool === 'line') {
          return {
            ...prev,
            points: [
              { x: startPoint.x, y: startPoint.y },
              { x: snappedPoint.x, y: snappedPoint.y },
            ]
          }
        }
        
        if (activeTool === 'trapezoid') {
          const x = Math.min(startPoint.x, snappedPoint.x)
          const y = Math.min(startPoint.y, snappedPoint.y)
          const width = Math.abs(snappedPoint.x - startPoint.x)
          const height = Math.abs(snappedPoint.y - startPoint.y)
          
          const topWidth = width * 0.6
          return {
            ...prev,
            points: [
              { x, y },
              { x: x + topWidth, y },
              { x: x + width, y: y + height },
              { x, y: y + height },
            ]
          }
        }
        
        return prev
      })
    }
    
    tool.onMouseMove(e, toolContext)
  }, [isPanning, panStart, pan, isResizingRef, isMovingRef, isRotatingRef, rotationStartRef, rotationShiftRef, resizeHandleRef, resizeStartRef, initialBoxRef, selectedIds, elements, previewElement, activeTool, tool, toolContext, screenToCanvas, snapToGrid, updateElementNoHistory, calculateAngle, settings])

  /**
   * Handle mouse up
   */
  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setIsPanning(false)
      return
    }
    
    if (isMovingRef.current) {
      isMovingRef.current = false
      initialElementPositionsRef.current.clear()
      isFirstMoveRef.current = true
    }

    if (isResizingRef.current) {
      isResizingRef.current = false
      resizeHandleRef.current = ''
      resizeFromCenterRef.current = false
      initialBoxRef.current = null
      initialElementPositionsRef.current.clear()
    }

    if (isRotatingRef.current) {
      isRotatingRef.current = false
      rotationStartRef.current = { x: 0, y: 0 }
      rotationShiftRef.current = false
      initialBoxRef.current = null
      initialElementPositionsRef.current.clear()
    }

    if (isVertexMovingRef.current) {
      isVertexMovingRef.current = false
      vertexMoveElementIdRef.current = ''
      vertexMoveIndicesRef.current = []
      vertexMoveStartRef.current = { x: 0, y: 0 }
      initialVertexPositionsRef.current.clear()
    }

    if (isControlMovingRef.current) {
      isControlMovingRef.current = false
      controlMoveElementIdRef.current = ''
      controlMoveVertexIndexRef.current = 0
      controlMoveTypeRef.current = 'cp1'
      controlMoveStartRef.current = { x: 0, y: 0 }
      initialControlPositionsRef.current.clear()
    }
    
    if (isDrawingRef.current && previewElement) {
      isDrawingRef.current = false
      
      const bounds = calculateBounds(previewElement.points)
      const hasSize = bounds.width > 0.1 && bounds.height > 0.1
      
      if (hasSize) {
        const finalElement = { ...previewElement, id: generateId() }
        addElement(finalElement)
      }
      
      setPreviewElement(null)
    }
    
    tool.onMouseUp(e, toolContext)
  }, [isPanning, previewElement, tool, toolContext, addElement, calculateBounds])

  /**
   * Handle context menu
   */
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
  }, [])

  /**
   * Global mouse up handler
   */
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isPanning) {
        setIsPanning(false)
      }
      
      if (isMovingRef.current) {
        isMovingRef.current = false
        initialElementPositionsRef.current.clear()
      }

      if (isResizingRef.current) {
        isResizingRef.current = false
        resizeHandleRef.current = ''
        resizeFromCenterRef.current = false
        initialBoxRef.current = null
        initialElementPositionsRef.current.clear()
      }

      if (isRotatingRef.current) {
        isRotatingRef.current = false
        rotationStartRef.current = { x: 0, y: 0 }
        rotationShiftRef.current = false
        initialBoxRef.current = null
        initialElementPositionsRef.current.clear()
      }

      if (isVertexMovingRef.current) {
        isVertexMovingRef.current = false
        vertexMoveElementIdRef.current = ''
        vertexMoveIndicesRef.current = []
        vertexMoveStartRef.current = { x: 0, y: 0 }
        initialVertexPositionsRef.current.clear()
      }

      if (isControlMovingRef.current) {
        isControlMovingRef.current = false
        controlMoveElementIdRef.current = ''
        controlMoveVertexIndexRef.current = 0
        controlMoveTypeRef.current = 'cp1'
        controlMoveStartRef.current = { x: 0, y: 0 }
        initialControlPositionsRef.current.clear()
      }
      
      if (isDrawingRef.current && previewElement) {
        isDrawingRef.current = false
        
        const bounds = calculateBounds(previewElement.points)
        const hasSize = bounds.width > 0.1 && bounds.height > 0.1
        
        if (hasSize) {
          const finalElement = { ...previewElement, id: generateId() }
          addElement(finalElement)
        }
        
        setPreviewElement(null)
      }
    }
    
    window.addEventListener('mouseup', handleGlobalMouseUp)
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp)
  }, [isPanning, previewElement, addElement, calculateBounds])

  /**
   * Calculate artboard dimensions in pixels
   */
  const artboardWidthPx = settings.artboardWidth * DEFAULTS.MM_TO_PX
  const artboardHeightPx = settings.artboardHeight * DEFAULTS.MM_TO_PX

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-canvas-bg overflow-hidden relative cursor-crosshair"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onContextMenu={handleContextMenu}
    >
      <svg
        ref={canvasRef}
        className="w-full h-full"
        style={{
          transform: `translate(${view.offsetX}px, ${view.offsetY}px) scale(${view.scale})`,
          transformOrigin: '0 0',
        }}
      >
        <defs>
          <pattern
            id="grid"
            x={0}
            y={0}
            width={DEFAULTS.MM_TO_PX}
            height={DEFAULTS.MM_TO_PX}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${DEFAULTS.MM_TO_PX} 0 L 0 0 0 ${DEFAULTS.MM_TO_PX}`}
              fill="none"
              stroke="#0a0a0a"
              strokeWidth={0.45 / view.scale}
              vectorEffect="non-scaling-stroke"
            />
          </pattern>
          
          <pattern
            id="gridBold"
            x={0}
            y={0}
            width={DEFAULTS.MM_TO_PX * 10}
            height={DEFAULTS.MM_TO_PX * 10}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${DEFAULTS.MM_TO_PX * 10} 0 L 0 0 0 ${DEFAULTS.MM_TO_PX * 10}`}
              fill="none"
              stroke="#1a1a1a"
              strokeWidth={3 / view.scale}
              vectorEffect="non-scaling-stroke"
            />
          </pattern>
        </defs>

        {settings.showGrid && (
          <>
            {view.scale >= 2.5 && (
              <rect
                x={-10000}
                y={-10000}
                width={20000}
                height={20000}
                fill="url(#grid)"
                opacity={0.94}
              />
            )}
            <rect
              x={-10000}
              y={-10000}
              width={20000}
              height={20000}
              fill="url(#gridBold)"
              opacity={0.2}
            />
          </>
        )}

        <rect
          x={0}
          y={0}
          width={artboardWidthPx}
          height={artboardHeightPx}
          fill="#ffffff"
          stroke="#555555"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />

        {settings.showGrid && (
          <>
            {view.scale >= 2.5 && (
              <rect
                x={0}
                y={0}
                width={artboardWidthPx}
                height={artboardHeightPx}
                fill="url(#grid)"
                opacity={0.9}
                pointerEvents="none"
              />
            )}
            <rect
              x={0}
              y={0}
              width={artboardWidthPx}
              height={artboardHeightPx}
              fill="url(#gridBold)"
              opacity={0.2}
              pointerEvents="none"
            />
          </>
        )}

        <g id="elements">
          {elements.map((element) => (
            <CanvasElement 
              key={element.id} 
              element={element} 
              isSelected={selectedIds.includes(element.id)}
            />
          ))}
        </g>

        {previewElement && (
          <CanvasElement element={previewElement} isPreview />
        )}

        {selectedIds.length > 0 && activeTool === 'selection' && (
          <BoundingBox 
            elements={elements} 
            selectedIds={selectedIds}
            scale={view.scale}
            onHandleDragStart={handleResizeStart}
            onRotateStart={handleRotateStart}
          />
        )}

        {selectedIds.length > 0 && activeTool === 'directSelection' && (
          <DirectSelectionBox 
            elements={elements} 
            selectedIds={selectedIds}
            scale={view.scale}
            selectedVertices={selectedVertices}
            onVertexSelect={handleVertexSelect}
            onVertexDragStart={handleVertexDragStart}
            onControlDragStart={handleControlDragStart}
          />
        )}

        <g opacity={0.5}>
          <line x1={-5} y1={0} x2={5} y2={0} stroke="#666" strokeWidth={0.5 / view.scale} vectorEffect="non-scaling-stroke" />
          <line x1={0} y1={-5} x2={0} y2={5} stroke="#666" strokeWidth={0.5 / view.scale} vectorEffect="non-scaling-stroke" />
        </g>
      </svg>

      <div className="absolute bottom-4 right-4 bg-dark-bgSecondary/90 backdrop-blur px-3 py-2 rounded text-xs text-dark-text select-none pointer-events-none">
        <div>Zoom: {Math.round(view.scale * 100)}%</div>
        <div className="text-dark-textMuted">
          Elements: {elements.length}
        </div>
        <div className="text-dark-textMuted">
          Middle drag to pan | Scroll to zoom
        </div>
      </div>

      {selectedIds.length > 0 && activeTool === 'selection' && containerRef.current && (
        <FloatingPropertiesWidget
          scale={view.scale}
          offsetX={view.offsetX}
          offsetY={view.offsetY}
          containerWidth={containerRef.current.clientWidth}
          containerHeight={containerRef.current.clientHeight}
        />
      )}
    </div>
  )
}

/**
 * Calculate distance from point to line segment
 */
function distanceToLineSegment(point: Point, p1: Point, p2: Point): number {
  const x1 = p1.x
  const y1 = p1.y
  const x2 = p2.x
  const y2 = p2.y
  
  const dx = x2 - x1
  const dy = y2 - y1
  
  if (dx === 0 && dy === 0) {
    return Math.sqrt((point.x - x1) ** 2 + (point.y - y1) ** 2)
  }
  
  const t = Math.max(0, Math.min(1, ((point.x - x1) * dx + (point.y - y1) * dy) / (dx * dx + dy * dy)))
  
  const closestX = x1 + t * dx
  const closestY = y1 + t * dy
  
  return Math.sqrt((point.x - closestX) ** 2 + (point.y - closestY) ** 2)
}

/**
 * Canvas element renderer
 */
interface CanvasElementProps {
  element: SVGElement
  isPreview?: boolean
  isSelected?: boolean
}

const CanvasElement: React.FC<CanvasElementProps> = ({ element, isPreview, isSelected }) => {
  const commonProps = {
    fill: 'none',
    stroke: isSelected ? '#007acc' : (element.stroke || '#000000'),
    strokeWidth: isSelected ? 0.5 : 0.5,
    vectorEffect: 'non-scaling-stroke' as const,
    opacity: isPreview ? 0.7 : 1,
    strokeDasharray: isPreview ? '2,2' : undefined,
  }

  if ('points' in element && element.points) {
    const pointEl = element as PointElement
    const points = pointEl.points
    
    // Generate SVG path data with Bezier curve support
    let d = ''
    for (let i = 0; i < points.length; i++) {
      const p = points[i]
      const px = p.x * DEFAULTS.MM_TO_PX
      const py = p.y * DEFAULTS.MM_TO_PX
      
      if (i === 0) {
        d += `M ${px} ${py}`
      } else {
        const prev = points[i - 1]
        
        const prevCp2 = prev.vertexType === 'corner' ? prev.cp2 : undefined
        const currCp1 = p.vertexType === 'corner' ? p.cp1 : undefined
        
        if (prevCp2 || currCp1) {
          const cp1x = prevCp2 ? prevCp2.x * DEFAULTS.MM_TO_PX : px
          const cp1y = prevCp2 ? prevCp2.y * DEFAULTS.MM_TO_PX : py
          const cp2x = currCp1 ? currCp1.x * DEFAULTS.MM_TO_PX : px
          const cp2y = currCp1 ? currCp1.y * DEFAULTS.MM_TO_PX : py
          d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${px} ${py}`
        } else {
          d += ` L ${px} ${py}`
        }
      }
    }
    
    // Close path if isClosedShape is true
    if (pointEl.isClosedShape && points.length > 2) {
      const first = points[0]
      const last = points[points.length - 1]
      
      const lastCp2 = last.vertexType === 'corner' ? last.cp2 : undefined
      const firstCp1 = first.vertexType === 'corner' ? first.cp1 : undefined
      
      if (lastCp2 || firstCp1) {
        const firstPx = first.x * DEFAULTS.MM_TO_PX
        const firstPy = first.y * DEFAULTS.MM_TO_PX
        const cp1x = lastCp2 ? lastCp2.x * DEFAULTS.MM_TO_PX : firstPx
        const cp1y = lastCp2 ? lastCp2.y * DEFAULTS.MM_TO_PX : firstPy
        const cp2x = firstCp1 ? firstCp1.x * DEFAULTS.MM_TO_PX : firstPx
        const cp2y = firstCp1 ? firstCp1.y * DEFAULTS.MM_TO_PX : firstPy
        d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${firstPx} ${firstPy}`
      }
      d += ' Z'
    }
    
    return (
      <path
        d={d}
        {...commonProps}
      />
    )
  }

  return null
}
