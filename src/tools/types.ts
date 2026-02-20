/**
 * Tool System Types and Interfaces
 * 
 * Defines the contract for all tools in the editor.
 */

import type { Point, ToolType, SVGElement, ToolContext as IToolContext } from '@/types-app/index'

export interface ToolContext extends IToolContext {
  addElement: (element: SVGElement) => void
  screenToCanvas: (screenX: number, screenY: number) => Point
  snapPoint: (point: Point) => Point
}

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
 * Base tool class with common functionality
 */
export abstract class BaseTool implements ITool {
  abstract id: ToolType
  abstract cursor: string
  
  activate(): void {
    // Override in subclasses if needed
  }
  
  deactivate(): void {
    // Override in subclasses if needed
  }
  
  abstract onMouseDown(e: React.MouseEvent, context: ToolContext): void
  abstract onMouseMove(e: React.MouseEvent, context: ToolContext): void
  abstract onMouseUp(e: React.MouseEvent, context: ToolContext): void
}
