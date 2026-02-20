/**
 * Trapezoid Tool
 * 
 * Tool for creating asymmetric trapezoids by defining four corner points.
 */

import { BaseTool, type ToolContext } from './types'

export class TrapezoidTool extends BaseTool {
  id = 'trapezoid' as const
  cursor = 'crosshair'
  
  onMouseDown(_e: React.MouseEvent, _context: ToolContext): void {
    // Handled by Canvas component
  }
  
  onMouseMove(_e: React.MouseEvent, _context: ToolContext): void {
    // Handled by Canvas component
  }
  
  onMouseUp(_e: React.MouseEvent, _context: ToolContext): void {
    // Handled by Canvas component
  }
}

export const trapezoidTool = new TrapezoidTool()
