/**
 * Rectangle Tool
 * 
 * Creates rectangles by clicking and dragging on the canvas.
 * Supports snapping to grid if enabled.
 * Note: Canvas component handles the actual element creation
 */

import { BaseTool, type ToolContext } from './types'
import type { Point } from '@/types-app/index'

export class RectangleTool extends BaseTool {
  id = 'rectangle' as const
  cursor = 'crosshair'
  
  private isDrawing = false
  private startPoint: Point = { x: 0, y: 0 }
  
  onMouseDown(e: React.MouseEvent, context: ToolContext): void {
    if (e.button !== 0) return // Only left mouse button
    
    e.preventDefault()
    this.isDrawing = true
    
    const point = context.screenToCanvas(e.clientX, e.clientY)
    this.startPoint = context.snapPoint(point)
  }
  
  onMouseMove(_e: React.MouseEvent, _context: ToolContext): void {
    // Preview is handled by Canvas component
  }
  
  onMouseUp(_e: React.MouseEvent, _context: ToolContext): void {
    this.isDrawing = false
  }
  
  deactivate(): void {
    this.isDrawing = false
  }
  
  getStartPoint(): Point {
    return this.startPoint
  }
  
  isCurrentlyDrawing(): boolean {
    return this.isDrawing
  }
}

export const rectangleTool = new RectangleTool()
