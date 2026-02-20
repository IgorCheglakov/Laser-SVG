/**
 * Polygon Tool
 * 
 * Tool for creating arbitrary polygons by clicking points.
 * Double-click or press Enter to finish the polygon.
 */

import { BaseTool, type ToolContext } from './types'
import type { Point } from '@/types-app/index'

export class PolygonTool extends BaseTool {
  id = 'polygon' as const
  cursor = 'crosshair'
  
  private isDrawing = false
  private points: Point[] = []
  private currentPoint: Point = { x: 0, y: 0 }
  
  onMouseDown(e: React.MouseEvent, context: ToolContext): void {
    if (e.button !== 0) return
    
    e.preventDefault()
    
    const point = context.screenToCanvas(e.clientX, e.clientY)
    const snappedPoint = context.snapPoint(point)
    
    this.isDrawing = true
    this.points.push(snappedPoint)
    this.currentPoint = snappedPoint
  }
  
  onMouseMove(e: React.MouseEvent, context: ToolContext): void {
    if (!this.isDrawing) return
    
    const point = context.screenToCanvas(e.clientX, e.clientY)
    this.currentPoint = context.snapPoint(point)
  }
  
  onMouseUp(_e: React.MouseEvent, _context: ToolContext): void {
    // Handled by double-click or Enter
  }
  
  onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Enter' || e.key === 'Escape') {
      this.finishPolygon()
    }
  }
  
  private finishPolygon(): void {
    this.isDrawing = false
    this.points = []
  }
  
  deactivate(): void {
    this.isDrawing = false
    this.points = []
  }
  
  getPoints(): Point[] {
    return this.points
  }
  
  getCurrentPoint(): Point {
    return this.currentPoint
  }
  
  isCurrentlyDrawing(): boolean {
    return this.isDrawing
  }
  
  addPoint(point: Point): void {
    this.points.push(point)
  }
  
  clearPoints(): void {
    this.points = []
  }
}

export const polygonTool = new PolygonTool()
