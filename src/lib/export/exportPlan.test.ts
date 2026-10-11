import { describe, expect, it } from 'vitest'
import { createCostume, createSprite } from '../../domain/factory'
import { planSpriteExport } from './exportPlan'

const sprite = (name: string, costumeNames: string[], size = 16) => ({
  ...createSprite(name),
  costumes: costumeNames.map((n) =>
    createCostume({ name: n, width: size, height: size }),
  ),
})

describe('planSpriteExport', () => {
  it('ASCII の安全なファイル名を作る', () => {
    const plan = planSpriteExport(sprite('My Hero', ['idle', 'run']), 0)
    expect(plan.spriteName).toBe('my_hero')
    expect(plan.costumeFiles).toEqual(['my_hero_idle.png', 'my_hero_run.png'])
    expect(plan.sheetFile).toBe('my_hero_sheet.png')
  })

  it('日本語の名前は連番にフォールバックし、重複は連番で区別する', () => {
    const plan = planSpriteExport(
      sprite('プレイヤー', ['歩く', '歩く', 'idle']),
      2,
    )
    expect(plan.spriteName).toBe('sprite3')
    expect(plan.costumeFiles).toEqual([
      'sprite3_costume1.png',
      'sprite3_costume2.png',
      'sprite3_idle.png',
    ])
  })

  it('同名コスチュームでもファイル名が衝突しない', () => {
    const plan = planSpriteExport(sprite('a', ['x', 'x']), 0)
    expect(new Set(plan.costumeFiles).size).toBe(2)
  })

  it('シートのレイアウトを設定から計算する', () => {
    const s = {
      ...sprite('a', ['1', '2', '3', '4', '5']),
      sheet: { columns: 2, padding: 1, fps: 12 },
    }
    const plan = planSpriteExport(s, 0)
    expect(plan.layout.columns).toBe(2)
    expect(plan.layout.rows).toBe(3)
    expect(plan.settings.fps).toBe(12)
  })

  it('コスチュームが無いスプライトはエラー', () => {
    expect(() => planSpriteExport(sprite('a', []), 0)).toThrow()
  })
})
