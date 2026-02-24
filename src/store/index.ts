/**
 * Zustand Store with Undo/Redo History
 * 
 * Manages the application state including elements, view, settings,
 * and provides undo/redo functionality.
 */

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { EditorState, GroupElement, HistoryEntry, SVGElement, ViewState, CanvasSettings } from '@/types-app/index'
import { DEFAULTS } from '@constants/index'

/**
 * Initial view state
 */
const initialView: ViewState = {
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  screenWidth: 800,
  screenHeight: 600,
}

/**
 * Initial canvas settings
 */
const initialSettings: CanvasSettings = {
  artboardWidth: DEFAULTS.ARTBOARD_WIDTH,
  artboardHeight: DEFAULTS.ARTBOARD_HEIGHT,
  showGrid: false,
  snapToGrid: true,
  gridSize: DEFAULTS.GRID_SIZE,
  debugMode: false,
}

/**
 * History state (not part of the main store to avoid serialization issues)
 */
interface HistoryState {
  past: HistoryEntry[]
  future: HistoryEntry[]
}

const history: HistoryState = {
  past: [],
  future: [],
}

/**
 * Push current state to history for undo support
 */
const pushHistory = (get: () => EditorState) => {
  const { elements, selectedIds } = get()
  history.past.push({
    elements: JSON.parse(JSON.stringify(elements)),
    selectedIds: [...selectedIds],
  })
  // Clear future when new action occurs
  history.future = []
  // Limit history size
  if (history.past.length > 50) {
    history.past.shift()
  }
}

/**
 * Save current state to history (for use before operations like move)
 */
export const saveToHistory = () => {
  pushHistory(useEditorStore.getState)
}

/**
 * Main editor store
 */
