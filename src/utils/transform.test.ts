import { describe, it, expect } from 'vitest'
import { parseHandle, transformPoints, rotatePoints, flipPointsHorizontal, flipPointsVertical, TransformHandleType, TransformDirection } from './transform'
import type { Point, InitialSize } from './transform'

describe('parseHandle', () => {
  it('should parse northwest handle', () => {
    const result = parseHandle('nw')
    expect(result).toEqual({
      horizontal: TransformDirection.Left,
      vertical: TransformDirection.Top,
      isCorner: true,
    })
  })

  it('should parse southeast handle', () => {
    const result = parseHandle('se')
    expect(result).toEqual({
      horizontal: TransformDirection.Right,
      vertical: TransformDirection.Bottom,
      isCorner: true,
    })
  })

  it('should parse east handle', () => {
    const result = parseHandle('e')
    expect(result).toEqual({
      horizontal: TransformDirection.Right,
      vertical: undefined,
      isCorner: false,
    })
  })

  it('should parse north handle', () => {
    const result = parseHandle('n')
    expect(result).toEqual({
      horizontal: undefined,
      vertical: TransformDirection.Top,
      isCorner: false,
    })
  })

  it('should parse southwest handle', () => {
    const result = parseHandle('sw')
    expect(result).toEqual({
      horizontal: TransformDirection.Left,
      vertical: TransformDirection.Bottom,
      isCorner: true,
    })
  })

  it('should parse west handle', () => {
    const result = parseHandle('w')
    expect(result).toEqual({
      horizontal: TransformDirection.Left,
      vertical: undefined,
      isCorner: false,
    })
  })

  it('should parse northeast handle', () => {
    const result = parseHandle('ne')
    expect(result).toEqual({
      horizontal: TransformDirection.Right,
      vertical: TransformDirection.Top,
      isCorner: true,
    })
  })

  it('should parse south handle', () => {
    const result = parseHandle('s')
    expect(result).toEqual({
      horizontal: undefined,
      vertical: TransformDirection.Bottom,
      isCorner: false,
    })
  })
})

describe('transformPoints', () => {
  const box: InitialSize = { x: 0, y: 0, width: 100, height: 50 }

  it('should move east handle right', () => {
    const points: Point[] = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 50 },
      { x: 0, y: 50 },
    ]
    const handle = parseHandle('e')
    const delta = { dx: 20, dy: 0 }
    
    const result = transformPoints(points, box, delta, handle, false)
    
    // Left side (x=0) should not move (coefficient = 0)
    expect(result[0].x).toBe(0)
    // Right side (x=100) should move by 20 (coefficient = 1)
    expect(result[1].x).toBe(120)
    // Bottom-right should move by 20 (coefficient = 1)
    expect(result[2].x).toBe(120)
    // Bottom-left should not move
    expect(result[3].x).toBe(0)
  })

  it('should move north handle up', () => {
    const points: Point[] = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 50 },
      { x: 0, y: 50 },
    ]
    const handle = parseHandle('n')
    const delta = { dx: 0, dy: -10 }
    
    const result = transformPoints(points, box, delta, handle, false)
    
    // Top points should move -10 (coefficient = 1)
    expect(result[0].y).toBe(-10)
    expect(result[1].y).toBe(-10)
    // Bottom points should not move
    expect(result[2].y).toBe(50)
    expect(result[3].y).toBe(50)
  })

  it('should scale from center when fromCenter is true', () => {
    const points: Point[] = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 50 },
      { x: 0, y: 50 },
    ]
    const handle = parseHandle('e')
    const delta = { dx: 20, dy: 0 }
    
    const result = transformPoints(points, box, delta, handle, true)
    
    // All points should scale from center
    // Left side moves -10, right side moves +10
    expect(result[0].x).toBe(-10)
    expect(result[1].x).toBe(110)
    expect(result[2].x).toBe(110)
    expect(result[3].x).toBe(-10)
  })

  it('should handle corner handles with both axes', () => {
    const points: Point[] = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 50 },
      { x: 0, y: 50 },
    ]
    const handle = parseHandle('se')
    const delta = { dx: 20, dy: 10 }
    
    const result = transformPoints(points, box, delta, handle, false)
    
    // Only bottom-right corner moves fully
    expect(result[2].x).toBe(120)
    expect(result[2].y).toBe(60)
  })
})

describe('rotatePoints', () => {
  it('should rotate points 90 degrees around center', () => {
    const points: Point[] = [
      { x: 10, y: 0 },  // 10mm to the right of center
      { x: 10, y: 10 },  // 10mm right, 10mm down
    ]
    const center = { x: 0, y: 0 }
    
    const result = rotatePoints(points, center, 90)
    
    // 90 degrees: (x, y) -> (-y, x)
    expect(result[0].x).toBeCloseTo(0, 5)
    expect(result[0].y).toBeCloseTo(10, 5)
    expect(result[1].x).toBeCloseTo(-10, 5)
    expect(result[1].y).toBeCloseTo(10, 5)
  })

  it('should rotate points -90 degrees around center', () => {
    const points: Point[] = [
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ]
    const center = { x: 0, y: 0 }
    
    const result = rotatePoints(points, center, -90)
    
    // -90 degrees: (x, y) -> (y, -x)
    expect(result[0].x).toBeCloseTo(0, 5)
    expect(result[0].y).toBeCloseTo(-10, 5)
    expect(result[1].x).toBeCloseTo(10, 5)
    expect(result[1].y).toBeCloseTo(-10, 5)
  })

  it('should rotate points 45 degrees around arbitrary center', () => {
    const points: Point[] = [
      { x: 10, y: 10 },
    ]
    const center = { x: 10, y: 0 }
    
    const result = rotatePoints(points, center, 45)
    
    // Point is (0, 10) relative to center
    // 45 degrees: (x, y) -> (x*cos - y*sin, x*sin + y*cos)
    // (0, 10) -> (-7.07, 7.07)
    expect(result[0].x).toBeCloseTo(2.93, 1)
    expect(result[0].y).toBeCloseTo(7.07, 1)
  })
})

describe('flipPointsHorizontal', () => {
  it('should flip points horizontally around box center', () => {
    const points: Point[] = [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 50, y: 50 },
      { x: 0, y: 50 },
    ]
    const box: InitialSize = { x: 0, y: 0, width: 50, height: 50 }
    
    const result = flipPointsHorizontal(points, box)
    
    // Center is at x=25, so flip: x -> 50 - x
    expect(result[0].x).toBe(50)
    expect(result[1].x).toBe(0)
    expect(result[2].x).toBe(0)
    expect(result[3].x).toBe(50)
  })
})

describe('flipPointsVertical', () => {
  it('should flip points vertically around box center', () => {
    const points: Point[] = [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 50, y: 50 },
      { x: 0, y: 50 },
    ]
    const box: InitialSize = { x: 0, y: 0, width: 50, height: 50 }
    
    const result = flipPointsVertical(points, box)
    
    // Center is at y=25, so flip: y -> 50 - y
    expect(result[0].y).toBe(50)
    expect(result[1].y).toBe(50)
    expect(result[2].y).toBe(0)
    expect(result[3].y).toBe(0)
  })
})
