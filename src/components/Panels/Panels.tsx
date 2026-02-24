/**
 * Panels Component
 * 
 * Right-side panel area with Layers and Properties panels.
 */

import { useMemo, useState } from 'react'
import { useEditorStore } from '@store/index'
import { UI_STRINGS, COLOR_PALETTE, getContrastColor } from '@constants/index'
import { Square, Circle, Minus, Folder } from 'lucide-react'
import type { PointElement, SVGElement, Point } from '@/types-app/index'
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
    // Group vertices by element
    const verticesByElement = new Map<string, number[]>()
    
    selectedVertices.forEach(key => {
      const [elementId, vertexIndexStr] = key.split(':')
      const vertexIndex = parseInt(vertexIndexStr, 10)
      
      if (!verticesByElement.has(elementId)) {
        verticesByElement.set(elementId, [])
      }
      verticesByElement.get(elementId)!.push(vertexIndex)
    })
    
    // Process each element once with all its vertices
    verticesByElement.forEach((vertexIndices, elementId) => {
      const element = elements.find(el => el.id === elementId)
      if (!element) return
      
      const newPoints = [...element.points]
      
      vertexIndices.forEach(vertexIndex => {
        let converted: Point
        
        if (newType === 'corner') {
          converted = convertToCorner(vertexIndex, newPoints, element.isClosedShape)
        } else if (newType === 'straight') {
          converted = convertToStraight(vertexIndex, newPoints, element.isClosedShape)
        } else {
          converted = convertToSmooth(vertexIndex, newPoints, element.isClosedShape)
        }
        
        newPoints[vertexIndex] = converted
      })
      
      updateElement(elementId, { points: newPoints } as Partial<SVGElement>)
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
 * Layers Panel
 */
const LayersPanel: React.FC = () => {
  const { 
    elements, 
    layers, 
    activeLayerId, 
    selectedIds, 
    setSelectedIds,
    addLayer,
    updateLayer,
    deleteLayer,
    setActiveLayer,
  } = useEditorStore()

  const [editingLayerId, setEditingLayerId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')

  const getElementIcon = (type: string) => {
    switch (type) {
      case 'rect': return <Square size={12} />
      case 'ellipse': return <Circle size={12} />
      case 'line': return <Minus size={12} />
      case 'group': return <Folder size={12} />
      case 'point': return <Square size={12} />
      default: return <Square size={12} />
    }
  }

  const handleAddLayer = () => {
    const newId = `layer_${Date.now()}`
    const layerCount = layers.length + 1
    addLayer({
      id: newId,
      name: `Layer ${layerCount}`,
      visible: true,
      locked: false,
      color: '#000000',
    })
    setActiveLayer(newId)
  }

  const handleDeleteLayer = (layerId: string) => {
    if (layers.length <= 1) return
    deleteLayer(layerId)
  }

  const handleToggleVisibility = (layerId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const layer = layers.find(l => l.id === layerId)
    if (layer) {
      updateLayer(layerId, { visible: !layer.visible })
    }
  }

  const handleToggleLock = (layerId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const layer = layers.find(l => l.id === layerId)
    if (layer) {
      updateLayer(layerId, { locked: !layer.locked })
    }
  }

  const handleStartEdit = (layerId: string, currentName: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingLayerId(layerId)
    setEditingName(currentName)
  }

  const handleFinishEdit = () => {
    if (editingLayerId && editingName.trim()) {
      updateLayer(editingLayerId, { name: editingName.trim() })
    }
    setEditingLayerId(null)
    setEditingName('')
  }

  const handleLayerClick = (layerId: string) => {
    setActiveLayer(layerId)
  }

  const handleElementClick = (elementId: string, e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      if (selectedIds.includes(elementId)) {
        setSelectedIds(selectedIds.filter(id => id !== elementId))
      } else {
        setSelectedIds([...selectedIds, elementId])
      }
    } else {
      setSelectedIds([elementId])
    }
  }

  const elementsByLayer = useMemo(() => {
    const result: Record<string, typeof elements> = {}
    layers.forEach(layer => {
      result[layer.id] = elements.filter(el => el.layerId === layer.id || (!el.layerId && layer.id === 'default'))
    })
    return result
  }, [elements, layers])

  return (
    <div className="flex flex-col h-full">
      {/* Layers header with add button */}
      <div className="px-3 py-2 bg-dark-bgTertiary text-sm font-medium text-dark-text border-b border-dark-border flex items-center justify-between">
        <span>{UI_STRINGS.PANEL_LAYERS}</span>
        <button
          onClick={handleAddLayer}
          className="text-xs px-2 py-0.5 bg-dark-accent text-white rounded hover:bg-dark-accent/80"
          title="Add Layer"
        >
          +
        </button>
      </div>

      {/* Layers list */}
      <div className="flex-1 overflow-y-auto">
        {layers.map(layer => (
          <div key={layer.id} className="border-b border-dark-border">
            {/* Layer header */}
            <div 
              className={`
                flex items-center gap-2 px-3 py-2 cursor-pointer select-none
                ${activeLayerId === layer.id ? 'bg-dark-bgSecondary' : 'hover:bg-dark-bgTertiary'}
              `}
              onClick={() => handleLayerClick(layer.id)}
            >
              {/* Visibility toggle */}
              <button
                onClick={(e) => handleToggleVisibility(layer.id, e)}
                className={`text-xs w-4 ${layer.visible ? 'text-dark-text' : 'text-dark-textMuted'}`}
                title={layer.visible ? 'Hide Layer' : 'Show Layer'}
              >
                {layer.visible ? '👁' : '○'}
              </button>

              {/* Lock toggle */}
              <button
                onClick={(e) => handleToggleLock(layer.id, e)}
                className={`text-xs w-4 ${layer.locked ? 'text-dark-accent' : 'text-dark-textMuted'}`}
                title={layer.locked ? 'Unlock Layer' : 'Lock Layer'}
              >
                {layer.locked ? '🔒' : '🔓'}
              </button>

              {/* Layer name */}
              {editingLayerId === layer.id ? (
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={handleFinishEdit}
                  onKeyDown={(e) => e.key === 'Enter' && handleFinishEdit()}
                  className="flex-1 bg-dark-bgTertiary text-dark-text text-xs px-1 py-0.5 rounded border border-dark-border"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span 
                  className="flex-1 text-sm text-dark-text truncate"
                  onDoubleClick={(e) => handleStartEdit(layer.id, layer.name, e)}
                >
                  {layer.name}
                </span>
              )}

              {/* Delete layer button */}
              {layers.length > 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteLayer(layer.id) }}
                  className="text-xs text-dark-textMuted hover:text-red-400 w-4"
                  title="Delete Layer"
                >
                  ×
                </button>
              )}

              {/* Element count */}
              <span className="text-xs text-dark-textMuted">
                ({elementsByLayer[layer.id]?.length || 0})
              </span>
            </div>

            {/* Elements in layer */}
            {activeLayerId === layer.id && elementsByLayer[layer.id]?.length > 0 && (
              <div className="bg-dark-bgSecondary">
                {[...elementsByLayer[layer.id]].reverse().map((element, idx) => (
                  <div
                    key={element.id}
                    onClick={(e) => handleElementClick(element.id, e)}
                    className={`
                      flex items-center gap-2 px-4 py-1.5 text-xs cursor-pointer
                      ${selectedIds.includes(element.id)
                        ? 'bg-dark-accent text-white'
                        : 'text-dark-text hover:bg-dark-bgTertiary'
                      }
                    `}
                  >
                    <span className="text-dark-textMuted">
                      {getElementIcon(element.type)}
                    </span>
                    <span className="truncate">
                      {element.name || `${element.type} ${elements.length - idx}`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Right panel container with layers and properties
 */
export const Panels: React.FC = () => {
  const { elements, selectedIds, updateElement, activeTool, selectedVertices } = useEditorStore()

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
    const newPoints = pointEl.points.map(p => ({
      ...p,
      x: p.x + deltaX,
      prevControlHandle: p.prevControlHandle ? { ...p.prevControlHandle, x: p.prevControlHandle.x + deltaX } : undefined,
      nextControlHandle: p.nextControlHandle ? { ...p.nextControlHandle, x: p.nextControlHandle.x + deltaX } : undefined,
    }))
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
    const newPoints = pointEl.points.map(p => ({
      ...p,
      y: p.y + deltaY,
      prevControlHandle: p.prevControlHandle ? { ...p.prevControlHandle, y: p.prevControlHandle.y + deltaY } : undefined,
      nextControlHandle: p.nextControlHandle ? { ...p.nextControlHandle, y: p.nextControlHandle.y + deltaY } : undefined,
    }))
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
      <div className="h-[45%] border-b border-dark-border overflow-y-auto">
        <div className="px-3 py-2 bg-dark-bgTertiary text-sm font-medium text-dark-text border-b border-dark-border sticky top-0">
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
      <LayersPanel />
    </div>
  )
}
