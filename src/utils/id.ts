/**
 * ID Generation Utility
 * 
 * Generates unique identifiers for SVG elements.
 */

/**
 * Generate a unique ID string
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}
