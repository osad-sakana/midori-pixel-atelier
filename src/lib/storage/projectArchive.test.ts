import { strToU8, unzipSync, zipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import {
  addCostume,
  addSprite,
  createCostume,
  createProject,
  createSprite,
} from '../../domain/factory'
import { createBitmap, type Bitmap } from '../bitmap/bitmap'
import { setPixel } from '../bitmap/draw'
import { createBitmapStore } from '../bitmap/bitmapStore'
import {
  exportProjectZip,
  importProjectZip,
  type PngCodec,
} from './projectArchive'

/** テスト用: PNG の代わりに [w(2byte), h(2byte), ...rgba] で符号化する */
const fakeCodec: PngCodec = {
  async encode(bmp) {
    const out = new Uint8Array(4 + bmp.data.length)
    out.set([
      bmp.width >> 8,
      bmp.width & 255,
      bmp.height >> 8,
      bmp.height & 255,
    ])
    out.set(bmp.data, 4)
    return out
  },
  async decode(bytes): Promise<Bitmap> {
    const width = (bytes[0]! << 8) | bytes[1]!
    const height = (bytes[2]! << 8) | bytes[3]!
    return { width, height, data: new Uint8ClampedArray(bytes.subarray(4)) }
  },
}

function build() {
  const sprite = createSprite('player')
  const costume = createCostume({ name: 'idle', width: 4, height: 4 })
  const project = addCostume(
    addSprite(createProject('テスト'), sprite),
    sprite.id,
    costume,
  )
  const store = createBitmapStore()
  const assetId = costume.layers[0]!.assetId
  store.create(assetId, 4, 4)
  store.update(assetId, (b) => setPixel(b, 1, 2, [10, 20, 30, 255]))
  return { project, store, assetId }
}

describe('project archive', () => {
  it('書き出して読み込むと、構造もピクセルも一致する', async () => {
    const { project, store, assetId } = build()
    const zip = await exportProjectZip(
      project,
      (id) => store.get(id),
      fakeCodec,
    )
    const loaded = await importProjectZip(zip, fakeCodec)
    expect(loaded.project).toEqual(project)
    expect(loaded.bitmaps.get(assetId)?.data).toEqual(store.get(assetId)?.data)
  })

  it('画像データが欠けていたら空の画像で書き出す', async () => {
    const { project, assetId } = build()
    const zip = await exportProjectZip(project, () => undefined, fakeCodec)
    const loaded = await importProjectZip(zip, fakeCodec)
    expect(loaded.bitmaps.get(assetId)?.width).toBe(4)
  })

  it('ZIP でないデータは日本語のエラーにする', async () => {
    await expect(
      importProjectZip(new Uint8Array([1, 2, 3]), fakeCodec),
    ).rejects.toThrow(/ZIP|ファイル/)
  })

  it('project.json が無いとエラー', async () => {
    const zip = zipSync({ 'readme.txt': strToU8('x') })
    await expect(importProjectZip(zip, fakeCodec)).rejects.toThrow(
      /project\.json/,
    )
  })

  it('参照されている画像が無いとエラー', async () => {
    const { project } = build()
    const zip = zipSync({ 'project.json': strToU8(JSON.stringify(project)) })
    await expect(importProjectZip(zip, fakeCodec)).rejects.toThrow(/画像/)
  })

  it('画像サイズがコスチュームと違うとエラー', async () => {
    const { project, assetId } = build()
    const wrong = await fakeCodec.encode(createBitmap(2, 2))
    const zip = zipSync({
      'project.json': strToU8(JSON.stringify(project)),
      [`assets/${assetId}.png`]: wrong,
    })
    await expect(importProjectZip(zip, fakeCodec)).rejects.toThrow(/サイズ/)
  })

  it('壊れた JSON はエラー', async () => {
    const zip = zipSync({ 'project.json': strToU8('{oops') })
    await expect(importProjectZip(zip, fakeCodec)).rejects.toThrow()
  })

  it('assetId にパス区切りが含まれていても書き出し先を壊さない', async () => {
    const { project } = build()
    const evil = {
      ...project,
      sprites: project.sprites.map((s) => ({
        ...s,
        costumes: s.costumes.map((c) => ({
          ...c,
          layers: c.layers.map((l) => ({ ...l, assetId: '../evil' })),
        })),
      })),
    }
    const zip = zipSync({ 'project.json': strToU8(JSON.stringify(evil)) })
    await expect(importProjectZip(zip, fakeCodec)).rejects.toThrow()
  })

  it('project.json と assets 以外のエントリは展開しない', async () => {
    const { project, store, assetId } = build()
    const zip = await exportProjectZip(
      project,
      (id) => store.get(id),
      fakeCodec,
    )
    const entries = unzipSync(zip)
    const withJunk = zipSync({
      ...entries,
      'junk/huge.bin': new Uint8Array(10),
    })
    const loaded = await importProjectZip(withJunk, fakeCodec)
    expect(loaded.bitmaps.has(assetId)).toBe(true)
  })

  it('展開後の合計サイズが上限を超える ZIP は拒否する', async () => {
    const { project, store } = build()
    const zip = await exportProjectZip(
      project,
      (id) => store.get(id),
      fakeCodec,
    )
    await expect(importProjectZip(zip, fakeCodec, 10)).rejects.toThrow(/ZIP/)
  })
})
