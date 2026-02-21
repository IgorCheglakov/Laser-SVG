/**
 * Point Definition
 * 
 * Point with Bezier curve control points.
 * All points have cp1 and cp2 control handles.
 * Vertex type determines how control points behave.
 */

/**
 * Vertex type for curve behavior
 */
export type VertexType = 'straight' | 'smooth' | 'corner'

/**
 * Default control point offset (10mm)
 */
const DEFAULT_CP_OFFSET = 10

/**
 * Point with Bezier curve control points
 */
export interface Point {
  x: number
  y: number
  /**
   * Vertex type determines how control points behave
   */
  vertexType?: VertexType
  /**
   * First control point for cubic Bezier curve (from this point to next)
   */
  cp1?: { x: number; y: number }
  /**
   * Second control point for cubic Bezier curve (from previous point to this)
   */
  cp2?: { x: number; y: number }
}

/**
 * Check if point has any curve control points
 */
export function hasCurve(p: Point): boolean {
  return !!p.cp1 || !!p.cp2
}

/**
 * Check if point is a smooth (dependent handles) Bezier
 */
export function isSmooth(p: Point): boolean {
  return p.vertexType === 'smooth' && (!!p.cp1 || !!p.cp2)
}

/**
 * Check if point is a corner (independent handles) Bezier
 */
export function isCorner(p: Point): boolean {
  return p.vertexType === 'corner' && (!!p.cp1 || !!p.cp2)
}

/**
 * Create a simple point without curves
 * Control points are created but hidden for straight vertices
 */
export function createPoint(x: number, y: number, vertexType: VertexType = 'straight'): Point {
  return { 
    x, 
    y, 
    vertexType,
    cp1: { x: x + DEFAULT_CP_OFFSET, y },
    cp2: { x: x - DEFAULT_CP_OFFSET, y },
  }
}

/**
 * Create a point with Bezier control points
 */
export function createCurvePoint(
  x: number, 
  y: number, 
  vertexType: VertexType = 'smooth',
  cp1?: { x: number; y: number }, 
  cp2?: { x: number; y: number }
): Point {
  return { 
    x, 
    y, 
    vertexType, 
    cp1: cp1 || { x: x + DEFAULT_CP_OFFSET, y },
    cp2: cp2 || { x: x - DEFAULT_CP_OFFSET, y },
  }
}

/**
 * Set cp1 and adjust cp2 to maintain smooth curve (180 degrees apart)
 */
export function setSmoothCp1(p: Point, cp1: { x: number; y: number }): Point {
  const result = { ...p, cp1, vertexType: 'smooth' as VertexType }
  if (p.cp2) {
    const dx = p.x - cp1.x
    const dy = p.y - cp1.y
    result.cp2 = { x: p.x + dx, y: p.y + dy }
  }
  return result
}

/**
 * Set cp2 and adjust cp1 to maintain smooth curve (180 degrees apart)
 */
export function setSmoothCp2(p: Point, cp2: { x: number; y: number }): Point {
  const result = { ...p, cp2, vertexType: 'smooth' as VertexType }
  if (p.cp1) {
    const dx = p.x - cp2.x
    const dy = p.y - cp2.y
    result.cp1 = { x: p.x + dx, y: p.y + dy }
  }
  return result
}

/**
 * Convert straight vertex to smooth vertex
 * Calculates control points based on neighbors, handles are 180 degrees apart
 */
