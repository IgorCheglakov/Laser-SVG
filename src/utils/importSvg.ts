/**
 * SVG Import Utility
 * 
 * Parses SVG content and converts it to PointElement array.
 * Supports all SVG shapes: line, rect, circle, ellipse, polyline, polygon, path
 * Converts colors to nearest palette color and stroke width to standard 0.25mm
 */

import type { PointElement, SVGElement, Point } from '@/types-app/index'
import type { VertexType } from '@/types-app/point'
import { generateId } from '@/utils/id'
import { COLOR_PALETTE } from '@constants/index'

const STANDARD_STROKE_WIDTH = 0.25
const TIMESTAMP_TOLERANCE_MS = 2000

interface ParsedCommand {
  command: string
  values: number[]
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null
}

function colorToPalette(inputColor: string): string {
  const rgb = hexToRgb(inputColor)
  if (!rgb) return '#000000'

  let minDistance = Infinity
  let closestColor = '#000000'

  for (const paletteColor of COLOR_PALETTE) {
    const paletteRgb = hexToRgb(paletteColor.color)
    if (!paletteRgb) continue

    const distance = Math.sqrt(
      Math.pow(rgb.r - paletteRgb.r, 2) +
      Math.pow(rgb.g - paletteRgb.g, 2) +
      Math.pow(rgb.b - paletteRgb.b, 2)
    )

    if (distance < minDistance) {
      minDistance = distance
      closestColor = paletteColor.color
    }
  }

  return closestColor
}

function normalizeStrokeWidth(width: number): number {
  if (isNaN(width) || width <= 0) return STANDARD_STROKE_WIDTH
  return STANDARD_STROKE_WIDTH
}

function convertLineToPoints(x1: number, y1: number, x2: number, y2: number): Point[] {
  return [
    { x: x1, y: y1, vertexType: 'straight' as VertexType },
    { x: x2, y: y2, vertexType: 'straight' as VertexType },
  ]
}

function convertRectToPoints(x: number, y: number, width: number, height: number): Point[] {
  return [
    { x, y, vertexType: 'straight' as VertexType },
    { x: x + width, y, vertexType: 'straight' as VertexType },
    { x: x + width, y: y + height, vertexType: 'straight' as VertexType },
    { x, y: y + height, vertexType: 'straight' as VertexType },
  ]
}

function convertCircleToPoints(cx: number, cy: number, r: number): Point[] {
  const k = 0.5522847498 * r

  const points: Point[] = [
    { x: cx, y: cy - r, vertexType: 'smooth' as VertexType },
    { x: cx + r, y: cy, vertexType: 'smooth' as VertexType },
    { x: cx, y: cy + r, vertexType: 'smooth' as VertexType },
    { x: cx - r, y: cy, vertexType: 'smooth' as VertexType },
  ]

  points[0].prevControlHandle = { x: cx - k, y: cy - r }
  points[0].nextControlHandle = { x: cx + k, y: cy - r }
  points[1].prevControlHandle = { x: cx + r, y: cy - k }
  points[1].nextControlHandle = { x: cx + r, y: cy + k }
  points[2].prevControlHandle = { x: cx + k, y: cy + r }
  points[2].nextControlHandle = { x: cx - k, y: cy + r }
  points[3].prevControlHandle = { x: cx - r, y: cy + k }
  points[3].nextControlHandle = { x: cx - r, y: cy - k }

  return points
}

