/**
 * Transform Service
 * 
 * Unified transformation logic using coefficient-based scaling.
 * Each point moves relative to the pivot point based on its coefficient.
 */

export enum TransformDirection {
  Left = 'left',
  Right = 'right',
  Top = 'top',
  Bottom = 'bottom',
}

export enum TransformHandleType {
  NorthWest = 'nw',
  North = 'n',
  NorthEast = 'ne',
  East = 'e',
  SouthEast = 'se',
  South = 's',
  SouthWest = 'sw',
  West = 'w',
}

export interface TransformHandle {
  horizontal?: TransformDirection.Left | TransformDirection.Right
  vertical?: TransformDirection.Top | TransformDirection.Bottom
  isCorner: boolean
}

export interface Point {
  x: number
  y: number
  cp1?: { x: number; y: number }
  cp2?: { x: number; y: number }
}

export interface TransformBox {
  x: number
  y: number
  width: number
  height: number
}

export interface InitialSize {
  x: number
  y: number
  width: number
  height: number
}

export interface TransformDelta {
  dx: number
  dy: number
}

/**
 * Parse handle string (e.g., 'nw', 'se', 'e', 'n') into TransformHandle
 */
export function parseHandle(handle: string): TransformHandle {
  const isCorner = handle.length === 2
  
  const horizontal = handle.includes('e') 
    ? TransformDirection.Right 
    : handle.includes('w') 
      ? TransformDirection.Left 
      : undefined
      
  const vertical = handle.includes('s') 
    ? TransformDirection.Bottom 
    : handle.includes('n') 
      ? TransformDirection.Top 
      : undefined
  
  return {
    horizontal,
    vertical,
    isCorner,
  }
}

/**
 * Calculate pivot point (opora) for transformation based on handle
 */
function getPivotPoint(box: InitialSize, handle: TransformHandle): Point {
  if (handle.horizontal === TransformDirection.Right) {
    return { x: box.x, y: box.y + box.height / 2 }
  }
  if (handle.horizontal === TransformDirection.Left) {
    return { x: box.x + box.width, y: box.y + box.height / 2 }
  }
  if (handle.vertical === TransformDirection.Bottom) {
    return { x: box.x + box.width / 2, y: box.y }
  }
  if (handle.vertical === TransformDirection.Top) {
    return { x: box.x + box.width / 2, y: box.y + box.height }
  }
  
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

/**
 * Calculate handle position based on handle type
 */
function getHandlePosition(box: InitialSize, handle: TransformHandle): Point {
  if (handle.horizontal === TransformDirection.Right) {
    return { x: box.x + box.width, y: box.y + box.height / 2 }
  }
  if (handle.horizontal === TransformDirection.Left) {
    return { x: box.x, y: box.y + box.height / 2 }
  }
  if (handle.vertical === TransformDirection.Bottom) {
    return { x: box.x + box.width / 2, y: box.y + box.height }
  }
  if (handle.vertical === TransformDirection.Top) {
    return { x: box.x + box.width / 2, y: box.y }
  }
  
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

/**
 * Transform all points based on handle movement
 * 
 * Each point shifts relative to the pivot (transformation center) by a distance
 * multiplied by a coefficient calculated as:
 * coefficient = |point - pivot| / |handle - pivot|
 * 
 * @param points - Original points of the element (including cp1, cp2)
 * @param box - Initial bounding box
 * @param delta - Mouse movement delta {dx, dy} in mm
 * @param handle - Parsed transform handle
 * @param fromCenter - If true, use center as pivot (Alt key)
 * @returns New transformed points
 */
export function transformPoints(
  points: Point[],
  box: InitialSize,
  delta: TransformDelta,
  handle: TransformHandle,
  fromCenter: boolean
): Point[] {
  const pivot = fromCenter 
    ? { x: box.x + box.width / 2, y: box.y + box.height / 2 }
    : getPivotPoint(box, handle)
  
  const handlePos = getHandlePosition(box, handle)
  
  return points.map(p => {
    let newX = p.x
    let newY = p.y
    
    // X-axis transformation
    if (handle.horizontal) {
      const handleDeltaX = handlePos.x - pivot.x
      if (handleDeltaX !== 0) {
        // Coefficient using absolute values as per specification
        const coefficientX = Math.abs(p.x - pivot.x) / Math.abs(handleDeltaX)
        newX = p.x + coefficientX * delta.dx
      }
    }
    
    // Y-axis transformation
    if (handle.vertical) {
      const handleDeltaY = handlePos.y - pivot.y
      if (handleDeltaY !== 0) {
        // Coefficient using absolute values as per specification
        const coefficientY = Math.abs(p.y - pivot.y) / Math.abs(handleDeltaY)
        newY = p.y + coefficientY * delta.dy
      }
    }
    
    // Transform Bezier control points
    const newPoint: Point = { x: newX, y: newY }
    
    if (p.cp1) {
      let newCp1X = p.cp1.x
      let newCp1Y = p.cp1.y
      
      if (handle.horizontal) {
        const handleDeltaX = handlePos.x - pivot.x
        if (handleDeltaX !== 0) {
          const coefficientX = Math.abs(p.cp1.x - pivot.x) / Math.abs(handleDeltaX)
          newCp1X = p.cp1.x + coefficientX * delta.dx
        }
      }
      
      if (handle.vertical) {
        const handleDeltaY = handlePos.y - pivot.y
        if (handleDeltaY !== 0) {
          const coefficientY = Math.abs(p.cp1.y - pivot.y) / Math.abs(handleDeltaY)
          newCp1Y = p.cp1.y + coefficientY * delta.dy
        }
      }
      
      newPoint.cp1 = { x: newCp1X, y: newCp1Y }
    }
    
    if (p.cp2) {
      let newCp2X = p.cp2.x
      let newCp2Y = p.cp2.y
      
      if (handle.horizontal) {
        const handleDeltaX = handlePos.x - pivot.x
        if (handleDeltaX !== 0) {
          const coefficientX = Math.abs(p.cp2.x - pivot.x) / Math.abs(handleDeltaX)
          newCp2X = p.cp2.x + coefficientX * delta.dx
        }
      }
      
      if (handle.vertical) {
        const handleDeltaY = handlePos.y - pivot.y
        if (handleDeltaY !== 0) {
          const coefficientY = Math.abs(p.cp2.y - pivot.y) / Math.abs(handleDeltaY)
          newCp2Y = p.cp2.y + coefficientY * delta.dy
        }
      }
      
      newPoint.cp2 = { x: newCp2X, y: newCp2Y }
    }
    
    return newPoint
  })
}
