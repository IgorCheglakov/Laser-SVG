/**
 * UI Strings
 * 
 * All user-facing strings are centralized here for future i18n support.
 */

export const UI_STRINGS = {
  // App
  APP_NAME: 'LaserSVG Editor',
  APP_VERSION: '0.1.0',

  // Menu
  MENU_FILE: 'File',
  MENU_EDIT: 'Edit',
  MENU_VIEW: 'View',
  MENU_SETTINGS: 'Settings',
  
  // File menu
  FILE_NEW: 'New',
  FILE_OPEN: 'Open...',
  FILE_SAVE: 'Save',
  FILE_SAVE_AS: 'Save As...',
  FILE_EXPORT_SVG: 'Export SVG...',
  FILE_EXIT: 'Exit',
  
  // Edit menu
  EDIT_UNDO: 'Undo',
  EDIT_REDO: 'Redo',
  EDIT_CUT: 'Cut',
  EDIT_COPY: 'Copy',
  EDIT_PASTE: 'Paste',
  EDIT_DELETE: 'Delete',
  EDIT_SELECT_ALL: 'Select All',
  
  // View menu
  VIEW_ZOOM_IN: 'Zoom In',
  VIEW_ZOOM_OUT: 'Zoom Out',
  VIEW_RESET_ZOOM: 'Reset Zoom',
  VIEW_FIT_TO_SCREEN: 'Fit to Screen',
  VIEW_TOGGLE_GRID: 'Toggle Grid',
  
  // Tools
  TOOL_SELECTION: 'Selection Tool (V)',
  TOOL_DIRECT_SELECTION: 'Direct Selection (A)',
  TOOL_RECTANGLE: 'Rectangle Tool (R)',
  TOOL_ELLIPSE: 'Ellipse Tool (E)',
  TOOL_LINE: 'Line Tool (L)',
  
  // Panels
  PANEL_LAYERS: 'Layers',
  PANEL_PROPERTIES: 'Properties',
  PANEL_NO_SELECTION: 'No selection',
  
  // Properties
  PROP_X: 'X',
  PROP_Y: 'Y',
  PROP_WIDTH: 'W',
  PROP_HEIGHT: 'H',
  PROP_ROTATION: 'Rotation',
  PROP_COLOR: 'Color',
  PROP_STROKE_WIDTH: 'Stroke Width',
  
  // Canvas
  CANVAS_ARTBOARD: 'Artboard',
  CANVAS_ZOOM: 'Zoom',
  
  // Status
  STATUS_READY: 'Ready',
  STATUS_PANNING: 'Panning...',
  STATUS_ZOOMING: 'Zooming...',
  STATUS_SNAP_ENABLED: 'Snap enabled',
  STATUS_SNAP_DISABLED: 'Snap disabled',
  
  // Units
  UNIT_MM: 'mm',
  UNIT_PERCENT: '%',
} as const

/**
 * Hotkey mappings
 */
export const HOTKEYS = {
  TOOL_SELECTION: 'v',
  TOOL_DIRECT_SELECTION: 'a',
  TOOL_RECTANGLE: 'r',
  TOOL_ELLIPSE: 'e',
  TOOL_LINE: 'l',
  UNDO: 'ctrl+z',
  REDO: 'ctrl+y',
  SAVE: 'ctrl+s',
  OPEN: 'ctrl+o',
  DELETE: 'delete',
  SELECT_ALL: 'ctrl+a',
  TOGGLE_GRID: 'ctrl+\'',
  TOGGLE_SNAP: 'ctrl+shift+s',
  ZOOM_IN: 'ctrl+=',
  ZOOM_OUT: 'ctrl+-',
  RESET_ZOOM: 'ctrl+0',
} as const

/**
 * Default values
 */
export const DEFAULTS = {
  ARTBOARD_WIDTH: 1000,
  ARTBOARD_HEIGHT: 1000,
  STROKE_WIDTH: 1,
  GRID_SIZE: 1,
  MIN_ZOOM: 0.1,
  MAX_ZOOM: 10,
  ZOOM_STEP: 0.1,
  MM_TO_PX: 3.7795275591, // 1mm = 3.7795px at 96 DPI
  PX_TO_MM: 0.2645833333,
} as const
