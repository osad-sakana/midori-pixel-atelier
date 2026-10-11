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
    const project = addSprite(createProject('p'), createSprite('s'))
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
})
