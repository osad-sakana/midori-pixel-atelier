import { describe, expect, it } from 'vitest'
import { createCostume, createSprite } from '../../domain/factory'
import { planSpriteExport } from './exportPlan'
import { buildPygameExample, exampleFileName } from './pygameExample'

const plan = (size: number, count: number, sheet?: object) =>
  planSpriteExport(
    {
      ...createSprite('hero'),
      costumes: Array.from({ length: count }, (_, i) =>
        createCostume({ name: `walk_${i + 1}`, width: size, height: size }),
      ),
      ...(sheet ? { sheet: sheet as never } : {}),
    },
    0,
  )

describe('buildPygameExample', () => {
  it('シート画像・コマの位置・速さをコードに埋め込む', () => {
    const code = buildPygameExample(
      plan(16, 3, { columns: 2, padding: 1, fps: 5 }),
    )
    expect(code).toContain('SHEET_FILE = "hero_sheet.png"')
    expect(code).toContain('FRAME_W = 16')
    expect(code).toContain('FRAMES = [(0, 0), (17, 0), (0, 17)]')
    expect(code).toContain('FPS = 5')
  })

  it('小さい絵は大きく、大きい絵は等倍近くで表示する', () => {
    expect(buildPygameExample(plan(16, 1))).toContain('SCALE = 6')
    expect(buildPygameExample(plan(32, 1))).toContain('SCALE = 3')
    expect(buildPygameExample(plan(200, 1))).toContain('SCALE = 1')
    expect(buildPygameExample(plan(4, 1))).toContain('SCALE = 8')
  })

  it('ファイル名は書き出し名に合わせる', () => {
    expect(exampleFileName(plan(16, 1))).toBe('hero_example.py')
  })
})
