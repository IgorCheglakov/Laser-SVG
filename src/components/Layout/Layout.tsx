/**
 * Main Layout Component
 * 
 * Defines the overall application layout with toolbar, canvas, and panels.
 */

import { Toolbar } from '@components/Toolbar/Toolbar'
import { Canvas } from '@components/Canvas/Canvas'
import { Panels } from '@components/Panels/Panels'
import { StatusBar } from './StatusBar'

/**
 * Main layout component composing all major UI sections
 */
export const Layout: React.FC = () => {
  return (
    <div className="flex flex-col h-full w-full">
      {/* Top toolbar area */}
      <div className="h-12 bg-dark-bgSecondary border-b border-dark-border flex items-center px-4 shrink-0">
        <h1 className="text-lg font-semibold text-dark-text">LaserSVG Editor</h1>
        <div className="ml-8 text-sm text-dark-textMuted">
          Phase 1: Project Skeleton & Canvas
        </div>
      </div>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left toolbar */}
        <div className="w-12 bg-dark-bgSecondary border-r border-dark-border shrink-0">
          <Toolbar />
        </div>

        {/* Center canvas */}
        <div className="flex-1 relative overflow-hidden">
          <Canvas />
        </div>

        {/* Right panels */}
        <div className="w-72 bg-dark-bgSecondary border-l border-dark-border shrink-0 overflow-y-auto">
          <Panels />
        </div>
      </div>

      {/* Bottom status bar */}
      <StatusBar />
    </div>
  )
}
