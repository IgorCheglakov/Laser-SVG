/**
 * Point Definition
 * 
 * Point with control points for Bezier curves.
 * Control points exist for all vertices but are hidden for straight vertices.
 */

export type VertexType = 'straight' | 'corner' | 'smooth'

export interface ControlPoint {
  x: number
  y: number
  targetVertexIndex: number | null
  siblingIndex?: number | null  // reference to cp1 (1) or cp2 (2) on the same vertex
}

export interface Point {
  x: number
  y: number
  vertexType?: VertexType
  cp1?: ControlPoint
  cp2?: ControlPoint
}

function validateAndFixControlPoints(
  pointIndex: number,
  points: Point[],
  cp1: ControlPoint | undefined,
  cp2: ControlPoint | undefined,
  vertexType: VertexType
): { cp1: ControlPoint | undefined; cp2: ControlPoint | undefined } {
  let fixedCp1 = cp1
  let fixedCp2 = cp2

  if (vertexType === 'corner' && fixedCp1 && fixedCp2) {
    if (fixedCp1.targetVertexIndex === fixedCp2.targetVertexIndex && fixedCp1.targetVertexIndex !== null) {
      console.warn(
        `[Point] Invalid control point configuration at vertex ${pointIndex}: ` +
        `cp1 and cp2 reference same target vertex ${fixedCp1.targetVertexIndex}. Auto-fixing...`
      )
      
      const totalPoints = points.length
      const isFirst = pointIndex === 0
      const isLast = pointIndex === totalPoints - 1
      const isClosedShape = points.length > 2
      
      if (isFirst) {
        fixedCp1 = { ...fixedCp1, targetVertexIndex: isClosedShape ? 1 : 1 }
        fixedCp2 = { ...fixedCp2, targetVertexIndex: isClosedShape ? totalPoints - 1 : null }
      } else if (isLast) {
        fixedCp1 = { ...fixedCp1, targetVertexIndex: isClosedShape ? 0 : null }
        fixedCp2 = { ...fixedCp2, targetVertexIndex: isClosedShape ? 0 : pointIndex - 1 }
      } else {
        fixedCp1 = { ...fixedCp1, targetVertexIndex: pointIndex + 1 }
        fixedCp2 = { ...fixedCp2, targetVertexIndex: pointIndex - 1 }
      }
    }
  }

  return { cp1: fixedCp1, cp2: fixedCp2 }
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
  
  let cp1: ControlPoint | undefined
  let cp2: ControlPoint | undefined
  
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
        cp1 = { 
          x: p.x + (dx1 / dist1) * handleLength, 
          y: p.y + (dy1 / dist1) * handleLength,
          targetVertexIndex: 1
        }
      }
      if (dist2 > 0) {
        const handleLength = dist2 / 4
        cp2 = { 
          x: p.x + (dx2 / dist2) * handleLength, 
          y: p.y + (dy2 / dist2) * handleLength,
          targetVertexIndex: totalPoints - 1
        }
      }
    } else {
      const nextP = points[1]
      const dx = nextP.x - p.x
      const dy = nextP.y - p.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist > 0) {
        const handleLength = dist / 4
        cp1 = { 
          x: p.x + (dx / dist) * handleLength, 
          y: p.y + (dy / dist) * handleLength,
          targetVertexIndex: 1
        }
        cp2 = { 
          x: p.x - (dx / dist) * handleLength, 
          y: p.y - (dy / dist) * handleLength,
          targetVertexIndex: null
        }
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
        cp2 = { 
          x: p.x + (dx1 / dist1) * handleLength, 
          y: p.y + (dy1 / dist1) * handleLength,
          targetVertexIndex: pointIndex - 1
        }
      }
      if (dist2 > 0) {
        const handleLength = dist2 / 4
        cp1 = { 
          x: p.x + (dx2 / dist2) * handleLength, 
          y: p.y + (dy2 / dist2) * handleLength,
          targetVertexIndex: 0
        }
      }
    } else {
      const prevP = points[pointIndex - 1]
      const dx = prevP.x - p.x
      const dy = prevP.y - p.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist > 0) {
        const handleLength = dist / 4
        cp2 = { 
          x: p.x + (dx / dist) * handleLength, 
          y: p.y + (dy / dist) * handleLength,
          targetVertexIndex: pointIndex - 1
        }
        cp1 = { 
          x: p.x - (dx / dist) * handleLength, 
          y: p.y - (dy / dist) * handleLength,
          targetVertexIndex: null
        }
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
      cp1 = { 
        x: p.x + (dx1 / dist1) * handleLength, 
        y: p.y + (dy1 / dist1) * handleLength,
        targetVertexIndex: pointIndex + 1
      }
    }
    
    if (dist2 > 0) {
      const handleLength = dist2 / 4
      cp2 = { 
        x: p.x + (dx2 / dist2) * handleLength, 
        y: p.y + (dy2 / dist2) * handleLength,
        targetVertexIndex: pointIndex - 1
      }
    }
  }
  
  const validated = validateAndFixControlPoints(pointIndex, points, cp1, cp2, 'corner')
  
  if (cp1) cp1.siblingIndex = cp2 ? 2 : null
  if (cp2) cp2.siblingIndex = cp1 ? 1 : null
  
  return { ...p, vertexType: 'corner', cp1: validated.cp1, cp2: validated.cp2 }
}

