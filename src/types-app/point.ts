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
          x: p.x - (dx2 / dist2) * handleLength, 
          y: p.y - (dy2 / dist2) * handleLength,
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
          x: p.x - (dx1 / dist1) * handleLength, 
          y: p.y - (dy1 / dist1) * handleLength,
          targetVertexIndex: pointIndex - 1
        }
      }
      if (dist2 > 0) {
        const handleLength = dist2 / 4
        cp1 = { 
          x: p.x - (dx2 / dist2) * handleLength, 
          y: p.y - (dy2 / dist2) * handleLength,
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
        x: p.x - (dx2 / dist2) * handleLength, 
        y: p.y - (dy2 / dist2) * handleLength,
        targetVertexIndex: pointIndex - 1
      }
    }
  }
  
  if (cp1) cp1.siblingIndex = cp2 ? 2 : null
  if (cp2) cp2.siblingIndex = cp1 ? 1 : null
  
  return { 
    ...p, 
    vertexType: 'smooth',
    cp1,
    cp2,
  }
}
