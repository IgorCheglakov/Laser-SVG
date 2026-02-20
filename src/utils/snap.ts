/**
 * Snap Service
 * 
 * Pure function service for snapping coordinates to grid.
 */

import type { Point } from '@/types-app/index'

/**
 * Snap a point to the nearest grid intersection
 */
export function snapPoint(point: Point, gridSize: number, enabled: boolean): Point {
  if (!enabled || gridSize <= 0) {
    return point
  }
  
  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize,
  }
}

/**
 * Snap a single value to grid
 */
export function snapValue(value: number, gridSize: number, enabled: boolean): number {
  if (!enabled || gridSize <= 0) {
    return value
  }
  
  return Math.round(value / gridSize) * gridSize
}
