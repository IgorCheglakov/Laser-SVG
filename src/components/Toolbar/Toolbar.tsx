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
  Bug,
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
]

/**
 * Vertical toolbar with tool selection
 */
export const Toolbar: React.FC = () => {
  const { activeTool, setActiveTool, settings, toggleDebug } = useEditorStore()

  return (
    <div className="flex flex-col items-center py-2 gap-1">
      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => setActiveTool(tool.id)}
          className={`
            w-9 h-9 flex items-center justify-center rounded
            transition-colors duration-150
            focus:outline-none
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
      
      <button
        onClick={() => toggleDebug()}
        className={`
          w-9 h-9 flex items-center justify-center rounded
          transition-colors duration-150
          focus:outline-none
          ${settings.debugMode 
            ? 'bg-green-700 text-white' 
            : 'text-dark-text hover:bg-dark-bgTertiary hover:text-white'
          }
        `}
        title="Toggle Debug Mode (Ctrl+Shift+D)"
      >
        <Bug size={20} />
      </button>
      
    </div>
  )
}
