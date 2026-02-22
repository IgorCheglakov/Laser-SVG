/**
 * SVG Import Utility
 * 
 * Parses SVG content and converts it to PointElement array.
 */

import type { PointElement, SVGElement, Point } from '@/types-app/index'
import { generateId } from '@/utils/id'
import { DEFAULTS } from '@constants/index'

interface ParsedCommand {
  command: string
  values: number[]
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
      const values = argsStr.split(/[\s,]+/).filter(v => v).map(Number)
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

    switch (baseCmd) {
      case 'M': {
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
        const newX = isRelative ? x + v[0] : v[0]
        const newY = isRelative ? y + v[1] : v[1]
        absolute.push({ command: 'L', values: [newX, newY] })
        x = newX
        y = newY
        break
      }
      case 'C': {
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

export function importFromSVG(svgContent: string): SVGElement[] {
  console.log('[Import] Starting importFromSVG, content length:', svgContent.length)
  
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

    const elements: SVGElement[] = []
    const paths = svg.querySelectorAll('path')
    console.log('[Import] Found paths:', paths.length)

    paths.forEach((pathEl, index) => {
      console.log(`[Import] Processing path ${index}`)
      const d = pathEl.getAttribute('d')
      if (!d) {
        console.log(`[Import] Path ${index}: no d attribute`)
        return
      }
      console.log(`[Import] Path ${index}: d =`, d.substring(0, 100))

      try {
        const commands = parsePathData(d)
        const absCommands = convertToAbsolute(commands)

        const points: Point[] = []
        let currentPoint: Point | null = null

        for (const cmd of absCommands) {
          if (cmd.command === 'M') {
            currentPoint = { x: cmd.values[0], y: cmd.values[1], vertexType: 'straight' }
            points.push(currentPoint)
          } else if (cmd.command === 'L') {
            currentPoint = { x: cmd.values[0], y: cmd.values[1], vertexType: 'straight' }
            points.push(currentPoint)
          } else if (cmd.command === 'C') {
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
            points.push(currentPoint)
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

        console.log(`[Import] Path ${index}: points count:`, points.length)

        if (points.length < 2) {
          console.log(`[Import] Path ${index}: less than 2 points, skipping`)
          return
        }

        const isClosed = d.toUpperCase().includes('Z')
        const stroke = pathEl.getAttribute('stroke') || '#000000'
        const strokeWidth = parseFloat(pathEl.getAttribute('stroke-width') || '') || DEFAULTS.STROKE_WIDTH
        const name = pathEl.getAttribute('data-name') || pathEl.getAttribute('id') || `Path ${index + 1}`

        const pointElement: PointElement = {
          id: generateId(),
          type: 'point',
          name,
          visible: true,
          locked: false,
          points,
          stroke,
          strokeWidth,
          isClosedShape: isClosed,
        }

        elements.push(pointElement)
        console.log(`[Import] Path ${index}: added to elements`)
      } catch (err) {
        console.error(`[Import] Error processing path ${index}:`, err)
      }
    })

    console.log('[Import] Complete, elements count:', elements.length)
    return elements
  } catch (error) {
    console.error('[Import] Fatal error:', error)
    return []
  }
}
