import { describe, it, expect } from 'vitest'
import { createPoint, hasCurve, isCorner, convertToCorner, convertToStraight, convertToSmooth } from './point'
import type { Point } from './point'

describe('createPoint', () => {
  it('should create a point with x and y', () => {
    const result = createPoint(10, 20)
    expect(result).toEqual({ x: 10, y: 20 })
  })
})

describe('hasCurve', () => {
  it('should return false for point without control handles', () => {
    const point: Point = { x: 0, y: 0 }
    expect(hasCurve(point)).toBe(false)
  })

  it('should return true for point with nextControlHandle', () => {
    const point: Point = { x: 0, y: 0, nextControlHandle: { x: 10, y: 10 } }
    expect(hasCurve(point)).toBe(true)
  })

  it('should return true for point with prevControlHandle', () => {
    const point: Point = { x: 0, y: 0, prevControlHandle: { x: -10, y: 0 } }
    expect(hasCurve(point)).toBe(true)
  })
})

describe('isCorner', () => {
  it('should return false for straight vertex type', () => {
    const point: Point = { x: 0, y: 0, vertexType: 'straight' }
    expect(isCorner(point)).toBe(false)
  })

  it('should return false for smooth vertex type', () => {
    const point: Point = { x: 0, y: 0, vertexType: 'smooth' }
    expect(isCorner(point)).toBe(false)
  })

  it('should return true for corner vertex type', () => {
    const point: Point = { x: 0, y: 0, vertexType: 'corner' }
    expect(isCorner(point)).toBe(true)
  })

  it('should return false for undefined vertex type', () => {
    const point: Point = { x: 0, y: 0 }
    expect(isCorner(point)).toBe(false)
  })
})

describe('convertToCorner', () => {
  it('should convert first point of open shape to corner', () => {
    const points: Point[] = [
      { x: 0, y: 0, nextControlHandle: { x: 10, y: 0 } },
      { x: 100, y: 0, prevControlHandle: { x: 90, y: 0 } },
    ]
    
    const result = convertToCorner(0, points, false)
    
    expect(result.vertexType).toBe('corner')
    expect(result.prevControlHandle).toBeUndefined()
    expect(result.nextControlHandle).toBeUndefined()
  })

  it('should convert last point of open shape to corner', () => {
    const points: Point[] = [
      { x: 0, y: 0, nextControlHandle: { x: 10, y: 0 } },
      { x: 100, y: 0, prevControlHandle: { x: 90, y: 0 } },
    ]
    
    const result = convertToCorner(1, points, false)
    
    expect(result.vertexType).toBe('corner')
    expect(result.prevControlHandle).toBeUndefined()
    expect(result.nextControlHandle).toBeUndefined()
  })

  it('should convert middle point of open shape to corner', () => {
    const points: Point[] = [
      { x: 0, y: 0, nextControlHandle: { x: 10, y: 0 } },
      { x: 50, y: 50, prevControlHandle: { x: 40, y: 50 }, nextControlHandle: { x: 60, y: 50 } },
      { x: 100, y: 0, prevControlHandle: { x: 90, y: 0 } },
    ]
    
    const result = convertToCorner(1, points, false)
    
    expect(result.vertexType).toBe('corner')
    expect(result.prevControlHandle).toBeUndefined()
    expect(result.nextControlHandle).toBeUndefined()
  })
})

describe('convertToStraight', () => {
  it('should convert point to straight by removing handles', () => {
    const points: Point[] = [
      { x: 0, y: 0, nextControlHandle: { x: 10, y: 0 }, vertexType: 'smooth' },
      { x: 100, y: 0, prevControlHandle: { x: 90, y: 0 } },
    ]
    
    const result = convertToStraight(0, points, false)
    
    expect(result.vertexType).toBe('straight')
    expect(result.nextControlHandle).toBeUndefined()
  })

  it('should preserve point coordinates', () => {
    const points: Point[] = [
      { x: 25, y: 50, nextControlHandle: { x: 35, y: 50 }, vertexType: 'smooth' },
      { x: 100, y: 0 },
    ]
    
    const result = convertToStraight(0, points, false)
    
    expect(result.x).toBe(25)
    expect(result.y).toBe(50)
  })
})

describe('convertToSmooth', () => {
  it('should convert first point of closed shape to smooth', () => {
    const points: Point[] = [
      { x: 80, y: 21 },
      { x: 120, y: 21 },
      { x: 120, y: 60 },
      { x: 80, y: 60 },
    ]
    
    const result = convertToSmooth(0, points, true)
    
    expect(result.vertexType).toBe('smooth')
    expect(result.prevControlHandle).toBeDefined()
    expect(result.nextControlHandle).toBeDefined()
  })

  it('should convert middle point to smooth', () => {
    const points: Point[] = [
      { x: 0, y: 0 },
      { x: 120, y: 21 },
      { x: 120, y: 60 },
      { x: 80, y: 60 },
    ]
    
    const result = convertToSmooth(1, points, true)
    
    expect(result.vertexType).toBe('smooth')
    expect(result.prevControlHandle).toBeDefined()
    expect(result.nextControlHandle).toBeDefined()
  })

  it('should convert last point of closed shape to smooth', () => {
    const points: Point[] = [
      { x: 80, y: 21 },
      { x: 120, y: 21 },
      { x: 120, y: 60 },
      { x: 80, y: 60 },
    ]
    
    const result = convertToSmooth(3, points, true)
    
    expect(result.vertexType).toBe('smooth')
    expect(result.prevControlHandle).toBeDefined()
    expect(result.nextControlHandle).toBeDefined()
  })

  it('should convert first point of open shape to smooth with only nextHandle', () => {
    const points: Point[] = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ]
    
    const result = convertToSmooth(0, points, false)
    
    expect(result.vertexType).toBe('smooth')
    expect(result.nextControlHandle).toBeDefined()
    expect(result.prevControlHandle).toBeUndefined()
  })

  it('should convert last point of open shape to smooth with only prevHandle', () => {
    const points: Point[] = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ]
    
    const result = convertToSmooth(1, points, false)
    
    expect(result.vertexType).toBe('smooth')
    expect(result.prevControlHandle).toBeDefined()
    expect(result.nextControlHandle).toBeUndefined()
  })

  it('should preserve existing control handles direction', () => {
    const points: Point[] = [
      { x: 0, y: 0, prevControlHandle: { x: -10, y: 0 } },
      { x: 100, y: 0 },
    ]
    
    const result = convertToSmooth(0, points, false)
    
    // Should still have handles after conversion
    expect(result.vertexType).toBe('smooth')
  })
})
