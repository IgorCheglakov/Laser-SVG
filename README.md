# LaserSVG Editor

Desktop SVG editor for laser engraving with Lightburn compatibility.

## Phase 2 Complete: State Management & History

### Features Implemented

✅ **Electron + React + TypeScript + Vite + Tailwind CSS**
- Modern tech stack with hot reload in development
- Dark theme by default

✅ **Application Layout**
- Top menu bar
- Left vertical toolbar with tool icons
- Center canvas area
- Right panels (Layers & Properties)
- Bottom status bar

✅ **Canvas**
- 1000x1000mm white artboard on dark background
- Zoom: Mouse wheel (centered on cursor)
- Pan: Middle mouse button drag
- Zoom level indicator
- Grid toggle (Ctrl+')
- Real-time preview while drawing

✅ **Drawing Tools**
- **Rectangle Tool (R)**: Click and drag to create rectangles
- **Ellipse Tool (E)**: Click and drag to create ellipses  
- **Line Tool (L)**: Click and drag to create lines
- All tools support snap-to-grid (1mm)
- Preview shown while drawing (dashed outline)

✅ **Layers Panel**
- Displays all created elements
- Shows element type with icon
- Click to select elements
- Ctrl+Click for multi-select

✅ **Zustand Store**
- Global state management for all elements
- **Undo/Redo system** (Ctrl+Z / Ctrl+Y)
- View state (zoom, pan)
- Settings (grid, snap)

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| V | Selection Tool |
| A | Direct Selection Tool |
| R | Rectangle Tool |
| E | Ellipse Tool |
| L | Line Tool |
| Ctrl+Z | Undo |
| Ctrl+Y | Redo |
| Ctrl+Shift+S | Toggle Snap |
| Ctrl+' | Toggle Grid |
| Ctrl+= | Zoom In |
| Ctrl+- | Zoom Out |
| Ctrl+0 | Reset Zoom |
| Delete | Delete Selected |

### Running the Application

#### Development Mode
```bash
npm install
npm run electron:dev
```

#### Build Portable Version
```bash
npm run electron:build
npm run dist:portable
```

The portable executable will be created in `release/LaserSVG-Editor-0.1.0.exe`

### Project Structure

```
laser-svg-editor/
├── electron/           # Electron main & preload
├── src/
│   ├── components/     # React components
│   │   ├── Layout/
│   │   ├── Canvas/
│   │   ├── Toolbar/
│   │   └── Panels/
│   ├── tools/          # Tool implementations
│   │   ├── RectangleTool.ts
│   │   ├── EllipseTool.ts
│   │   └── LineTool.ts
│   ├── store/          # Zustand store
│   ├── types-app/      # TypeScript types
│   ├── constants/      # UI strings, defaults
│   ├── utils/          # Utilities (id, snap)
│   └── styles/         # Tailwind CSS
├── dist/               # React build output
├── dist-electron/      # Electron build output
└── release/            # Portable executable
```

### Next Phase

**Phase 3: Selection & Transformation**
- Selection tool (click to select)
- Drag to move objects
- Bounding box with resize handles
- Rotation handle
- Floating properties widget

### Tech Stack

- **Framework:** Electron 28
- **Frontend:** React 18 + TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **State:** Zustand
- **Icons:** Lucide React

### License

MIT
