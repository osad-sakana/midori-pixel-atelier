import { createBitmap, type Bitmap } from './bitmap'
import { getPixel, setPixel } from './draw'

export function flipH(src: Bitmap): Bitmap {
  const out = createBitmap(src.width, src.height)
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++)
      setPixel(out, src.width - 1 - x, y, getPixel(src, x, y))
  }
  return out
}

export function flipV(src: Bitmap): Bitmap {
  const out = createBitmap(src.width, src.height)
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++)
      setPixel(out, x, src.height - 1 - y, getPixel(src, x, y))
  }
  return out
}

export function rotate90(src: Bitmap, clockwise: boolean): Bitmap {
  const out = createBitmap(src.height, src.width)
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      const [nx, ny] = clockwise
        ? [src.height - 1 - y, x]
        : [y, src.width - 1 - x]
      setPixel(out, nx, ny, getPixel(src, x, y))
    }
  }
  return out
}

/** 範囲外は透明で埋める */
export function crop(
  src: Bitmap,
  x: number,
  y: number,
  width: number,
  height: number,
): Bitmap {
  const out = createBitmap(width, height)
  for (let cy = 0; cy < height; cy++) {
    for (let cx = 0; cx < width; cx++)
      setPixel(out, cx, cy, getPixel(src, x + cx, y + cy))
  }
  return out
}

export function scaleNearest(
  src: Bitmap,
  width: number,
  height: number,
): Bitmap {
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

/**
 * src を dst の (dx, dy) に重ねる（ストレートアルファの "over" 合成）。dst を直接書き換える。
 * 描画のたびに呼ばれるので、ピクセルごとの配列確保を避けて添字で直接処理する。
 */
export function blit(
  dst: Bitmap,
  src: Bitmap,
  dx: number,
  dy: number,
  opacity = 1,
): void {
  const d = dst.data
  const s = src.data
  for (let y = Math.max(0, -dy); y < src.height && dy + y < dst.height; y++) {
    for (let x = Math.max(0, -dx); x < src.width && dx + x < dst.width; x++) {
      const si = (y * src.width + x) * 4
      const sa = ((s[si + 3] as number) / 255) * opacity
      if (sa <= 0) continue
      const di = ((dy + y) * dst.width + dx + x) * 4
      if (sa >= 1) {
        d[di] = s[si] as number
        d[di + 1] = s[si + 1] as number
        d[di + 2] = s[si + 2] as number
        d[di + 3] = 255
        continue
      }
      const da = (d[di + 3] as number) / 255
      const oa = sa + da * (1 - sa)
      const k = da * (1 - sa)
      d[di] = ((s[si] as number) * sa + (d[di] as number) * k) / oa
      d[di + 1] = ((s[si + 1] as number) * sa + (d[di + 1] as number) * k) / oa
      d[di + 2] = ((s[si + 2] as number) * sa + (d[di + 2] as number) * k) / oa
      d[di + 3] = oa * 255
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
