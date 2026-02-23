/**
 * Panels Component
 * 
 * Right-side panel area with Layers and Properties panels.
 */

import { useMemo, useState } from 'react'
import { useEditorStore } from '@store/index'
import { UI_STRINGS, COLOR_PALETTE, getContrastColor } from '@constants/index'
import { Square, Circle, Minus } from 'lucide-react'
import type { PointElement, SVGElement } from '@/types-app/index'
import { convertToCorner, convertToStraight, convertToSmooth } from '@/types-app/point'
import { transformPoints, parseHandle } from '@/utils/transform'

/**
 * Vertex Properties Panel for Direct Selection tool
 */
const VertexPropertiesPanel: React.FC<{
  selectedVertices: Set<string>
  elements: PointElement[]
}> = ({ selectedVertices, elements }) => {
  const { updateElement } = useEditorStore()

  const [localValues, setLocalValues] = useState<{
    x: string
    y: string
    width: string
    height: string
  }>({
    x: '',
    y: '',
    width: '',
    height: '',
  })

  const selectedPoints = useMemo(() => {
    const points: { x: number; y: number }[] = []
    selectedVertices.forEach(key => {
      const [elementId, vertexIndexStr] = key.split(':')
      const vertexIndex = parseInt(vertexIndexStr, 10)
      const element = elements.find(el => el.id === elementId)
      if (element && element.points[vertexIndex]) {
        points.push(element.points[vertexIndex])
      }
    })
    return points
  }, [selectedVertices, elements])

  const pointCount = selectedPoints.length
  const isMultiPoint = pointCount > 1
  const isActive = pointCount > 0

  const bounds = useMemo(() => {
    if (selectedPoints.length === 0) return null
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const p of selectedPoints) {
      minX = Math.min(minX, p.x)
      minY = Math.min(minY, p.y)
      maxX = Math.max(maxX, p.x)
      maxY = Math.max(maxY, p.y)
    }
    if (minX === Infinity) return null
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
  }, [selectedPoints])

  const handleInputChange = (field: 'x' | 'y' | 'width' | 'height') => (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValues(prev => ({ ...prev, [field]: e.target.value }))
  }

  const handleBlur = (field: 'x' | 'y' | 'width' | 'height') => () => {
    const value = parseFloat(localValues[field])
    if (isNaN(value)) return

    if (field === 'x' && !isMultiPoint && bounds) {
      const deltaX = value - bounds.x
      selectedVertices.forEach(key => {
        const [elementId, vertexIndexStr] = key.split(':')
        const vertexIndex = parseInt(vertexIndexStr, 10)
        const element = elements.find(el => el.id === elementId)
        if (element) {
          const newPoints = [...element.points]
          newPoints[vertexIndex] = { ...newPoints[vertexIndex], x: newPoints[vertexIndex].x + deltaX }
          updateElement(elementId, { points: newPoints } as Partial<SVGElement>)
        }
      })
    } else if (field === 'y' && !isMultiPoint && bounds) {
      const deltaY = value - bounds.y
      selectedVertices.forEach(key => {
        const [elementId, vertexIndexStr] = key.split(':')
        const vertexIndex = parseInt(vertexIndexStr, 10)
        const element = elements.find(el => el.id === elementId)
        if (element) {
          const newPoints = [...element.points]
          newPoints[vertexIndex] = { ...newPoints[vertexIndex], y: newPoints[vertexIndex].y + deltaY }
          updateElement(elementId, { points: newPoints } as Partial<SVGElement>)
        }
      })
    } else if ((field === 'width' || field === 'height') && isMultiPoint && bounds) {
      const isWidth = field === 'width'
      const newValue = value
      const oldValue = isWidth ? bounds.width : bounds.height
      if (oldValue === 0) return

      const scale = newValue / oldValue

      selectedVertices.forEach(key => {
        const [elementId, vertexIndexStr] = key.split(':')
        const vertexIndex = parseInt(vertexIndexStr, 10)
        const element = elements.find(el => el.id === elementId)
        if (element) {
          const newPoints = [...element.points]
          const p = newPoints[vertexIndex]
          if (isWidth) {
            newPoints[vertexIndex] = { ...p, x: bounds.x + (p.x - bounds.x) * scale }
          } else {
            newPoints[vertexIndex] = { ...p, y: bounds.y + (p.y - bounds.y) * scale }
          }
          updateElement(elementId, { points: newPoints } as Partial<SVGElement>)
        }
      })
    }
  }

  const getInputValue = (field: 'x' | 'y' | 'width' | 'height', fallback: string) => {
    return localValues[field] || fallback
  }

  const displayX = bounds ? bounds.x.toFixed(1) : '0'
  const displayY = bounds ? bounds.y.toFixed(1) : '0'
  const displayW = bounds ? bounds.width.toFixed(1) : '0'
  const displayH = bounds ? bounds.height.toFixed(1) : '0'

  const currentVertexType = useMemo(() => {
    const firstKey = Array.from(selectedVertices)[0]
    if (!firstKey) return 'straight'
    const [elementId, vertexIndexStr] = firstKey.split(':')
    const vertexIndex = parseInt(vertexIndexStr, 10)
    const element = elements.find(el => el.id === elementId)
    if (element && element.points[vertexIndex]) {
      return element.points[vertexIndex].vertexType || 'straight'
    }
    return 'straight'
  }, [selectedVertices, elements])

  const handleVertexTypeChange = (newType: 'straight' | 'corner' | 'smooth') => {
    selectedVertices.forEach(key => {
      const [elementId, vertexIndexStr] = key.split(':')
      const vertexIndex = parseInt(vertexIndexStr, 10)
      const element = elements.find(el => el.id === elementId)
      if (element) {
        let newPoints: PointElement['points']
        
        if (newType === 'corner') {
          const converted = convertToCorner(vertexIndex, element.points, element.isClosedShape)
          newPoints = [...element.points]
          newPoints[vertexIndex] = converted
        } else if (newType === 'straight') {
          const converted = convertToStraight(vertexIndex, element.points, element.isClosedShape)
          newPoints = [...element.points]
          newPoints[vertexIndex] = converted
        } else {
          const converted = convertToSmooth(vertexIndex, element.points, element.isClosedShape)
          newPoints = [...element.points]
          newPoints[vertexIndex] = converted
        }
        
        updateElement(elementId, { points: newPoints } as Partial<SVGElement>)
      }
    })
  }

  return (
    <div className="p-4 space-y-3">
      <div className="text-sm text-dark-text font-medium">Vertex Properties</div>
      
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-dark-textMuted block mb-1">{UI_STRINGS.PROP_X}</label>
          <input
            type="text"
            value={getInputValue('x', displayX)}
            onChange={handleInputChange('x')}
            onBlur={handleBlur('x')}
            disabled={!isActive || isMultiPoint}
            className="w-full bg-dark-bgTertiary text-dark-text text-xs px-2 py-1 rounded border border-dark-border disabled:opacity-50"
          />
        </div>
        <div>
          <label className="text-xs text-dark-textMuted block mb-1">{UI_STRINGS.PROP_Y}</label>
          <input
            type="text"
            value={getInputValue('y', displayY)}
            onChange={handleInputChange('y')}
            onBlur={handleBlur('y')}
            disabled={!isActive || isMultiPoint}
            className="w-full bg-dark-bgTertiary text-dark-text text-xs px-2 py-1 rounded border border-dark-border disabled:opacity-50"
          />
        </div>
        <div>
          <label className="text-xs text-dark-textMuted block mb-1">{UI_STRINGS.PROP_WIDTH}</label>
          <input
            type="text"
            value={getInputValue('width', displayW)}
            onChange={handleInputChange('width')}
            onBlur={handleBlur('width')}
            disabled={!isActive || !isMultiPoint}
            className="w-full bg-dark-bgTertiary text-dark-text text-xs px-2 py-1 rounded border border-dark-border disabled:opacity-50"
          />
        </div>
        <div>
          <label className="text-xs text-dark-textMuted block mb-1">{UI_STRINGS.PROP_HEIGHT}</label>
          <input
            type="text"
            value={getInputValue('height', displayH)}
            onChange={handleInputChange('height')}
            onBlur={handleBlur('height')}
            disabled={!isActive || !isMultiPoint}
            className="w-full bg-dark-bgTertiary text-dark-text text-xs px-2 py-1 rounded border border-dark-border disabled:opacity-50"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs text-dark-textMuted block">Vertex Type</label>
        <div className="flex gap-1">
          <button
            onClick={() => handleVertexTypeChange('straight')}
            disabled={!isActive}
            className={`flex-1 px-2 py-1.5 text-xs rounded border ${
              currentVertexType === 'straight'
                ? 'bg-dark-accent text-white border-dark-accent'
                : 'bg-dark-bgTertiary text-dark-text border-dark-border hover:bg-dark-border'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            title="Straight"
          >
            Straight
          </button>
          <button
            onClick={() => handleVertexTypeChange('corner')}
            disabled={!isActive}
            className={`flex-1 px-2 py-1.5 text-xs rounded border ${
              currentVertexType === 'corner'
                ? 'bg-dark-accent text-white border-dark-accent'
                : 'bg-dark-bgTertiary text-dark-text border-dark-border hover:bg-dark-border'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            title="Corner"
          >
            Corner
          </button>
          <button
            onClick={() => handleVertexTypeChange('smooth')}
            disabled={!isActive}
            className={`flex-1 px-2 py-1.5 text-xs rounded border ${
              currentVertexType === 'smooth'
                ? 'bg-dark-accent text-white border-dark-accent'
                : 'bg-dark-bgTertiary text-dark-text border-dark-border hover:bg-dark-border'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            title="Smooth"
          >
            Smooth
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Right panel container with layers and properties
 */
export const Panels: React.FC = () => {
  const { elements, selectedIds, setSelectedIds, updateElement, activeTool, selectedVertices } = useEditorStore()

  const [localValues, setLocalValues] = useState<{
    x: string
    y: string
    width: string
    height: string
    angle: string
  }>({
    x: '',
    y: '',
    width: '',
    height: '',
    angle: '',
  })

  const bounds = useMemo(() => {
    if (selectedIds.length === 0) return null
    
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    
    selectedIds.forEach(id => {
      const element = elements.find(el => el.id === id)
      if (!element || !('points' in element)) return
      
      const pointEl = element as PointElement
      for (const p of pointEl.points) {
        minX = Math.min(minX, p.x)
        minY = Math.min(minY, p.y)
        maxX = Math.max(maxX, p.x)
        maxY = Math.max(maxY, p.y)
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

  const getElementIcon = (type: string) => {
    switch (type) {
      case 'rect': return <Square size={14} />
      case 'ellipse': return <Circle size={14} />
      case 'line': return <Minus size={14} />
      default: return <Square size={14} />
    }
  }

  const handleElementClick = (id: string, e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      if (selectedIds.includes(id)) {
        setSelectedIds(selectedIds.filter(sid => sid !== id))
      } else {
        setSelectedIds([...selectedIds, id])
      }
    } else {
      setSelectedIds([id])
    }
  }

  const handleInputChange = (field: 'y' | 'x' | 'width' | 'height' | 'angle') => (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValues(prev => ({ ...prev, [field]: e.target.value }))
  }

  const handleInputKeyDown = (handler: () => void) => (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handler()
    }
  }

  const handleXBlur = () => {
    if (!bounds || selectedIds.length === 0) return
    const value = parseFloat(localValues.x)
    if (isNaN(value)) {
      setLocalValues(prev => ({ ...prev, x: bounds.x.toFixed(1) }))
      return
    }
    
    const deltaX = value - bounds.x
    const selectedElement = elements.find(el => el.id === selectedIds[0])
    if (!selectedElement || !('points' in selectedElement)) return
    
    const pointEl = selectedElement as PointElement
    const handle = parseHandle('w')
    const delta = { dx: deltaX, dy: 0 }
    const newPoints = transformPoints(pointEl.points, bounds, delta, handle, false)
    updateElement(selectedElement.id, { points: newPoints } as Partial<SVGElement>)
    setLocalValues(prev => ({ ...prev, x: value.toFixed(1) }))
  }

  const handleYBlur = () => {
    if (!bounds || selectedIds.length === 0) return
    const value = parseFloat(localValues.y)
    if (isNaN(value)) {
      setLocalValues(prev => ({ ...prev, y: bounds.y.toFixed(1) }))
      return
    }
    
    const deltaY = value - bounds.y
    const selectedElement = elements.find(el => el.id === selectedIds[0])
    if (!selectedElement || !('points' in selectedElement)) return
    
    const pointEl = selectedElement as PointElement
    const handle = parseHandle('n')
    const delta = { dx: 0, dy: deltaY }
    const newPoints = transformPoints(pointEl.points, bounds, delta, handle, false)
    updateElement(selectedElement.id, { points: newPoints } as Partial<SVGElement>)
    setLocalValues(prev => ({ ...prev, y: value.toFixed(1) }))
  }

  const handleWidthBlur = () => {
    if (!bounds || selectedIds.length === 0 || bounds.width === 0) return
    const value = parseFloat(localValues.width)
    if (isNaN(value) || value <= 0) {
      setLocalValues(prev => ({ ...prev, width: bounds.width.toFixed(1) }))
      return
    }
    
    const deltaW = value - bounds.width
    const selectedElement = elements.find(el => el.id === selectedIds[0])
    if (!selectedElement || !('points' in selectedElement)) return
    
    const pointEl = selectedElement as PointElement
    const handle = parseHandle('e')
    const delta = { dx: deltaW, dy: 0 }
    const newPoints = transformPoints(pointEl.points, bounds, delta, handle, false)
    updateElement(selectedElement.id, { points: newPoints } as Partial<SVGElement>)
    setLocalValues(prev => ({ ...prev, width: value.toFixed(1) }))
  }

  const handleHeightBlur = () => {
    if (!bounds || selectedIds.length === 0 || bounds.height === 0) return
    const value = parseFloat(localValues.height)
    if (isNaN(value) || value <= 0) {
      setLocalValues(prev => ({ ...prev, height: bounds.height.toFixed(1) }))
      return
    }
    
    const deltaH = value - bounds.height
    const selectedElement = elements.find(el => el.id === selectedIds[0])
    if (!selectedElement || !('points' in selectedElement)) return
    
    const pointEl = selectedElement as PointElement
    const handle = parseHandle('s')
    const delta = { dx: 0, dy: deltaH }
    const newPoints = transformPoints(pointEl.points, bounds, delta, handle, false)
    updateElement(selectedElement.id, { points: newPoints } as Partial<SVGElement>)
    setLocalValues(prev => ({ ...prev, height: value.toFixed(1) }))
  }

  const handleAngleBlur = () => {
    if (selectedIds.length === 0) return
    const value = parseFloat(localValues.angle)
    if (isNaN(value)) {
      const pointEl = selectedIds.length === 1 ? elements.find(el => el.id === selectedIds[0]) : null
      const angle = pointEl && 'points' in pointEl ? (pointEl as PointElement).angle ?? 0 : 0
      setLocalValues(prev => ({ ...prev, angle: angle.toString() }))
      return
    }
    
    selectedIds.forEach(id => {
      const element = elements.find(el => el.id === id)
      if (!element || !('points' in element)) return
      updateElement(id, { angle: value } as Partial<SVGElement>)
    })
    setLocalValues(prev => ({ ...prev, angle: value.toString() }))
  }

  const selectedElement = selectedIds.length === 1 ? elements.find(el => el.id === selectedIds[0]) : null
  const pointElement = selectedElement && 'points' in selectedElement ? selectedElement as PointElement : null
  const currentAngle = pointElement?.angle ?? 0

  const getInputValue = (field: 'x' | 'y' | 'width' | 'height' | 'angle', fallback: string) => {
    return localValues[field] || fallback
  }

  return (
    <div className="flex flex-col h-full" tabIndex={0}>
      {/* Properties Panel */}
      <div className="flex-1 border-b border-dark-border min-h-0 overflow-y-auto">
        <div className="px-3 py-2 bg-dark-bgTertiary text-sm font-medium text-dark-text border-b border-dark-border">
          {UI_STRINGS.PANEL_PROPERTIES}
        </div>
        
        {activeTool === 'directSelection' ? (
          <VertexPropertiesPanel
            selectedVertices={selectedVertices}
            elements={elements.filter(el => selectedIds.includes(el.id) && 'points' in el) as PointElement[]}
          />
        ) : (
          <div className="p-4">
          {selectedIds.length === 0 ? (
            <div className="text-sm text-dark-textMuted italic">
              {UI_STRINGS.PANEL_NO_SELECTION}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-sm text-dark-text">
                {selectedIds.length > 1 
                  ? `${selectedIds.length} elements selected`
                  : (() => {
                      const el = elements.find(e => e.id === selectedIds[0])
                      return el?.name || 'Unknown'
                    })()
                }
              </div>
              
              {bounds && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-dark-textMuted block mb-1">{UI_STRINGS.PROP_X}</label>
                    <input
                      type="text"
                      value={getInputValue('x', bounds.x.toFixed(1))}
                      onChange={handleInputChange('x')}
                      onBlur={handleXBlur}
                      onKeyDown={handleInputKeyDown(handleXBlur)}
                      className="w-full bg-dark-bgTertiary text-dark-text text-xs px-2 py-1 rounded border border-dark-border"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-dark-textMuted block mb-1">{UI_STRINGS.PROP_Y}</label>
                    <input
                      type="text"
                      value={getInputValue('y', bounds.y.toFixed(1))}
                      onChange={handleInputChange('y')}
                      onBlur={handleYBlur}
                      onKeyDown={handleInputKeyDown(handleYBlur)}
                      className="w-full bg-dark-bgTertiary text-dark-text text-xs px-2 py-1 rounded border border-dark-border"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-dark-textMuted block mb-1">{UI_STRINGS.PROP_WIDTH}</label>
                    <input
                      type="text"
                      value={getInputValue('width', bounds.width.toFixed(1))}
                      onChange={handleInputChange('width')}
                      onBlur={handleWidthBlur}
                      onKeyDown={handleInputKeyDown(handleWidthBlur)}
                      className="w-full bg-dark-bgTertiary text-dark-text text-xs px-2 py-1 rounded border border-dark-border"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-dark-textMuted block mb-1">{UI_STRINGS.PROP_HEIGHT}</label>
                    <input
                      type="text"
                      value={getInputValue('height', bounds.height.toFixed(1))}
                      onChange={handleInputChange('height')}
                      onBlur={handleHeightBlur}
                      onKeyDown={handleInputKeyDown(handleHeightBlur)}
                      className="w-full bg-dark-bgTertiary text-dark-text text-xs px-2 py-1 rounded border border-dark-border"
                    />
                  </div>
                </div>
              )}

              {selectedIds.length === 1 && (
                <div>
                  <label className="text-xs text-dark-textMuted block mb-1">{UI_STRINGS.PROP_ROTATION}</label>
                  <input
                    type="text"
                    value={getInputValue('angle', currentAngle.toString())}
                    onChange={handleInputChange('angle')}
                    onBlur={handleAngleBlur}
                    onKeyDown={handleInputKeyDown(handleAngleBlur)}
                    className="w-full bg-dark-bgTertiary text-dark-text text-xs px-2 py-1 rounded border border-dark-border"
                  />
                </div>
              )}

              {selectedIds.length === 1 && pointElement && (
                <div>
                  <label className="text-xs text-dark-textMuted block mb-1">{UI_STRINGS.PROP_COLOR}</label>
                  <div className="flex flex-wrap gap-1 max-w-[180px]">
                    {COLOR_PALETTE.map((c) => (
                      <button
                        key={c.index}
                        onClick={() => {
                          updateElement(selectedIds[0], { stroke: c.color } as Partial<SVGElement>)
                        }}
                        className={`
                          w-8 h-6 rounded border-2 transition-all text-xs font-bold
                          ${pointElement.stroke === c.color 
                            ? 'border-white scale-110' 
                            : 'border-transparent hover:border-dark-border'
                          }
                        `}
                        style={{ 
                          backgroundColor: c.color,
                          color: getContrastColor(c.color),
                        }}
                        title={`${c.index}: ${c.color}`}
                      >
                        {c.index}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        )}
      </div>

      {/* Layers Panel */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="px-3 py-2 bg-dark-bgTertiary text-sm font-medium text-dark-text border-b border-dark-border">
          {UI_STRINGS.PANEL_LAYERS}
        </div>
        <div className="p-0">
          {elements.length === 0 ? (
            <div className="p-4 text-sm text-dark-textMuted italic">
              No layers yet
            </div>
          ) : (
            <div className="divide-y divide-dark-border">
              {[...elements].reverse().map((element) => (
                <div
                  key={element.id}
                  onClick={(e) => handleElementClick(element.id, e)}
                  className={`
                    flex items-center gap-2 px-3 py-2 text-sm cursor-pointer
                    transition-colors duration-100
                    ${selectedIds.includes(element.id)
                      ? 'bg-dark-accent text-white'
                      : 'text-dark-text hover:bg-dark-bgTertiary'
                    }
                  `}
                >
                  <span className="text-dark-textMuted">
                    {getElementIcon(element.type)}
                  </span>
                  <span className="truncate flex-1">
                    {element.name} {elements.indexOf(element) + 1}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