export function convertToStraight(
  pointIndex: number,
  points: Point[],
  isClosedShape: boolean
): Point {
  const p = points[pointIndex]
  const totalPoints = points.length
  
  const isFirst = pointIndex === 0
  const isLast = pointIndex === totalPoints - 1
  
  let cp1: ControlPoint | undefined
  let cp2: ControlPoint | undefined
  
  if (isFirst) {
    if (isClosedShape && totalPoints > 2) {
      const nextP = points[1]
      const dx = nextP.x - p.x
      const dy = nextP.y - p.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist > 0) {
        const handleLength = dist / 4
        cp1 = {
          x: p.x + (dx / dist) * handleLength,
          y: p.y + (dy / dist) * handleLength,
          targetVertexIndex: 1
        }
        cp2 = {
          x: p.x - (dx / dist) * handleLength,
          y: p.y - (dy / dist) * handleLength,
          targetVertexIndex: totalPoints - 1
        }
      }
    } else {
      const nextP = points[1]
      const dx = nextP.x - p.x
      const dy = nextP.y - p.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist > 0) {
        const handleLength = dist / 4
        cp1 = {
          x: p.x + (dx / dist) * handleLength,
          y: p.y + (dy / dist) * handleLength,
          targetVertexIndex: 1
        }
        cp2 = {
          x: p.x - (dx / dist) * handleLength,
          y: p.y - (dy / dist) * handleLength,
          targetVertexIndex: null
        }
      }
    }
  } else if (isLast) {
    const prevP = points[pointIndex - 1]
    const dx = prevP.x - p.x
    const dy = prevP.y - p.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist > 0) {
      const handleLength = dist / 4
      cp2 = {
        x: p.x - (dx / dist) * handleLength,
        y: p.y - (dy / dist) * handleLength,
        targetVertexIndex: pointIndex - 1
      }
      cp1 = {
        x: p.x + (dx / dist) * handleLength,
        y: p.y + (dy / dist) * handleLength,
        targetVertexIndex: null
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
      cp1 = {
        x: p.x + (dx1 / dist1) * handleLength,
        y: p.y + (dy1 / dist1) * handleLength,
        targetVertexIndex: pointIndex + 1
      }
    }
    
    if (dist2 > 0) {
      const handleLength = dist2 / 4
      cp2 = {
        x: p.x + (dx2 / dist2) * handleLength,
        y: p.y + (dy2 / dist2) * handleLength,
        targetVertexIndex: pointIndex - 1
      }
    }
  }
  
  if (cp1) cp1.siblingIndex = cp2 ? 2 : null
  if (cp2) cp2.siblingIndex = cp1 ? 1 : null
  
  return { 
    ...p, 
    vertexType: 'straight',
    cp1,
    cp2,
  }
}

