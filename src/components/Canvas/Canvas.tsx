/**
 * Canvas Component
 * 
 * Main drawing area with white artboard, zoom, and pan functionality.
 * Integrates with the tool system for shape creation and selection.
 */

import { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import { useEditorStore, saveToHistory } from '../../store/index'
import { getTool } from '@/tools/index'
import type { ToolContext } from '@/tools/types'
import type { Point, RectElement, EllipseElement, LineElement, PolygonElement, SVGElement } from '@/types-app/index'
import { snapPoint } from '@/utils/snap'
import { generateId } from '@/utils/id'
import { DEFAULTS } from '@constants/index'
import { BoundingBox } from './BoundingBox'

/**
 * Canvas component with artboard, zoom, and tool integration
 */
export const Canvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<SVGSVGElement>(null)
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState<Point>({ x: 0, y: 0 })
  const [previewElement, setPreviewElement] = useState<RectElement | EllipseElement | LineElement | PolygonElement | null>(null)
  const startPointRef = useRef<Point>({ x: 0, y: 0 })
  const isDrawingRef = useRef(false)
  const isMovingRef = useRef(false)
  const moveStartRef = useRef<Point>({ x: 0, y: 0 })
  const initialElementPositionsRef = useRef<Map<string, Point>>(new Map())
  const isFirstMoveRef = useRef(true)
  const isResizingRef = useRef(false)
  const resizeHandleRef = useRef<string>('')
  const resizeStartRef = useRef<Point>({ x: 0, y: 0 })
  const resizeStartBoxRef = useRef<{ x: number; y: number; width: number; height: number }>({ x: 0, y: 0, width: 0, height: 0 })
  const initialElementSizesRef = useRef<Map<string, { x: number; y: number; width: number; height: number }>>(new Map())
  const initialElementPointsRef = useRef<Map<string, { x: number; y: number }[]>>(new Map())
  
  const { 
    view, 
    settings, 
    setView, 
    pan,
    elements,
    selectedIds,
    setSelectedIds,
    addElement,
    updateElement,
    updateElementNoHistory,
    activeTool,
  } = useEditorStore()

  // Get current tool instance
  const tool = useMemo(() => getTool(activeTool), [activeTool])

  /**
   * Convert screen coordinates to canvas coordinates (in mm)
   */
  const screenToCanvas = useCallback((screenX: number, screenY: number): Point => {
    if (!containerRef.current) return { x: 0, y: 0 }
    
    const rect = containerRef.current.getBoundingClientRect()
    // Convert screen pixels to canvas pixels, then to mm
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
   * Hit test - find element at point
   */
  const findElementAtPoint = useCallback((point: Point): SVGElement | null => {
    const hitThreshold = 3 / view.scale // 3 pixels in mm at current zoom
    
    // Check elements in reverse order (top to bottom)
    for (let i = elements.length - 1; i >= 0; i--) {
      const element = elements[i]
      
      switch (element.type) {
        case 'rect': {
          const rect = element as RectElement
          if (
            point.x >= rect.x - hitThreshold &&
            point.x <= rect.x + rect.width + hitThreshold &&
            point.y >= rect.y - hitThreshold &&
            point.y <= rect.y + rect.height + hitThreshold
          ) {
            return element
          }
          break
        }
        
        case 'ellipse': {
          const ellipse = element as EllipseElement
          const dx = point.x - ellipse.cx
          const dy = point.y - ellipse.cy
          // Check if point is inside or near ellipse
          const distance = Math.sqrt((dx * dx) / (ellipse.rx * ellipse.rx) + (dy * dy) / (ellipse.ry * ellipse.ry))
          if (distance <= 1.1) {
            return element
          }
          break
        }
        
        case 'line': {
          const line = element as LineElement
          const dist = distanceToLineSegment(point, line)
          if (dist <= hitThreshold) {
            return element
          }
          break
        }
        
        case 'polygon': {
          const polygon = element as PolygonElement
          const bounds = getPolygonBounds(polygon.points)
          // Simple bounding box check first
          if (
            point.x >= bounds.x - hitThreshold &&
            point.x <= bounds.x + bounds.width + hitThreshold &&
            point.y >= bounds.y - hitThreshold &&
            point.y <= bounds.y + bounds.height + hitThreshold
          ) {
            // Check if point is inside polygon using ray casting
            if (isPointInPolygon(point, polygon.points)) {
              return element
            }
            // Check edges
            for (let i = 0; i < polygon.points.length; i++) {
              const p1 = polygon.points[i]
              const p2 = polygon.points[(i + 1) % polygon.points.length]
              const dist = distanceToLineSegmentPoint(point, p1, p2)
              if (dist <= hitThreshold) {
                return element
              }
            }
          }
          break
        }
      }
    }
    
    return null
  }, [elements, view.scale])

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
    
    // Calculate zoom factor
    const delta = e.deltaY > 0 ? -DEFAULTS.ZOOM_STEP : DEFAULTS.ZOOM_STEP
    const newScale = Math.max(
      DEFAULTS.MIN_ZOOM,
      Math.min(DEFAULTS.MAX_ZOOM, view.scale + delta)
    )
    
    // Calculate new offset to zoom towards cursor
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
   * Handle mouse down - pan with middle button, draw with left button
   */
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Middle mouse button (button 1) for panning
    if (e.button === 1) {
      e.preventDefault()
      setIsPanning(true)
      setPanStart({ x: e.clientX, y: e.clientY })
      return
    }
    
    // Left mouse button for tool actions
    if (e.button === 0) {
      const point = screenToCanvas(e.clientX, e.clientY)
      
      if (activeTool === 'selection') {
        // Hit test to find clicked element
        const clickedElement = findElementAtPoint(point)
        
        if (clickedElement) {
          // Clicked on element
          if (e.ctrlKey || e.metaKey) {
            // Multi-select toggle
            if (selectedIds.includes(clickedElement.id)) {
              setSelectedIds(selectedIds.filter(id => id !== clickedElement.id))
            } else {
              setSelectedIds([...selectedIds, clickedElement.id])
            }
          } else {
            // Select single element
            if (!selectedIds.includes(clickedElement.id)) {
              setSelectedIds([clickedElement.id])
            }
            
            // Start moving
            isMovingRef.current = true
            moveStartRef.current = point
            isFirstMoveRef.current = true
            
            // Store initial positions of selected elements
            initialElementPositionsRef.current.clear()
            selectedIds.forEach(id => {
              const el = elements.find(el => el.id === id)
              if (el) {
                if (el.type === 'rect') {
                  const rect = el as RectElement
                  initialElementPositionsRef.current.set(id, { x: rect.x, y: rect.y })
                } else if (el.type === 'ellipse') {
                  const ellipse = el as EllipseElement
                  initialElementPositionsRef.current.set(id, { x: ellipse.cx, y: ellipse.cy })
                } else if (el.type === 'line') {
                  const line = el as LineElement
                  initialElementPositionsRef.current.set(id, { x: line.x1, y: line.y1 })
                } else if (el.type === 'polygon') {
                  const polygon = el as PolygonElement
                  const bounds = getPolygonBounds(polygon.points)
                  initialElementPositionsRef.current.set(id, { x: bounds.x, y: bounds.y })
                }
              }
            })
          }
        } else {
          // Clicked on empty space - deselect
          if (!e.ctrlKey && !e.metaKey) {
            setSelectedIds([])
          }
        }
      } else if (activeTool === 'rectangle' || activeTool === 'ellipse' || activeTool === 'line' || activeTool === 'trapezoid') {
        // Drawing tools - reset any pending move/resize operations
        isMovingRef.current = false
        isResizingRef.current = false
        initialElementPositionsRef.current.clear()
        initialElementSizesRef.current.clear()
        initialElementPointsRef.current.clear()
        const snappedPoint = snapToGrid(point)
        startPointRef.current = snappedPoint
        isDrawingRef.current = true
        
        if (activeTool === 'rectangle') {
          setPreviewElement({
            id: 'preview',
            type: 'rect',
            name: 'Rectangle',
            x: snappedPoint.x,
            y: snappedPoint.y,
            width: 0,
            height: 0,
            stroke: '#000000',
            strokeWidth: 2,
            visible: true,
            locked: false,
          })
        } else if (activeTool === 'ellipse') {
          setPreviewElement({
            id: 'preview',
            type: 'ellipse',
            name: 'Ellipse',
            cx: snappedPoint.x,
            cy: snappedPoint.y,
            rx: 0,
            ry: 0,
            stroke: '#000000',
            strokeWidth: 2,
            visible: true,
            locked: false,
          })
        } else if (activeTool === 'line') {
          setPreviewElement({
            id: 'preview',
            type: 'line',
            name: 'Line',
            x1: snappedPoint.x,
            y1: snappedPoint.y,
            x2: snappedPoint.x,
            y2: snappedPoint.y,
            stroke: '#000000',
            strokeWidth: 2,
            visible: true,
            locked: false,
          })
        } else if (activeTool === 'trapezoid') {
          setPreviewElement({
            id: 'preview',
            type: 'polygon',
            name: 'Trapezoid',
            points: [
              { x: snappedPoint.x, y: snappedPoint.y },
              { x: snappedPoint.x, y: snappedPoint.y },
              { x: snappedPoint.x, y: snappedPoint.y },
              { x: snappedPoint.x, y: snappedPoint.y },
            ],
            stroke: '#000000',
            strokeWidth: 2,
            visible: true,
            locked: false,
          })
        }
      }
      
      tool.onMouseDown(e, toolContext)
    }
  }, [activeTool, tool, toolContext, screenToCanvas, snapToGrid, findElementAtPoint, selectedIds, setSelectedIds, elements])

  /**
   * Handle resize start from BoundingBox handles
   */
  const handleResizeStart = useCallback((handle: string, startPoint: { x: number; y: number }, startBox: { x: number; y: number; width: number; height: number }) => {
    isResizingRef.current = true
    resizeHandleRef.current = handle
    resizeStartRef.current = screenToCanvas(startPoint.x, startPoint.y)
    resizeStartBoxRef.current = startBox
    
    // Store initial sizes of selected elements
    initialElementSizesRef.current.clear()
    initialElementPointsRef.current.clear()
    selectedIds.forEach(id => {
      const el = elements.find(el => el.id === id)
      if (el) {
        if (el.type === 'rect') {
          const rect = el as RectElement
          initialElementSizesRef.current.set(id, { x: rect.x, y: rect.y, width: rect.width, height: rect.height })
        } else if (el.type === 'ellipse') {
          const ellipse = el as EllipseElement
          initialElementSizesRef.current.set(id, { x: ellipse.cx - ellipse.rx, y: ellipse.cy - ellipse.ry, width: ellipse.rx * 2, height: ellipse.ry * 2 })
        } else if (el.type === 'line') {
          const line = el as LineElement
          initialElementSizesRef.current.set(id, { 
            x: Math.min(line.x1, line.x2), 
            y: Math.min(line.y1, line.y2), 
            width: Math.abs(line.x2 - line.x1), 
            height: Math.abs(line.y2 - line.y1) 
          })
        } else if (el.type === 'polygon') {
          const polygon = el as PolygonElement
          const bounds = getPolygonBounds(polygon.points)
          initialElementSizesRef.current.set(id, {
            x: bounds.x,
            y: bounds.y,
            width: bounds.width,
            height: bounds.height,
          })
          // Store initial points for polygon
          initialElementPointsRef.current.set(id, [...polygon.points])
        }
      }
    })
    
    // Save to history
    saveToHistory()
  }, [screenToCanvas, selectedIds, elements])

  /**
   * Handle mouse move - pan, move elements, or update preview
   */
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    // Handle panning
    if (isPanning) {
      const deltaX = e.clientX - panStart.x
      const deltaY = e.clientY - panStart.y
      
      pan(deltaX, deltaY)
      setPanStart({ x: e.clientX, y: e.clientY })
      return
    }
    
    // Handle moving selected elements
    if (isMovingRef.current && (e.buttons & 1)) {
      const point = screenToCanvas(e.clientX, e.clientY)
      const deltaX = point.x - moveStartRef.current.x
      const deltaY = point.y - moveStartRef.current.y
      
      // Move all selected elements (skip history - save only on mouse down)
      if (isFirstMoveRef.current) {
        saveToHistory()
        isFirstMoveRef.current = false
      }
      
      selectedIds.forEach(id => {
        const initialPos = initialElementPositionsRef.current.get(id)
        if (initialPos) {
          const element = elements.find(el => el.id === id)
          if (element) {
            if (element.type === 'rect') {
              updateElementNoHistory(id, {
                x: initialPos.x + deltaX,
                y: initialPos.y + deltaY,
              })
            } else if (element.type === 'ellipse') {
              updateElementNoHistory(id, {
                cx: initialPos.x + deltaX,
                cy: initialPos.y + deltaY,
              })
            } else if (element.type === 'line') {
              const line = element as LineElement
              const newX1 = initialPos.x + deltaX
              const newY1 = initialPos.y + deltaY
              const dx = line.x2 - line.x1
              const dy = line.y2 - line.y1
              updateElementNoHistory(id, {
                x1: newX1,
                y1: newY1,
                x2: newX1 + dx,
                y2: newY1 + dy,
              })
            } else if (element.type === 'polygon') {
              const polygon = element as PolygonElement
              const newPoints = polygon.points.map(p => ({
                x: p.x + deltaX,
                y: p.y + deltaY
              }))
              updateElementNoHistory(id, {
                points: newPoints,
              })
            }
          }
        }
      })
    }
    
    // Handle resize
    if (isResizingRef.current && (e.buttons & 1)) {
      const point = screenToCanvas(e.clientX, e.clientY)
      const handle = resizeHandleRef.current
      
      // Calculate delta from start point
      const dx = point.x - resizeStartRef.current.x
      const dy = point.y - resizeStartRef.current.y
      
      // Determine which edges are being moved
      const moveLeft = handle === 'w' || handle === 'nw' || handle === 'sw'
      const moveRight = handle === 'e' || handle === 'ne' || handle === 'se'
      const moveTop = handle === 'n' || handle === 'nw' || handle === 'ne'
      const moveBottom = handle === 's' || handle === 'sw' || handle === 'se'
      
      // Update all selected elements
      selectedIds.forEach(id => {
        const initialSize = initialElementSizesRef.current.get(id)
        if (!initialSize) return
        
        const el = elements.find(el => el.id === id)
        if (!el) return
        
        // === PHASE 1: Calculate new bounding box ===
        let boxX = initialSize.x
        let boxY = initialSize.y
        let boxWidth = initialSize.width
        let boxHeight = initialSize.height
        
        const cx0 = initialSize.x + initialSize.width / 2
        const cy0 = initialSize.y + initialSize.height / 2
        
        if (e.altKey) {
          // Alt: resize from center (symmetric)
          if (moveRight) {
            boxWidth = initialSize.width + Math.abs(dx) * 2
            boxX = cx0 - boxWidth / 2
          }
          if (moveLeft) {
            boxWidth = initialSize.width + Math.abs(dx) * 2
            boxX = cx0 - boxWidth / 2
          }
          if (moveBottom) {
            boxHeight = initialSize.height + Math.abs(dy) * 2
            boxY = cy0 - boxHeight / 2
          }
          if (moveTop) {
            boxHeight = initialSize.height + Math.abs(dy) * 2
            boxY = cy0 - boxHeight / 2
          }
        } else {
          // No Alt: resize from edge (allows inversion)
          // Right edge: width grows/shrinks with positive/negative dx
          if (moveRight) {
            boxWidth = initialSize.width + dx
          }
          // Left edge: keep right edge fixed, allow inversion
          if (moveLeft) {
            if (dx < initialSize.width) {
              // Normal resize - left edge moves, right edge stays fixed
              boxX = initialSize.x + dx
              boxWidth = initialSize.width - dx
            } else {
              // Inverted - right edge moves instead
              boxX = initialSize.x + initialSize.width
              boxWidth = dx - initialSize.width
            }
          }
          // Bottom edge: height grows/shrinks with positive/negative dy
          if (moveBottom) {
            boxHeight = initialSize.height + dy
          }
          // Top edge: keep bottom edge fixed, allow inversion
          if (moveTop) {
            if (dy < initialSize.height) {
              // Normal resize - top edge moves, bottom edge stays fixed
              boxY = initialSize.y + dy
              boxHeight = initialSize.height - dy
            } else {
              // Inverted - bottom edge moves instead
              boxY = initialSize.y + initialSize.height
              boxHeight = dy - initialSize.height
            }
          }
        }
        
        // Ensure minimum size
        boxWidth = Math.max(0.5, boxWidth)
        boxHeight = Math.max(0.5, boxHeight)
        
        // === PHASE 2: Apply to element based on type ===
        if (el.type === 'rect') {
          // Direct: rect properties match bounding box exactly
          updateElementNoHistory(id, {
            x: boxX,
            y: boxY,
            width: boxWidth,
            height: boxHeight,
          })
        } else if (el.type === 'ellipse') {
          // Convert: ellipse center = box center, radii = half of box dimensions
          updateElementNoHistory(id, {
            cx: boxX + boxWidth / 2,
            cy: boxY + boxHeight / 2,
            rx: boxWidth / 2,
            ry: boxHeight / 2,
          })
        } else if (el.type === 'line') {
          // Convert: line from (boxX, boxY) to (boxX+width, boxY+height)
          updateElementNoHistory(id, {
            x1: boxX,
            y1: boxY,
            x2: boxX + boxWidth,
            y2: boxY + boxHeight,
          })
        } else if (el.type === 'polygon') {
          // Scale: transform initial points to new box using scale factors
          const initialPoints = initialElementPointsRef.current.get(id)
          if (!initialPoints) return
          
          const scaleX = boxWidth / initialSize.width
          const scaleY = boxHeight / initialSize.height
          
          // Each point scales from initial bounding box to new bounding box
          const newPoints = initialPoints.map(p => ({
            x: initialSize.x + (p.x - initialSize.x) * scaleX,
            y: initialSize.y + (p.y - initialSize.y) * scaleY
          }))
          
          updateElementNoHistory(id, {
            points: newPoints,
          })
        }
      })
    }
    
    // Update preview element during drawing
    if (isDrawingRef.current && previewElement && (e.buttons & 1)) {
      const currentPoint = screenToCanvas(e.clientX, e.clientY)
      const snappedPoint = snapToGrid(currentPoint)
      const startPoint = startPointRef.current
      
      setPreviewElement(prev => {
        if (!prev) return null
        
        if (prev.type === 'rect') {
          const x = Math.min(startPoint.x, snappedPoint.x)
          const y = Math.min(startPoint.y, snappedPoint.y)
          const width = Math.abs(snappedPoint.x - startPoint.x)
          const height = Math.abs(snappedPoint.y - startPoint.y)
          return { ...prev, x, y, width, height }
        }
        
        if (prev.type === 'ellipse') {
          const centerX = (startPoint.x + snappedPoint.x) / 2
          const centerY = (startPoint.y + snappedPoint.y) / 2
          const rx = Math.abs(snappedPoint.x - startPoint.x) / 2
          const ry = Math.abs(snappedPoint.y - startPoint.y) / 2
          return { ...prev, cx: centerX, cy: centerY, rx, ry }
        }
        
        if (prev.type === 'line') {
          return { ...prev, x2: snappedPoint.x, y2: snappedPoint.y }
        }
        
        if (prev.type === 'polygon') {
          const x = Math.min(startPoint.x, snappedPoint.x)
          const y = Math.min(startPoint.y, snappedPoint.y)
          const width = Math.abs(snappedPoint.x - startPoint.x)
          const height = Math.abs(snappedPoint.y - startPoint.y)
          
          // Create right trapezoid: left side is vertical, right side is slanted
          const topWidth = width * 0.6  // top is narrower than bottom
          return {
            ...prev,
            points: [
              { x: x, y: y },                              // top-left (vertical left side starts here)
              { x: x + topWidth, y: y },                   // top-right
              { x: x + width, y: y + height },            // bottom-right
              { x: x, y: y + height },                    // bottom-left (vertical left side ends here)
            ]
          }
        }
        
        return prev
      })
    }
    
    tool.onMouseMove(e, toolContext)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPanning, panStart, pan, selectedIds, elements, updateElement, previewElement, tool, toolContext, screenToCanvas, snapToGrid])

  /**
   * Handle mouse up - end pan, move, or create element
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
    
    // End resize operation
    if (isResizingRef.current) {
      isResizingRef.current = false
      initialElementSizesRef.current.clear()
      initialElementPointsRef.current.clear()
    }
    
    // Finalize element creation
    if (isDrawingRef.current && previewElement) {
      isDrawingRef.current = false
      
      // Check if element has meaningful size
      let shouldCreate = false
      
      if (previewElement.type === 'rect') {
        shouldCreate = previewElement.width > 0.1 && previewElement.height > 0.1
      } else if (previewElement.type === 'ellipse') {
        shouldCreate = previewElement.rx > 0.05 && previewElement.ry > 0.05
      } else if (previewElement.type === 'line') {
        const dx = previewElement.x2 - previewElement.x1
        const dy = previewElement.y2 - previewElement.y1
        shouldCreate = Math.sqrt(dx * dx + dy * dy) > 0.1
      } else if (previewElement.type === 'polygon') {
        const bounds = getPolygonBounds(previewElement.points)
        shouldCreate = bounds.width > 0.1 && bounds.height > 0.1
      }
      
      if (shouldCreate) {
        // Generate real ID and add to store
        const finalElement = { ...previewElement, id: generateId() }
        addElement(finalElement)
      }
      
      setPreviewElement(null)
    }
    
    tool.onMouseUp(e, toolContext)
  }, [isPanning, previewElement, tool, toolContext, addElement])

  /**
   * Handle context menu (disable right-click menu on canvas)
   */
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
  }, [])

  // Add global mouse up handler to handle mouse release outside canvas
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      // Handle panning end
      if (isPanning) {
        setIsPanning(false)
      }
      
      // Handle move end
      if (isMovingRef.current) {
        isMovingRef.current = false
        initialElementPositionsRef.current.clear()
      }
      
      // Finalize shape creation if we were drawing
      if (isDrawingRef.current && previewElement) {
        isDrawingRef.current = false
        
        // Check if element has meaningful size
        let shouldCreate = false
        
        if (previewElement.type === 'rect') {
          shouldCreate = previewElement.width > 0.1 && previewElement.height > 0.1
        } else if (previewElement.type === 'ellipse') {
          shouldCreate = previewElement.rx > 0.05 && previewElement.ry > 0.05
        } else if (previewElement.type === 'line') {
          const dx = previewElement.x2 - previewElement.x1
          const dy = previewElement.y2 - previewElement.y1
          shouldCreate = Math.sqrt(dx * dx + dy * dy) > 0.1
        }
        
        if (shouldCreate) {
          // Generate real ID and add to store
          const finalElement = { ...previewElement, id: generateId() }
          addElement(finalElement)
        }
        
        setPreviewElement(null)
      }
    }
    
    window.addEventListener('mouseup', handleGlobalMouseUp)
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp)
  }, [isPanning, previewElement, addElement])

  // Calculate artboard dimensions in pixels
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
        {/* Definitions for patterns and markers */}
        <defs>
          {/* Grid pattern */}
          <pattern
            id="grid"
            width={DEFAULTS.MM_TO_PX * 10}
            height={DEFAULTS.MM_TO_PX * 10}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${DEFAULTS.MM_TO_PX * 10} 0 L 0 0 0 ${DEFAULTS.MM_TO_PX * 10}`}
              fill="none"
              stroke="#2a2a2a"
              strokeWidth={1 / view.scale}
              vectorEffect="non-scaling-stroke"
            />
          </pattern>
          
          {/* Dot pattern for mm grid */}
          <pattern
            id="dots"
            width={DEFAULTS.MM_TO_PX}
            height={DEFAULTS.MM_TO_PX}
            patternUnits="userSpaceOnUse"
          >
            <circle
              cx={0.5}
              cy={0.5}
              r={0.5}
              fill="#3a3a3a"
              opacity={0.5}
            />
          </pattern>
        </defs>

        {/* Background grid (optional) */}
        {settings.showGrid && (
          <rect
            x={-10000}
            y={-10000}
            width={20000}
            height={20000}
            fill="url(#dots)"
            opacity={0.3}
          />
        )}

        {/* Artboard background */}
        <rect
          x={0}
          y={0}
          width={artboardWidthPx}
          height={artboardHeightPx}
          fill="#ffffff"
          stroke="#333333"
          strokeWidth={1 / view.scale}
          vectorEffect="non-scaling-stroke"
        />

        {/* Artboard grid overlay */}
        {settings.showGrid && (
          <rect
            x={0}
            y={0}
            width={artboardWidthPx}
            height={artboardHeightPx}
            fill="url(#grid)"
            opacity={0.1}
            pointerEvents="none"
          />
        )}

        {/* Render elements */}
        <g id="elements">
          {elements.map((element) => (
            <CanvasElement 
              key={element.id} 
              element={element} 
              isSelected={selectedIds.includes(element.id)}
            />
          ))}
        </g>

        {/* Preview element during drawing */}
        {previewElement && (
          <CanvasElement element={previewElement} isPreview />
        )}

        {/* Bounding box for selected elements */}
        {selectedIds.length > 0 && activeTool === 'selection' && (
          <BoundingBox 
            elements={elements} 
            selectedIds={selectedIds}
            scale={view.scale}
            onResizeStart={handleResizeStart}
          />
        )}

        {/* Origin marker */}
        <g opacity={0.5}>
          <line x1={-5} y1={0} x2={5} y2={0} stroke="#666" strokeWidth={1 / view.scale} vectorEffect="non-scaling-stroke" />
          <line x1={0} y1={-5} x2={0} y2={5} stroke="#666" strokeWidth={1 / view.scale} vectorEffect="non-scaling-stroke" />
        </g>
      </svg>

      {/* Zoom/Pan info overlay */}
      <div className="absolute bottom-4 right-4 bg-dark-bgSecondary/90 backdrop-blur px-3 py-2 rounded text-xs text-dark-text select-none pointer-events-none">
        <div>Zoom: {Math.round(view.scale * 100)}%</div>
        <div className="text-dark-textMuted">
          Elements: {elements.length}
        </div>
        <div className="text-dark-textMuted">
          Middle drag to pan • Scroll to zoom
        </div>
      </div>
    </div>
  )
}

/**
 * Calculate distance from point to line segment
 */
function distanceToLineSegment(point: Point, line: LineElement): number {
  const x1 = line.x1
  const y1 = line.y1
  const x2 = line.x2
  const y2 = line.y2
  
  const dx = x2 - x1
  const dy = y2 - y1
  
  if (dx === 0 && dy === 0) {
    // Line is a point
    return Math.sqrt((point.x - x1) ** 2 + (point.y - y1) ** 2)
  }
  
  // Project point onto line
  const t = Math.max(0, Math.min(1, ((point.x - x1) * dx + (point.y - y1) * dy) / (dx * dx + dy * dy)))
  
  const closestX = x1 + t * dx
  const closestY = y1 + t * dy
  
  return Math.sqrt((point.x - closestX) ** 2 + (point.y - closestY) ** 2)
}

/**
 * Calculate bounding box for polygon points
 */
function getPolygonBounds(points: { x: number; y: number }[]): { x: number; y: number; width: number; height: number } {
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
    height: maxY - minY
  }
}

/**
 * Check if point is inside polygon using ray casting
 */
function isPointInPolygon(point: { x: number; y: number }, vertices: { x: number; y: number }[]): boolean {
  let inside = false
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const xi = vertices[i].x, yi = vertices[i].y
    const xj = vertices[j].x, yj = vertices[j].y
    
    if (((yi > point.y) !== (yj > point.y)) &&
        (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
      inside = !inside
    }
  }
  return inside
}

/**
 * Calculate distance from point to line segment defined by two points
 */
function distanceToLineSegmentPoint(point: { x: number; y: number }, p1: { x: number; y: number }, p2: { x: number; y: number }): number {
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
 * Individual canvas element renderer
 */
import type { SVGElement as SVGElementType } from '@/types-app/index'

interface CanvasElementProps {
  element: SVGElementType
  isPreview?: boolean
  isSelected?: boolean
}

const CanvasElement: React.FC<CanvasElementProps> = ({ element, isPreview, isSelected }) => {
  const commonProps = {
    fill: 'none',
    stroke: isSelected ? '#007acc' : (element.stroke || '#000000'),
    // Stroke width: 1px for both preview and normal elements
    strokeWidth: isSelected ? 2 : 1,
    vectorEffect: 'non-scaling-stroke' as const,
    opacity: isPreview ? 0.7 : 1,
    // Very small dash pattern for "marching ants" effect
    strokeDasharray: isPreview ? '2,2' : undefined,
  }

  switch (element.type) {
    case 'rect': {
      const rectEl = element as RectElement
      return (
        <rect
          x={rectEl.x * DEFAULTS.MM_TO_PX}
          y={rectEl.y * DEFAULTS.MM_TO_PX}
          width={rectEl.width * DEFAULTS.MM_TO_PX}
          height={rectEl.height * DEFAULTS.MM_TO_PX}
          rx={(rectEl.rx || 0) * DEFAULTS.MM_TO_PX}
          ry={(rectEl.ry || 0) * DEFAULTS.MM_TO_PX}
          {...commonProps}
        />
      )
    }
    
    case 'ellipse': {
      const ellipseEl = element as EllipseElement
      return (
        <ellipse
          cx={ellipseEl.cx * DEFAULTS.MM_TO_PX}
          cy={ellipseEl.cy * DEFAULTS.MM_TO_PX}
          rx={ellipseEl.rx * DEFAULTS.MM_TO_PX}
          ry={ellipseEl.ry * DEFAULTS.MM_TO_PX}
          {...commonProps}
        />
      )
    }
    
    case 'line': {
      const lineEl = element as LineElement
      return (
        <line
          x1={lineEl.x1 * DEFAULTS.MM_TO_PX}
          y1={lineEl.y1 * DEFAULTS.MM_TO_PX}
          x2={lineEl.x2 * DEFAULTS.MM_TO_PX}
          y2={lineEl.y2 * DEFAULTS.MM_TO_PX}
          {...commonProps}
        />
      )
    }
    
    case 'polygon': {
      const polygonEl = element as PolygonElement
      const pointsStr = polygonEl.points.map(p => `${p.x * DEFAULTS.MM_TO_PX},${p.y * DEFAULTS.MM_TO_PX}`).join(' ')
      return (
        <polygon
          points={pointsStr}
          {...commonProps}
        />
      )
    }
    
    default:
      return null
  }
}
