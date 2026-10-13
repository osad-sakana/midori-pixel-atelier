import { describe, expect, it } from 'vitest'
import { parseProject } from '../domain/schema'
import { toSafeName } from '../lib/naming'
import { listAssets } from '../lib/storage/projectArchive'
import { buildTemplate, templatePreviews } from './build'
import { TEMPLATES } from './catalog'
import { decodePixelArt } from './pixelArt'

describe('decodePixelArt', () => {
  it('文字を色に、. を透明にする', () => {
    const bitmap = decodePixelArt(['r.', '.k'], 2, 2)
    expect(Array.from(bitmap.data.slice(0, 4))).toEqual([0xe5, 0x48, 0x4d, 255])
    expect(Array.from(bitmap.data.slice(4, 8))).toEqual([0, 0, 0, 0])
    expect(bitmap.data[(1 * 2 + 1) * 4 + 3]).toBe(255)
  })

  it('大きさや色が合わなければエラーにする', () => {
    expect(() => decodePixelArt(['r'], 2, 1)).toThrow('幅')
    expect(() => decodePixelArt(['rr'], 2, 2)).toThrow('高さ')
    expect(() => decodePixelArt(['?'], 1, 1)).toThrow('未定義')
  })
})

describe('テンプレート一覧', () => {
  it('ID が重複せず、3種類すべてがある', () => {
    const ids = TEMPLATES.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const category of ['blank', 'sample', 'pygame']) {
      expect(TEMPLATES.some((t) => t.category === category)).toBe(true)
    }
  })

  it.each(TEMPLATES.map((t) => [t.id, t] as const))(
    '%s: 検証を通り、画像が全レイヤーにそろう',
    (_id, spec) => {
      const loaded = buildTemplate(spec)
      expect(() => parseProject(loaded.project)).not.toThrow()
      const assets = listAssets(loaded.project)
      expect(assets.length).toBeGreaterThan(0)
      for (const asset of assets) {
        const bitmap = loaded.bitmaps.get(asset.assetId)
        expect(bitmap?.width).toBe(asset.width)
        expect(bitmap?.height).toBe(asset.height)
      }
      expect(templatePreviews(loaded).length).toBeGreaterThan(0)
    },
  )

  it('スプライト名とコスチューム名はそのまま書き出し名に使える', () => {
    for (const spec of TEMPLATES)
      for (const sprite of spec.sprites) {
        expect(toSafeName(sprite.name, '')).toBe(sprite.name)
        for (const costume of sprite.costumes) {
          expect(toSafeName(costume.name, '')).toBe(costume.name)
        }
      }
  })

  it('お手本は絵が描いてあり、まっさらは空', () => {
    const painted = (id: string) => {
      const loaded = buildTemplate(TEMPLATES.find((t) => t.id === id)!)
      return [...loaded.bitmaps.values()].every((b) =>
        b.data.some((v, i) => i % 4 === 3 && v > 0),
      )
    }
    expect(painted('sample-coin')).toBe(true)
    expect(painted('pygame-ready')).toBe(true)
    expect(painted('blank-small')).toBe(false)
  })

  it('呼ぶたびに別の ID のプロジェクトになる', () => {
    const spec = TEMPLATES[0]!
    expect(buildTemplate(spec).project.id).not.toBe(
      buildTemplate(spec).project.id,
    )
  })
})
