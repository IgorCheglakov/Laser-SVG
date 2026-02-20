/**
 * Status Bar Component
 * 
 * Displays application status information at the bottom of the window.
 */

import { useEditorStore } from '@store/index'
import { UI_STRINGS } from '@constants/index'

/**
 * Status bar showing current zoom, tool, and other info
 */
export const StatusBar: React.FC = () => {
  const { view, activeTool, settings } = useEditorStore()

  const toolLabels: Record<string, string> = {
    selection: 'Selection',
    directSelection: 'Direct Selection',
    rectangle: 'Rectangle',
    ellipse: 'Ellipse',
    line: 'Line',
    pen: 'Pen',
  }

  return (
    <div className="h-7 bg-dark-accent text-white flex items-center px-3 text-xs shrink-0 select-none">
      <div className="flex items-center gap-4">
        <span>{UI_STRINGS.STATUS_READY}</span>
        <span className="text-white/70">|</span>
        <span>Tool: {toolLabels[activeTool] || activeTool}</span>
        <span className="text-white/70">|</span>
        <span>Zoom: {Math.round(view.scale * 100)}%</span>
        <span className="text-white/70">|</span>
        <span>Snap: {settings.snapToGrid ? 'On' : 'Off'}</span>
        <span className="text-white/70">|</span>
        <span>Grid: {settings.showGrid ? 'Visible' : 'Hidden'}</span>
      </div>
      <div className="flex-1" />
      <div className="text-white/70">
        v{UI_STRINGS.APP_VERSION}
      </div>
    </div>
  )
}
