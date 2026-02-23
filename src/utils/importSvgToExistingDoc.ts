/**
 * SVG Import Utility for Existing Document
 * 
 * Handles import logic when adding SVG elements to an already opened document.
 * Parses SVG content and converts it to PointElement array.
 * Supports all SVG shapes: line, rect, circle, ellipse, polyline, polygon, path
 * Converts colors to nearest palette color and stroke width to standard 0.25mm
 * Includes cropping and centering logic for imported elements
 */

import type { PointElement, SVGElement, Point } from '@/types-app/index'
import type { VertexType } from '@/types-app/point'
import { generateId } from '@/utils/id'
import { COLOR_PALETTE, DEFAULTS } from '@constants/index'

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
      const hasPrevControlHandle = !isNaN(cmd.values[2]) && !isNaN(cmd.values[3])
      currentPoint = {
        x: cmd.values[4],
        y: cmd.values[5],
        vertexType: hasPrevControlHandle ? 'corner' : 'straight',
        prevControlHandle: hasPrevControlHandle ? {
          x: cmd.values[2],
          y: cmd.values[3],
        } : undefined,
      }
      if (!isNaN(currentPoint.x) && !isNaN(currentPoint.y)) {
        points.push(currentPoint)
      }
    } else if (cmd.command === 'Z') {
      if (points.length > 2 && currentPoint) {
        const first = points[0]
        const last = currentPoint
        
        // Bidirectional linking of control handles for closed shapes
        // Copy first.prevControlHandle to last.nextControlHandle
        if (first.prevControlHandle) {
          last.nextControlHandle = { x: first.prevControlHandle.x, y: first.prevControlHandle.y }
          last.vertexType = 'corner'
        }
        
        // Copy last.nextControlHandle to first.prevControlHandle  
        if (last.nextControlHandle) {
          first.prevControlHandle = { x: last.nextControlHandle.x, y: last.nextControlHandle.y }
          first.vertexType = 'corner'
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

function getSvgDimensions(svg: Element): { width: number; height: number; viewBox: { x: number; y: number; width: number; height: number } | null; unit: string | null; offsetX: number; offsetY: number } {
  // Get viewBox first (preferred)
  const viewBoxAttr = svg.getAttribute('viewBox')
  let viewBox: { x: number; y: number; width: number; height: number } | null = null
  let offsetX = 0
  let offsetY = 0
  
  if (viewBoxAttr) {
    const parts = viewBoxAttr.split(/[\s,]+/).map(Number)
    if (parts.length === 4 && !parts.some(isNaN)) {
      viewBox = { x: parts[0], y: parts[1], width: parts[2], height: parts[3] }
      offsetX = parts[0]
      offsetY = parts[1]
    }
  }
  
  // Get width/height with unit detection
  const widthAttr = svg.getAttribute('width')
  const heightAttr = svg.getAttribute('height')
  
  // Extract unit (mm, px, etc.)
  let unit: string | null = null
  let width = NaN
  let height = NaN
  
  if (widthAttr) {
    const widthMatch = widthAttr.match(/^([\d.]+)\s*(px|mm|cm|in)?$/i)
    if (widthMatch) {
      width = parseFloat(widthMatch[1])
      unit = widthMatch[2] || null
    }
  }
  
  if (heightAttr) {
    const heightMatch = heightAttr.match(/^([\d.]+)\s*(px|mm|cm|in)?$/i)
    if (heightMatch) {
      height = parseFloat(heightMatch[1])
      if (!unit) unit = heightMatch[2] || null
    }
  }
  
  // If no width/height but have viewBox, use viewBox
  if ((isNaN(width) || isNaN(height)) && viewBox) {
    width = viewBox.width
    height = viewBox.height
  }
  
  // Default to 1000 if still not found
  if (isNaN(width)) width = 1000
  if (isNaN(height)) height = 1000
  if (!unit) unit = 'px'
  
  console.log(`[Import] SVG dimensions: ${width}x${height}${unit}, viewBox:`, viewBox, 'offset:', offsetX, offsetY)
  
  return { width, height, viewBox, unit, offsetX, offsetY }
}

const DEFAULT_ARTBOARD_SIZE = 1000

function calculateScaleFactor(svgWidth: number, svgHeight: number, unit: string | null): number {
  // If dimensions are in mm or viewBox is in mm (our app uses mm), no scaling needed
  if (unit === 'mm') {
    console.log(`[Import] Dimensions in mm, no scaling needed`)
    return 1
  }
  
  // For other units (px, cm, in) or no unit, convert to mm
  let svgWidthMm = svgWidth
  let svgHeightMm = svgHeight
  
  if (unit === 'cm') {
    svgWidthMm = svgWidth * 10
    svgHeightMm = svgHeight * 10
  } else if (unit === 'in') {
    svgWidthMm = svgWidth * 25.4
    svgHeightMm = svgHeight * 25.4
  } else {
    // Assume px, convert using DPI
    svgWidthMm = svgWidth * DEFAULTS.PX_TO_MM
    svgHeightMm = svgHeight * DEFAULTS.PX_TO_MM
  }
  
  // Scale to fit within 1000x1000 mm while preserving aspect ratio
  const targetSize = DEFAULT_ARTBOARD_SIZE
  const scaleX = targetSize / svgWidthMm
  const scaleY = targetSize / svgHeightMm
  const scale = Math.min(scaleX, scaleY)
  
  console.log(`[Import] SVG size: ${svgWidth}x${svgHeight}${unit || ''} = ${svgWidthMm.toFixed(2)}x${svgHeightMm.toFixed(2)}mm, scale: ${scale.toFixed(4)}`)
  
  return scale
}

function scalePoints(points: Point[], scaleFactor: number, offsetX: number = 0, offsetY: number = 0): Point[] {
  return points.map(p => {
    const scaled: Point = {
      x: p.x * scaleFactor + offsetX,
      y: p.y * scaleFactor + offsetY,
      vertexType: p.vertexType,
    }
    if (p.prevControlHandle) {
      scaled.prevControlHandle = {
        x: p.prevControlHandle.x * scaleFactor + offsetX,
        y: p.prevControlHandle.y * scaleFactor + offsetY,
      }
    }
    if (p.nextControlHandle) {
      scaled.nextControlHandle = {
        x: p.nextControlHandle.x * scaleFactor + offsetX,
        y: p.nextControlHandle.y * scaleFactor + offsetY,
      }
    }
    return scaled
  })
}

function calculateBounds(points: Point[]): { x: number; y: number; width: number; height: number } {
  if (points.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 }
  }
  
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  
  for (const p of points) {
    minX = Math.min(minX, p.x)
    minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x)
    maxY = Math.max(maxY, p.y)
    
    if (p.prevControlHandle) {
      minX = Math.min(minX, p.prevControlHandle.x)
      minY = Math.min(minY, p.prevControlHandle.y)
      maxX = Math.max(maxX, p.prevControlHandle.x)
      maxY = Math.max(maxY, p.prevControlHandle.y)
    }
    if (p.nextControlHandle) {
      minX = Math.min(minX, p.nextControlHandle.x)
      minY = Math.min(minY, p.nextControlHandle.y)
      maxX = Math.max(maxX, p.nextControlHandle.x)
      maxY = Math.max(maxY, p.nextControlHandle.y)
    }
  }
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

export function cropElementsToBounds(
  elements: SVGElement[],
  artboardWidth: number,
  artboardHeight: number
): SVGElement[] {
  if (elements.length === 0) return elements

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const el of elements) {
    if ('points' in el && el.points) {
      const bounds = calculateBounds(el.points)
      minX = Math.min(minX, bounds.x)
      minY = Math.min(minY, bounds.y)
      maxX = Math.max(maxX, bounds.x + bounds.width)
      maxY = Math.max(maxY, bounds.y + bounds.height)
    }
  }

  if (minX === Infinity) return elements

  const elementsWidth = maxX - minX
  const elementsHeight = maxY - minY

  if (elementsWidth <= artboardWidth && elementsHeight <= artboardHeight) {
    return elements
  }

  const scaleX = artboardWidth / elementsWidth
  const scaleY = artboardHeight / elementsHeight
  const scale = Math.min(scaleX, scaleY, 1)

  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2
  const scaledWidth = elementsWidth * scale
  const scaledHeight = elementsHeight * scale
  const newMinX = centerX - scaledWidth / 2
  const newMinY = centerY - scaledHeight / 2

  return elements.map(el => {
    if ('points' in el && el.points) {
      const newPoints = el.points.map(p => ({
        ...p,
        x: (p.x - minX) * scale + newMinX,
        y: (p.y - minY) * scale + newMinY,
        prevControlHandle: p.prevControlHandle ? {
          x: (p.prevControlHandle.x - minX) * scale + newMinX,
          y: (p.prevControlHandle.y - minY) * scale + newMinY,
        } : undefined,
        nextControlHandle: p.nextControlHandle ? {
          x: (p.nextControlHandle.x - minX) * scale + newMinX,
          y: (p.nextControlHandle.y - minY) * scale + newMinY,
        } : undefined,
      }))
      return { ...el, points: newPoints }
    }
    return el
  })
}

export function centerElements(
  elements: SVGElement[], 
  targetCenterX: number, 
  targetCenterY: number, 
  artboardWidth: number, 
  artboardHeight: number
): SVGElement[] {
  if (elements.length === 0) return elements

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const el of elements) {
    if ('points' in el && el.points) {
      const bounds = calculateBounds(el.points)
      minX = Math.min(minX, bounds.x)
      minY = Math.min(minY, bounds.y)
      maxX = Math.max(maxX, bounds.x + bounds.width)
      maxY = Math.max(maxY, bounds.y + bounds.height)
    }
  }

  if (minX === Infinity) return elements

  const elementsWidth = maxX - minX
  const elementsHeight = maxY - minY

  if (elementsWidth > artboardWidth || elementsHeight > artboardHeight) {
    return elements
  }

  const elementsCenterX = (minX + maxX) / 2
  const elementsCenterY = (minY + maxY) / 2

  const offsetX = targetCenterX - elementsCenterX
  const offsetY = targetCenterY - elementsCenterY

  return elements.map(el => {
    if ('points' in el && el.points) {
      const newPoints = el.points.map(p => ({
        ...p,
        x: p.x + offsetX,
        y: p.y + offsetY,
        prevControlHandle: p.prevControlHandle ? {
          x: p.prevControlHandle.x + offsetX,
          y: p.prevControlHandle.y + offsetY,
        } : undefined,
        nextControlHandle: p.nextControlHandle ? {
          x: p.nextControlHandle.x + offsetX,
          y: p.nextControlHandle.y + offsetY,
        } : undefined,
      }))
      return { ...el, points: newPoints }
    }
    return el
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
    const { width: svgWidth, height: svgHeight, unit, offsetX, offsetY } = getSvgDimensions(svg)
    const scaleFactor = calculateScaleFactor(svgWidth, svgHeight, unit)
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
          points: scalePoints(points, scaleFactor, offsetX, offsetY),
          stroke: finalStroke,
          strokeWidth: attrs.strokeWidth,
          isClosedShape: isClosed,
        }

        const elementBounds = calculateBounds(pointElement.points)
        console.log(`[Import] Element "${name}" position on canvas: x=${elementBounds.x.toFixed(2)}, y=${elementBounds.y.toFixed(2)}, width=${elementBounds.width.toFixed(2)}, height=${elementBounds.height.toFixed(2)}`)

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