function convertEllipseToPoints(cx: number, cy: number, rx: number, ry: number): Point[] {
  const kx = 0.5522847498 * rx
  const ky = 0.5522847498 * ry

  const points: Point[] = [
    { x: cx, y: cy - ry, vertexType: 'smooth' as VertexType },
    { x: cx + rx, y: cy, vertexType: 'smooth' as VertexType },
    { x: cx, y: cy + ry, vertexType: 'smooth' as VertexType },
    { x: cx - rx, y: cy, vertexType: 'smooth' as VertexType },
  ]

  points[0].prevControlHandle = { x: cx - kx, y: cy - ry }
  points[0].nextControlHandle = { x: cx + kx, y: cy - ry }
  points[1].prevControlHandle = { x: cx + rx, y: cy - ky }
  points[1].nextControlHandle = { x: cx + rx, y: cy + ky }
  points[2].prevControlHandle = { x: cx + kx, y: cy + ry }
  points[2].nextControlHandle = { x: cx - kx, y: cy + ry }
  points[3].prevControlHandle = { x: cx - rx, y: cy + ky }
  points[3].nextControlHandle = { x: cx - rx, y: cy - ky }

  return points
}

function convertPolylineToPoints(pointsStr: string): Point[] {
  const points: Point[] = []
  const nums = pointsStr.trim().split(/[\s,]+/).map(Number)

  for (let i = 0; i < nums.length; i += 2) {
    if (!isNaN(nums[i]) && !isNaN(nums[i + 1])) {
      points.push({ x: nums[i], y: nums[i + 1], vertexType: 'straight' as VertexType })
    }
  }

  return points
}

function parsePathData(d: string): ParsedCommand[] {
  console.log('[Import] Starting parsePathData, d length:', d.length)
  const commands: ParsedCommand[] = []
  const regex = /([MLCQZmlcqz])([^MLCQZmlcqz]*)/g
  let match
  let matchCount = 0

  while ((match = regex.exec(d)) !== null) {
    matchCount++
    const command = match[1]
    const argsStr = match[2].trim()
    
    if (argsStr) {
      const rawValues = argsStr.split(/[\s,]+/).filter(v => v)
      const values: number[] = []
      for (const v of rawValues) {
        const num = Number(v)
        if (!isNaN(num)) {
          values.push(num)
        }
      }
      commands.push({ command, values })
    } else {
      commands.push({ command, values: [] })
    }
  }

  console.log('[Import] parsePathData complete, commands:', matchCount)
  return commands
}

function convertToAbsolute(commands: ParsedCommand[]): ParsedCommand[] {
  console.log('[Import] Starting convertToAbsolute, commands count:', commands.length)
  const absolute: ParsedCommand[] = []
  let x = 0, y = 0
  let startX = 0, startY = 0

  for (const cmd of commands) {
    const c = cmd.command
    const v = cmd.values
    const isRelative = c === c.toLowerCase()
    const baseCmd = c.toUpperCase()

    // Skip commands with invalid/insufficient values
    if (v.some(val => isNaN(val))) continue

    switch (baseCmd) {
      case 'M': {
        if (v.length < 2) continue
        const newX = isRelative ? x + v[0] : v[0]
        const newY = isRelative ? y + v[1] : v[1]
        absolute.push({ command: 'M', values: [newX, newY] })
        x = newX
        y = newY
        startX = x
        startY = y
        break
      }
      case 'L': {
        if (v.length < 2) continue
        const newX = isRelative ? x + v[0] : v[0]
        const newY = isRelative ? y + v[1] : v[1]
        absolute.push({ command: 'L', values: [newX, newY] })
        x = newX
        y = newY
        break
      }
      case 'C': {
        if (v.length < 6) continue
        let cp1x, cp1y, cp2x, cp2y, endX, endY
        if (isRelative) {
          cp1x = x + v[0]
          cp1y = y + v[1]
          cp2x = x + v[2]
          cp2y = y + v[3]
          endX = x + v[4]
          endY = y + v[5]
        } else {
          cp1x = v[0]
          cp1y = v[1]
          cp2x = v[2]
          cp2y = v[3]
          endX = v[4]
          endY = v[5]
        }
        absolute.push({ command: 'C', values: [cp1x, cp1y, cp2x, cp2y, endX, endY] })
        x = endX
        y = endY
        break
      }
      case 'Q': {
        let cpx, cpy, endX, endY
        if (isRelative) {
          cpx = x + v[0]
          cpy = y + v[1]
          endX = x + v[2]
          endY = y + v[3]
        } else {
          cpx = v[0]
          cpy = v[1]
          endX = v[2]
          endY = v[3]
        }
        const cp1x = x + (cpx - x) * 2/3
        const cp1y = y + (cpy - y) * 2/3
        const cp2x = endX + (cpx - endX) * 2/3
        const cp2y = endY + (cpy - endY) * 2/3
        absolute.push({ command: 'C', values: [cp1x, cp1y, cp2x, cp2y, endX, endY] })
        x = endX
        y = endY
        break
      }
      case 'Z': {
        absolute.push({ command: 'Z', values: [] })
        x = startX
        y = startY
        break
      }
    }
  }

  console.log('[Import] convertToAbsolute complete, result count:', absolute.length)
  return absolute
}

