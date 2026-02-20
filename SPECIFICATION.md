# Project Specification: LaserSVG Editor

## 1. General Information
- **Project Type:** Desktop Application (Windows).
- **Tech Stack:** Electron, React, TypeScript, Vite.
- **Styling:** Tailwind CSS (Dark Theme by default).
- **Icons:** `lucide-react` (Vector icons).
- **State Management:** Zustand (with persistence middleware).
- **Language:** English (UI strings in a separate constant file for future i18n).
- **Unit System:** Millimeters (mm), precision 3 decimal places (e.g., `10.500 mm`).
- **Target Audience:** Hobbyist laser engraving (Lightburn compatible SVG output).
- **Distribution:** Portable build (ZIP containing executable) preferred for development.

## 2. UI/UX Design Guidelines
- **Theme:** Dark Mode (Backgrounds: `#1e1e1e`, `#252526`, Text: `#cccccc`, Accents: Blue/Orange).
- **Layout:**
    - **Top:** Menu Bar (File, Edit, View, Settings).
    - **Left:** Toolbar (Vertical, Icons + Tooltip).
    - **Center:** Canvas (Dark Gray background `#121212`, Artboard White `#ffffff`).
    - **Right:** Layers Panel & Properties Panel (Collapsible/Accordion style).
    - **Overlay:** Floating Transformation Widget (appears near selected object).
- **Canvas Behavior:**
    - Default Artboard Size: 1000x1000 mm.
    - Navigation: Middle Mouse Drag (Pan), Scroll Wheel (Zoom centered on cursor).
    - Grid: Invisible 1x1 mm snap grid (Toggleable). Visual grid optional in settings.

## 3. Core Architecture & Modules

### 3.1. Unified Element Model (PointElement)
All visible elements that are exported to SVG file MUST inherit from PointElement.
This ensures consistent behavior for transformation, rotation, and node manipulation.

```typescript
interface Point {
  x: number
  y: number
  cp1?: { x: number; y: number }  // Bezier curve control point 1
  cp2?: { x: number; y: number }  // Bezier curve control point 2
}

interface PointElement {
  id: string
  type: 'point'
  name: string
  visible: boolean
  locked: boolean
  points: Point[]
  stroke: string
  strokeWidth: number
  isClosedShape: boolean  // true for closed shapes (rect, circle), false for open (line, polyline)
}
```

**Shape Examples:**
- Line: 2 points, isClosedShape = false
- Rectangle: 4 points (corners), isClosedShape = true
- Trapezoid: 4 points, isClosedShape = true
- Polygon: N points, isClosedShape = true/false
- Polyline: N points, isClosedShape = false
- Circle/Ellipse: Represented as 4+ points with Bezier control points (cp1, cp2)

### 3.2. State Management & History (Undo/Redo)
- **Store:** Zustand.
- **History:** Implement Undo/Redo functionality using `zustand/middleware` (temporal) or a custom history stack.
- **Requirement:** Every action that changes the shape data (create, move, resize, color change) must be pushable to history stack.
- **Hotkeys:** `Ctrl+Z` (Undo), `Ctrl+Y` (Redo).

