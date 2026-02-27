import { describe, it, expect } from 'vitest'
import { 
  isSvgLaserCompatible, 
  cropElementsToBounds, 
  centerElements,
  importFromSVG,
} from './importSvgToExistingDoc'
import type { PointElement, GroupElement, SVGElement } from '@/types-app/index'

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

describe('isSvgLaserCompatible', () => {
  it('should return true for SVG with isLaserSvgCompatible tag', () => {
    const svg = `<svg><metadata><isLaserSvgCompatible>true</isLaserSvgCompatible></metadata></svg>`
    expect(isSvgLaserCompatible(svg)).toBe(true)
  })

  it('should return false for SVG without isLaserSvgCompatible tag', () => {
    const svg = `<svg><rect width="100" height="100"/></svg>`
    expect(isSvgLaserCompatible(svg)).toBe(false)
  })

  it('should return false for empty string', () => {
    expect(isSvgLaserCompatible('')).toBe(false)
  })

  it('should return true if tag is present anywhere in content', () => {
    const svg = `<svg><!-- isLaserSvgCompatible --><path/></svg>`
    expect(isSvgLaserCompatible(svg)).toBe(true)
  })
})

describe('cropElementsToBounds', () => {
  it('should return empty array for empty elements', () => {
    const result = cropElementsToBounds([], 1000, 1000)
    expect(result).toEqual([])
  })

  it('should return original elements if within bounds', () => {
    const elements: SVGElement[] = [createPointElement()]
    const result = cropElementsToBounds(elements, 1000, 1000)
    
    expect(result.length).toBe(1)
    expect(result[0]).toEqual(elements[0])
  })

  it('should scale down elements that exceed bounds', () => {
    const elements: SVGElement[] = [
      createPointElement({ id: 'big', points: [{ x: 0, y: 0 }, { x: 2000, y: 0 }, { x: 2000, y: 2000 }, { x: 0, y: 2000 }] }),
    ]
    const result = cropElementsToBounds(elements, 1000, 1000)
    
    expect(result.length).toBe(1)
    const points = (result[0] as PointElement).points
    expect(points[1].x).toBeLessThan(2000)
  })

  it('should scale proportionally from center', () => {
    const elements: SVGElement[] = [
      createPointElement({ id: 'wide', points: [{ x: 0, y: 0 }, { x: 200, y: 0 }, { x: 200, y: 100 }, { x: 0, y: 100 }] }),
    ]
    const result = cropElementsToBounds(elements, 100, 100)
    
    expect(result.length).toBe(1)
    const points = (result[0] as PointElement).points
    expect(points[1].x).toBe(150)
    expect(points[2].y).toBe(75)
  })
})

describe('centerElements', () => {
  it('should return empty array for empty elements', () => {
    const result = centerElements([], 500, 500, 1000, 1000)
    expect(result).toEqual([])
  })

  it('should return original elements if elements exceed artboard', () => {
    const element = createPointElement({ 
      points: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 50 }, { x: 0, y: 50 }] 
    })
    const result = centerElements([element], 500, 500, 40, 40)
    
    expect(result[0]).toEqual(element)
  })

  it('should center elements at target position', () => {
    const elements: SVGElement[] = [
      createPointElement({ id: 'rect', points: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 50 }, { x: 0, y: 50 }] }),
    ]
    const result = centerElements(elements, 500, 500, 1000, 1000)
    
    expect(result.length).toBe(1)
    const points = (result[0] as PointElement).points
    expect(points[0].x).toBe(450)
    expect(points[0].y).toBe(475)
  })

  it('should also offset control handles when centering', () => {
    const elements: SVGElement[] = [
      createPointElement({
        id: 'curve',
        points: [
          { x: 0, y: 0, nextControlHandle: { x: 25, y: 0 } },
          { x: 100, y: 0, prevControlHandle: { x: 75, y: 0 } },
        ],
      }),
    ]
    const result = centerElements(elements, 500, 500, 1000, 1000)
    
    expect(result.length).toBe(1)
    const points = (result[0] as PointElement).points
    
    expect(points[0].x).toBe(450)
    expect(points[0].nextControlHandle?.x).toBe(475)
    
    expect(points[1].x).toBe(550)
    expect(points[1].prevControlHandle?.x).toBe(525)
  })

  it('should preserve element properties other than points', () => {
    const element = createPointElement({ 
      id: 'test', 
      name: 'Test Element', 
      stroke: '#ff0000',
      strokeWidth: 0.5,
    })
    const result = centerElements([element], 500, 500, 1000, 1000)
    
    expect(result[0].id).toBe('test')
    expect(result[0].name).toBe('Test Element')
    expect((result[0] as PointElement).stroke).toBe('#ff0000')
    expect((result[0] as PointElement).strokeWidth).toBe(0.5)
  })
})