function convertPathToPoints(d: string): Point[] {
  const commands = parsePathData(d)
  const absCommands = convertToAbsolute(commands)

  const points: Point[] = []
  let currentPoint: Point | null = null

  for (const cmd of absCommands) {
    // Skip commands with invalid values
    if (cmd.values.some(v => isNaN(v))) continue
    
    if (cmd.command === 'M') {
      if (cmd.values.length < 2) continue
      currentPoint = { x: cmd.values[0], y: cmd.values[1], vertexType: 'straight' }
      if (!isNaN(currentPoint.x) && !isNaN(currentPoint.y)) {
        points.push(currentPoint)
      }
    } else if (cmd.command === 'L') {
      if (cmd.values.length < 2) continue
      currentPoint = { x: cmd.values[0], y: cmd.values[1], vertexType: 'straight' }
      if (!isNaN(currentPoint.x) && !isNaN(currentPoint.y)) {
        points.push(currentPoint)
      }
    } else if (cmd.command === 'C') {
      if (cmd.values.length < 6) continue
      if (currentPoint) {
        currentPoint.nextControlHandle = {
          x: cmd.values[0],
          y: cmd.values[1],
        }
        currentPoint.vertexType = 'corner'
      }
      currentPoint = {
        x: cmd.values[4],
        y: cmd.values[5],
        vertexType: 'straight',
        prevControlHandle: {
          x: cmd.values[2],
          y: cmd.values[3],
        },
      }
      if (!isNaN(currentPoint.x) && !isNaN(currentPoint.y)) {
        points.push(currentPoint)
      }
    } else if (cmd.command === 'Z') {
      if (points.length > 2 && currentPoint) {
        const first = points[0]
        if (first && currentPoint) {
          currentPoint.nextControlHandle = first.prevControlHandle 
            ? { x: first.prevControlHandle.x, y: first.prevControlHandle.y }
            : undefined
          if (currentPoint.nextControlHandle) {
            currentPoint.vertexType = 'corner'
          }
        }
      }
    }
  }

  return points
}

function getSvgElementAttributes(el: Element): {
  stroke: string
  strokeWidth: number
  fill: string | null
  name: string
} {
  let stroke = el.getAttribute('stroke')
  const strokeWidth = parseFloat(el.getAttribute('stroke-width') || '') || STANDARD_STROKE_WIDTH
  const fill = el.getAttribute('fill')
  
  // If no stroke but has fill, use fill as stroke (convert filled shape to outline)
  if (!stroke && fill && fill !== 'none') {
    stroke = fill
  }
  
  // Default to black if no stroke
  if (!stroke || stroke === 'none') {
    stroke = '#000000'
  }
  
  const name = el.getAttribute('data-name') || el.getAttribute('id') || ''

  return {
    stroke: colorToPalette(stroke),
    strokeWidth: normalizeStrokeWidth(strokeWidth),
    fill,
    name,
  }
}

