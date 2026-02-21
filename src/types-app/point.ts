/**
 * Point Definition
 * 
 * Point with optional control points for Bezier curves.
 * Control points exist for all vertices but are hidden for straight vertices.
 */

export type VertexType = 'straight' | 'corner'

export interface Point {
  x: number
  y: number
  vertexType?: VertexType
  cp1?: { x: number; y: number }
  cp2?: { x: number; y: number }
}

export function createPoint(x: number, y: number): Point {
  return { 
    x, 
    y, 
    vertexType: 'straight',
  }
}

export function hasCurve(p: Point): boolean {
  return !!p.cp1 || !!p.cp2
}

export function isCorner(p: Point): boolean {
  return p.vertexType === 'corner' && (!!p.cp1 || !!p.cp2)
}

export function convertToCorner(
  pointIndex: number,
  points: Point[],
  isClosedShape: boolean
): Point {
  const p = points[pointIndex]
  const totalPoints = points.length
  
  if (totalPoints < 2) return p
  
  const isFirst = pointIndex === 0
  const isLast = pointIndex === totalPoints - 1
  
  let cp1: { x: number; y: number } | undefined
  let cp2: { x: number; y: number } | undefined
  
  if (isFirst) {
    if (isClosedShape && totalPoints > 2) {
      const nextP = points[1]
      const lastP = points[totalPoints - 1]
      
      const dx1 = nextP.x - p.x
      const dy1 = nextP.y - p.y
      const dist1 = Math.sqrt(dx1 * dx1 + dy1 * dy1)
      
      const dx2 = lastP.x - p.x
      const dy2 = lastP.y - p.y
      const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2)
      
      if (dist1 > 0) {
        const handleLength = dist1 / 4
        cp1 = { x: p.x + (dx1 / dist1) * handleLength, y: p.y + (dy1 / dist1) * handleLength }
      }
      if (dist2 > 0) {
        const handleLength = dist2 / 4
        cp2 = { x: p.x + (dx2 / dist2) * handleLength, y: p.y + (dy2 / dist2) * handleLength }
      }
    } else {
      const nextP = points[1]
      const dx = nextP.x - p.x
      const dy = nextP.y - p.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist > 0) {
        const handleLength = dist / 4
        cp1 = { x: p.x + (dx / dist) * handleLength, y: p.y + (dy / dist) * handleLength }
        cp2 = { x: p.x - (dx / dist) * handleLength, y: p.y - (dy / dist) * handleLength }
      }
    }
  } else if (isLast) {
    if (isClosedShape && totalPoints > 2) {
      const prevP = points[pointIndex - 1]
      const firstP = points[0]
      
      const dx1 = prevP.x - p.x
      const dy1 = prevP.y - p.y
      const dist1 = Math.sqrt(dx1 * dx1 + dy1 * dy1)
      
      const dx2 = firstP.x - p.x
      const dy2 = firstP.y - p.y
      const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2)
      
      if (dist1 > 0) {
        const handleLength = dist1 / 4
        cp2 = { x: p.x - (dx1 / dist1) * handleLength, y: p.y - (dy1 / dist1) * handleLength }
      }
      if (dist2 > 0) {
        const handleLength = dist2 / 4
        cp1 = { x: p.x + (dx2 / dist2) * handleLength, y: p.y + (dy2 / dist2) * handleLength }
      }
    } else {
      const prevP = points[pointIndex - 1]
      const dx = prevP.x - p.x
      const dy = prevP.y - p.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist > 0) {
        const handleLength = dist / 4
        cp2 = { x: p.x - (dx / dist) * handleLength, y: p.y - (dy / dist) * handleLength }
        cp1 = { x: p.x + (dx / dist) * handleLength, y: p.y + (dy / dist) * handleLength }
      }
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

export function convertToStraight(
  pointIndex: number,
  points: Point[],
  _isClosedShape: boolean
): Point {
  const p = points[pointIndex]
  
  return { 
    ...p, 
    vertexType: 'straight',
    cp1: undefined,
    cp2: undefined,
  }
}
