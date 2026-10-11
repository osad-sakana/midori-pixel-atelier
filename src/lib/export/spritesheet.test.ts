import { describe, expect, it } from 'vitest'
import { createBitmap } from '../bitmap/bitmap'
import { getPixel, setPixel, type Rgba } from '../bitmap/draw'
import { computeSheetLayout, renderSheet, sliceSheet } from './spritesheet'

const RED: Rgba = [255, 0, 0, 255]
const BLUE: Rgba = [0, 0, 255, 255]

const costume = (w: number, h: number) => ({
  width: w,
  height: h,
  pivot: { x: w / 2, y: h / 2 },
})

describe('computeSheetLayout', () => {
  it('同サイズなら列数で折り返す', () => {
    const layout = computeSheetLayout(
      [costume(16, 16), costume(16, 16), costume(16, 16)],
      { columns: 2, padding: 0, fps: 8 },
    )
    expect(layout.frameWidth).toBe(16)
    expect(layout.columns).toBe(2)
    expect(layout.rows).toBe(2)
    expect([layout.sheetWidth, layout.sheetHeight]).toEqual([32, 32])
    expect(layout.frames[2]).toMatchObject({ x: 0, y: 16 })
  })

  it('列数はフレーム数を超えない', () => {
    const layout = computeSheetLayout([costume(8, 8), costume(8, 8)], {
      columns: 10,
      padding: 0,
      fps: 8,
    })
    expect(layout.columns).toBe(2)
    expect(layout.rows).toBe(1)
  })

  it('padding は枠の間だけに入る', () => {
    const layout = computeSheetLayout([costume(8, 8), costume(8, 8)], {
      columns: 2,
      padding: 2,
      fps: 8,
    })
    expect(layout.sheetWidth).toBe(18)
    expect(layout.frames[1]?.x).toBe(10)
  })

  it('サイズが違うコスチュームは最大サイズに揃えて中央寄せ', () => {
    const layout = computeSheetLayout([costume(16, 16), costume(8, 8)], {
      columns: 2,
      padding: 0,
      fps: 8,
    })
    expect([layout.frameWidth, layout.frameHeight]).toEqual([16, 16])
    expect([layout.frames[1]?.offsetX, layout.frames[1]?.offsetY]).toEqual([
      4, 4,
    ])
  })

  it('コスチュームが0個ならエラー', () => {
    expect(() =>
      computeSheetLayout([], { columns: 1, padding: 0, fps: 8 }),
    ).toThrow()
  })
})

describe('renderSheet / sliceSheet', () => {
  it('レイアウト通りに並べ、切り出すと元に戻る', () => {
    const a = createBitmap(4, 4)
    const b = createBitmap(4, 4)
    setPixel(a, 1, 1, RED)
    setPixel(b, 2, 2, BLUE)
    const layout = computeSheetLayout([costume(4, 4), costume(4, 4)], {
      columns: 2,
      padding: 1,
      fps: 8,
    })
    const sheet = renderSheet([a, b], layout)
    expect(getPixel(sheet, 1, 1)).toEqual(RED)
    expect(getPixel(sheet, 5 + 2, 2)).toEqual(BLUE)

    const frames = sliceSheet(sheet, 4, 4, 1)
    expect(frames).toHaveLength(2)
    expect(frames[0]?.data).toEqual(a.data)
    expect(frames[1]?.data).toEqual(b.data)
  })

  it('sliceSheet は末尾の空フレームを捨てる', () => {
    const sheet = createBitmap(8, 4)
    setPixel(sheet, 0, 0, RED)
    expect(sliceSheet(sheet, 4, 4, 0)).toHaveLength(1)
  })

  it('sliceSheet は全部空でも1枚は返す', () => {
    expect(sliceSheet(createBitmap(8, 4), 4, 4, 0)).toHaveLength(1)
  })

  it('セルが画像より大きければエラー', () => {
    expect(() => sliceSheet(createBitmap(4, 4), 8, 8, 0)).toThrow()
  })
})