function isLaserSvgCompatible(svg: Element, fileTimestamp: number): boolean {
  const meta = svg.querySelector('metadata')
  if (!meta) return false

  const compatible = meta.getAttribute('isLaserSvgCompatible')
  if (compatible !== 'true') return false

  const timestampStr = meta.getAttribute('timestamp')
  if (!timestampStr) return false

  const svgTimestamp = parseInt(timestampStr, 10)
  if (isNaN(svgTimestamp)) return false

  const diff = Math.abs(svgTimestamp - fileTimestamp)
  console.log(`[Import] File timestamp: ${fileTimestamp}, SVG timestamp: ${svgTimestamp}, diff: ${diff}ms`)

  return diff <= TIMESTAMP_TOLERANCE_MS
}

function getSvgDimensions(svg: Element): { width: number; height: number; viewBox: { x: number; y: number; width: number; height: number } | null } {
  // Get viewBox first (preferred)
  const viewBoxAttr = svg.getAttribute('viewBox')
  let viewBox: { x: number; y: number; width: number; height: number } | null = null
  
  if (viewBoxAttr) {
    const parts = viewBoxAttr.split(/[\s,]+/).map(Number)
    if (parts.length === 4 && !parts.some(isNaN)) {
      viewBox = { x: parts[0], y: parts[1], width: parts[2], height: parts[3] }
    }
  }
  
  // Get width/height
  let width = parseFloat(svg.getAttribute('width') || '')
  let height = parseFloat(svg.getAttribute('height') || '')
  
  // If no width/height but have viewBox, use viewBox
  if ((isNaN(width) || isNaN(height)) && viewBox) {
    width = viewBox.width
    height = viewBox.height
  }
  
  // Default to 1000 if still not found
  if (isNaN(width)) width = 1000
  if (isNaN(height)) height = 1000
  
  console.log(`[Import] SVG dimensions: ${width}x${height}, viewBox:`, viewBox)
  
  return { width, height, viewBox }
}

const DEFAULT_ARTBOARD_SIZE = 1000

function calculateScaleFactor(svgWidth: number, svgHeight: number): number {
  // Scale to fit within 1000x1000 while preserving aspect ratio
  const targetSize = DEFAULT_ARTBOARD_SIZE
  const scaleX = targetSize / svgWidth
  const scaleY = targetSize / svgHeight
  return Math.min(scaleX, scaleY)
}

function scalePoints(points: Point[], scaleFactor: number): Point[] {
  return points.map(p => {
    const scaled: Point = {
      x: p.x * scaleFactor,
      y: p.y * scaleFactor,
      vertexType: p.vertexType,
    }
    if (p.prevControlHandle) {
      scaled.prevControlHandle = {
        x: p.prevControlHandle.x * scaleFactor,
        y: p.prevControlHandle.y * scaleFactor,
      }
    }
    if (p.nextControlHandle) {
      scaled.nextControlHandle = {
        x: p.nextControlHandle.x * scaleFactor,
        y: p.nextControlHandle.y * scaleFactor,
      }
    }
    return scaled
  })
}

