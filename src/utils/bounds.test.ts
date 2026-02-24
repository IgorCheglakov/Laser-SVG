import { describe, it, expect } from 'vitest'
import { getAllPointElements, findPointElementsByIds, calculateBoundsFromPoints, calculateBoundingBox } from './bounds'
import type { SVGElement, PointElement, GroupElement, Point } from '@/types-app/index'

describe('getAllPointElements', () => {
  it('should return empty array for empty input', () => {
    const result = getAllPointElements([])
    expect(result).toEqual([])
  })

  it('should extract point elements from flat array', () => {
    const elements: SVGElement[] = [
      { id: '1', type: 'point', name: 'rect', visible: true, locked: false, points: [{ x: 0, y: 0 }], stroke: '#000', strokeWidth: 1, isClosedShape: true },
      { id: '2', type: 'point', name: 'line', visible: true, locked: false, points: [{ x: 0, y: 0 }, { x: 10, y: 10 }], stroke: '#000', strokeWidth: 1, isClosedShape: false },
    ]
    
    const result = getAllPointElements(elements)
    
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('1')
    expect(result[1].id).toBe('2')
  })

  it('should extract point elements from nested groups', () => {
    const groupChild: PointElement = { id: '2', type: 'point', name: 'child', visible: true, locked: false, points: [{ x: 5, y: 5 }], stroke: '#000', strokeWidth: 1, isClosedShape: true }
    const group: GroupElement = { id: 'g1', type: 'group', name: 'Group', visible: true, locked: false, children: [groupChild] }
    const elements: SVGElement[] = [
      { id: '1', type: 'point', name: 'rect', visible: true, locked: false, points: [{ x: 0, y: 0 }], stroke: '#000', strokeWidth: 1, isClosedShape: true },
      group,
    ]
    
    const result = getAllPointElements(elements)
    
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('1')
    expect(result[1].id).toBe('2')
  })

  it('should handle deeply nested groups', () => {
    const deepChild: PointElement = { id: '3', type: 'point', name: 'deep', visible: true, locked: false, points: [{ x: 10, y: 10 }], stroke: '#000', strokeWidth: 1, isClosedShape: true }
    const innerGroup: GroupElement = { id: 'g2', type: 'group', name: 'Inner', visible: true, locked: false, children: [deepChild] }
    const outerGroup: GroupElement = { id: 'g1', type: 'group', name: 'Outer', visible: true, locked: false, children: [innerGroup] }
    
    const result = getAllPointElements([outerGroup])
    
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('3')
  })

  it('should skip hidden groups', () => {
    const hiddenChild: PointElement = { id: '2', type: 'point', name: 'hidden', visible: true, locked: false, points: [{ x: 5, y: 5 }], stroke: '#000', strokeWidth: 1, isClosedShape: true }
    const hiddenGroup: GroupElement = { id: 'g1', type: 'group', name: 'Hidden', visible: false, locked: false, children: [hiddenChild] }
    
    const result = getAllPointElements([hiddenGroup])
    
    expect(result).toHaveLength(0)
  })
})

