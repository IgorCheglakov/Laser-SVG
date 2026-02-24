import { describe, it, expect } from 'vitest'
import { snapPoint, snapValue } from './snap'

describe('snapPoint', () => {
  it('should return original point when snap is disabled', () => {
    const point = { x: 15.5, y: 25.3 }
    const result = snapPoint(point, 1, false)
    expect(result).toEqual(point)
  })

  it('should return original point when grid size is zero', () => {
    const point = { x: 15.5, y: 25.3 }
    const result = snapPoint(point, 0, true)
    expect(result).toEqual(point)
  })

  it('should return original point when grid size is negative', () => {
    const point = { x: 15.5, y: 25.3 }
    const result = snapPoint(point, -1, true)
    expect(result).toEqual(point)
  })

  it('should snap to nearest grid intersection with 1mm grid', () => {
    const point = { x: 15.5, y: 25.3 }
    const result = snapPoint(point, 1, true)
    expect(result).toEqual({ x: 16, y: 25 })
  })

  it('should snap to nearest grid intersection with 10mm grid', () => {
    const point = { x: 15.5, y: 25.3 }
    const result = snapPoint(point, 10, true)
    expect(result).toEqual({ x: 20, y: 30 })
  })

  it('should handle exact grid values', () => {
    const point = { x: 10, y: 20 }
    const result = snapPoint(point, 1, true)
    expect(result).toEqual({ x: 10, y: 20 })
  })

  it('should snap negative values correctly', () => {
    const point = { x: -5.3, y: -15.7 }
    const result = snapPoint(point, 1, true)
    expect(result).toEqual({ x: -5, y: -16 })
  })
})

describe('snapValue', () => {
  it('should return original value when snap is disabled', () => {
    const result = snapValue(15.5, 1, false)
    expect(result).toBe(15.5)
  })

  it('should return original value when grid size is zero', () => {
    const result = snapValue(15.5, 0, true)
    expect(result).toBe(15.5)
  })

  it('should snap to nearest grid intersection', () => {
    const result = snapValue(15.5, 1, true)
    expect(result).toBe(16)
  })

  it('should handle exact grid values', () => {
    const result = snapValue(20, 10, true)
    expect(result).toBe(20)
  })

  it('should snap negative values correctly', () => {
    const result = snapValue(-5.3, 1, true)
    expect(result).toBe(-5)
  })
})
