# LaserSVG Editor - Project Structure

## Overview

Desktop SVG editor for laser engraving with Lightburn compatibility.
**Current Phase:** Phase 3 - Selection & Transformation
**Tech Stack:** Electron 28, React 18, TypeScript, Vite, Tailwind CSS, Zustand, Lucide React

## Architecture

The application follows a modular architecture with:
- **Electron** - Desktop wrapper for Windows
- **React** - UI rendering
- **Zustand** - State management with undo/redo history
- **Unified PointElement Model** - All shapes represented as points for consistent transformation

## Project Tree

```
LaserSVG Editor/
├── electron/                    # Electron main process
│   ├── main.ts                  # Main window entry point
│   └── preload.ts               # Preload script for IPC
├── src/
│   ├── main.tsx                 # React entry point
│   ├── App.tsx                  # Root component
│   ├── components/
│   │   ├── Canvas/
│   │   │   ├── Canvas.tsx              # Main canvas with zoom/pan
│   │   │   ├── BoundingBox.tsx         # Selection bounding box (Phase 3)
│   │   │   ├── DirectSelectionBox.tsx  # Node selection box (Phase 3)
│   │   │   ├── FloatingPropertiesWidget.tsx  # Quick transform widget
│   │   │   └── index.ts
│   │   ├── Layout/
│   │   │   ├── Layout.tsx        # Main app layout
│   │   │   ├── StatusBar.tsx    # Bottom status bar
│   │   │   └── index.ts
│   │   ├── Panels/
│   │   │   ├── Panels.tsx        # Layers & Properties panels
│   │   │   └── index.ts
│   │   ├── Toolbar/
│   │   │   ├── Toolbar.tsx       # Left vertical toolbar
│   │   │   └── index.ts
│   │   └── index.ts
│   ├── tools/                   # Drawing tool implementations
│   │   ├── types.ts              # ITool interface
│   │   ├── index.ts              # Tool registry
│   │   ├── SelectionTool.ts     # Selection tool (V)
│   │   ├── RectangleTool.ts      # Rectangle tool (R)
│   │   ├── EllipseTool.ts        # Ellipse tool (E)
│   │   ├── LineTool.ts           # Line tool (L)
│   │   ├── TrapezoidTool.ts      # Trapezoid tool (T)
│   │   └── PolygonTool.ts        # Polygon tool (P)
│   ├── store/
│   │   └── index.ts              # Zustand store (elements, history, view)
│   ├── types-app/
│   │   ├── index.ts              # App type exports
│   │   └── point.ts              # PointElement interface
│   ├── constants/
│   │   └── index.ts              # UI strings, defaults, colors
│   ├── utils/
│   │   ├── transform.ts          # Point transformation logic
│   │   ├── bounds.ts             # Bounding box calculations
│   │   ├── snap.ts               # Grid snap service
│   │   └── id.ts                 # ID generation
│   └── styles/
│       └── index.css             # Tailwind CSS
├── dist/                         # React build output
├── dist-electron/                # Electron build output
├── release/
│   ├── LaserSVG-Editor-0.1.0.exe # Portable executable
│   └── win-unpacked/             # Unpacked build
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── electron/tsconfig.json
```

## Key Modules

### PointElement Model
All visible elements inherit from `PointElement` interface:
- `id`: Unique identifier
- `type`: Always 'point'
- `name`: Display name
- `visible/locked`: Element state
- `points`: Array of Point (with optional Bezier cp1/cp2)
- `stroke`: Color from Lightburn palette
- `strokeWidth`: Default 1mm
- `isClosedShape`: true for shapes, false for lines

### Store (Zustand)
Manages:
- `elements`: All PointElements
- `selectedIds`: Currently selected elements
- `activeTool`: Current tool ID
- `viewState`: Zoom level, pan offset
- `settings`: Grid visibility, snap toggle
- `history`: Undo/redo stack

### Tool System
Each tool implements `ITool` interface:
- `id`, `cursor`: Tool identification
- `activate/deactivate`: Lifecycle hooks
- `onMouseDown/Move/Up`: Drawing handlers
- `onKeyDown`: Keyboard input

### Transform Service
Located in `src/utils/transform.ts`:
- Coefficient-based point transformation
- Handle-to-pivot mapping (8 handles)
- Alt-key center scaling support
- Bezier control point transformation

## Phase Status

| Phase | Status | Description |
|-------|--------|-------------|
| 1 | ✅ Complete | Project skeleton & canvas |
| 2 | ✅ Complete | State management & drawing tools |
| 3 | 🔄 In Progress | Selection & transformation |
| 4 | ⏳ Pending | Properties, styling, snapping |
| 5 | ⏳ Pending | Direct selection & Bezier |
| 6 | ⏳ Pending | Export, import, settings |

## Running

```bash
npm install
npm run electron:dev      # Development
npm run electron:build    # Build
npm run dist:portable     # Create portable exe
```

## Key Dependencies

- electron: ^28.x
- react: ^18.x
- zustand: ^4.x
- lucide-react: ^0.x
- tailwindcss: ^3.x
- vite: ^5.x
