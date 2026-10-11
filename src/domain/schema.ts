import { z } from 'zod'
import { migrateToCurrent } from './migrate'

export const CURRENT_SCHEMA_VERSION = 1

const MAX_COSTUME_SIZE = 4096

const pointSchema = z.object({ x: z.number(), y: z.number() })

const layerSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('raster'),
    id: z.string().min(1),
    name: z.string(),
    visible: z.boolean(),
    locked: z.boolean(),
    opacity: z.number().min(0).max(1),
    assetId: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/),
  }),
])

const costumeSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  width: z.number().int().min(1).max(MAX_COSTUME_SIZE),
  height: z.number().int().min(1).max(MAX_COSTUME_SIZE),
  pivot: pointSchema,
  antialias: z.boolean(),
  layers: z.array(layerSchema).min(1),
})

const sheetSchema = z.object({
  columns: z.number().int().min(1).max(256),
  padding: z.number().int().min(0).max(64),
  fps: z.number().int().min(1).max(60),
})

const spriteSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  costumes: z.array(costumeSchema).min(1),
  sheet: sheetSchema.optional(),
})

/** 画像全体のメモリ上限（RGBA）。悪意ある/壊れたファイルでタブが落ちるのを防ぐ */
export const MAX_TOTAL_PIXELS = 64 * 1024 * 1024

const projectSchema = z
  .object({
    schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
    id: z.string().min(1),
    name: z.string(),
    sprites: z.array(spriteSchema).min(1),
  })
  .refine(
    (project) =>
      project.sprites
        .flatMap((s) => s.costumes)
        .reduce((sum, c) => sum + c.width * c.height * c.layers.length, 0) <=
      MAX_TOTAL_PIXELS,
    { message: 'プロジェクトの画像が大きすぎます（合計 6700万ピクセルまで）' },
  )

/** 外部入力（ファイル/IndexedDB）を、移行 → 検証の順で Project にする */
export function parseProject(input: unknown): z.infer<typeof projectSchema> {
  const migrated = migrateToCurrent(input, CURRENT_SCHEMA_VERSION)
  return projectSchema.parse(migrated)
}
