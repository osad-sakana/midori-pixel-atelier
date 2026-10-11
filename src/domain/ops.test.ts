import { describe, expect, it } from 'vitest'
import {
  addCostume,
  addSprite,
  createCostume,
  createProject,
  createSprite,
} from './factory'
import {
  addLayer,
  findCostume,
  moveItem,
  removeCostume,
  removeLayer,
  removeSprite,
  renameCostume,
  renameSprite,
  setLayerProps,
  setSheetSettings,
  updateCostume,
} from './ops'
import { createRasterLayer } from './factory'

function setup() {
  const sprite = createSprite('player')
  const costume = createCostume({ name: 'c1', width: 8, height: 8 })
  const project = addCostume(
    addSprite(createProject('p'), sprite),
    sprite.id,
    costume,
  )
  return { project, sprite, costume }
}

describe('findCostume', () => {
  it('見つかれば sprite と costume を返す', () => {
    const { project, sprite, costume } = setup()
    expect(findCostume(project, sprite.id, costume.id)?.costume.id).toBe(
      costume.id,
    )
    expect(findCostume(project, sprite.id, 'x')).toBeUndefined()
    expect(findCostume(project, 'x', costume.id)).toBeUndefined()
  })
})

describe('layer ops', () => {
  it('addLayer は一番上に追加する（元は不変）', () => {
    const { project, sprite, costume } = setup()
    const layer = createRasterLayer('L2')
    const next = addLayer(project, sprite.id, costume.id, layer)
    expect(
      findCostume(project, sprite.id, costume.id)?.costume.layers,
    ).toHaveLength(1)
    const layers = findCostume(next, sprite.id, costume.id)?.costume.layers
    expect(layers).toHaveLength(2)
    expect(layers?.[1]?.id).toBe(layer.id)
  })

  it('removeLayer は最後の1枚を消せない', () => {
    const { project, sprite, costume } = setup()
    const only = costume.layers[0]!
    expect(() => removeLayer(project, sprite.id, costume.id, only.id)).toThrow()
  })

  it('removeLayer で消える', () => {
    const { project, sprite, costume } = setup()
    const layer = createRasterLayer('L2')
    const two = addLayer(project, sprite.id, costume.id, layer)
    const one = removeLayer(two, sprite.id, costume.id, layer.id)
    expect(
      findCostume(one, sprite.id, costume.id)?.costume.layers,
    ).toHaveLength(1)
  })

  it('setLayerProps で名前・表示・不透明度を変える', () => {
    const { project, sprite, costume } = setup()
    const id = costume.layers[0]!.id
    const next = setLayerProps(project, sprite.id, costume.id, id, {
      name: 'x',
      visible: false,
      opacity: 0.5,
    })
    const layer = findCostume(next, sprite.id, costume.id)?.costume.layers[0]
    expect(layer).toMatchObject({ name: 'x', visible: false, opacity: 0.5 })
  })

  it('opacity は 0〜1 に丸める', () => {
    const { project, sprite, costume } = setup()
    const id = costume.layers[0]!.id
    const next = setLayerProps(project, sprite.id, costume.id, id, {
      opacity: 3,
    })
    expect(
      findCostume(next, sprite.id, costume.id)?.costume.layers[0]?.opacity,
    ).toBe(1)
  })
})

describe('moveItem', () => {
  it('要素を移動した新しい配列を返す', () => {
    expect(moveItem(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a'])
    expect(moveItem(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b'])
  })

  it('範囲外は変更しない', () => {
    const src = ['a', 'b']
    expect(moveItem(src, 0, 5)).toEqual(['a', 'b'])
    expect(moveItem(src, -1, 0)).toEqual(['a', 'b'])
  })
})

describe('sprite / costume ops', () => {
  it('rename / remove', () => {
    const { project, sprite, costume } = setup()
    expect(renameSprite(project, sprite.id, 'hero').sprites[0]?.name).toBe(
      'hero',
    )
    expect(
      renameCostume(project, sprite.id, costume.id, 'run').sprites[0]
        ?.costumes[0]?.name,
    ).toBe('run')
    expect(
      removeCostume(project, sprite.id, costume.id).sprites[0]?.costumes,
    ).toHaveLength(0)
    expect(removeSprite(project, sprite.id).sprites).toHaveLength(0)
  })

  it('updateCostume は対象だけ変える', () => {
    const { project, sprite, costume } = setup()
    const next = updateCostume(project, sprite.id, costume.id, (c) => ({
      ...c,
      antialias: true,
    }))
    expect(next.sprites[0]?.costumes[0]?.antialias).toBe(true)
    expect(project.sprites[0]?.costumes[0]?.antialias).toBe(false)
  })

  it('setSheetSettings は値を丸めて保存する', () => {
    const { project, sprite } = setup()
    const next = setSheetSettings(project, sprite.id, {
      columns: 0,
      padding: -3,
      fps: 500,
    })
    expect(next.sprites[0]?.sheet).toEqual({ columns: 1, padding: 0, fps: 60 })
    const frac = setSheetSettings(project, sprite.id, {
      columns: 2,
      padding: 0,
      fps: 7.6,
    })
    expect(frac.sprites[0]?.sheet?.fps).toBe(8)
  })
})
