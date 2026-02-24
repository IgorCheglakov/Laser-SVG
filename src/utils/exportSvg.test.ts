import { describe, it, expect } from 'vitest'
import { generatePathData, exportToSVG } from './exportSvg'
import type { Point } from '@/types-app/point'
import type { PointElement, GroupElement, SVGElement } from '@/types-app/index'

type TestPoints = Point[]

function createPointElement(overrides: Partial<PointElement> = {}): PointElement {
  return {
    id: 'test-1',
    type: 'point',
    name: 'Test',
    visible: true,
    locked: false,
    points: [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 50 },
      { x: 0, y: 50 },
    ],
    stroke: '#000000',
    strokeWidth: 0.25,
    isClosedShape: true,
    ...overrides,
  }
}

function createGroupElement(overrides: Partial<GroupElement> = {}): GroupElement {
  return {
    id: 'group-1',
    type: 'group',
    name: 'Group 1',
    visible: true,
    locked: false,
    children: [],
    ...overrides,
  }
}

describe('generatePathData', () => {
  describe('empty and single points', () => {
    it('should return empty string for empty points array', () => {
      const result = generatePathData([], false)
      expect(result).toBe('')
    })

    it('should return just M command for single point', () => {
      const points: TestPoints = [{ x: 10, y: 20 }]
      const result = generatePathData(points, false)
      expect(result).toBe('M 10 20')
    })

    it('should return just M command for single closed shape', () => {
      const points: TestPoints = [{ x: 10, y: 20 }]
      const result = generatePathData(points, true)
      expect(result).toBe('M 10 20')
    })
  })

  describe('two points (line)', () => {
    it('should generate M + L for two points open shape', () => {
      const points: TestPoints = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ]
      const result = generatePathData(points, false)
      expect(result).toBe('M 0 0 L 100 0')
    })

    it('should generate M + L for two points closed shape (no Z for only 2 points)', () => {
      const points: TestPoints = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ]
      const result = generatePathData(points, true)
      expect(result).toBe('M 0 0 L 100 0')
    })
  })

  describe('three points (triangle)', () => {
    it('should generate triangle path for open shape', () => {
      const points: TestPoints = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 50, y: 100 },
      ]
      const result = generatePathData(points, false)
      expect(result).toBe('M 0 0 L 100 0 L 50 100')
    })

    it('should generate triangle path with Z for closed shape', () => {
      const points: TestPoints = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 50, y: 100 },
      ]
      const result = generatePathData(points, true)
      expect(result).toBe('M 0 0 L 100 0 L 50 100 Z')
    })
  })

  describe('rectangle', () => {
    it('should generate rectangle path for open shape', () => {
      const points: TestPoints = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 50 },
        { x: 0, y: 50 },
      ]
      const result = generatePathData(points, false)
      expect(result).toBe('M 0 0 L 100 0 L 100 50 L 0 50')
    })

    it('should generate rectangle path with Z for closed shape', () => {
      const points: TestPoints = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 50 },
        { x: 0, y: 50 },
      ]
      const result = generatePathData(points, true)
      expect(result).toBe('M 0 0 L 100 0 L 100 50 L 0 50 Z')
    })
  })

  describe('Bezier curves - smooth vertex', () => {
    it('should use C command when prev point has nextControlHandle with smooth type', () => {
      const points: TestPoints = [
        { x: 0, y: 0, vertexType: 'smooth', nextControlHandle: { x: 25, y: 0 } },
        { x: 100, y: 0 },
      ]
      const result = generatePathData(points, false)
      expect(result).toBe('M 0 0 C 25 0, 100 0, 100 0')
    })

    it('should use C command when current point has prevControlHandle with smooth type', () => {
      const points: TestPoints = [
        { x: 0, y: 0 },
        { x: 100, y: 0, vertexType: 'smooth', prevControlHandle: { x: 75, y: 0 } },
      ]
      const result = generatePathData(points, false)
      expect(result).toBe('M 0 0 C 100 0, 75 0, 100 0')
    })

    it('should use both control handles in C command when both exist', () => {
      const points: TestPoints = [
        { x: 0, y: 0, vertexType: 'smooth', nextControlHandle: { x: 25, y: 10 } },
        { x: 100, y: 0, vertexType: 'smooth', prevControlHandle: { x: 75, y: -10 } },
      ]
      const result = generatePathData(points, false)
      expect(result).toBe('M 0 0 C 25 10, 75 -10, 100 0')
    })

    it('should use L (not C) when vertexType is straight even with control handles', () => {
      const points: TestPoints = [
        { x: 0, y: 0, nextControlHandle: { x: 25, y: 0 } },
        { x: 100, y: 0 },
      ]
      const result = generatePathData(points, false)
      expect(result).toBe('M 0 0 L 100 0')
    })
  })

  describe('Bezier curves - corner vertex', () => {
    it('should use C command when prev point has nextControlHandle with corner type', () => {
      const points: TestPoints = [
        { x: 0, y: 0, vertexType: 'corner', nextControlHandle: { x: 25, y: 0 } },
        { x: 100, y: 0 },
      ]
      const result = generatePathData(points, false)
      expect(result).toBe('M 0 0 C 25 0, 100 0, 100 0')
    })

    it('should use C command when current point has prevControlHandle with corner type', () => {
      const points: TestPoints = [
        { x: 0, y: 0 },
        { x: 100, y: 0, vertexType: 'corner', prevControlHandle: { x: 75, y: 0 } },
      ]
      const result = generatePathData(points, false)
      expect(result).toBe('M 0 0 C 100 0, 75 0, 100 0')
    })
  })

  describe('Bezier curves - closed shape', () => {
    it('should add Z for closed smooth shape with 3+ points', () => {
      const points: TestPoints = [
        { x: 0, y: 50, vertexType: 'smooth', nextControlHandle: { x: 0, y: 25 }, prevControlHandle: { x: 50, y: 100 } },
        { x: 100, y: 0, vertexType: 'smooth', nextControlHandle: { x: 100, y: 25 }, prevControlHandle: { x: 50, y: 0 } },
        { x: 50, y: 100 },
      ]
      const result = generatePathData(points, true)
      expect(result).toContain('Z')
    })

    it('should close with curve when first and last have control handles', () => {
      const points: TestPoints = [
        { x: 0, y: 50, vertexType: 'smooth', prevControlHandle: { x: 0, y: 100 } },
        { x: 100, y: 50, vertexType: 'smooth', nextControlHandle: { x: 100, y: 100 } },
        { x: 50, y: 0 },
      ]
      const result = generatePathData(points, true)
      expect(result).toMatch(/C .+ .+ .+ .+ Z$/)
    })

    it('should not add Z for closed shape with less than 3 points', () => {
      const points: TestPoints = [
        { x: 0, y: 50, vertexType: 'smooth', prevControlHandle: { x: 0, y: 100 } },
        { x: 100, y: 50, vertexType: 'smooth', nextControlHandle: { x: 100, y: 100 } },
      ]
      const result = generatePathData(points, true)
      expect(result).not.toContain('Z')
    })
  })
})

