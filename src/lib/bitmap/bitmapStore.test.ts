import { describe, expect, it, vi } from 'vitest'
import { createBitmap } from './bitmap'
import { createBitmapStore } from './bitmapStore'

describe('createBitmap', () => {
  it('透明な RGBA バッファを作る', () => {
    const bmp = createBitmap(4, 3)
    expect(bmp.width).toBe(4)
    expect(bmp.height).toBe(3)
    expect(bmp.data).toHaveLength(4 * 3 * 4)
    expect(bmp.data.every((v) => v === 0)).toBe(true)
  })

  it('不正なサイズはエラー', () => {
    expect(() => createBitmap(0, 3)).toThrow()
    expect(() => createBitmap(2.5, 3)).toThrow()
  })
})

describe('BitmapStore', () => {
  it('create した画像を get で取得できる', () => {
    const store = createBitmapStore()
    store.create('a', 2, 2)
    expect(store.get('a')?.width).toBe(2)
    expect(store.get('missing')).toBeUndefined()
  })

  it('update は元のバッファを変更せず、新しい画像に差し替える', () => {
    const store = createBitmapStore()
    store.create('a', 2, 2)
    const before = store.get('a')
    store.update('a', (bmp) => {
      bmp.data[0] = 255
    })
    const after = store.get('a')
    expect(before?.data[0]).toBe(0)
    expect(after?.data[0]).toBe(255)
    expect(after).not.toBe(before)
  })

  it('update のたびに revision が増える', () => {
    const store = createBitmapStore()
    store.create('a', 1, 1)
    const r0 = store.revision('a')
    store.update('a', () => {})
    expect(store.revision('a')).toBe(r0 + 1)
  })

  it('存在しない assetId の update はエラー', () => {
    const store = createBitmapStore()
    expect(() => store.update('nope', () => {})).toThrow()
  })

  it('変更を購読でき、解除もできる', () => {
    const store = createBitmapStore()
    const listener = vi.fn()
    const unsubscribe = store.subscribe(listener)
    store.create('a', 1, 1)
    store.update('a', () => {})
    expect(listener).toHaveBeenCalledTimes(2)
    unsubscribe()
    store.delete('a')
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('delete で取り除ける', () => {
    const store = createBitmapStore()
    store.create('a', 1, 1)
    store.delete('a')
    expect(store.get('a')).toBeUndefined()
  })

  it('replace は渡した画像をそのまま登録し、revision を進める', () => {
    const store = createBitmapStore()
    const bmp = createBitmap(2, 2)
    store.replace('a', bmp)
    expect(store.get('a')).toBe(bmp)
    const r = store.revision('a')
    store.replace('a', createBitmap(3, 3))
    expect(store.revision('a')).toBe(r + 1)
    expect(store.get('a')?.width).toBe(3)
  })

  it('clear で全部消える', () => {
    const store = createBitmapStore()
    store.create('a', 1, 1)
    store.create('b', 1, 1)
    store.clear()
    expect(store.get('a')).toBeUndefined()
    expect(store.get('b')).toBeUndefined()
  })

  it('存在しない assetId の revision は -1', () => {
    expect(createBitmapStore().revision('nope')).toBe(-1)
  })
})
