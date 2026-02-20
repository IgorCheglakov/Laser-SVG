/**
 * Point Definition
 * 
 * Point with optional Bezier curve control points.
 */

export interface Point {
  x: number
  y: number
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
 * Create a simple point without curves
 */
export function createPoint(x: number, y: number): Point {
  return { x, y }
}

/**
 * Create a point with Bezier control points
 */
export function createCurvePoint(
  x: number, 
  y: number, 
  cp1?: { x: number; y: number }, 
  cp2?: { x: number; y: number }
): Point {
  return { x, y, cp1, cp2 }
}
