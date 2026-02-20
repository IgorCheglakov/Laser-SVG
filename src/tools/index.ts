/**
 * Tool Manager
 * 
 * Manages active tool and provides tool instances.
 */

import type { ToolType } from '@/types-app/index'
import type { ITool } from './types'
import { selectionTool } from './SelectionTool'
import { rectangleTool } from './RectangleTool'
import { ellipseTool } from './EllipseTool'
import { lineTool } from './LineTool'
import { trapezoidTool } from './TrapezoidTool'

/**
 * Registry of all available tools
 */
const tools: Record<ToolType, ITool> = {
  selection: selectionTool,
  directSelection: selectionTool, // Placeholder for Phase 5
  rectangle: rectangleTool,
  ellipse: ellipseTool,
  line: lineTool,
  trapezoid: trapezoidTool,
  pen: lineTool, // Placeholder
}

/**
 * Get a tool instance by type
 */
export function getTool(type: ToolType): ITool {
  return tools[type] || selectionTool
}

/**
 * Export all tools
 */
export { selectionTool, rectangleTool, ellipseTool, lineTool, trapezoidTool }
export type { ITool, ToolContext } from './types'