### 3.2. Tool API (`ITool` Interface)
All tools must implement this interface to ensure decoupling.
```typescript
interface ITool {
  id: string;
  cursor: string; 
  activate(): void;
  deactivate(): void;
  onMouseDown(e: MouseEvent, context: ToolContext): void;
  onMouseMove(e: MouseEvent, context: ToolContext): void;
  onMouseUp(e: MouseEvent, context: ToolContext): void;
  onKeyDown(e: KeyboardEvent): void;
}

### 3.3. Snap Engine (SnapService)
Pure function service.
Input: Raw X, Y.
Output: Snapped X, Y (if grid snap is enabled).
Grid Size: 1.0 mm.
Toggle: Hotkey (e.g., Ctrl+Shift+S) or Settings.

### 3.4. Color Palette (Lightburn Compatible)
Strict constant list. UI must show swatches with labels (01, 02... T1, T2).
Selection changes the stroke attribute of the selected SVG element.
Palette Datails are presented in the APPENDIX-COLOR.md file.

### 3.5. Hotkey Configuration
- Store keybindings in a config.json or internal constant.
- Default mappings:
    V: Selection Tool
    A: Direct Selection Tool
    R: Rectangle Tool
    L: Line Tool
    T: Trapezoid Tool
    P: Polygon Tool
    Ctrl+Z/Y: Undo/Redo
    Ctrl+S: Save
    Ctrl+O: Open

## 4. Development Roadmap (Strict Iterative Process)
RULE FOR AI:
- Do not proceed to the next phase until the user confirms the current phase works.
- After each phase, provide instructions on how to build/run the portable version.
- Keep code clean, typed, and modular.
- If a library is needed (e.g., for icons), choose the most popular/react-friendly one.
### Phase 1: Project Skeleton & Canvas
- Setup Electron + React + TS + Vite + Tailwind CSS.
- Configure Dark Theme globally.
- Create main window layout (Toolbar, Canvas area, Panels placeholders).
- Implement Canvas rendering (White 1000x1000mm artboard on dark background).
- Implement Zoom & Pan (Mouse wheel + Middle drag).
- Deliverable: A window with a dark UI, white canvas that can be zoomed and panned.
### Phase 2: State Management & History
- Setup Zustand store for SVG elements.
- Implement Undo/Redo system integrated with the store.
- Implement "Create Rectangle" tool (Click+Drag).
- Implement "Create Line" tool (Click+Drag).
- Implement "Create Trapezoid" tool (Click+Drag).
- Implement "Create Polygon" tool (Click+Click+...).
- Render shapes on canvas using unified PointElement model.
- Deliverable: Ability to draw rects, lines, trapezoids, polygons. Undo/Redo must work for these actions.
### Phase 3: Selection & Transformation
- Implement "Selection Tool" (Black Arrow).
- Click to select, Drag to move.
- Implement Bounding Box for rotation and resizing.
- Implement Floating Properties Widget (near object) for quick transform.
- Deliverable: Select, Move, Rotate, Resize existing shapes. Undo/Redo must work for transforms.
### Phase 4: Properties, Styling & Snapping
- Implement Docked Properties Panel (Numeric inputs for X, Y, W, H, Color).
- Implement Color Picker (Lightburn palette).
- Apply vector-effect: non-scaling-stroke (Stroke width visual ~1mm, doesn't vanish on zoom).
- Implement SnapService (1mm grid).
- Toggle Snap via Hotkey.
- Deliverable: Change color/dimensions via panel. Shapes snap to 1mm grid.
### Phase 5: Direct Selection & Bezier Curves
- Implement "Direct Selection Tool" (White Arrow) - Move individual nodes.
- Implement Bezier curve creation and editing via control points (cp1, cp2).
- Implement circle/ellipse using 4 Bezier curves.
- Deliverable: Move nodes individually. Create and edit Bezier curves.
### Phase 6: Export, Import & Settings
- Export to SVG (Clean code, Lightburn compatible layers/colors).
- Import SVG.
- Settings Window (Grid visibility, Hotkeys config loading).
- Build configuration for Portable Windows executable.
- Deliverable: Save/Load files. Final portable build.

## 5. Technical Constraints
- Coordinates: All internal math in mm. Convert to pixels only for rendering (e.g., 1mm = 3.78px at 96DPI, or define a fixed scale factor).
- Stroke: Default stroke width 1mm. Use CSS vector-effect: non-scaling-stroke.
- Fill: Always none for closed shapes (Laser cutting requirement).
- Performance: Ensure canvas remains responsive with up to 500 objects.

## 6. Code Quality & Documentation Standards
- **Language:** All code, comments, and documentation must be in English.
- **JSDoc/TSDoc:** All public functions, interfaces, and components must have TSDoc comments describing:
  - Purpose of the function/component
  - Input parameters with types
  - Return values
  - Any side effects
- **Inline Comments:** Use for complex logic only. Explain WHY, not WHAT.
  - ✅ Good: `// Snap to grid only if within 5mm threshold to prevent jitter`
  - ❌ Bad: `// Increment i by 1`
- **Self-Documenting Code:** Use descriptive variable/function names instead of excessive comments.
  - ✅ Good: `isSnapEnabled`, `calculateBoundingBox()`
  - ❌ Bad: `flag1`, `doStuff()`
- **README:** Each major module should have a brief header comment explaining its responsibility.