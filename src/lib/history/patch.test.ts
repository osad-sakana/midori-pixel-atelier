import { describe, expect, it } from 'vitest'
import { createBitmap, cloneBitmap } from '../bitmap/bitmap'
import { getPixel, setPixel } from '../bitmap/draw'
import { applyPatch, diffBitmaps, patchBytes } from './patch'

describe('diffBitmaps', () => {
  it('変更がなければ null', () => {
    const a = createBitmap(4, 4)
    expect(diffBitmaps('x', a, cloneBitmap(a))).toBeNull()
  })

  it('変更した外接矩形だけを記録する', () => {
    const before = createBitmap(10, 10)
    const after = cloneBitmap(before)
    setPixel(after, 3, 4, [1, 2, 3, 255])
    setPixel(after, 5, 6, [1, 2, 3, 255])
    const patch = diffBitmaps('x', before, after)
    expect(patch).toMatchObject({ kind: 'rect', x: 3, y: 4, width: 3, height: 3 })
    expect(patchBytes(patch!)).toBeLessThan(10 * 10 * 4)
  })

  it('サイズが違えば全体置換になる', () => {
    const patch = diffBitmaps('x', createBitmap(2, 2), createBitmap(3, 3))
    expect(patch?.kind).toBe('full')
  })

  it('作成と削除（null）も全体置換で表す', () => {
    expect(diffBitmaps('x', undefined, createBitmap(2, 2))?.kind).toBe('full')
    expect(diffBitmaps('x', createBitmap(2, 2), undefined)?.kind).toBe('full')
    expect(diffBitmaps('x', undefined, undefined)).toBeNull()
  })
})

describe('applyPatch', () => {
  it('after → before の往復で元に戻る', () => {
    const before = createBitmap(6, 6)
    setPixel(before, 0, 0, [9, 9, 9, 255])
    const after = cloneBitmap(before)
    setPixel(after, 2, 2, [255, 0, 0, 255])
    const patch = diffBitmaps('x', before, after)!

    const work = cloneBitmap(after)
    expect(applyPatch(work, patch, 'before')).toBe(work)
    expect(work.data).toEqual(before.data)
    applyPatch(work, patch, 'after')
    expect(getPixel(work, 2, 2)).toEqual([255, 0, 0, 255])
  })

  it('full パッチは対象の画像を丸ごと返す', () => {
    const next = createBitmap(3, 3)
    const patch = diffBitmaps('x', createBitmap(2, 2), next)!
    expect(applyPatch(createBitmap(2, 2), patch, 'after')?.width).toBe(3)
    expect(applyPatch(createBitmap(3, 3), patch, 'before')?.width).toBe(2)
  })
})