export function convertToSmooth(
  pointIndex: number,
  points: Point[],
  _isClosedShape: boolean
): Point {
  const p = points[pointIndex]
  const totalPoints = points.length
  
  if (totalPoints < 2) return p
  
  const isFirst = pointIndex === 0
  const isLast = pointIndex === totalPoints - 1
  
  let cp1: { x: number; y: number } | undefined
  let cp2: { x: number; y: number } | undefined
  
  if (isFirst) {
    // First point: cp1 points toward next point, cp2 is mirror
    const nextP = points[1]
    const dx = nextP.x - p.x
    const dy = nextP.y - p.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const handleLength = Math.max(dist / 4, 10)
    cp1 = { x: p.x + (dx / dist) * handleLength, y: p.y + (dy / dist) * handleLength }
    cp2 = { x: p.x - (dx / dist) * handleLength, y: p.y - (dy / dist) * handleLength }
  } else if (isLast) {
    // Last point: cp2 points toward previous point, cp1 is mirror
    const prevP = points[pointIndex - 1]
    const dx = prevP.x - p.x
    const dy = prevP.y - p.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const handleLength = Math.max(dist / 4, 10)
    cp2 = { x: p.x - (dx / dist) * handleLength, y: p.y - (dy / dist) * handleLength }
    cp1 = { x: p.x + (dx / dist) * handleLength, y: p.y + (dy / dist) * handleLength }
  } else {
    // Middle point: use angle bisector for smooth curve
    const prevP = points[pointIndex - 1]
    const nextP = points[pointIndex + 1]
    
    const dx1 = nextP.x - p.x
    const dy1 = nextP.y - p.y
    const dist1 = Math.sqrt(dx1 * dx1 + dy1 * dy1)
    
    const dx2 = prevP.x - p.x
    const dy2 = prevP.y - p.y
    const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2)
    
    // Angle to next point
    const angle1 = Math.atan2(dy1, dx1)
    
    // Use average handle length
    const avgDist = (dist1 + dist2) / 2
    const handleLength = Math.max(avgDist / 4, 10)
    
    // cp1 in direction of next point
    cp1 = { 
      x: p.x + Math.cos(angle1) * handleLength, 
      y: p.y + Math.sin(angle1) * handleLength 
    }
    // cp2 mirrored (180 degrees from cp1)
    cp2 = { 
      x: p.x - Math.cos(angle1) * handleLength, 
      y: p.y - Math.sin(angle1) * handleLength 
    }
  }
  
  return { ...p, vertexType: 'smooth', cp1, cp2 }
}

/**
 * Convert straight vertex to corner vertex
 * Creates independent control points
 */
export function convertToCorner(
  pointIndex: number,
  points: Point[],
  _isClosedShape: boolean
): Point {
  const p = points[pointIndex]
  const totalPoints = points.length
  
  if (totalPoints < 2) return p
  
  const isFirst = pointIndex === 0
  const isLast = pointIndex === totalPoints - 1
  
  let cp1: { x: number; y: number } | undefined
  let cp2: { x: number; y: number } | undefined
  
  if (isFirst) {
    const nextP = points[1]
    const dx = nextP.x - p.x
    const dy = nextP.y - p.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist > 0) {
      const handleLength = Math.max(dist / 4, 10)
      cp1 = { x: p.x + (dx / dist) * handleLength, y: p.y + (dy / dist) * handleLength }
    }
  } else if (isLast) {
    const prevP = points[pointIndex - 1]
    const dx = prevP.x - p.x
    const dy = prevP.y - p.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist > 0) {
      const handleLength = Math.max(dist / 4, 10)
      cp2 = { x: p.x - (dx / dist) * handleLength, y: p.y - (dy / dist) * handleLength }
    }
  } else {
    const prevP = points[pointIndex - 1]
    const nextP = points[pointIndex + 1]
    
    const dx1 = nextP.x - p.x
    const dy1 = nextP.y - p.y
    const dist1 = Math.sqrt(dx1 * dx1 + dy1 * dy1)
    
    const dx2 = prevP.x - p.x
    const dy2 = prevP.y - p.y
    const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2)
    
    if (dist1 > 0) {
      const handleLength = dist1 / 4
      cp1 = { x: p.x + (dx1 / dist1) * handleLength, y: p.y + (dy1 / dist1) * handleLength }
    }
    
    if (dist2 > 0) {
      const handleLength = dist2 / 4
      cp2 = { x: p.x + (dx2 / dist2) * handleLength, y: p.y + (dy2 / dist2) * handleLength }
    }
  }
  
  return { ...p, vertexType: 'corner', cp1, cp2 }
}