export function importFromSVG(svgContent: string, fileTimestamp?: number): SVGElement[] {
  console.log('[Import] Starting importFromSVG, content length:', svgContent.length, 'fileTimestamp:', fileTimestamp)
  
  try {
    const parser = new DOMParser()
    console.log('[Import] DOMParser created')
    
    const doc = parser.parseFromString(svgContent, 'image/svg+xml')
    console.log('[Import] SVG parsed')
    
    const parserError = doc.querySelector('parsererror')
    if (parserError) {
      console.error('[Import] SVG parse error:', parserError.textContent)
      return []
    }

    const svg = doc.querySelector('svg')
    console.log('[Import] SVG element found:', !!svg)

    if (!svg) {
      console.error('[Import] Invalid SVG: no svg element found')
      return []
    }

    // Get SVG dimensions and calculate scale factor
    const { width: svgWidth, height: svgHeight } = getSvgDimensions(svg)
    const scaleFactor = calculateScaleFactor(svgWidth, svgHeight)
    console.log(`[Import] Scale factor: ${scaleFactor}`)

    if (fileTimestamp && isLaserSvgCompatible(svg, fileTimestamp)) {
      console.log('[Import] File is LaserSVG compatible, using fast path')
    }

    const elements: SVGElement[] = []
    const selectors = ['path', 'line', 'rect', 'circle', 'ellipse', 'polyline', 'polygon']
    let elementIndex = 0

    for (const selector of selectors) {
      const els = svg.querySelectorAll(selector)
      console.log(`[Import] Found ${selector}:`, els.length)

      els.forEach((el) => {
        let points: Point[] = []
        let isClosed = false

        switch (el.tagName.toLowerCase()) {
          case 'line': {
            const x1 = parseFloat(el.getAttribute('x1') || '0')
            const y1 = parseFloat(el.getAttribute('y1') || '0')
            const x2 = parseFloat(el.getAttribute('x2') || '0')
            const y2 = parseFloat(el.getAttribute('y2') || '0')
            points = convertLineToPoints(x1, y1, x2, y2)
            break
          }
          case 'rect': {
            const x = parseFloat(el.getAttribute('x') || '0')
            const y = parseFloat(el.getAttribute('y') || '0')
            const width = parseFloat(el.getAttribute('width') || '0')
            const height = parseFloat(el.getAttribute('height') || '0')
            if (width > 0 && height > 0) {
              points = convertRectToPoints(x, y, width, height)
              isClosed = true
            }
            break
          }
          case 'circle': {
            const cx = parseFloat(el.getAttribute('cx') || '0')
            const cy = parseFloat(el.getAttribute('cy') || '0')
            const r = parseFloat(el.getAttribute('r') || '0')
            if (r > 0) {
              points = convertCircleToPoints(cx, cy, r)
              isClosed = true
            }
            break
          }
          case 'ellipse': {
            const cx = parseFloat(el.getAttribute('cx') || '0')
            const cy = parseFloat(el.getAttribute('cy') || '0')
            const rx = parseFloat(el.getAttribute('rx') || '0')
            const ry = parseFloat(el.getAttribute('ry') || '0')
            if (rx > 0 && ry > 0) {
              points = convertEllipseToPoints(cx, cy, rx, ry)
              isClosed = true
            }
            break
          }
          case 'polyline': {
            const pointsStr = el.getAttribute('points') || ''
            points = convertPolylineToPoints(pointsStr)
            break
          }
          case 'polygon': {
            const pointsStr = el.getAttribute('points') || ''
            points = convertPolylineToPoints(pointsStr)
            isClosed = points.length > 2
            break
          }
          case 'path': {
            const d = el.getAttribute('d')
            if (d) {
              points = convertPathToPoints(d)
              const fill = el.getAttribute('fill')
              // Closed if has Z or has fill (filled shape)
              isClosed = d.toUpperCase().includes('Z') || (!!fill && fill !== 'none')
            }
            break
          }
        }

        if (points.length < 2) {
          console.log(`[Import] Skipping ${el.tagName}: less than 2 points`)
          return
        }

        const attrs = getSvgElementAttributes(el)
        
        // Use fill color as stroke if no stroke (convert filled shape to outline)
        let finalStroke = attrs.stroke
        if ((!el.getAttribute('stroke') || el.getAttribute('stroke') === 'none') && attrs.fill && attrs.fill !== 'none') {
          finalStroke = colorToPalette(attrs.fill)
        }

        const name = attrs.name || `${el.tagName} ${elementIndex + 1}`

        const pointElement: PointElement = {
          id: generateId(),
          type: 'point',
          name,
          visible: true,
          locked: false,
          points: scalePoints(points, scaleFactor),
          stroke: finalStroke,
          strokeWidth: attrs.strokeWidth,
          isClosedShape: isClosed,
        }

        elements.push(pointElement)
        elementIndex++
        console.log(`[Import] Added ${el.tagName}: ${name}, points: ${points.length}, closed: ${isClosed}`)
      })
    }

    console.log('[Import] Complete, elements count:', elements.length)
    return elements
  } catch (error) {
    console.error('[Import] Fatal error:', error)
    return []
  }
}
