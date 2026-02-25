/**
 * SVG Import Utility for Existing Document
 * 
 * Handles import logic when adding SVG elements to an already opened document.
 * Parses SVG content and converts it to PointElement array.
 * Supports all SVG shapes: line, rect, circle, ellipse, polyline, polygon, path
 * Converts colors to nearest palette color and stroke width to standard 0.25mm
 * Includes cropping and centering logic for imported elements
 */

import type { PointElement, SVGElement, GroupElement, Point } from '@/types-app/index'
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

/**
 * Split path data into subpaths (by M command)
 */
function splitPathToSubpaths(d: string): string[] {
  const subpaths: string[] = []
  const commands = d.match(/[MLHVQZCSmlhvqzcs][^MLHVQZCSmlhvqzcs]*/g) || []
  
  let currentSubpath = ''
  for (const cmd of commands) {
    const cmdLetter = cmd[0].toUpperCase()
    if (cmdLetter === 'M' && currentSubpath.length > 0) {
      subpaths.push(currentSubpath.trim())
      currentSubpath = cmd
    } else {
      currentSubpath += cmd
    }
  }
  if (currentSubpath.trim().length > 0) {
    subpaths.push(currentSubpath.trim())
  }
  
  return subpaths
}

function parsePathData(d: string): ParsedCommand[] {
  const commands: ParsedCommand[] = []
  
  // Split by command letters
  const commandRegex = /([MLHVQZCSmlhvqzcs])/g
  const parts = d.split(commandRegex)
  
  let lastCommand = ''
  
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]
    
    // Skip empty parts
    if (!part || !part.trim()) continue
    
    // Check if this part is a command letter
    if (/^[MLHVQZCSmlhvqzcs]$/.test(part)) {
      lastCommand = part
      // Check next part for arguments
      if (i + 1 < parts.length) {
        const nextPart = parts[i + 1]
        if (nextPart && nextPart.trim()) {
          const values = extractNumbers(nextPart)
          if (values.length > 0) {
            const cmdParts = splitValuesByCommand(part, values)
            for (const cmdVal of cmdParts) {
              commands.push({ command: cmdVal.command, values: cmdVal.values })
            }
          }
        } else {
          commands.push({ command: part, values: [] })
        }
      }
    } else if (lastCommand && i > 0) {
      // This part contains numbers without a command - implicit command
      // Skip if the previous iteration was a command (its arguments)
      const prevPart = parts[i - 1]
      if (/^[MLHVQZCSmlhvqzcs]$/.test(prevPart)) {
        continue // The previous command already consumed these numbers
      }
      
      const values = extractNumbers(part)
      if (values.length > 0) {
        const implicitCommand = getImplicitCommand(lastCommand)
        // Split values into multiple commands if needed
        const cmdParts = splitValuesByCommand(implicitCommand, values)
        for (const cmdVal of cmdParts) {
          commands.push({ command: cmdVal.command, values: cmdVal.values })
        }
      }
    }
  }
  
  return commands
}

function splitValuesByCommand(command: string, values: number[]): { command: string; values: number[] }[] {
  const results: { command: string; values: number[] }[] = []
  const baseCommand = command.toUpperCase()
  const isRelative = command === command.toLowerCase()
  
  // Number of values expected per command
  const valuesPerCommand: Record<string, number> = {
    'M': 2, 'm': 2,
    'L': 2, 'l': 2,
    'H': 1, 'h': 1,
    'V': 1, 'v': 1,
    'C': 6, 'c': 6,
    'S': 4, 's': 4,
    'Q': 4, 'q': 4,
    'T': 2, 't': 2,
    'A': 7, 'a': 7,
    'Z': 0, 'z': 0
  }
  
  const perCmd = valuesPerCommand[command] || 2
  
  for (let i = 0; i < values.length; i += perCmd) {
    const cmdValues = values.slice(i, i + perCmd)
    if (cmdValues.length > 0) {
      results.push({ command, values: cmdValues })
    }
  }
  
  return results
}

function extractNumbers(str: string): number[] {
  const numRegex = /-?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/g
  const rawValues = str.match(numRegex) || []
  return rawValues.map(v => Number(v)).filter(n => !isNaN(n))
}

