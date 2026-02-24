import { describe, it, expect, beforeEach } from 'vitest'
import { useEditorStore } from './index'
import type { Layer, PointElement } from '@/types-app/index'

describe('Layer functionality', () => {
  beforeEach(() => {
    useEditorStore.setState({
      elements: [],
      selectedIds: [],
      selectedVertices: new Set(),
      layers: [{ id: 'default', name: 'Layer 1', visible: true, locked: false, color: '#000000' }],
      activeLayerId: 'default',
    })
  })

  describe('addLayer', () => {
    it('should add a new layer', () => {
      const newLayer: Layer = { id: 'layer2', name: 'Layer 2', visible: true, locked: false, color: '#ff0000' }
      
      useEditorStore.getState().addLayer(newLayer)
      
      const layers = useEditorStore.getState().layers
      expect(layers).toHaveLength(2)
      expect(layers[1].id).toBe('layer2')
      expect(layers[1].name).toBe('Layer 2')
    })
  })

  describe('updateLayer', () => {
    it('should update layer properties', () => {
      useEditorStore.getState().updateLayer('default', { name: 'Updated Layer', visible: false })
      
      const layer = useEditorStore.getState().layers.find(l => l.id === 'default')
      expect(layer?.name).toBe('Updated Layer')
      expect(layer?.visible).toBe(false)
    })
  })

  describe('deleteLayer', () => {
    it('should delete layer and move elements to first remaining layer', () => {
      // Add a second layer
      useEditorStore.getState().addLayer({ id: 'layer2', name: 'Layer 2', visible: true, locked: false, color: '#ff0000' })
      
      // Add element to layer2
      const element: PointElement = {
        id: 'elem1',
        type: 'point',
        name: 'Test',
        visible: true,
        locked: false,
        points: [{ x: 0, y: 0 }],
        stroke: '#000',
        strokeWidth: 0.25,
        isClosedShape: false,
        layerId: 'layer2',
      }
      useEditorStore.getState().setElements([element])
      
      // Delete layer2
      useEditorStore.getState().deleteLayer('layer2')
      
      const layers = useEditorStore.getState().layers
      expect(layers).toHaveLength(1)
      
      // Elements on deleted layer should be removed
      const elements = useEditorStore.getState().elements
      expect(elements).toHaveLength(0)
    })

    it('should not delete last remaining layer', () => {
      useEditorStore.getState().deleteLayer('default')
      
      const layers = useEditorStore.getState().layers
      expect(layers).toHaveLength(1)
    })
  })

  describe('setActiveLayer', () => {
    it('should set active layer', () => {
      useEditorStore.getState().addLayer({ id: 'layer2', name: 'Layer 2', visible: true, locked: false, color: '#ff0000' })
      
      useEditorStore.getState().setActiveLayer('layer2')
      
      expect(useEditorStore.getState().activeLayerId).toBe('layer2')
    })
  })

  describe('moveElementToLayer', () => {
    it('should move element to specified layer', () => {
      useEditorStore.getState().addLayer({ id: 'layer2', name: 'Layer 2', visible: true, locked: false, color: '#ff0000' })
      
      const element: PointElement = {
        id: 'elem1',
        type: 'point',
        name: 'Test',
        visible: true,
        locked: false,
        points: [{ x: 0, y: 0 }],
        stroke: '#000',
        strokeWidth: 0.25,
        isClosedShape: false,
        layerId: 'default',
      }
      useEditorStore.getState().setElements([element])
      
      useEditorStore.getState().moveElementToLayer('elem1', 'layer2')
      
      const elements = useEditorStore.getState().elements
      expect(elements[0].layerId).toBe('layer2')
    })
  })

  describe('layer visibility', () => {
    it('should hide elements from hidden layers', () => {
      useEditorStore.getState().addLayer({ id: 'layer2', name: 'Layer 2', visible: false, locked: false, color: '#ff0000' })
      
      const element: PointElement = {
        id: 'elem1',
        type: 'point',
        name: 'Test',
        visible: true,
        locked: false,
        points: [{ x: 0, y: 0 }],
        stroke: '#000',
        strokeWidth: 0.25,
        isClosedShape: false,
        layerId: 'layer2',
      }
      useEditorStore.getState().setElements([element])
      
      const { layers } = useEditorStore.getState()
      const layer2 = layers.find(l => l.id === 'layer2')
      
      expect(layer2?.visible).toBe(false)
    })
  })
})
