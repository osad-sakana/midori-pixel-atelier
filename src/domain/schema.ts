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
    assetId: z.string().min(1),
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

const spriteSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  costumes: z.array(costumeSchema),
})

const projectSchema = z.object({
  schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
  id: z.string().min(1),
  name: z.string(),
  sprites: z.array(spriteSchema),
})

/** 外部入力（ファイル/IndexedDB）を、移行 → 検証の順で Project にする */
export function parseProject(input: unknown): z.infer<typeof projectSchema> {
  const migrated = migrateToCurrent(input, CURRENT_SCHEMA_VERSION)
  return projectSchema.parse(migrated)
}
