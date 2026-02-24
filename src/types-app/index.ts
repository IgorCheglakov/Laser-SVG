/**
 * Core Type Definitions
 * 
 * TypeScript interfaces and types for the LaserSVG Editor application.
 * All visible elements are represented as PointElement with array of points.
 * Each point can optionally have Bezier curve control points (cp1, cp2).
 */

import type { Point as BasePoint } from './point'

/**
 * Point with optional Bezier curve control points
 */
export type Point = BasePoint

/**
 * Represents a rectangle's dimensions and position
 */
export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Supported SVG element types
 */
export type ElementType = 'point' | 'path' | 'text' | 'group'

/**
 * Layer - Group of elements that can be shown/hidden/locked together
 */
export interface Layer {
  id: string
  name: string
  visible: boolean
  locked: boolean
  color: string
}

/**
 * Base interface for all SVG elements
 */
export interface BaseElement {
  id: string
  type: ElementType
  name: string
  visible: boolean
  locked: boolean
  layerId?: string
}

/**
 * Point Element - Universal element for all geometric shapes
 * Represented as an array of vertices (points)
 * - Line: 2 points, isClosedShape = false
 * - Rectangle: 4 points (corners), isClosedShape = true
 * - Polygon: N points (vertices), isClosedShape = true/false
 * - Curves: Points with cp1/cp2 control points for Bezier curves
 */
export interface PointElement extends BaseElement {
  type: 'point'
  points: Point[]
  stroke: string
  strokeWidth: number
  isClosedShape: boolean
  rotationCenter?: Point
  angle?: number
  isSimpleLine?: boolean
}

/**
 * Path element (for future complex paths with mixed segments)
 */
export interface PathElement extends BaseElement {
  type: 'path'
  d: string
  stroke: string
  strokeWidth: number
}

/**
 * Group element - contains child elements
 * Exported as <g> in SVG
 */
export interface GroupElement extends BaseElement {
  type: 'group'
  children: SVGElement[]
}

/**
 * Union type for all element types
 */
export type SVGElement = PointElement | PathElement | GroupElement

/**
 * View state for the canvas (zoom and pan)
 */
export interface ViewState {
  scale: number
  offsetX: number
  offsetY: number
  screenWidth: number
  screenHeight: number
}

/**
 * Canvas settings
 */
export interface CanvasSettings {
  artboardWidth: number
  artboardHeight: number
  showGrid: boolean
  snapToGrid: boolean
  gridSize: number
  debugMode: boolean
}

/**
 * Available tools
 */
export type ToolType = 
  | 'selection' 
  | 'directSelection' 
  | 'rectangle' 
  | 'ellipse'
  | 'line' 
  | 'trapezoid'
  | 'polygon'
  | 'pen'

/**
 * Tool interface definition
 */
export interface ITool {
  id: ToolType
  cursor: string
  activate: () => void
  deactivate: () => void
  onMouseDown: (e: React.MouseEvent, context: ToolContext) => void
  onMouseMove: (e: React.MouseEvent, context: ToolContext) => void
  onMouseUp: (e: React.MouseEvent, context: ToolContext) => void
  onKeyDown?: (e: KeyboardEvent) => void
}

/**
 * Context provided to tools
 */
export interface ToolContext {
  view: ViewState
  settings: CanvasSettings
  screenToCanvas: (screenX: number, screenY: number) => Point
  snapPoint: (point: Point) => Point
  addElement: (element: SVGElement) => void
}

/**
 * Editor state for Zustand store
 */
export interface EditorState {
  // Elements
  elements: SVGElement[]
  selectedIds: string[]
  selectedVertices: Set<string>
  
  // Layers
  layers: Layer[]
  activeLayerId: string | null
  
  // View
  view: ViewState
  settings: CanvasSettings
  
  // Tool
  activeTool: ToolType
  
  // Actions
  setElements: (elements: SVGElement[]) => void
  addElement: (element: SVGElement) => void
  updateElement: (id: string, updates: Partial<SVGElement>) => void
  updateElementNoHistory: (id: string, updates: Partial<SVGElement>) => void
  deleteElement: (id: string) => void
  deleteAllElements: () => void
  setSelectedIds: (ids: string[]) => void
  clearSelection: () => void
  
  // View actions
  setView: (view: Partial<ViewState>) => void
  setScreenSize: (width: number, height: number) => void
  zoomIn: () => void
  zoomOut: () => void
  resetView: () => void
  pan: (deltaX: number, deltaY: number) => void
  
  // Settings actions
  setSettings: (settings: Partial<CanvasSettings>) => void
  toggleGrid: () => void
  toggleSnap: () => void
  toggleDebug: () => void
  
  // Tool actions
  setActiveTool: (tool: ToolType) => void
  
  // Vertex selection
  setSelectedVertices: (vertices: Set<string>) => void
  
  // Group actions
  groupElements: (ids: string[]) => void
  ungroupElements: (id: string) => void
  
  // Layer actions
  addLayer: (layer: Layer) => void
  updateLayer: (id: string, updates: Partial<Layer>) => void
  deleteLayer: (id: string) => void
  setActiveLayer: (id: string | null) => void
  moveElementToLayer: (elementId: string, layerId: string) => void
}

/**
 * History entry for undo/redo
 */
export interface HistoryEntry {
  elements: SVGElement[]
  selectedIds: string[]
}