export function convertToSmooth(
  pointIndex: number,
  points: Point[],
  isClosedShape: boolean
): Point {
  const p = points[pointIndex]
  const totalPoints = points.length
  
  if (totalPoints < 2) return p
  
  const isFirst = pointIndex === 0
  const isLast = pointIndex === totalPoints - 1
  
  let cp1: ControlPoint | undefined
  let cp2: ControlPoint | undefined
  
  /**
   * Helper function: normalize angle to range (-180, 180]
   */
  const normalizeAngle = (angle: number): number => {
    while (angle > 180) angle -= 360
    while (angle <= -180) angle += 360
    return angle
  }
  
  /**
   * Helper function: calculate angle difference considering wrap-around
   * Returns the smallest signed difference between two angles
   */
  const angleDifference = (angle1: number, angle2: number): number => {
    let diff = angle1 - angle2
    while (diff > 180) diff -= 360
    while (diff <= -180) diff += 360
    return diff
  }
  
  /**
   * Helper function: choose the best handle direction based on current control point or neighbor direction
   * 
   * @param bisectAngle - angle of the bisector (direction bisecting the corner)
   * @param currentCp - existing control point (if converting from corner), for comparison
   * @param neighborDirection - angle pointing to neighbor vertex (next or previous)
   * @returns chosen angle for the handle
   */
  const chooseHandleAngle = (
    bisectAngle: number, 
    currentCp: ControlPoint | undefined, 
    neighborDirection: number
  ): number => {
    // Two possible handle directions: bisector ± 90°
    // These are perpendicular to the bisector and point in opposite directions
    const option1 = normalizeAngle(bisectAngle + 90)
    const option2 = normalizeAngle(bisectAngle - 90)
    
    if (currentCp) {
      // If there's an existing control point, choose the direction closest to it
      // This prevents handles from "jumping" when converting between vertex types
      const currentAngle = Math.atan2(currentCp.y - p.y, currentCp.x - p.x) * 180 / Math.PI
      const diff1 = Math.abs(angleDifference(currentAngle, option1))
      const diff2 = Math.abs(angleDifference(currentAngle, option2))
      return diff1 <= diff2 ? option1 : option2
    } else {
      // No existing control point - choose direction closest to the neighbor vertex
      // This ensures handles point roughly toward the adjacent path segments
      const diff1 = Math.abs(angleDifference(neighborDirection, option1))
      const diff2 = Math.abs(angleDifference(neighborDirection, option2))
      return diff1 <= diff2 ? option1 : option2
    }
  }
  
  /**
   * Helper function: create a control point at given angle and distance from vertex
   */
  const createControlPoint = (
    angleDeg: number, 
    distance: number, 
    targetIndex: number | null
  ): ControlPoint => {
    const angleRad = angleDeg * Math.PI / 180
    return {
      x: p.x + Math.cos(angleRad) * distance,
      y: p.y + Math.sin(angleRad) * distance,
      targetVertexIndex: targetIndex,
    }
  }
  
  if (isFirst) {
    if (isClosedShape && totalPoints > 2) {
      // First vertex in closed shape: use previous (last) and next (second) vertices
      const nextP = points[1]
      const lastP = points[totalPoints - 1]
      
      // Vector from current vertex to next vertex
      const dxToNext = nextP.x - p.x
      const dyToNext = nextP.y - p.y
      const distToNext = Math.sqrt(dxToNext * dxToNext + dyToNext * dyToNext)
      
      // Vector from current vertex to previous (last) vertex
      const dxToPrev = lastP.x - p.x
      const dyToPrev = lastP.y - p.y
      const distToPrev = Math.sqrt(dxToPrev * dxToPrev + dyToPrev * dyToPrev)
      
      if (distToNext > 0 && distToPrev > 0) {
        // Normalize vectors to unit length
        const n1 = { x: dxToNext / distToNext, y: dyToNext / distToNext }
        const n2 = { x: dxToPrev / distToPrev, y: dyToPrev / distToPrev }
        
        // Bisector vector = sum of normalized vectors (points inward to the corner)
        const bisector = { x: n1.x + n2.x, y: n1.y + n2.y }
        const bisectorLen = Math.sqrt(bisector.x * bisector.x + bisector.y * bisector.y)
        
        let bisectAngle: number
        
        if (bisectorLen > 0.001) {
          // Normalize bisector and get its angle
          bisectAngle = Math.atan2(bisector.y / bisectorLen, bisector.x / bisectorLen) * 180 / Math.PI
        } else {
          // Vectors are opposite (straight line) - use perpendicular to either direction
          bisectAngle = Math.atan2(-n1.y, n1.x) * 180 / Math.PI + 90
        }
        
        // Angle pointing toward the next vertex (used for comparison)
        const angleToNext = Math.atan2(dyToNext, dxToNext) * 180 / Math.PI
        
        // Choose cp1 direction (pointing toward next vertex segment)
        const cp1Angle = chooseHandleAngle(bisectAngle, p.cp1, angleToNext)
        // cp2 direction is opposite to cp1 (180° difference)
        const cp2Angle = normalizeAngle(cp1Angle + 180)
        
        // Distance for handles: proportional to average adjacent segment length
        const avgDist = (distToNext + distToPrev) / 4
        
        cp1 = createControlPoint(cp1Angle, avgDist, 1)
        cp2 = createControlPoint(cp2Angle, avgDist, totalPoints - 1)
      }
    } else {
      // First vertex in open shape or only 2 points: use only next vertex
      const nextP = points[1]
      
      const dx = nextP.x - p.x
      const dy = nextP.y - p.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      
      if (dist > 0) {
        // Direction to next vertex
        const angleToNext = Math.atan2(dy, dx) * 180 / Math.PI
        
        // For open path, bisector is perpendicular to the line direction
        // Two options: ±90° from line direction
        const option1 = normalizeAngle(angleToNext + 90)
        const option2 = normalizeAngle(angleToNext - 90)
        
        let cp1Angle: number
        if (p.cp1) {
          // Choose closest to existing cp1
          const currentAngle = Math.atan2(p.cp1.y - p.y, p.cp1.x - p.x) * 180 / Math.PI
          const diff1 = Math.abs(angleDifference(currentAngle, option1))
          const diff2 = Math.abs(angleDifference(currentAngle, option2))
          cp1Angle = diff1 <= diff2 ? option1 : option2
        } else {
          // Default: use +90° (perpendicular to path direction)
          cp1Angle = option1
        }
        
        // cp2 is opposite direction (180° away), pointing inward toward vertex
        const cp2Angle = normalizeAngle(cp1Angle + 180)
        
        const handleLength = dist / 4
        
        cp1 = createControlPoint(cp1Angle, handleLength, 1)
        cp2 = createControlPoint(cp2Angle, handleLength, null)
      }
    }
  } else if (isLast) {
    if (isClosedShape && totalPoints > 2) {
      // Last vertex in closed shape: use previous (second-to-last) and next (first) vertices
      const prevP = points[pointIndex - 1]
      const firstP = points[0]
      
      // Vector from current vertex to previous vertex
      const dxToPrev = prevP.x - p.x
      const dyToPrev = prevP.y - p.y
      const distToPrev = Math.sqrt(dxToPrev * dxToPrev + dyToPrev * dyToPrev)
      
      // Vector from current vertex to next (first) vertex
      const dxToNext = firstP.x - p.x
      const dyToNext = firstP.y - p.y
      const distToNext = Math.sqrt(dxToNext * dxToNext + dyToNext * dyToNext)
      
      if (distToPrev > 0 && distToNext > 0) {
        // Normalize vectors
        const n1 = { x: dxToNext / distToNext, y: dyToNext / distToNext }
        const n2 = { x: dxToPrev / distToPrev, y: dyToPrev / distToPrev }
        
        // Bisector vector
        const bisector = { x: n1.x + n2.x, y: n1.y + n2.y }
        const bisectorLen = Math.sqrt(bisector.x * bisector.x + bisector.y * bisector.y)
        
        let bisectAngle: number
        if (bisectorLen > 0.001) {
          bisectAngle = Math.atan2(bisector.y / bisectorLen, bisector.x / bisectorLen) * 180 / Math.PI
        } else {
          bisectAngle = Math.atan2(-n1.y, n1.x) * 180 / Math.PI + 90
        }
        
        const angleToPrev = Math.atan2(dyToPrev, dxToPrev) * 180 / Math.PI
        
        // cp2 points toward previous vertex segment
        const cp2Angle = chooseHandleAngle(bisectAngle, p.cp2, angleToPrev)
        const cp1Angle = normalizeAngle(cp2Angle + 180)
        
        const avgDist = (distToNext + distToPrev) / 4
        
        cp1 = createControlPoint(cp1Angle, avgDist, 0)
        cp2 = createControlPoint(cp2Angle, avgDist, pointIndex - 1)
      }
    } else {
      // Last vertex in open shape: use only previous vertex
      const prevP = points[pointIndex - 1]
      
      const dx = prevP.x - p.x
      const dy = prevP.y - p.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      
      if (dist > 0) {
        const angleToPrev = Math.atan2(dy, dx) * 180 / Math.PI
        
        // For open path, perpendicular options
        const option1 = normalizeAngle(angleToPrev + 90)
        const option2 = normalizeAngle(angleToPrev - 90)
        
        let cp2Angle: number
        if (p.cp2) {
          const currentAngle = Math.atan2(p.cp2.y - p.y, p.cp2.x - p.x) * 180 / Math.PI
          const diff1 = Math.abs(angleDifference(currentAngle, option1))
          const diff2 = Math.abs(angleDifference(currentAngle, option2))
          cp2Angle = diff1 <= diff2 ? option1 : option2
        } else {
          cp2Angle = option1
        }
        
        const cp1Angle = normalizeAngle(cp2Angle + 180)
        
        const handleLength = dist / 4
        
        cp1 = createControlPoint(cp1Angle, handleLength, null)
        cp2 = createControlPoint(cp2Angle, handleLength, pointIndex - 1)
      }
    }
  } else {
    // Middle vertex: always has both previous and next neighbors
    const prevP = points[pointIndex - 1]
    const nextP = points[pointIndex + 1]
    
    // Vector from current vertex to next vertex
    const dxToNext = nextP.x - p.x
    const dyToNext = nextP.y - p.y
    const distToNext = Math.sqrt(dxToNext * dxToNext + dyToNext * dyToNext)
    
    // Vector from current vertex to previous vertex
    const dxToPrev = prevP.x - p.x
    const dyToPrev = prevP.y - p.y
    const distToPrev = Math.sqrt(dxToPrev * dxToPrev + dyToPrev * dyToPrev)
    
    if (distToNext > 0 && distToPrev > 0) {
      // Normalize vectors to unit length
      const n1 = { x: dxToNext / distToNext, y: dyToNext / distToNext }
      const n2 = { x: dxToPrev / distToPrev, y: dyToPrev / distToPrev }
      
      // Bisector = sum of normalized vectors (bisects the interior angle)
      const bisector = { x: n1.x + n2.x, y: n1.y + n2.y }
      const bisectorLen = Math.sqrt(bisector.x * bisector.x + bisector.y * bisector.y)
      
      let bisectAngle: number
      if (bisectorLen > 0.001) {
        // Normalize bisector and get angle (this points into the corner)
        bisectAngle = Math.atan2(bisector.y / bisectorLen, bisector.x / bisectorLen) * 180 / Math.PI
      } else {
        // Degenerate case: vectors point in opposite directions (straight line)
        // Use perpendicular to either direction
        bisectAngle = Math.atan2(-n1.y, n1.x) * 180 / Math.PI + 90
      }
      
      // Direction angles for comparison (used when no existing control points)
      const angleToNext = Math.atan2(dyToNext, dxToNext) * 180 / Math.PI
      
      // cp1 direction: choose between bisect±90°, closest to existing cp1 or angle to next
      const cp1Angle = chooseHandleAngle(bisectAngle, p.cp1, angleToNext)
      // For smooth vertex, cp2 should be opposite to cp1 (180° difference)
      const smoothCp2Angle = normalizeAngle(cp1Angle + 180)
      
      const avgDist = (distToNext + distToPrev) / 4
      
      cp1 = createControlPoint(cp1Angle, avgDist, pointIndex + 1)
      cp2 = createControlPoint(smoothCp2Angle, avgDist, pointIndex - 1)
    }
  }
  
  // Set sibling references: cp1's sibling is cp2 (index 2), cp2's sibling is cp1 (index 1)
  if (cp1) cp1.siblingIndex = cp2 ? 2 : null
  if (cp2) cp2.siblingIndex = cp1 ? 1 : null
  
  return { 
    ...p, 
    vertexType: 'smooth',
    cp1,
    cp2,
  }
}