describe('importFromSVG - basic shapes', () => {
  it('should return empty array for empty SVG', () => {
    const svg = `<svg></svg>`
    const result = importFromSVG(svg)
    expect(result).toEqual([])
  })

  it('should return empty array for invalid SVG', () => {
    const svg = `not an svg`
    const result = importFromSVG(svg)
    expect(result).toEqual([])
  })

  it('should import rect element', () => {
    const svg = `<svg width="100mm" height="100mm" viewBox="0 0 100 100"><rect x="10" y="20" width="50" height="30"/></svg>`
    const result = importFromSVG(svg)
    
    expect(result.length).toBe(1)
    expect(result[0].type).toBe('point')
    const pointEl = result[0] as PointElement
    expect(pointEl.points.length).toBeGreaterThan(2)
    expect(pointEl.isClosedShape).toBe(true)
  })

  it('should import line element', () => {
    const svg = `<svg width="100mm" height="100mm" viewBox="0 0 100 100"><line x1="10" y1="20" x2="50" y2="60"/></svg>`
    const result = importFromSVG(svg)
    
    expect(result.length).toBe(1)
    expect(result[0].type).toBe('point')
    const pointEl = result[0] as PointElement
    expect(pointEl.points.length).toBe(2)
    expect(pointEl.isClosedShape).toBe(false)
  })

  it('should import circle element', () => {
    const svg = `<svg width="100mm" height="100mm" viewBox="0 0 100 100"><circle cx="50" cy="50" r="25"/></svg>`
    const result = importFromSVG(svg)
    
    expect(result.length).toBe(1)
    expect(result[0].type).toBe('point')
    const pointEl = result[0] as PointElement
    expect(pointEl.isClosedShape).toBe(true)
  })

  it('should import ellipse element', () => {
    const svg = `<svg width="100mm" height="100mm" viewBox="0 0 100 100"><ellipse cx="50" cy="50" rx="30" ry="20"/></svg>`
    const result = importFromSVG(svg)
    
    expect(result.length).toBe(1)
    expect(result[0].type).toBe('point')
    const pointEl = result[0] as PointElement
    expect(pointEl.isClosedShape).toBe(true)
  })

  it('should import polygon element', () => {
    const svg = `<svg width="100mm" height="100mm" viewBox="0 0 100 100"><polygon points="50,10 90,90 10,90"/></svg>`
    const result = importFromSVG(svg)
    
    expect(result.length).toBe(1)
    expect(result[0].type).toBe('point')
    const pointEl = result[0] as PointElement
    expect(pointEl.isClosedShape).toBe(true)
  })

  it('should import polyline element', () => {
    const svg = `<svg width="100mm" height="100mm" viewBox="0 0 100 100"><polyline points="10,10 50,50 90,10"/></svg>`
    const result = importFromSVG(svg)
    
    expect(result.length).toBe(1)
    expect(result[0].type).toBe('point')
    const pointEl = result[0] as PointElement
    expect(pointEl.isClosedShape).toBe(false)
  })

  it('should preserve stroke color from SVG (uppercase)', () => {
    const svg = `<svg width="100mm" height="100mm" viewBox="0 0 100 100"><rect x="10" y="10" width="50" height="50" stroke="#ff0000"/></svg>`
    const result = importFromSVG(svg)
    
    expect(result.length).toBe(1)
    const pointEl = result[0] as PointElement
    expect(pointEl.stroke).toBe('#FF0000')
  })

  it('should preserve SVG size when using px units (no scaling to artboard)', () => {
    const svg = `<svg width="100px" height="100px" viewBox="0 0 100 100"><rect x="0" y="0" width="10" height="10"/></svg>`
    const result = importFromSVG(svg)
    
    expect(result.length).toBe(1)
    const pointEl = result[0] as PointElement
    const maxCoord = Math.max(...pointEl.points.map(p => Math.max(p.x, p.y)))
    // With scale factor = 1, coordinates should be in mm (100px * 0.264583 = 26.46mm)
    // rect goes from 0 to 10, so maxCoord = 10
    expect(maxCoord).toBe(10)
  })

  it('should import group element with children', () => {
    const svg = `<svg width="100mm" height="100mm" viewBox="0 0 100 100"><g><rect x="10" y="10" width="20" height="20"/></g></svg>`
    const result = importFromSVG(svg)
    
    expect(result.length).toBe(1)
    expect(result[0].type).toBe('group')
    const groupEl = result[0] as GroupElement
    expect(groupEl.children.length).toBe(1)
    expect(groupEl.children[0].type).toBe('point')
  })

  it('should import nested groups', () => {
    const svg = `<svg width="100mm" height="100mm" viewBox="0 0 100 100"><g><g><rect x="10" y="10" width="20" height="20"/></g></g></svg>`
    const result = importFromSVG(svg)
    
    expect(result.length).toBe(1)
    expect(result[0].type).toBe('group')
    const outerGroup = result[0] as GroupElement
    expect(outerGroup.children.length).toBe(1)
    expect(outerGroup.children[0].type).toBe('group')
  })

  it('should import path element', () => {
    const svg = `<svg width="100mm" height="100mm" viewBox="0 0 100 100"><path d="M 10 10 L 50 50 L 90 10"/></svg>`
    const result = importFromSVG(svg)
    
    expect(result.length).toBe(1)
    expect(result[0].type).toBe('point')
    const pointEl = result[0] as PointElement
    expect(pointEl.points.length).toBe(3)
    expect(pointEl.isClosedShape).toBe(false)
  })

  it('should import path with Bezier curve', () => {
    const svg = `<svg width="100mm" height="100mm" viewBox="0 0 100 100"><path d="M 0 0 C 25 0 75 100 100 100"/></svg>`
    const result = importFromSVG(svg)
    
    expect(result.length).toBe(1)
    expect(result[0].type).toBe('point')
    const pointEl = result[0] as PointElement
    expect(pointEl.points.length).toBe(2)
  })

  it('should handle SVG with small viewBox but large width/height', () => {
    const svg = `<svg fill="#000000" width="800px" height="800px" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <path d="M8.49,12.68v4.61c0,.34,.23,.61,.53,.71v5.48c0,.13"/>
    </svg>`
    const result = importFromSVG(svg)
    
    expect(result.length).toBe(1)
    expect(result[0].type).toBe('point')
    const pointEl = result[0] as PointElement
    expect(pointEl.points.length).toBeGreaterThan(0)
    expect(pointEl.points[0].x).toBe(8.49 * 25)
    expect(pointEl.points[0].y).toBe(12.68 * 25)
  })

  it('should handle Zm (close path then move) correctly', () => {
    const svg = `<svg width="100mm" height="100mm" viewBox="0 0 32 32">
      <path d="M0,0 L10,0 L10,10 L0,10 Z m5,5 L20,15 L20,5 L5,15 Z"/>
    </svg>`
    const result = importFromSVG(svg)
    
    // Path is now processed as single element to preserve command context
    expect(result.length).toBe(1)
    
    // The path should contain both subpaths
    const pointEl = result[0] as PointElement
    
    // Scale factor = 100/32 = 3.125
    const scale = 100 / 32
    
    // First point should be at (0, 0)
    expect(pointEl.points[0].x).toBe(0)
    expect(pointEl.points[0].y).toBe(0)
    
    // After Zm5,5 the next point should be at ABSOLUTE position (5,5) per SVG spec
    // Find the point that follows Z (the first point of second subpath)
    // In single-element approach, we need to check that coordinates are correct
    const fifthPointIndex = 4 // After M,L,L,L,Z -> M is at index 4
    expect(pointEl.points[fifthPointIndex].x).toBe(5 * scale)
    expect(pointEl.points[fifthPointIndex].y).toBe(5 * scale)
  })
})
