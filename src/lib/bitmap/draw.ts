import type { Bitmap } from './bitmap'

/**
 * ピクセル単位の描画プリミティブ（アンチエイリアスなし）。
 * 第1引数の Bitmap は呼び出し側が用意した作業用コピー（BitmapStore.update の draft）で、直接書き込む。
 */
export type Rgba = readonly [number, number, number, number]

export type BrushShape = 'square' | 'round'

export type BrushOptions = {
  readonly size: number
  readonly color: Rgba
  readonly shape: BrushShape
  /** true のとき color を無視して透明にする */
  readonly erase?: boolean
}

export type ShapeOptions = {
  readonly size: number
  readonly color: Rgba
  readonly fill: boolean
}

const inBounds = (bmp: Bitmap, x: number, y: number): boolean =>
  x >= 0 && y >= 0 && x < bmp.width && y < bmp.height

export function getPixel(bmp: Bitmap, x: number, y: number): Rgba {
  if (!inBounds(bmp, x, y)) return [0, 0, 0, 0]
  const i = (y * bmp.width + x) * 4
  return [bmp.data[i] ?? 0, bmp.data[i + 1] ?? 0, bmp.data[i + 2] ?? 0, bmp.data[i + 3] ?? 0]
}

export function setPixel(bmp: Bitmap, x: number, y: number, color: Rgba): void {
  if (!inBounds(bmp, x, y)) return
  const i = (y * bmp.width + x) * 4
  bmp.data[i] = color[0]
  bmp.data[i + 1] = color[1]
  bmp.data[i + 2] = color[2]
  bmp.data[i + 3] = color[3]
}

const TRANSPARENT: Rgba = [0, 0, 0, 0]

/** (cx, cy) を中心にブラシを1回押す。偶数サイズは左上寄りになる */
export function stamp(bmp: Bitmap, cx: number, cy: number, brush: BrushOptions): void {
  const size = Math.max(1, Math.floor(brush.size))
  const color = brush.erase ? TRANSPARENT : brush.color
  const start = -Math.floor(size / 2)
  const radius = size / 2
  for (let dy = 0; dy < size; dy++) {
    for (let dx = 0; dx < size; dx++) {
      if (brush.shape === 'round') {
        const ox = dx + 0.5 - radius
        const oy = dy + 0.5 - radius
        if (ox * ox + oy * oy > radius * radius) continue
      }
      setPixel(bmp, cx + start + dx, cy + start + dy, color)
    }
  }
}

/** Bresenham 法。ブラシを線上にスタンプする */
export function drawLine(
  bmp: Bitmap,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  brush: BrushOptions,
): void {
  let x = Math.round(x0)
  let y = Math.round(y0)
  const endX = Math.round(x1)
  const endY = Math.round(y1)
  const dx = Math.abs(endX - x)
  const dy = -Math.abs(endY - y)
  const sx = x < endX ? 1 : -1
  const sy = y < endY ? 1 : -1
  let err = dx + dy
  for (;;) {
    stamp(bmp, x, y, brush)
    if (x === endX && y === endY) break
    const e2 = 2 * err
    if (e2 >= dy) {
      err += dy
      x += sx
    }
    if (e2 <= dx) {
      err += dx
      y += sy
    }
  }
}

const normalize = (a: number, b: number): readonly [number, number] =>
  a <= b ? [Math.round(a), Math.round(b)] : [Math.round(b), Math.round(a)]

export function drawRect(
  bmp: Bitmap,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  opts: ShapeOptions,
): void {
  const [x0, x1] = normalize(ax, bx)
  const [y0, y1] = normalize(ay, by)
  const t = Math.max(1, Math.floor(opts.size))
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const onEdge = x - x0 < t || x1 - x < t || y - y0 < t || y1 - y < t
      if (opts.fill || onEdge) setPixel(bmp, x, y, opts.color)
    }
  }
}

const insideEllipse = (px: number, py: number, rx: number, ry: number): boolean => {
  if (rx <= 0 || ry <= 0) return false
  return (px * px) / (rx * rx) + (py * py) / (ry * ry) <= 1
}

/** 外接矩形に内接する楕円。ピクセル中心で内外判定する */
export function drawEllipse(
  bmp: Bitmap,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  opts: ShapeOptions,
): void {
  const [x0, x1] = normalize(ax, bx)
  const [y0, y1] = normalize(ay, by)
  const rx = (x1 - x0 + 1) / 2
  const ry = (y1 - y0 + 1) / 2
  const cx = x0 + rx
  const cy = y0 + ry
  const t = Math.max(1, Math.floor(opts.size))
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const px = x + 0.5 - cx
      const py = y + 0.5 - cy
      if (!insideEllipse(px, py, rx, ry)) continue
      if (opts.fill || !insideEllipse(px, py, rx - t, ry - t)) {
        setPixel(bmp, x, y, opts.color)
      }
    }
  }
}

const sameColor = (bmp: Bitmap, i: number, c: Rgba): boolean =>
  bmp.data[i] === c[0] &&
  bmp.data[i + 1] === c[1] &&
  bmp.data[i + 2] === c[2] &&
  bmp.data[i + 3] === c[3]

/** 4近傍のスキャンライン塗りつぶし。同色の連結領域を color で置き換える */
export function floodFill(bmp: Bitmap, sx: number, sy: number, color: Rgba): void {
  if (!inBounds(bmp, sx, sy)) return
  const target = getPixel(bmp, sx, sy)
  if (target.every((v, k) => v === color[k])) return

  const { width, height } = bmp
  const stack: number[] = [sx, sy]
  while (stack.length > 0) {
    const y = stack.pop() as number
    const x = stack.pop() as number
    if (!sameColor(bmp, (y * width + x) * 4, target)) continue

    let left = x
    while (left > 0 && sameColor(bmp, (y * width + left - 1) * 4, target)) left--
    let right = x
    while (right < width - 1 && sameColor(bmp, (y * width + right + 1) * 4, target)) right++

    for (let cx = left; cx <= right; cx++) setPixel(bmp, cx, y, color)
    for (const ny of [y - 1, y + 1]) {
      if (ny < 0 || ny >= height) continue
      let inSpan = false
      for (let cx = left; cx <= right; cx++) {
        const match = sameColor(bmp, (ny * width + cx) * 4, target)
        if (match && !inSpan) stack.push(cx, ny)
        inSpan = match
      }
    }
  }
}