describe('exportToSVG', () => {
  it('should export single point element as path', () => {
    const elements: SVGElement[] = [createPointElement()]
    const result = exportToSVG(elements, 1000, 1000)
    
    expect(result).toContain('<path')
    expect(result).toContain('d="M 0 0 L 100 0 L 100 50 L 0 50 Z"')
    expect(result).toContain('stroke="#000000"')
    expect(result).toContain('stroke-width="0.25"')
  })

  it('should include XML declaration and SVG tag', () => {
    const elements: SVGElement[] = [createPointElement()]
    const result = exportToSVG(elements, 1000, 1000)
    
    expect(result).toContain('<?xml version="1.0" encoding="UTF-8"?>')
    expect(result).toContain('<svg')
    expect(result).toContain('width="1000mm"')
    expect(result).toContain('height="1000mm"')
    expect(result).toContain('viewBox="0 0 1000 1000"')
  })

  it('should include isLaserSvgCompatible metadata', () => {
    const elements: SVGElement[] = [createPointElement()]
    const result = exportToSVG(elements, 1000, 1000)
    
    expect(result).toContain('<isLaserSvgCompatible>true</isLaserSvgCompatible>')
    expect(result).toContain('<metadata>')
  })

  it('should include layer1 group', () => {
    const elements: SVGElement[] = [createPointElement()]
    const result = exportToSVG(elements, 1000, 1000)
    
    expect(result).toContain('<g id="layer1">')
    expect(result).toContain('</g>')
  })

  it('should not export invisible elements', () => {
    const elements: SVGElement[] = [
      createPointElement({ visible: false }),
    ]
    const result = exportToSVG(elements, 1000, 1000)
    
    expect(result).not.toContain('<path')
  })

  it('should export group with nested elements', () => {
    const group = createGroupElement({
      children: [createPointElement({ id: 'child-1', name: 'Child 1' })],
    })
    const elements: SVGElement[] = [group]
    const result = exportToSVG(elements, 1000, 1000)
    
    expect(result).toContain('<g id="group-1"')
    expect(result).toContain('data-name="Group 1"')
    expect(result).toContain('<path')
  })

  it('should not export invisible groups', () => {
    const group = createGroupElement({
      visible: false,
      children: [createPointElement()],
    })
    const elements: SVGElement[] = [group]
    const result = exportToSVG(elements, 1000, 1000)
    
    expect(result).not.toContain('<g id="group-1"')
  })

  it('should export element with custom stroke color', () => {
    const element = createPointElement({ stroke: '#ff0000' })
    const result = exportToSVG([element], 1000, 1000)
    
    expect(result).toContain('stroke="#ff0000"')
  })

  it('should export element with custom stroke width', () => {
    const element = createPointElement({ strokeWidth: 0.5 })
    const result = exportToSVG([element], 1000, 1000)
    
    expect(result).toContain('stroke-width="0.5"')
  })

  it('should include id and data-name attributes on path', () => {
    const element = createPointElement({ id: 'my-rect', name: 'Rectangle' })
    const result = exportToSVG([element], 1000, 1000)
    
    expect(result).toContain('id="my-rect"')
    expect(result).toContain('data-name="Rectangle"')
  })

  it('should handle empty elements array', () => {
    const result = exportToSVG([], 1000, 1000)
    
    expect(result).toContain('<?xml version="1.0" encoding="UTF-8"?>')
    expect(result).toContain('<svg')
    expect(result).toContain('</svg>')
  })

  it('should skip elements without points', () => {
    const element = createPointElement({ points: [] })
    const result = exportToSVG([element], 1000, 1000)
    
    expect(result).not.toContain('<path')
  })
})
