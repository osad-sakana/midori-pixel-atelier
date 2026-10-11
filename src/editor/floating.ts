import type { Point } from '../domain/types'
import { cloneBitmap, createBitmap, type Bitmap } from '../lib/bitmap/bitmap'
import {
  drawEllipse,
  drawLine,
  drawRect,
  setPixel,
  type BrushShape,
  type Rgba,
} from '../lib/bitmap/draw'
import { blit, crop } from '../lib/bitmap/transform'

/**
 * 「未確定オブジェクト」。確定するまでレイヤーのビットマップは書き換えず、
 * 位置・大きさ・色などを後から編集できる（ベクターのような編集をピクセルアートで実現する）。
 */
export type ShapeKind = 'line' | 'rect' | 'ellipse'

export type ShapeFloating = {
  readonly kind: 'shape'
  readonly shape: ShapeKind
  readonly start: Point
  readonly end: Point
  readonly color: Rgba
  readonly size: number
  readonly fill: boolean
  readonly brushShape: BrushShape
}

export type Rect = {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

export type SelectionFloating = {
  readonly kind: 'selection'
  /** 切り取り元の範囲 */
  readonly origin: Rect
  readonly pixels: Bitmap
  /** 現在の左上位置 */
  readonly offset: Point
  /** true: 元の場所を消す（移動）、false: 消さない（貼り付け） */
  readonly cut: boolean
}

export type Floating = ShapeFloating | SelectionFloating

export type HandleName = 'start' | 'end'
export type ShapeHit = HandleName | 'body'

export function renderFloating(base: Bitmap, floating: Floating): Bitmap {
  const out = cloneBitmap(base)
  if (floating.kind === 'shape') {
    const { start, end, color, size, fill, brushShape } = floating
    if (floating.shape === 'line') {
      drawLine(out, start.x, start.y, end.x, end.y, {
        size,
        color,
        shape: brushShape,
      })
    } else if (floating.shape === 'rect') {
      drawRect(out, start.x, start.y, end.x, end.y, { size, color, fill })
    } else {
      drawEllipse(out, start.x, start.y, end.x, end.y, { size, color, fill })
    }
    return out
  }

  if (floating.cut) {
    const { origin } = floating
    for (let y = 0; y < origin.height; y++) {
      for (let x = 0; x < origin.width; x++) {
        setPixel(out, origin.x + x, origin.y + y, [0, 0, 0, 0])
      }
    }
  }
  blit(out, floating.pixels, floating.offset.x, floating.offset.y)
  return out
}

export const moveShape = (
  shape: ShapeFloating,
  dx: number,
  dy: number,
): ShapeFloating => ({
  ...shape,
  start: { x: shape.start.x + dx, y: shape.start.y + dy },
  end: { x: shape.end.x + dx, y: shape.end.y + dy },
})

export const moveShapeHandle = (
  shape: ShapeFloating,
  handle: HandleName,
  point: Point,
): ShapeFloating => ({ ...shape, [handle]: point })

export function hitTestShape(
  shape: ShapeFloating,
  point: Point,
  handleRadius: number,
): ShapeHit | null {
  const near = (p: Point): boolean =>
    Math.max(Math.abs(p.x - point.x), Math.abs(p.y - point.y)) <= handleRadius
  if (near(shape.start)) return 'start'
  if (near(shape.end)) return 'end'
  const [x0, x1] = [
    Math.min(shape.start.x, shape.end.x),
    Math.max(shape.start.x, shape.end.x),
  ]
  const [y0, y1] = [
    Math.min(shape.start.y, shape.end.y),
    Math.max(shape.start.y, shape.end.y),
  ]
  return point.x >= x0 && point.x <= x1 && point.y >= y0 && point.y <= y1
    ? 'body'
    : null
}

export function createSelection(base: Bitmap, area: Rect): SelectionFloating {
  return {
    kind: 'selection',
    origin: area,
    pixels: crop(base, area.x, area.y, area.width, area.height),
    offset: { x: area.x, y: area.y },
    cut: true,
  }
}

export const moveSelection = (
  selection: SelectionFloating,
  dx: number,
  dy: number,
): SelectionFloating => ({
  ...selection,
  offset: { x: selection.offset.x + dx, y: selection.offset.y + dy },
})

/** クリップボードの画像を貼り付けた状態の選択を作る */
export function pasteSelection(pixels: Bitmap, at: Point): SelectionFloating {
  return {
    kind: 'selection',
    origin: { x: 0, y: 0, width: 0, height: 0 },
    pixels,
    offset: at,
    cut: false,
  }
}

/** 選択範囲を削除した結果（確定時に使う）。pixels を空にして移動しない選択として描画する */
export function deleteSelection(
  selection: SelectionFloating,
): SelectionFloating {
  return {
    ...selection,
    pixels: createBitmap(selection.pixels.width, selection.pixels.height),
  }
}
