import { describe, expect, it } from 'vitest'
import { createBitmap } from './bitmap'
import {
  drawEllipse,
  drawLine,
  drawRect,
  floodFill,
  getPixel,
  stamp,
  type Rgba,
} from './draw'

const RED: Rgba = [255, 0, 0, 255]
const BLUE: Rgba = [0, 0, 255, 255]
const CLEAR: Rgba = [0, 0, 0, 0]

const countOpaque = (bmp: ReturnType<typeof createBitmap>): number => {
  let n = 0
  for (let i = 3; i < bmp.data.length; i += 4) if (bmp.data[i] !== 0) n++
  return n
}

describe('stamp', () => {
  it('size=1 で1ピクセル塗る', () => {
    const bmp = createBitmap(5, 5)
    stamp(bmp, 2, 2, { size: 1, color: RED, shape: 'square' })
    expect(getPixel(bmp, 2, 2)).toEqual(RED)
    expect(countOpaque(bmp)).toBe(1)
  })

  it('size=3 の四角ブラシは 3x3', () => {
    const bmp = createBitmap(7, 7)
    stamp(bmp, 3, 3, { size: 3, color: RED, shape: 'square' })
    expect(countOpaque(bmp)).toBe(9)
  })

  it('丸ブラシは四角より少ない', () => {
    const bmp = createBitmap(15, 15)
    stamp(bmp, 7, 7, { size: 9, color: RED, shape: 'round' })
    expect(countOpaque(bmp)).toBeGreaterThan(40)
    expect(countOpaque(bmp)).toBeLessThan(81)
  })

  it('画像の外側は無視して落ちない', () => {
    const bmp = createBitmap(3, 3)
    stamp(bmp, -5, 10, { size: 3, color: RED, shape: 'square' })
    expect(countOpaque(bmp)).toBe(0)
  })

  it('erase は透明にする', () => {
    const bmp = createBitmap(3, 3)
    stamp(bmp, 1, 1, { size: 1, color: RED, shape: 'square' })
    stamp(bmp, 1, 1, { size: 1, color: CLEAR, shape: 'square', erase: true })
    expect(getPixel(bmp, 1, 1)).toEqual(CLEAR)
  })
})

describe('drawLine', () => {
  it('水平線は端点を含む', () => {
    const bmp = createBitmap(10, 3)
    drawLine(bmp, 1, 1, 6, 1, { size: 1, color: RED, shape: 'square' })
    expect(countOpaque(bmp)).toBe(6)
    expect(getPixel(bmp, 1, 1)).toEqual(RED)
    expect(getPixel(bmp, 6, 1)).toEqual(RED)
  })

  it('斜め線は隙間なく繋がる', () => {
    const bmp = createBitmap(10, 10)
    drawLine(bmp, 0, 0, 9, 9, { size: 1, color: RED, shape: 'square' })
    for (let i = 0; i < 10; i++) expect(getPixel(bmp, i, i)).toEqual(RED)
  })

  it('始点と終点が同じなら1点', () => {
    const bmp = createBitmap(4, 4)
    drawLine(bmp, 2, 2, 2, 2, { size: 1, color: RED, shape: 'square' })
    expect(countOpaque(bmp)).toBe(1)
  })
})

describe('drawRect', () => {
  it('塗りつぶし矩形は面積ぶん', () => {
    const bmp = createBitmap(10, 10)
    drawRect(bmp, 2, 2, 5, 4, { size: 1, color: RED, fill: true })
    expect(countOpaque(bmp)).toBe(4 * 3)
  })

  it('枠線は内側が空く', () => {
    const bmp = createBitmap(10, 10)
    drawRect(bmp, 1, 1, 6, 6, { size: 1, color: RED, fill: false })
    expect(getPixel(bmp, 3, 3)).toEqual(CLEAR)
    expect(getPixel(bmp, 1, 3)).toEqual(RED)
    expect(countOpaque(bmp)).toBe(6 * 4 - 4)
  })

  it('始点と終点の大小が逆でも同じ結果', () => {
    const a = createBitmap(8, 8)
    const b = createBitmap(8, 8)
    drawRect(a, 1, 1, 5, 4, { size: 1, color: RED, fill: true })
    drawRect(b, 5, 4, 1, 1, { size: 1, color: RED, fill: true })
    expect(a.data).toEqual(b.data)
  })
})

describe('drawEllipse', () => {
  it('塗りつぶしは中心を塗り、角は塗らない', () => {
    const bmp = createBitmap(11, 11)
    drawEllipse(bmp, 0, 0, 10, 10, { size: 1, color: RED, fill: true })
    expect(getPixel(bmp, 5, 5)).toEqual(RED)
    expect(getPixel(bmp, 0, 0)).toEqual(CLEAR)
  })

  it('枠線は中心が空く', () => {
    const bmp = createBitmap(11, 11)
    drawEllipse(bmp, 0, 0, 10, 10, { size: 1, color: RED, fill: false })
    expect(getPixel(bmp, 5, 5)).toEqual(CLEAR)
    expect(getPixel(bmp, 5, 0)).toEqual(RED)
    expect(getPixel(bmp, 0, 5)).toEqual(RED)
  })

  it('幅1の楕円でも落ちない', () => {
    const bmp = createBitmap(5, 5)
    drawEllipse(bmp, 2, 0, 2, 4, { size: 1, color: RED, fill: true })
    expect(countOpaque(bmp)).toBeGreaterThan(0)
  })
})

describe('floodFill', () => {
  it('同色で繋がった領域だけ塗る', () => {
    const bmp = createBitmap(5, 5)
    drawRect(bmp, 2, 0, 2, 4, { size: 1, color: BLUE, fill: true })
    floodFill(bmp, 0, 0, RED)
    expect(getPixel(bmp, 1, 4)).toEqual(RED)
    expect(getPixel(bmp, 2, 2)).toEqual(BLUE)
    expect(getPixel(bmp, 3, 0)).toEqual(CLEAR)
  })

  it('同じ色で塗っても無限ループしない', () => {
    const bmp = createBitmap(3, 3)
    floodFill(bmp, 0, 0, CLEAR)
    expect(countOpaque(bmp)).toBe(0)
  })

  it('範囲外クリックは何もしない', () => {
    const bmp = createBitmap(3, 3)
    floodFill(bmp, 9, 9, RED)
    expect(countOpaque(bmp)).toBe(0)
  })

  it('全面を塗れる', () => {
    const bmp = createBitmap(4, 4)
    floodFill(bmp, 1, 1, RED)
    expect(countOpaque(bmp)).toBe(16)
  })
})
