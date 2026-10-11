import { describe, expect, it } from 'vitest'
import { readPngSize } from './pngHeader'

const png = (width: number, height: number): Uint8Array => {
  const bytes = new Uint8Array(33)
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10])
  bytes.set([0, 0, 0, 13, 73, 72, 68, 82], 8)
  const view = new DataView(bytes.buffer)
  view.setUint32(16, width)
  view.setUint32(20, height)
  return bytes
}

describe('readPngSize', () => {
  it('IHDR から幅と高さを読む', () => {
    expect(readPngSize(png(30000, 20))).toEqual({ width: 30000, height: 20 })
  })

  it('PNG 以外は undefined', () => {
    expect(readPngSize(new Uint8Array([1, 2, 3]))).toBeUndefined()
    expect(readPngSize(new Uint8Array(40))).toBeUndefined()
  })

  it('短すぎるデータでも落ちない', () => {
    expect(readPngSize(new Uint8Array(10))).toBeUndefined()
  })
})
