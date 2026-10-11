import { describe, expect, it } from 'vitest'
import {
  addCostume,
  addSprite,
  createCostume,
  createProject,
  createSprite,
} from './factory'
import { CURRENT_SCHEMA_VERSION, parseProject } from './schema'

describe('factory', () => {
  it('createProject は空のスプライト配列と現行スキーマ版を持つ', () => {
    const project = createProject('テスト')
    expect(project.name).toBe('テスト')
    expect(project.schemaVersion).toBe(CURRENT_SCHEMA_VERSION)
    expect(project.sprites).toEqual([])
  })

  it('createCostume は指定サイズで、AAなし・レイヤー1枚を既定にする', () => {
    const costume = createCostume({ name: 'costume1', width: 32, height: 48 })
    expect(costume.width).toBe(32)
    expect(costume.height).toBe(48)
    expect(costume.antialias).toBe(false)
    expect(costume.layers).toHaveLength(1)
    expect(costume.layers[0]?.type).toBe('raster')
  })

  it('createCostume のピボットは中心が既定', () => {
    const costume = createCostume({ name: 'c', width: 32, height: 48 })
    expect(costume.pivot).toEqual({ x: 16, y: 24 })
  })

  it('ID は生成のたびに異なる', () => {
    const a = createSprite('a')
    const b = createSprite('a')
    expect(a.id).not.toBe(b.id)
  })

  it('addSprite / addCostume は元のオブジェクトを変更しない', () => {
    const project = createProject('p')
    const sprite = createSprite('player')
    const next = addSprite(project, sprite)
    expect(project.sprites).toHaveLength(0)
    expect(next.sprites).toHaveLength(1)

    const costume = createCostume({ name: 'c', width: 8, height: 8 })
    const next2 = addCostume(next, sprite.id, costume)
    expect(next.sprites[0]?.costumes).toHaveLength(0)
    expect(next2.sprites[0]?.costumes).toHaveLength(1)
  })

  it('存在しないスプライトへの addCostume はエラー', () => {
    const project = createProject('p')
    const costume = createCostume({ name: 'c', width: 8, height: 8 })
    expect(() => addCostume(project, 'nope', costume)).toThrow()
  })
})

describe('parseProject', () => {
  it('createProject の結果をそのまま検証できる', () => {
    const sprite = createSprite('s')
    const costume = createCostume({ name: 'c', width: 8, height: 8 })
    const project = addCostume(
      addSprite(createProject('p'), sprite),
      sprite.id,
      costume,
    )
    expect(parseProject(project)).toEqual(project)
  })

  it('壊れたデータは拒否する', () => {
    expect(() => parseProject({ foo: 1 })).toThrow()
    expect(() => parseProject(null)).toThrow()
  })

  it('不正なサイズのコスチュームは拒否する', () => {
    const project = createProject('p')
    const bad = {
      ...project,
      sprites: [
        {
          ...createSprite('s'),
          costumes: [
            { ...createCostume({ name: 'c', width: 8, height: 8 }), width: 0 },
          ],
        },
      ],
    }
    expect(() => parseProject(bad)).toThrow()
  })

  it('未来のスキーマ版は拒否する', () => {
    const project = {
      ...createProject('p'),
      schemaVersion: CURRENT_SCHEMA_VERSION + 1,
    }
    expect(() => parseProject(project)).toThrow(/新しい/)
  })

  it('小数の fps は拒否する', () => {
    const sprite = {
      ...createSprite('s'),
      sheet: { columns: 1, padding: 0, fps: 7.5 },
    }
    expect(() =>
      parseProject({ ...createProject('p'), sprites: [sprite] }),
    ).toThrow()
  })

  it('画像の総ピクセル数が上限を超えるプロジェクトは拒否する', () => {
    const costume = createCostume({ name: 'c', width: 4096, height: 4096 })
    const sprites = Array.from({ length: 5 }, (_, i) => ({
      ...createSprite(`s${i}`),
      costumes: [
        {
          ...costume,
          id: `c${i}`,
          layers: [
            costume.layers[0]!,
            ...Array.from({ length: 3 }, (_, j) => ({
              ...costume.layers[0]!,
              id: `l${i}${j}`,
              assetId: `a${i}${j}`,
            })),
          ],
        },
      ],
    }))
    expect(() => parseProject({ ...createProject('p'), sprites })).toThrow(
      /大きすぎ/,
    )
  })

  it('スプライトが0個、またはコスチュームが0個のプロジェクトは拒否する', () => {
    expect(() => parseProject(createProject('p'))).toThrow()
    expect(() =>
      parseProject(addSprite(createProject('p'), createSprite('s'))),
    ).toThrow()
  })
})
