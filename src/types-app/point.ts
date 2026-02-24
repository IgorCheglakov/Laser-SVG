/**
 * Point Definition
 * 
 * Point with control handles for Bezier curves.
 * Uses doubly-linked list structure:
 * - prevControlHandle: control handle entering this point (from prevPoint)
 * - nextControlHandle: control handle exiting this point (to nextPoint)
 */

export type VertexType = 'straight' | 'corner' | 'smooth'

export interface Point {
  x: number
  y: number
  vertexType?: VertexType
  prevControlHandle?: { x: number; y: number }  // enters this point (from prev)
  nextControlHandle?: { x: number; y: number }  // exits this point (to next)
}

export function createPoint(x: number, y: number): Point {
  return { 
    x, 
    y, 
    vertexType: 'straight',
  }
}

export function hasCurve(p: Point): boolean {
  return !!p.prevControlHandle || !!p.nextControlHandle
}

export function isCorner(p: Point): boolean {
  return p.vertexType === 'corner' && hasCurve(p)
}

function getHandleLength(fromX: number, fromY: number, toX: number, toY: number): number {
  const dx = toX - fromX
  const dy = toY - fromY
  const dist = Math.sqrt(dx * dx + dy * dy)
  return dist > 0 ? dist / 4 : 0
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
  
  let prevHandle: { x: number; y: number } | undefined
  let nextHandle: { x: number; y: number } | undefined
  
  if (isFirst) {
    if (isClosedShape && totalPoints > 2) {
      const nextP = points[1]
      const lastP = points[totalPoints - 1]
      
      // prevControlHandle: from last point towards current, at 1/4 distance
      const len1 = getHandleLength(lastP.x, lastP.y, p.x, p.y)
      if (len1 > 0) {
        const dx = p.x - lastP.x
        const dy = p.y - lastP.y
        prevHandle = {
          x: p.x - dx / 4,
          y: p.y - dy / 4,
        }
      }
      
      // nextControlHandle: from current towards next, at 1/4 distance
      const len2 = getHandleLength(p.x, p.y, nextP.x, nextP.y)
      if (len2 > 0) {
        const dx = nextP.x - p.x
        const dy = nextP.y - p.y
        nextHandle = {
          x: p.x + dx / 4,
          y: p.y + dy / 4,
        }
      }
    } else if (totalPoints > 1) {
      const nextP = points[1]
      const len = getHandleLength(p.x, p.y, nextP.x, nextP.y)
      if (len > 0) {
        const dx = nextP.x - p.x
        const dy = nextP.y - p.y
        // Both handles point outward from vertex
        nextHandle = {
          x: p.x + dx / 4,
          y: p.y + dy / 4,
        }
        prevHandle = {
          x: p.x - dx / 4,
          y: p.y - dy / 4,
        }
      }
    }
  } else if (isLast) {
    if (isClosedShape && totalPoints > 2) {
      const prevP = points[pointIndex - 1]
      const firstP = points[0]
      
      // prevControlHandle: from prev towards current, at 1/4 distance
      const len1 = getHandleLength(prevP.x, prevP.y, p.x, p.y)
      if (len1 > 0) {
        const dx = p.x - prevP.x
        const dy = p.y - prevP.y
        prevHandle = {
          x: p.x - dx / 4,
          y: p.y - dy / 4,
        }
      }
      
      // nextControlHandle: from current towards first, at 1/4 distance
      const len2 = getHandleLength(p.x, p.y, firstP.x, firstP.y)
      if (len2 > 0) {
        const dx = firstP.x - p.x
        const dy = firstP.y - p.y
        nextHandle = {
          x: p.x + dx / 4,
          y: p.y + dy / 4,
        }
      }
    } else {
      const prevP = points[pointIndex - 1]
      const len = getHandleLength(prevP.x, prevP.y, p.x, p.y)
      if (len > 0) {
        const dx = p.x - prevP.x
        const dy = p.y - prevP.y
        prevHandle = {
          x: p.x - dx / 4,
          y: p.y - dy / 4,
        }
        nextHandle = {
          x: p.x + dx / 4,
          y: p.y + dy / 4,
        }
      }
    }
  } else {
    // Middle point: both prev and next neighbors
    const prevP = points[pointIndex - 1]
    const nextP = points[pointIndex + 1]
    
    // prevControlHandle: from prev towards current, at 1/4 distance
    const len1 = getHandleLength(prevP.x, prevP.y, p.x, p.y)
    if (len1 > 0) {
      const dx = p.x - prevP.x
      const dy = p.y - prevP.y
      prevHandle = {
        x: p.x - dx / 4,
        y: p.y - dy / 4,
      }
    }
    
    // nextControlHandle: from current towards next, at 1/4 distance
    const len2 = getHandleLength(p.x, p.y, nextP.x, nextP.y)
    if (len2 > 0) {
      const dx = nextP.x - p.x
      const dy = nextP.y - p.y
      nextHandle = {
        x: p.x + dx / 4,
        y: p.y + dy / 4,
      }
    }
  }
  
  return { 
    ...p, 
    vertexType: 'corner',
    prevControlHandle: prevHandle,
    nextControlHandle: nextHandle,
  }
}

