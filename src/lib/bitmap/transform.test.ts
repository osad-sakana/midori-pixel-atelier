import { describe, expect, it } from 'vitest'
import { createBitmap } from './bitmap'
import {
  blit,
  crop,
  flatten,
  flipH,
  flipV,
  rotate90,
  scaleNearest,
} from './transform'
import { getPixel, setPixel, type Rgba } from './draw'

const RED: Rgba = [255, 0, 0, 255]
const BLUE: Rgba = [0, 0, 255, 255]

describe('flip / rotate', () => {
  it('flipH は左右を入れ替える', () => {
    const bmp = createBitmap(3, 2)
    setPixel(bmp, 0, 0, RED)
    const out = flipH(bmp)
    expect(getPixel(out, 2, 0)).toEqual(RED)
    expect(getPixel(bmp, 0, 0)).toEqual(RED)
  })

  it('flipV は上下を入れ替える', () => {
    const bmp = createBitmap(3, 2)
    setPixel(bmp, 0, 0, RED)
    expect(getPixel(flipV(bmp), 0, 1)).toEqual(RED)
  })

  it('rotate90 時計回りで幅と高さが入れ替わる', () => {
    const bmp = createBitmap(3, 2)
    setPixel(bmp, 0, 0, RED)
    const out = rotate90(bmp, true)
    expect([out.width, out.height]).toEqual([2, 3])
    expect(getPixel(out, 1, 0)).toEqual(RED)
  })

  it('rotate90 を時計回り→反時計回りで元に戻る', () => {
    const bmp = createBitmap(3, 2)
    setPixel(bmp, 1, 0, RED)
    setPixel(bmp, 2, 1, BLUE)
    expect(rotate90(rotate90(bmp, true), false).data).toEqual(bmp.data)
  })
})

describe('crop / blit / scale', () => {
  it('crop は範囲外を透明で埋める', () => {
    const bmp = createBitmap(2, 2)
    setPixel(bmp, 1, 1, RED)
    const out = crop(bmp, 1, 1, 2, 2)
    expect(getPixel(out, 0, 0)).toEqual(RED)
    expect(getPixel(out, 1, 1)).toEqual([0, 0, 0, 0])
  })

  it('blit は不透明ピクセルで上書きし、透明は無視する', () => {
    const dst = createBitmap(3, 3)
    setPixel(dst, 1, 1, BLUE)
    const src = createBitmap(2, 2)
    setPixel(src, 0, 0, RED)
    blit(dst, src, 1, 1)
    expect(getPixel(dst, 1, 1)).toEqual(RED)
    expect(getPixel(dst, 2, 2)).toEqual([0, 0, 0, 0])
  })

  it('blit は範囲外にはみ出しても落ちない', () => {
    const dst = createBitmap(2, 2)
    const src = createBitmap(3, 3)
    setPixel(src, 2, 2, RED)
    expect(() => blit(dst, src, -1, -1)).not.toThrow()
    expect(getPixel(dst, 1, 1)).toEqual(RED)
  })

  it('scaleNearest は2倍で 2x2 ブロックになる', () => {
    const bmp = createBitmap(2, 1)
    setPixel(bmp, 0, 0, RED)
    const out = scaleNearest(bmp, 4, 2)
    expect(getPixel(out, 1, 1)).toEqual(RED)
    expect(getPixel(out, 2, 0)).toEqual([0, 0, 0, 0])
  })
})

describe('flatten', () => {
  it('非表示レイヤーは除外する', () => {
    const a = createBitmap(1, 1)
    setPixel(a, 0, 0, RED)
    const out = flatten(1, 1, [{ bitmap: a, opacity: 1, visible: false }])
    expect(getPixel(out, 0, 0)).toEqual([0, 0, 0, 0])
  })

  it('上のレイヤーが下を覆う', () => {
    const a = createBitmap(1, 1)
    const b = createBitmap(1, 1)
    setPixel(a, 0, 0, RED)
    setPixel(b, 0, 0, BLUE)
    const out = flatten(1, 1, [
      { bitmap: a, opacity: 1, visible: true },
      { bitmap: b, opacity: 1, visible: true },
    ])
    expect(getPixel(out, 0, 0)).toEqual(BLUE)
  })

  it('不透明度 0.5 は半透明で乗る', () => {
    const a = createBitmap(1, 1)
    setPixel(a, 0, 0, RED)
    const out = flatten(1, 1, [{ bitmap: a, opacity: 0.5, visible: true }])
    const [r, , , alpha] = getPixel(out, 0, 0)
    expect(r).toBe(255)
    expect(alpha).toBeGreaterThan(120)
    expect(alpha).toBeLessThan(135)
  })

  it('半透明の上に不透明を重ねても色が崩れない', () => {
    const a = createBitmap(1, 1)
    setPixel(a, 0, 0, [0, 255, 0, 128])
    const b = createBitmap(1, 1)
    const out = flatten(1, 1, [
      { bitmap: a, opacity: 1, visible: true },
      { bitmap: b, opacity: 1, visible: true },
    ])
    expect(getPixel(out, 0, 0)).toEqual([0, 255, 0, 128])
  })
})
