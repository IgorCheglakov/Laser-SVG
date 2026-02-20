/**
 * Point Definition
 * 
 * Point with optional Bezier curve control points.
 * Vertex type determines how control points behave.
 */

/**
 * Vertex type for curve behavior
 */
export type VertexType = 'straight' | 'smooth' | 'corner'

/**
 * Point with optional Bezier curve control points
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
 */
export function createPoint(x: number, y: number, vertexType: VertexType = 'straight'): Point {
  return { x, y, vertexType }
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
  return { x, y, vertexType, cp1, cp2 }
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
