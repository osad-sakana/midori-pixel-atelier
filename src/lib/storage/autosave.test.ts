import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  addCostume,
  addSprite,
  createCostume,
  createProject,
  createSprite,
} from '../../domain/factory'
import { clearAutosave, loadAutosave, saveAutosave } from './autosave'
import { createBitmapStore } from '../bitmap/bitmapStore'
import { setPixel } from '../bitmap/draw'
import { createStore, set } from 'idb-keyval'

function build() {
  const sprite = createSprite('s')
  const costume = createCostume({ name: 'c', width: 3, height: 3 })
  const project = addCostume(
    addSprite(createProject('p'), sprite),
    sprite.id,
    costume,
  )
  const store = createBitmapStore()
  const assetId = costume.layers[0]!.assetId
  store.create(assetId, 3, 3)
  store.update(assetId, (b) => setPixel(b, 0, 0, [1, 2, 3, 255]))
  return { project, store, assetId }
}

describe('autosave', () => {
  beforeEach(async () => {
    await clearAutosave()
  })

  it('何も保存されていなければ undefined', async () => {
    expect(await loadAutosave()).toBeUndefined()
  })

  it('保存したものを読み戻せる', async () => {
    const { project, store, assetId } = build()
    await saveAutosave(project, (id) => store.get(id))
    const loaded = await loadAutosave()
    expect(loaded?.project).toEqual(project)
    expect(loaded?.bitmaps.get(assetId)?.data).toEqual(store.get(assetId)?.data)
  })

  it('壊れたデータは無視して undefined', async () => {
    await set(
      'autosave',
      { project: { broken: true }, assets: [] },
      createStore('midori-pic-editor', 'autosave'),
    )
    expect(await loadAutosave()).toBeUndefined()
  })

  it('clear で消える', async () => {
    const { project, store } = build()
    await saveAutosave(project, (id) => store.get(id))
    await clearAutosave()
    expect(await loadAutosave()).toBeUndefined()
  })

  it('画像データが型付き配列でなければ空の画像にする', async () => {
    const { project, store } = build()
    await saveAutosave(project, (id) => store.get(id))
    const store2 = createStore('midori-pic-editor', 'autosave')
    const stored = {
      project,
      assets: [
        {
          assetId: project.sprites[0]!.costumes[0]!.layers[0]!.assetId,
          width: 3,
          height: 3,
          data: new Array(36).fill(7),
        },
      ],
    }
    await set('autosave', stored, store2)
    const loaded = await loadAutosave()
    const bmp = loaded?.bitmaps.values().next().value
    expect(bmp?.data).toBeInstanceOf(Uint8ClampedArray)
    expect(bmp?.data.every((v: number) => v === 0)).toBe(true)
  })
})