function getImplicitCommand(lastCommand: string): string {
  const upper = lastCommand.toUpperCase()
  const isRelative = lastCommand === lastCommand.toLowerCase()
  
  switch (upper) {
    case 'M':
      return isRelative ? 'l' : 'L'
    case 'L':
    case 'H':
    case 'V':
      return lastCommand
    case 'C':
      return isRelative ? 's' : 'S'
    case 'S':
      return lastCommand
    case 'Q':
      return isRelative ? 't' : 'T'
    case 'T':
      return lastCommand
    case 'A':
      return lastCommand
    case 'Z':
      return 'Z'
    default:
      return lastCommand
  }
}

function convertToAbsolute(commands: ParsedCommand[]): ParsedCommand[] {
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
      case 'H': {
        if (v.length < 1) continue
        const newX = isRelative ? x + v[0] : v[0]
        absolute.push({ command: 'L', values: [newX, y] })
        x = newX
        break
      }
      case 'V': {
        if (v.length < 1) continue
        const newY = isRelative ? y + v[0] : v[0]
        absolute.push({ command: 'L', values: [x, newY] })
        y = newY
        break
      }
      case 'S': {
        // Shorthand smooth cubic Bezier: S x2 y2, x y
        // First control point is reflection of previous control point about the previous curve's end point
        if (v.length < 4) continue
        
        let cp1x: number, cp1y: number
        let cp2x: number, cp2y: number, endX: number, endY: number
        
        // Find previous control point AND end point from last C or S command
        let prevEndX: number | null = null
        let prevEndY: number | null = null
        let prevCp2x: number | null = null
        let prevCp2y: number | null = null
        for (let i = absolute.length - 1; i >= 0; i--) {
          const prevCmd = absolute[i]
          if (prevCmd.command === 'C' && prevCmd.values.length >= 6) {
            prevCp2x = prevCmd.values[2]
            prevCp2y = prevCmd.values[3]
            prevEndX = prevCmd.values[4]
            prevEndY = prevCmd.values[5]
            break
          }
        }
        
        // Reflect previous control point about the previous curve's end point to get first control point
        if (prevCp2x !== null && prevCp2y !== null && prevEndX !== null && prevEndY !== null) {
          cp1x = prevEndX + (prevEndX - prevCp2x)
          cp1y = prevEndY + (prevEndY - prevCp2y)
        } else {
          // If no previous control point, use current point
          cp1x = x
          cp1y = y
        }
        
        if (isRelative) {
          cp2x = x + v[0]
          cp2y = y + v[1]
          endX = x + v[2]
          endY = y + v[3]
        } else {
          cp2x = v[0]
          cp2y = v[1]
          endX = v[2]
          endY = v[3]
        }
        
        absolute.push({ command: 'C', values: [cp1x, cp1y, cp2x, cp2y, endX, endY] })
        x = endX
        y = endY
        break
      }
    }
  }

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
    } else if (cmd.command === 'H') {
      // Horizontal line - only x changes, y stays the same
      if (cmd.values.length < 1 || !currentPoint) continue
      currentPoint = { x: cmd.values[0], y: currentPoint.y, vertexType: 'straight' }
      if (!isNaN(currentPoint.x) && !isNaN(currentPoint.y)) {
        points.push(currentPoint)
      }
    } else if (cmd.command === 'V') {
      // Vertical line - only y changes, x stays the same
      if (cmd.values.length < 1 || !currentPoint) continue
      currentPoint = { x: currentPoint.x, y: cmd.values[0], vertexType: 'straight' }
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

function getSvgDimensions(svg: Element): { width: number; height: number; viewBox: { x: number; y: number; width: number; height: number } | null; unit: string | null; offsetX: number; offsetY: number; displayWidth: number; displayHeight: number } {
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
  
  const widthAttr = svg.getAttribute('width')
  const heightAttr = svg.getAttribute('height')
  
  let unit: string | null = null
  let displayWidth = NaN
  let displayHeight = NaN
  
  if (widthAttr) {
    const widthMatch = widthAttr.match(/^([\d.]+)\s*(px|mm|cm|in)?$/i)
    if (widthMatch) {
      displayWidth = parseFloat(widthMatch[1])
      unit = widthMatch[2] || null
    }
  }
  
  if (heightAttr) {
    const heightMatch = heightAttr.match(/^([\d.]+)\s*(px|mm|cm|in)?$/i)
    if (heightMatch) {
      displayHeight = parseFloat(heightMatch[1])
      if (!unit) unit = heightMatch[2] || null
    }
  }
  
  let width = displayWidth
  let height = displayHeight
  
  if (viewBox) {
    if (isNaN(width)) {
      width = viewBox.width
    }
    if (isNaN(height)) {
      height = viewBox.height
    }
    if (!unit) unit = 'px'
  } else if (isNaN(width) || isNaN(height)) {
    width = 1000
    height = 1000
  }
  
  if (isNaN(width)) width = 1000
  if (isNaN(height)) height = 1000
  if (isNaN(displayWidth)) displayWidth = width
  if (isNaN(displayHeight)) displayHeight = height
  if (!unit) unit = 'px'
  
  console.log(`[Import] SVG: ${width}x${height}${unit || ''} viewBox:`, viewBox, 'display:', displayWidth, displayHeight)
  
  return { width, height, viewBox, unit, offsetX, offsetY, displayWidth, displayHeight }
}

function calculateScaleFactor(displayWidth: number, displayHeight: number, viewBoxWidth: number, viewBoxHeight: number, unit: string | null): number {
  if (viewBoxWidth > 0 && viewBoxHeight > 0 && displayWidth > 0 && displayHeight > 0) {
    const scaleX = displayWidth / viewBoxWidth
    const scaleY = displayHeight / viewBoxHeight
    const calculatedScale = Math.min(scaleX, scaleY)
    
    if (unit === 'mm' || calculatedScale === 1) {
      return 1
    }
    return calculatedScale
  }
  
  if (unit === 'mm') {
    return 1
  }
  
  return 1
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

/**
 * Check if SVG content has isLaserSvgCompatible tag (without full parsing)
 */
export function isSvgLaserCompatible(svgContent: string): boolean {
  return svgContent.includes('isLaserSvgCompatible')
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
    const { width, height, viewBox, offsetX, offsetY, displayWidth, displayHeight } = getSvgDimensions(svg)
    const scaleFactor = calculateScaleFactor(
      displayWidth, 
      displayHeight, 
      viewBox ? viewBox.width : width, 
      viewBox ? viewBox.height : height, 
      viewBox ? null : 'px'
    )

    if (fileTimestamp && isLaserSvgCompatible(svg, fileTimestamp)) {
      console.log('[Import] File is LaserSVG compatible, using fast path')
    }

    const elements: SVGElement[] = []
    const selectors = ['path', 'line', 'rect', 'circle', 'ellipse', 'polyline', 'polygon']
    let elementIndex = 0

    // Helper function to convert an SVG element to PointElement
    const convertElementToPoint = (el: Element): PointElement | PointElement[] | null => {
      let points: Point[] = []
      let isClosed = false
      
      const tagName = el.tagName.toLowerCase()
      
      switch (tagName) {
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
            const subpaths = splitPathToSubpaths(d)
            
            if (subpaths.length > 1) {
              const fill = el.getAttribute('fill')
              let stroke = el.getAttribute('stroke')
              const strokeWidth = parseFloat(el.getAttribute('stroke-width') || '') || STANDARD_STROKE_WIDTH
              if ((!stroke || stroke === 'none') && fill && fill !== 'none') {
                stroke = fill
              }
              if (!stroke || stroke === 'none') {
                stroke = '#000000'
              }
              
              const resultElements: PointElement[] = []
              for (let idx = 0; idx < subpaths.length; idx++) {
                const subpath = subpaths[idx]
                const subPoints = convertPathToPoints(subpath)
                if (subPoints.length < 2) continue
                
                const scaledPoints = subPoints.map(p => ({
                  x: (p.x - offsetX) * scaleFactor,
                  y: (p.y - offsetY) * scaleFactor,
                  vertexType: p.vertexType,
                  prevControlHandle: p.prevControlHandle ? {
                    x: (p.prevControlHandle.x - offsetX) * scaleFactor,
                    y: (p.prevControlHandle.y - offsetY) * scaleFactor,
                  } : undefined,
                  nextControlHandle: p.nextControlHandle ? {
                    x: (p.nextControlHandle.x - offsetX) * scaleFactor,
                    y: (p.nextControlHandle.y - offsetY) * scaleFactor,
                  } : undefined,
                }))
                
                resultElements.push({
                  id: el.getAttribute('id') ? `${el.getAttribute('id')}_${idx}` : generateId(),
                  type: 'point',
                  name: `${el.getAttribute('data-name') || el.getAttribute('id') || 'path'} ${idx + 1}`,
                  visible: true,
                  locked: false,
                  points: scaledPoints,
                  stroke: colorToPalette(stroke),
                  strokeWidth,
                  isClosedShape: true,
                })
              }
              
              if (resultElements.length === 0) return null
              return resultElements
            } else {
              points = convertPathToPoints(d)
              const fill = el.getAttribute('fill')
              isClosed = d.toUpperCase().includes('Z') || (!!fill && fill !== 'none')
            }
          }
          break
        }
        default:
          return null
      }
      
      if (points.length < 2) {
        return null
      }
      
      // Get attributes
      let stroke = el.getAttribute('stroke')
      const strokeWidth = parseFloat(el.getAttribute('stroke-width') || '') || STANDARD_STROKE_WIDTH
      const fill = el.getAttribute('fill')
      
      // Use fill as stroke if no stroke
      if ((!stroke || stroke === 'none') && fill && fill !== 'none') {
        stroke = fill
      }
      if (!stroke || stroke === 'none') {
        stroke = '#000000'
      }
      
      const name = el.getAttribute('data-name') || el.getAttribute('id') || `${tagName} ${elementIndex + 1}`
      
      // Scale points with viewBox offset
      const scaledPoints = points.map(p => ({
        x: (p.x - offsetX) * scaleFactor,
        y: (p.y - offsetY) * scaleFactor,
        vertexType: p.vertexType,
        prevControlHandle: p.prevControlHandle ? {
          x: (p.prevControlHandle.x - offsetX) * scaleFactor,
          y: (p.prevControlHandle.y - offsetY) * scaleFactor,
        } : undefined,
        nextControlHandle: p.nextControlHandle ? {
          x: (p.nextControlHandle.x - offsetX) * scaleFactor,
          y: (p.nextControlHandle.y - offsetY) * scaleFactor,
        } : undefined,
      }))
      
      elementIndex++
      
      return {
        id: el.getAttribute('id') || generateId(),
        type: 'point' as const,
        name,
        visible: true,
        locked: false,
        points: scaledPoints,
        stroke: colorToPalette(stroke),
        strokeWidth,
        isClosedShape: isClosed,
      }
    }

    // Helper function to process elements recursively (including groups)
    const processElements = (els: HTMLCollection | Element[]): SVGElement[] => {
      const result: SVGElement[] = []
      
      Array.from(els).forEach((el: Element) => {
        const tagName = el.tagName.toLowerCase()
        
        if (tagName === 'g') {
          // Process group - recursively get children
          const children = processElements(el.children)
          
          // Only create group if it has children
          if (children.length > 0) {
            const groupEl: GroupElement = {
              id: el.getAttribute('id') || generateId(),
              type: 'group',
              name: el.getAttribute('data-name') || el.getAttribute('id') || `Group ${elementIndex + 1}`,
              visible: true,
              locked: false,
              children,
            }
            result.push(groupEl)
            elementIndex++
          }
        } else if (selectors.includes(tagName)) {
          const pointEl = convertElementToPoint(el)
          if (pointEl) {
            if (Array.isArray(pointEl)) {
              result.push(...pointEl)
            } else {
              result.push(pointEl)
            }
          }
        }
      })
      
      return result
    }

    // Process all elements including groups
    const allElements = processElements(svg.children)
    elements.push(...allElements)

    console.log(`[Import] Complete, elements count: ${elements.length}`)
    return elements
  } catch (error) {
    console.error('[Import] Fatal error:', error)
    return []
  }
}