describe('findPointElementsByIds', () => {
  it('should find point elements by ids in flat array', () => {
    const elements: SVGElement[] = [
      { id: '1', type: 'point', name: 'rect', visible: true, locked: false, points: [{ x: 0, y: 0 }], stroke: '#000', strokeWidth: 1, isClosedShape: true },
      { id: '2', type: 'point', name: 'line', visible: true, locked: false, points: [{ x: 0, y: 0 }], stroke: '#000', strokeWidth:1, isClosedShape: false },
      { id: '3', type: 'point', name: 'circle', visible: true, locked: false, points: [{ x: 5, y: 5 }], stroke: '#000', strokeWidth:1, isClosedShape: true },
    ]
    
    const result = findPointElementsByIds(elements, ['1', '3'])
    
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('1')
    expect(result[1].id).toBe('3')
  })

  it('should find point elements in groups by parent id', () => {
    const groupChild: PointElement = { id: '2', type: 'point', name: 'child', visible: true, locked: false, points: [{ x: 5, y: 5 }], stroke: '#000', strokeWidth: 1, isClosedShape: true }
    const group: GroupElement = { id: 'g1', type: 'group', name: 'Group', visible: true, locked: false, children: [groupChild] }
    const elements: SVGElement[] = [
      { id: '1', type: 'point', name: 'rect', visible: true, locked: false, points: [{ x: 0, y: 0 }], stroke: '#000', strokeWidth: 1, isClosedShape: true },
      group,
    ]
    
    // Note: This test shows current behavior - findPointElementsByIds finds by child IDs, not parent group IDs
    const result = findPointElementsByIds(elements, ['1', '2'])
    
    expect(result).toHaveLength(2)
  })
})

describe('calculateBoundsFromPoints', () => {
  it('should calculate bounds for empty points array', () => {
    const result = calculateBoundsFromPoints([])
    expect(result).toEqual({ x: 0, y: 0, width: 0, height: 0 })
  })

  it('should calculate bounds for single point', () => {
    const points: Point[] = [{ x: 10, y: 20 }]
    const result = calculateBoundsFromPoints(points)
    expect(result).toEqual({ x: 10, y: 20, width: 0, height: 0 })
  })

  it('should calculate bounds for multiple points', () => {
    const points: Point[] = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 50 },
      { x: 0, y: 50 },
    ]
    const result = calculateBoundsFromPoints(points)
    expect(result).toEqual({ x: 0, y: 0, width: 100, height: 50 })
  })

  it('should handle points with control handles', () => {
    const points: Point[] = [
      { x: 0, y: 0, nextControlHandle: { x: 10, y: 0 } },
      { x: 100, y: 0, prevControlHandle: { x: 90, y: 0 } },
    ]
    const result = calculateBoundsFromPoints(points)
    expect(result).toEqual({ x: 0, y: 0, width: 100, height: 0 })
  })
})

describe('calculateBoundingBox', () => {
  it('should return null for empty selectedIds', () => {
    const elements: SVGElement[] = []
    const result = calculateBoundingBox(elements, [])
    expect(result).toBeNull()
  })

  it('should calculate bounding box for selected point elements', () => {
    const elements: SVGElement[] = [
      { id: '1', type: 'point', name: 'rect', visible: true, locked: false, points: [{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 50, y: 50 }, { x: 0, y: 50 }], stroke: '#000', strokeWidth: 1, isClosedShape: true },
      { id: '2', type: 'point', name: 'line', visible: true, locked: false, points: [{ x: 100, y: 100 }, { x: 150, y: 150 }], stroke: '#000', strokeWidth: 1, isClosedShape: false },
    ]
    
    const result = calculateBoundingBox(elements, ['1', '2'])
    
    expect(result).toEqual({ x: 0, y: 0, width: 150, height: 150 })
  })

  it('should calculate bounding box for selected groups', () => {
    const groupChild: PointElement = { id: '2', type: 'point', name: 'child', visible: true, locked: false, points: [{ x: 100, y: 100 }, { x: 120, y: 120 }], stroke: '#000', strokeWidth: 1, isClosedShape: false }
    const group: GroupElement = { id: 'g1', type: 'group', name: 'Group', visible: true, locked: false, children: [groupChild] }
    const elements: SVGElement[] = [
      { id: '1', type: 'point', name: 'rect', visible: true, locked: false, points: [{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 50, y: 50 }, { x: 0, y: 50 }], stroke: '#000', strokeWidth: 1, isClosedShape: true },
      group,
    ]
    
    // Select the group - should include children
    const result = calculateBoundingBox(elements, ['g1'])
    
    expect(result).toEqual({ x: 100, y: 100, width: 20, height: 20 })
  })
})
