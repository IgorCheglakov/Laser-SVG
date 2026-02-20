/**
 * Selection Tool
 * 
 * Tool for selecting and moving objects on the canvas.
 * Selection and movement are handled by Canvas component.
 */

import { BaseTool, type ToolContext } from './types'

type SelectionMode = 'none' | 'selecting' | 'moving'

export class SelectionTool extends BaseTool {
  id = 'selection' as const
  cursor = 'default'
  
  private _mode: SelectionMode = 'none'
  
  get mode(): SelectionMode {
    return this._mode
  }
  
  onMouseDown(_e: React.MouseEvent, _context: ToolContext): void {
    this._mode = 'selecting'
  }
  
  onMouseMove(_e: React.MouseEvent, _context: ToolContext): void {
    // Handled by Canvas component
  }
  
  onMouseUp(_e: React.MouseEvent, _context: ToolContext): void {
    this._mode = 'none'
  }
  
  deactivate(): void {
    this._mode = 'none'
  }
}

export const selectionTool = new SelectionTool()
