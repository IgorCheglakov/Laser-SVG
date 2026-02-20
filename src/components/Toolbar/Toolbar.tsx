/**
 * Toolbar Component
 * 
 * Vertical toolbar with tool selection buttons.
 */

import { 
  MousePointer2, 
  MousePointerClick, 
  Square, 
  Minus,
  Pentagon,
} from 'lucide-react'
import { useEditorStore } from '@store/index'
import type { ToolType } from '@/types-app/index'
import { UI_STRINGS } from '@constants/index'

/**
 * Tool button configuration
 */
interface ToolButton {
  id: ToolType
  icon: React.ReactNode
  label: string
  shortcut: string
}

/**
 * Available tools configuration
 */
const tools: ToolButton[] = [
  { 
    id: 'selection', 
    icon: <MousePointer2 size={20} />, 
    label: UI_STRINGS.TOOL_SELECTION, 
    shortcut: 'V' 
  },
  { 
    id: 'directSelection', 
    icon: <MousePointerClick size={20} />, 
    label: UI_STRINGS.TOOL_DIRECT_SELECTION, 
    shortcut: 'A' 
  },
  { 
    id: 'rectangle', 
    icon: <Square size={20} />, 
    label: UI_STRINGS.TOOL_RECTANGLE, 
    shortcut: 'R' 
  },
  { 
    id: 'line', 
    icon: <Minus size={20} />, 
    label: UI_STRINGS.TOOL_LINE, 
    shortcut: 'L' 
  },
  { 
    id: 'trapezoid', 
    icon: <Pentagon size={20} />, 
    label: 'Трапеция', 
    shortcut: 'T' 
  },
  { 
    id: 'polygon', 
    icon: <Pentagon size={20} />, 
    label: 'Многоугольник', 
    shortcut: 'P' 
  },
]

/**
 * Vertical toolbar with tool selection
 */
export const Toolbar: React.FC = () => {
  const { activeTool, setActiveTool } = useEditorStore()

  return (
    <div className="flex flex-col items-center py-2 gap-1">
      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => setActiveTool(tool.id)}
          className={`
            w-9 h-9 flex items-center justify-center rounded
            transition-colors duration-150
            ${activeTool === tool.id 
              ? 'bg-dark-accent text-white' 
              : 'text-dark-text hover:bg-dark-bgTertiary hover:text-white'
            }
          `}
          title={`${tool.label} (${tool.shortcut})`}
        >
          {tool.icon}
        </button>
      ))}
      
      <div className="w-6 h-px bg-dark-border my-2" />
      
    </div>
  )
}
