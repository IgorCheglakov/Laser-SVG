/**
 * Core Type Definitions
 * 
 * TypeScript interfaces and types for the LaserSVG Editor application.
 */

/**
 * Represents a point in 2D space (in millimeters)
 */
export interface Point {
  x: number
  y: number
}

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
export type ElementType = 'rect' | 'ellipse' | 'line' | 'path' | 'text' | 'polygon'

/**
 * Base interface for all SVG elements
 */
export interface BaseElement {
  id: string
  type: ElementType
  name: string
  visible: boolean
  locked: boolean
}

/**
 * Rectangle element
 */
export interface RectElement extends BaseElement {
  type: 'rect'
  x: number
  y: number
  width: number
  height: number
  rx?: number
  ry?: number
  stroke: string
  strokeWidth: number
}

/**
 * Ellipse element
 */
export interface EllipseElement extends BaseElement {
  type: 'ellipse'
  cx: number
  cy: number
  rx: number
  ry: number
  stroke: string
  strokeWidth: number
}

/**
 * Line element
 */
export interface LineElement extends BaseElement {
  type: 'line'
  x1: number
  y1: number
  x2: number
  y2: number
  stroke: string
  strokeWidth: number
}

/**
 * Path element
 */
export interface PathElement extends BaseElement {
  type: 'path'
  d: string
  stroke: string
  strokeWidth: number
}

/**
 * Polygon element (e.g., trapezoid)
 */
export interface PolygonElement extends BaseElement {
  type: 'polygon'
  points: { x: number; y: number }[]
  stroke: string
  strokeWidth: number
}

/**
 * Union type for all element types
 */
export type SVGElement = RectElement | EllipseElement | LineElement | PathElement | PolygonElement

/**
 * View state for the canvas (zoom and pan)
 */
export interface ViewState {
  scale: number
  offsetX: number
  offsetY: number
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
}

/**
 * Editor state for Zustand store
 */
export interface EditorState {
  // Elements
  elements: SVGElement[]
  selectedIds: string[]
  
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
  zoomIn: () => void
  zoomOut: () => void
  resetView: () => void
  pan: (deltaX: number, deltaY: number) => void
  
  // Settings actions
  setSettings: (settings: Partial<CanvasSettings>) => void
  toggleGrid: () => void
  toggleSnap: () => void
  
  // Tool actions
  setActiveTool: (tool: ToolType) => void
}

/**
 * History entry for undo/redo
 */
export interface HistoryEntry {
  elements: SVGElement[]
  selectedIds: string[]
}