export function convertToStraight(
  pointIndex: number,
  points: Point[],
  _isClosedShape: boolean
): Point {
  return { 
    ...points[pointIndex], 
    vertexType: 'straight',
    prevControlHandle: undefined,
    nextControlHandle: undefined,
  }
}

function normalizeAngle(angle: number): number {
  while (angle > 180) angle -= 360
  while (angle <= -180) angle += 360
  return angle
}

function angleDifference(angle1: number, angle2: number): number {
  let diff = angle1 - angle2
  while (diff > 180) diff -= 360
  while (diff <= -180) diff += 360
  return diff
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
  
  let prevHandle: { x: number; y: number } | undefined
  let nextHandle: { x: number; y: number } | undefined
  
  if (isFirst) {
    if (isClosedShape && totalPoints > 2) {
      const nextP = points[1]
      const lastP = points[totalPoints - 1]
      
      const dxToNext = nextP.x - p.x
      const dyToNext = nextP.y - p.y
      const distToNext = Math.sqrt(dxToNext * dxToNext + dyToNext * dyToNext)
      
      const dxToPrev = lastP.x - p.x
      const dyToPrev = lastP.y - p.y
      const distToPrev = Math.sqrt(dxToPrev * dxToPrev + dyToPrev * dyToPrev)
      
      if (distToNext > 0 && distToPrev > 0) {
        const angleToNext = Math.atan2(dyToNext, dxToNext) * 180 / Math.PI
        const angleToPrev = Math.atan2(dyToPrev, dxToPrev) * 180 / Math.PI
        
        const n1 = { x: dxToNext / distToNext, y: dyToNext / distToNext }
        const n2 = { x: dxToPrev / distToPrev, y: dyToPrev / distToPrev }
        
        const bisector = { x: n1.x + n2.x, y: n1.y + n2.y }
        const bisectorLen = Math.sqrt(bisector.x * bisector.x + bisector.y * bisector.y)
        
        let bisectAngle: number
        if (bisectorLen > 0.001) {
          bisectAngle = Math.atan2(bisector.y / bisectorLen, bisector.x / bisectorLen) * 180 / Math.PI
        } else {
          bisectAngle = Math.atan2(-n1.y, n1.x) * 180 / Math.PI + 90
        }
        
        const perp1 = normalizeAngle(bisectAngle + 90)
        const perp2 = normalizeAngle(bisectAngle - 90)
        
        const diff1ToNext = Math.abs(angleDifference(perp1, angleToNext))
        const diff2ToNext = Math.abs(angleDifference(perp2, angleToNext))
        
        const handleAngleNext = diff1ToNext <= diff2ToNext ? perp1 : perp2
        const handleAnglePrev = normalizeAngle(handleAngleNext + 180)
        
        const handleLen = (distToNext + distToPrev) / 4
        
        const radNext = handleAngleNext * Math.PI / 180
        const radPrev = handleAnglePrev * Math.PI / 180
        
        nextHandle = {
          x: p.x + Math.cos(radNext) * handleLen,
          y: p.y + Math.sin(radNext) * handleLen,
        }
        prevHandle = {
          x: p.x + Math.cos(radPrev) * handleLen,
          y: p.y + Math.sin(radPrev) * handleLen,
        }
      }
    } else if (totalPoints > 1) {
      const nextP = points[1]
      const dx = nextP.x - p.x
      const dy = nextP.y - p.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      
      if (dist > 0) {
        const angleToNext = Math.atan2(dy, dx) * 180 / Math.PI
        const option1 = normalizeAngle(angleToNext + 90)
        const option2 = normalizeAngle(angleToNext - 90)
        
        let handleAngle: number
        if (p.nextControlHandle) {
          const currentAngle = Math.atan2(p.nextControlHandle.y - p.y, p.nextControlHandle.x - p.x) * 180 / Math.PI
          const diff1 = Math.abs(angleDifference(currentAngle, option1))
          const diff2 = Math.abs(angleDifference(currentAngle, option2))
          handleAngle = diff1 <= diff2 ? option1 : option2
        } else {
          handleAngle = option1
        }
        
        const handleLen = dist / 4
        const rad1 = handleAngle * Math.PI / 180
        
        // For first point of open shape: only nextHandle is relevant (points to next vertex)
        nextHandle = {
          x: p.x + Math.cos(rad1) * handleLen,
          y: p.y + Math.sin(rad1) * handleLen,
        }
      }
    }
  } else if (isLast) {
    if (isClosedShape && totalPoints > 2) {
      const prevP = points[pointIndex - 1]
      const firstP = points[0]
      
      const dxToPrev = prevP.x - p.x
      const dyToPrev = prevP.y - p.y
      const distToPrev = Math.sqrt(dxToPrev * dxToPrev + dyToPrev * dyToPrev)
      
      const dxToNext = firstP.x - p.x
      const dyToNext = firstP.y - p.y
      const distToNext = Math.sqrt(dxToNext * dxToNext + dyToNext * dyToNext)
      
      if (distToPrev > 0 && distToNext > 0) {
        const angleToPrev = Math.atan2(dyToPrev, dxToPrev) * 180 / Math.PI
        const angleToNext = Math.atan2(dyToNext, dxToNext) * 180 / Math.PI
        
        const n1 = { x: dxToNext / distToNext, y: dyToNext / distToNext }
        const n2 = { x: dxToPrev / distToPrev, y: dyToPrev / distToPrev }
        
        const bisector = { x: n1.x + n2.x, y: n1.y + n2.y }
        const bisectorLen = Math.sqrt(bisector.x * bisector.x + bisector.y * bisector.y)
        
        let bisectAngle: number
        if (bisectorLen > 0.001) {
          bisectAngle = Math.atan2(bisector.y / bisectorLen, bisector.x / bisectorLen) * 180 / Math.PI
        } else {
          bisectAngle = Math.atan2(-n1.y, n1.x) * 180 / Math.PI + 90
        }
        
        const perp1 = normalizeAngle(bisectAngle + 90)
        const perp2 = normalizeAngle(bisectAngle - 90)
        
        const diff1ToNext = Math.abs(angleDifference(perp1, angleToNext))
        const diff2ToNext = Math.abs(angleDifference(perp2, angleToNext))
        
        const handleAngleNext = diff1ToNext <= diff2ToNext ? perp1 : perp2
        const handleAnglePrev = normalizeAngle(handleAngleNext + 180)
        
        const handleLen = (distToPrev + distToNext) / 4
        
        const radNext = handleAngleNext * Math.PI / 180
        const radPrev = handleAnglePrev * Math.PI / 180
        
        nextHandle = {
          x: p.x + Math.cos(radNext) * handleLen,
          y: p.y + Math.sin(radNext) * handleLen,
        }
        prevHandle = {
          x: p.x + Math.cos(radPrev) * handleLen,
          y: p.y + Math.sin(radPrev) * handleLen,
        }
      }
    } else {
      const prevP = points[pointIndex - 1]
      const dx = prevP.x - p.x
      const dy = prevP.y - p.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      
      if (dist > 0) {
        const angleToPrev = Math.atan2(dy, dx) * 180 / Math.PI
        const option1 = normalizeAngle(angleToPrev + 90)
        const option2 = normalizeAngle(angleToPrev - 90)
        
        let handleAngle: number
        if (p.prevControlHandle) {
          const currentAngle = Math.atan2(p.prevControlHandle.y - p.y, p.prevControlHandle.x - p.x) * 180 / Math.PI
          const diff1 = Math.abs(angleDifference(currentAngle, option1))
          const diff2 = Math.abs(angleDifference(currentAngle, option2))
          handleAngle = diff1 <= diff2 ? option1 : option2
        } else {
          handleAngle = option1
        }
        
        const handleLen = dist / 4
        const rad1 = handleAngle * Math.PI / 180
        
        // For last point of open shape: only prevHandle is relevant (points to previous vertex)
        prevHandle = {
          x: p.x + Math.cos(rad1) * handleLen,
          y: p.y + Math.sin(rad1) * handleLen,
        }
      }
    }
  } else {
    // Middle point
    const prevP = points[pointIndex - 1]
    const nextP = points[pointIndex + 1]
    
    const dxToNext = nextP.x - p.x
    const dyToNext = nextP.y - p.y
    const distToNext = Math.sqrt(dxToNext * dxToNext + dyToNext * dyToNext)
    
    const dxToPrev = prevP.x - p.x
    const dyToPrev = prevP.y - p.y
    const distToPrev = Math.sqrt(dxToPrev * dxToPrev + dyToPrev * dyToPrev)
    
    if (distToNext > 0 && distToPrev > 0) {
      const angleToNext = Math.atan2(dyToNext, dxToNext) * 180 / Math.PI
      const angleToPrev = Math.atan2(dyToPrev, dxToPrev) * 180 / Math.PI
      
      const n1 = { x: dxToNext / distToNext, y: dyToNext / distToNext }
      const n2 = { x: dxToPrev / distToPrev, y: dyToPrev / distToPrev }
      
      const bisector = { x: n1.x + n2.x, y: n1.y + n2.y }
      const bisectorLen = Math.sqrt(bisector.x * bisector.x + bisector.y * bisector.y)
      
      let bisectAngle: number
      if (bisectorLen > 0.001) {
        bisectAngle = Math.atan2(bisector.y / bisectorLen, bisector.x / bisectorLen) * 180 / Math.PI
      } else {
        bisectAngle = Math.atan2(-n1.y, n1.x) * 180 / Math.PI + 90
      }
      
      const perp1 = normalizeAngle(bisectAngle + 90)
      const perp2 = normalizeAngle(bisectAngle - 90)
      
      const diff1ToNext = Math.abs(angleDifference(perp1, angleToNext))
      const diff2ToNext = Math.abs(angleDifference(perp2, angleToNext))
      
      const handleAngleNext = diff1ToNext <= diff2ToNext ? perp1 : perp2
      const handleAnglePrev = normalizeAngle(handleAngleNext + 180)
      
      const handleLen = (distToNext + distToPrev) / 4
      
      const radNext = handleAngleNext * Math.PI / 180
      const radPrev = handleAnglePrev * Math.PI / 180
      
      nextHandle = {
        x: p.x + Math.cos(radNext) * handleLen,
        y: p.y + Math.sin(radNext) * handleLen,
      }
      prevHandle = {
        x: p.x + Math.cos(radPrev) * handleLen,
        y: p.y + Math.sin(radPrev) * handleLen,
      }
    }
  }
  
  return { 
    ...p, 
    vertexType: 'smooth',
    prevControlHandle: prevHandle,
    nextControlHandle: nextHandle,
  }
}
