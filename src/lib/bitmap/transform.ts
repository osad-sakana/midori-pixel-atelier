import { createBitmap, type Bitmap } from './bitmap'
import { getPixel, setPixel, type Rgba } from './draw'

export function flipH(src: Bitmap): Bitmap {
  const out = createBitmap(src.width, src.height)
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) setPixel(out, src.width - 1 - x, y, getPixel(src, x, y))
  }
  return out
}

export function flipV(src: Bitmap): Bitmap {
  const out = createBitmap(src.width, src.height)
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) setPixel(out, x, src.height - 1 - y, getPixel(src, x, y))
  }
  return out
}

export function rotate90(src: Bitmap, clockwise: boolean): Bitmap {
  const out = createBitmap(src.height, src.width)
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      const [nx, ny] = clockwise ? [src.height - 1 - y, x] : [y, src.width - 1 - x]
      setPixel(out, nx, ny, getPixel(src, x, y))
    }
  }
  return out
}

/** 範囲外は透明で埋める */
export function crop(src: Bitmap, x: number, y: number, width: number, height: number): Bitmap {
  const out = createBitmap(width, height)
  for (let cy = 0; cy < height; cy++) {
    for (let cx = 0; cx < width; cx++) setPixel(out, cx, cy, getPixel(src, x + cx, y + cy))
  }
  return out
}

export function scaleNearest(src: Bitmap, width: number, height: number): Bitmap {
  const out = createBitmap(width, height)
  for (let y = 0; y < height; y++) {
    const sy = Math.min(src.height - 1, Math.floor((y * src.height) / height))
    for (let x = 0; x < width; x++) {
      const sx = Math.min(src.width - 1, Math.floor((x * src.width) / width))
      setPixel(out, x, y, getPixel(src, sx, sy))
    }
  }
  return out
}

/** ストレートアルファの "over" 合成。dst の (x, y) に src のピクセルを重ねる */
function overPixel(dst: Bitmap, x: number, y: number, src: Rgba, opacity: number): void {
  const sa = (src[3] / 255) * opacity
  if (sa <= 0) return
  const [dr, dg, db, dA] = getPixel(dst, x, y)
  const da = dA / 255
  const oa = sa + da * (1 - sa)
  const mix = (s: number, d: number): number =>
    Math.round((s * sa + d * da * (1 - sa)) / oa)
  setPixel(dst, x, y, [mix(src[0], dr), mix(src[1], dg), mix(src[2], db), Math.round(oa * 255)])
}

/** src を dst の (dx, dy) に重ねる。dst を直接書き換える */
export function blit(dst: Bitmap, src: Bitmap, dx: number, dy: number, opacity = 1): void {
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      overPixel(dst, dx + x, dy + y, getPixel(src, x, y), opacity)
    }
  }
}

export type FlattenLayer = {
  readonly bitmap: Bitmap
  readonly opacity: number
  readonly visible: boolean
}

/** 下 → 上の順のレイヤーを1枚に合成する。非表示は除外 */
export function flatten(
  width: number,
  height: number,
  layers: readonly FlattenLayer[],
): Bitmap {
  const out = createBitmap(width, height)
  for (const layer of layers) {
    if (layer.visible) blit(out, layer.bitmap, 0, 0, layer.opacity)
  }
  return out
}
