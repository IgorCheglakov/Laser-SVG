/**
 * Point Definition
 * 
 * Point with optional control points for future Bezier curve support.
 * Currently only straight lines are supported.
 */

export type VertexType = 'straight' | 'corner'

export interface Point {
  x: number
  y: number
  vertexType?: VertexType
}

export function createPoint(x: number, y: number): Point {
  return { 
    x, 
    y, 
    vertexType: 'straight',
  }
}
