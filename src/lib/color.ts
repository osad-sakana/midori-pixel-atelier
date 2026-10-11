import type { Rgba } from './bitmap/draw'

export function hexToRgba(hex: string): Rgba {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex)
  if (!m) return [0, 0, 0, 255]
  const n = parseInt(m[1] as string, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255]
}

export function rgbaToHex([r, g, b]: Rgba): string {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`
}
