import { createCostume, createProject, createSprite } from '../domain/factory'
import type { Costume, Sprite } from '../domain/types'
import { createBitmap, type Bitmap } from '../lib/bitmap/bitmap'
import type { LoadedProject } from '../lib/storage/projectArchive'
import { decodePixelArt } from './pixelArt'
import type { SpriteSpec, TemplateSpec } from './types'

type BuiltSprite = {
  readonly sprite: Sprite
  readonly bitmaps: readonly (readonly [string, Bitmap])[]
}

function buildSprite(spec: SpriteSpec): BuiltSprite {
  const { name, width, height } = spec
  const parts = spec.costumes.map((costumeSpec) => {
    const costume: Costume = createCostume({
      name: costumeSpec.name,
      width,
      height,
    })
    const bitmap = costumeSpec.rows
      ? decodePixelArt(costumeSpec.rows, width, height)
      : createBitmap(width, height)
    return { costume, entry: [costume.layers[0]!.assetId, bitmap] as const }
  })
  return {
    sprite: {
      ...createSprite(name),
      costumes: parts.map((p) => p.costume),
      ...(spec.sheet ? { sheet: spec.sheet } : {}),
    },
    bitmaps: parts.map((p) => p.entry),
  }
}

/** テンプレートの設計図から、新しいプロジェクトと画像を作る（呼ぶたびに新しい ID になる） */
export function buildTemplate(spec: TemplateSpec): LoadedProject {
  const built = spec.sprites.map(buildSprite)
  return {
    project: {
      ...createProject(spec.title),
      sprites: built.map((b) => b.sprite),
    },
    bitmaps: new Map(built.flatMap((b) => b.bitmaps)),
  }
}

/** 一覧に出すサムネイル。スプライトごとに最初のコスチューム（最大4つ） */
export function templatePreviews(loaded: LoadedProject): Bitmap[] {
  return loaded.project.sprites.slice(0, 4).flatMap((sprite) => {
    const assetId = sprite.costumes[0]?.layers[0]?.assetId
    const bitmap = assetId ? loaded.bitmaps.get(assetId) : undefined
    return bitmap ? [bitmap] : []
  })
}
