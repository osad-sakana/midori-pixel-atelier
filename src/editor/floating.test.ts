import { describe, expect, it } from 'vitest'
import { createBitmap } from '../lib/bitmap/bitmap'
import { getPixel, setPixel, type Rgba } from '../lib/bitmap/draw'
import {
  createSelection,
  hitTestShape,
  moveSelection,
  moveShape,
  moveShapeHandle,
  renderFloating,
  type ShapeFloating,
} from './floating'

const RED: Rgba = [255, 0, 0, 255]
const BLUE: Rgba = [0, 0, 255, 255]

const rect = (over: Partial<ShapeFloating> = {}): ShapeFloating => ({
  kind: 'shape',
  shape: 'rect',
  start: { x: 2, y: 2 },
  end: { x: 5, y: 5 },
  color: RED,
  size: 1,
  fill: true,
  brushShape: 'square',
  ...over,
})

describe('renderFloating (shape)', () => {
  it('元の画像を変更せず、図形を描いた複製を返す', () => {
    const base = createBitmap(8, 8)
    const out = renderFloating(base, rect())
    expect(getPixel(base, 3, 3)).toEqual([0, 0, 0, 0])
    expect(getPixel(out, 3, 3)).toEqual(RED)
  })

  it('line / ellipse も描ける', () => {
    const base = createBitmap(8, 8)
    expect(
      getPixel(renderFloating(base, rect({ shape: 'line' })), 2, 2),
    ).toEqual(RED)
    expect(
      getPixel(renderFloating(base, rect({ shape: 'ellipse' })), 3, 3),
    ).toEqual(RED)
  })
})

describe('shape editing', () => {
  it('moveShape は両端を同じだけ動かす', () => {
    const moved = moveShape(rect(), 2, 1)
    expect(moved.start).toEqual({ x: 4, y: 3 })
    expect(moved.end).toEqual({ x: 7, y: 6 })
  })

  it('moveShapeHandle は片端だけ動かす', () => {
    const moved = moveShapeHandle(rect(), 'end', { x: 7, y: 7 })
    expect(moved.start).toEqual({ x: 2, y: 2 })
    expect(moved.end).toEqual({ x: 7, y: 7 })
  })

  it('hitTestShape はハンドル → 本体 → なし の順に判定する', () => {
    const shape = rect()
    expect(hitTestShape(shape, { x: 2, y: 2 }, 1)).toBe('start')
    expect(hitTestShape(shape, { x: 5, y: 5 }, 1)).toBe('end')
    expect(hitTestShape(shape, { x: 3, y: 4 }, 1)).toBe('body')
    expect(hitTestShape(shape, { x: 20, y: 20 }, 1)).toBeNull()
  })

  it('ハンドル判定の半径は引数で変えられる', () => {
    expect(hitTestShape(rect(), { x: 4, y: 2 }, 1)).toBe('body')
    expect(hitTestShape(rect(), { x: 4, y: 2 }, 3)).toBe('start')
  })
})

describe('selection', () => {
  it('選択範囲のピクセルを持ち上げ、動かさなければ元の見た目のまま', () => {
    const base = createBitmap(8, 8)
    setPixel(base, 2, 2, RED)
    const sel = createSelection(base, { x: 1, y: 1, width: 3, height: 3 })
    expect(getPixel(sel.pixels, 1, 1)).toEqual(RED)
    expect(renderFloating(base, sel).data).toEqual(base.data)
  })

  it('移動すると新しい位置に現れる', () => {
    const base = createBitmap(8, 8)
    setPixel(base, 2, 2, RED)
    const sel = moveSelection(
      createSelection(base, { x: 1, y: 1, width: 3, height: 3 }),
      3,
      2,
    )
    const out = renderFloating(base, sel)
    expect(getPixel(out, 5, 4)).toEqual(RED)
    expect(getPixel(out, 2, 2)).toEqual([0, 0, 0, 0])
  })

  it('範囲が画像からはみ出していても切り取れる', () => {
    const base = createBitmap(4, 4)
    const sel = createSelection(base, { x: -2, y: -2, width: 4, height: 4 })
    expect(sel.pixels.width).toBe(4)
  })

  it('cut=false（貼り付け）は元の場所を消さない', () => {
    const base = createBitmap(8, 8)
    setPixel(base, 0, 0, BLUE)
    const pasted = {
      ...createSelection(createBitmap(2, 2), {
        x: 0,
        y: 0,
        width: 2,
        height: 2,
      }),
      cut: false,
    }
    expect(getPixel(renderFloating(base, pasted), 0, 0)).toEqual(BLUE)
  })
})