export const useEditorStore = create<EditorState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    elements: [],
    selectedIds: [],
    selectedVertices: new Set<string>(),
    view: initialView,
    settings: initialSettings,
    activeTool: 'selection',
    
    // Initial layer
    layers: [{ id: 'default', name: 'Layer 1', visible: true, locked: false, color: '#000000' }],
    activeLayerId: 'default',

    // Element actions
    setElements: (elements) => {
      pushHistory(get)
      set({ elements })
    },

    addElement: (element) => {
      // Check if element already exists (prevent duplicates)
      const existingIds = get().elements.map(el => el.id)
      if (existingIds.includes(element.id)) {
        console.warn('Attempted to add duplicate element:', element.id)
        return
      }
      pushHistory(get)
      set((state) => ({
        elements: [...state.elements, element],
        selectedIds: [element.id],
      }))
    },

    updateElement: (id, updates, skipHistory?: boolean) => {
      if (!skipHistory) {
        pushHistory(get)
      }
      set((state) => ({
        elements: state.elements.map((el) =>
          el.id === id ? ({ ...el, ...updates } as SVGElement) : el
        ),
      }))
    },

    updateElementNoHistory: (id: string, updates: Partial<SVGElement>) => {
      set((state) => {
        const updateInChildren = (elements: SVGElement[]): SVGElement[] => {
          return elements.map((el) => {
            if (el.id === id) {
              return { ...el, ...updates } as SVGElement
            }
            if (el.type === 'group') {
              return {
                ...el,
                children: updateInChildren((el as GroupElement).children),
              }
            }
            return el
          })
        }
        
        return {
          elements: updateInChildren(state.elements),
        }
      })
    },

    deleteElement: (id) => {
      pushHistory(get)
      set((state) => ({
        elements: state.elements.filter((el) => el.id !== id),
        selectedIds: state.selectedIds.filter((selectedId) => selectedId !== id),
      }))
    },

    deleteAllElements: () => {
      pushHistory(get)
      set({
        elements: [],
        selectedIds: [],
      })
    },

    setSelectedIds: (ids) => set({ selectedIds: ids }),
    
    clearSelection: () => set({ selectedIds: [] }),

    // View actions
    setView: (view) =>
      set((state) => ({
        view: { ...state.view, ...view },
      })),

    setScreenSize: (width, height) =>
      set((state) => ({
        view: { ...state.view, screenWidth: width, screenHeight: height },
      })),

    zoomIn: () =>
      set((state) => ({
        view: {
          ...state.view,
          scale: Math.min(state.view.scale + DEFAULTS.ZOOM_STEP, DEFAULTS.MAX_ZOOM),
        },
      })),

    zoomOut: () =>
      set((state) => ({
        view: {
          ...state.view,
          scale: Math.max(state.view.scale - DEFAULTS.ZOOM_STEP, DEFAULTS.MIN_ZOOM),
        },
      })),

    resetView: () =>
      set({
        view: initialView,
      }),

    pan: (deltaX, deltaY) =>
      set((state) => ({
        view: {
          ...state.view,
          offsetX: state.view.offsetX + deltaX,
          offsetY: state.view.offsetY + deltaY,
        },
      })),

    // Settings actions
    setSettings: (settings) =>
      set((state) => ({
        settings: { ...state.settings, ...settings },
      })),

    toggleGrid: () =>
      set((state) => ({
        settings: { ...state.settings, showGrid: !state.settings.showGrid },
      })),

    toggleSnap: () =>
      set((state) => ({
        settings: { ...state.settings, snapToGrid: !state.settings.snapToGrid },
      })),

    toggleDebug: () =>
      set((state) => ({
        settings: { ...state.settings, debugMode: !state.settings.debugMode },
      })),

    // Tool actions
    setActiveTool: (tool) => set({ activeTool: tool }),
    
    // Vertex selection actions
    setSelectedVertices: (vertices: Set<string>) => set({ selectedVertices: vertices }),
    
    // Group actions
    groupElements: (ids: string[]) => {
      const state = get()
      if (ids.length < 2) return
      
      pushHistory(get)
      
      const elementsToGroup = state.elements.filter(el => ids.includes(el.id))
      if (elementsToGroup.length < 2) return
      
      const groupId = `group-${Date.now()}`
      
      const group: GroupElement = {
        id: groupId,
        type: 'group',
        name: 'Group',
        visible: true,
        locked: false,
        children: elementsToGroup,
      }
      
      const remainingElements = state.elements.filter(el => !ids.includes(el.id))
      
      set({
        elements: [...remainingElements, group],
        selectedIds: [groupId],
      })
    },
    
    ungroupElements: (id: string) => {
      const state = get()
      const group = state.elements.find(el => el.id === id && el.type === 'group')
      if (!group || group.type !== 'group') return
      
      pushHistory(get)
      
      const children = group.children
      const parentElements = state.elements.filter(el => el.id !== id)
      
      const newElements = [...parentElements, ...children]
      const childIds = children.map(c => c.id)
      
      set({
        elements: newElements,
        selectedIds: childIds,
      })
    },
    
    // Layer actions
    addLayer: (layer) => {
      pushHistory(get)
      set(state => ({
        layers: [...state.layers, layer],
      }))
    },
    
    updateLayer: (id, updates) => {
      pushHistory(get)
      set(state => ({
        layers: state.layers.map(l => l.id === id ? { ...l, ...updates } : l),
      }))
    },
    
    deleteLayer: (id) => {
      const state = get()
      if (state.layers.length <= 1) return // Can't delete last layer
      
      pushHistory(get)
      
      // Move elements from deleted layer to first remaining layer
      const remainingLayers = state.layers.filter(l => l.id !== id)
      const newLayerId = remainingLayers[0].id
      
      set({
        layers: remainingLayers,
        activeLayerId: state.activeLayerId === id ? newLayerId : state.activeLayerId,
        elements: state.elements.map(el => 
          el.layerId === id ? { ...el, layerId: newLayerId } : el
        ),
      })
    },
    
    setActiveLayer: (id) => {
      set({ activeLayerId: id })
    },
    
    moveElementToLayer: (elementId, layerId) => {
      pushHistory(get)
      set(state => ({
        elements: state.elements.map(el => 
          el.id === elementId ? { ...el, layerId } : el
        ),
      }))
    },
  }))
)

/**
 * Undo the last action
 */
export const undo = () => {
  const current = useEditorStore.getState()
  
  if (history.past.length === 0) return
  
  const previous = history.past.pop()!
  
  // Save current state to future
  history.future.push({
    elements: JSON.parse(JSON.stringify(current.elements)),
    selectedIds: [...current.selectedIds],
  })
  
  // Restore previous state
  useEditorStore.setState({
    elements: previous.elements,
    selectedIds: previous.selectedIds,
  })
}

/**
 * Redo the previously undone action
 */
export const redo = () => {
  const current = useEditorStore.getState()
  
  if (history.future.length === 0) return
  
  const next = history.future.pop()!
  
  // Save current state to past
  history.past.push({
    elements: JSON.parse(JSON.stringify(current.elements)),
    selectedIds: [...current.selectedIds],
  })
  
  // Restore next state
  useEditorStore.setState({
    elements: next.elements,
    selectedIds: next.selectedIds,
  })
}

/**
 * Check if undo is available
 */
export const canUndo = () => history.past.length > 0

/**
 * Check if redo is available
 */
export const canRedo = () => history.future.length > 0
