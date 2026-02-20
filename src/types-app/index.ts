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
export type ElementType = 'point' | 'path' | 'text'

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
 * Union type for all element types
 */
export type SVGElement = PointElement | PathElement

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
