/**
 * Bounding Box utilities
 */

import type { PointElement, Point } from '@/types-app/index'

/**
 * Calculate point on cubic Bezier curve at parameter t
 */
function bezierPoint(t: number, p0: Point, p1: Point, p2: Point, p3: Point): Point {
  const mt = 1 - t
  const mt2 = mt * mt
  const mt3 = mt2 * mt
  const t2 = t * t
  const t3 = t2 * t
  
  return {
    x: mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
    y: mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y,
  }
}

/**
 * Get curve segments from points array
 */
function getCurveSegments(points: Point[], isClosed: boolean): { p1: Point; cp1: Point; cp2: Point; p2: Point; isCurve: boolean }[] {
  const segments: { p1: Point; cp1: Point; cp2: Point; p2: Point; isCurve: boolean }[] = []
  const len = points.length
  
  if (len < 2) return segments
  
  for (let i = 0; i < len; i++) {
    const p1 = points[i]
    const p2 = points[(i + 1) % len]
    
    if (i === len - 1 && !isClosed) continue
    
    const hasCp1 = (p1.vertexType === 'corner' || p1.vertexType === 'smooth') && p1.cp1
    const hasCp2 = (p2.vertexType === 'corner' || p2.vertexType === 'smooth') && p2.cp2
    
    if (hasCp1 || hasCp2) {
      const cp1Point = hasCp1 ? { x: p1.cp1!.x, y: p1.cp1!.y } : p1
      const cp2Point = hasCp2 ? { x: p2.cp2!.x, y: p2.cp2!.y } : p2
      
      segments.push({
        p1,
        cp1: cp1Point,
        cp2: cp2Point,
        p2,
        isCurve: true,
      })
    } else {
      segments.push({
        p1,
        cp1: p1,
        cp2: p2,
        p2,
        isCurve: false,
      })
    }
  }
  
  return segments
}

/**
 * Calculate bounding box from points, including Bezier curve extents (not control points)
 */
export function calculateBoundsFromPoints(points: Point[], isClosed: boolean = false): { x: number; y: number; width: number; height: number } {
  if (points.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 }
  }
  
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  
  const segments = getCurveSegments(points, isClosed)
  
  for (const seg of segments) {
    minX = Math.min(minX, seg.p1.x)
    minY = Math.min(minY, seg.p1.y)
    maxX = Math.max(maxX, seg.p1.x)
    maxY = Math.max(maxY, seg.p1.y)
    
    if (seg.isCurve) {
      for (let i = 1; i <= 20; i++) {
        const t = i / 20
        const curvePoint = bezierPoint(t, seg.p1, seg.cp1, seg.cp2, seg.p2)
        minX = Math.min(minX, curvePoint.x)
        minY = Math.min(minY, curvePoint.y)
        maxX = Math.max(maxX, curvePoint.x)
        maxY = Math.max(maxY, curvePoint.y)
      }
    }
  }
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

/**
 * Calculate bounding box for selected elements, including Bezier curve extents
 */
export function calculateBoundingBox(elements: PointElement[], selectedIds: string[]): { x: number; y: number; width: number; height: number } | null {
  if (selectedIds.length === 0) return null

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  selectedIds.forEach(id => {
    const element = elements.find(el => el.id === id)
    if (!element || !element.points) return
    
    const bounds = calculateBoundsFromPoints(element.points, element.isClosedShape)
    minX = Math.min(minX, bounds.x)
    minY = Math.min(minY, bounds.y)
    maxX = Math.max(maxX, bounds.x + bounds.width)
    maxY = Math.max(maxY, bounds.y + bounds.height)
  })

  if (minX === Infinity) return null

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  }
}
