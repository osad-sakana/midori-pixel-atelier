import { strFromU8, strToU8, unzipSync, zipSync, type Zippable } from 'fflate'
import { parseProject } from '../../domain/schema'
import type { Project } from '../../domain/types'
import { createBitmap, type Bitmap } from '../bitmap/bitmap'

/** PNG の符号化/復号。ブラウザの Canvas 実装を差し込む（テストでは偽物を使う） */
export type PngCodec = {
  encode(bitmap: Bitmap): Promise<Uint8Array>
  decode(bytes: Uint8Array): Promise<Bitmap>
}

export type LoadedProject = {
  readonly project: Project
  readonly bitmaps: ReadonlyMap<string, Bitmap>
}

const PROJECT_FILE = 'project.json'
const assetPath = (assetId: string): string => `assets/${assetId}.png`
/** 展開後1ファイルの上限（zip bomb 対策） */
const MAX_ENTRY_BYTES = 64 * 1024 * 1024
/** 展開後の合計の上限 */
const MAX_TOTAL_BYTES = 200 * 1024 * 1024
const MAX_ENTRIES = 2000
const ASSET_ENTRY = /^assets\/[A-Za-z0-9_-]{1,64}\.png$/

export type AssetRef = {
  readonly assetId: string
  readonly width: number
  readonly height: number
}

export function listAssets(project: Project): AssetRef[] {
  return project.sprites.flatMap((s) =>
    s.costumes.flatMap((c) =>
      c.layers.map((l) => ({
        assetId: l.assetId,
        width: c.width,
        height: c.height,
      })),
    ),
  )
}

export async function exportProjectZip(
  project: Project,
  getBitmap: (assetId: string) => Bitmap | undefined,
  codec: PngCodec,
): Promise<Uint8Array> {
  const files: Zippable = {
    [PROJECT_FILE]: strToU8(JSON.stringify(project, null, 2)),
  }
  for (const ref of listAssets(project)) {
    const bitmap = getBitmap(ref.assetId) ?? createBitmap(ref.width, ref.height)
    // PNG は圧縮済みなので再圧縮しない
    files[assetPath(ref.assetId)] = [await codec.encode(bitmap), { level: 0 }]
  }
  return zipSync(files)
}

function unzip(
  data: Uint8Array,
  maxTotalBytes: number,
): Record<string, Uint8Array> {
  let count = 0
  let total = 0
  try {
    return unzipSync(data, {
      filter: (file) => {
        count += 1
        if (count > MAX_ENTRIES || file.originalSize > MAX_ENTRY_BYTES) {
          throw new Error('too large')
        }
        // 読み込む名前のものだけ展開する（それ以外はメモリに載せない）
        if (file.name !== PROJECT_FILE && !ASSET_ENTRY.test(file.name))
          return false
        total += file.originalSize
        if (total > maxTotalBytes) throw new Error('too large')
        return true
      },
    })
  } catch {
    throw new Error(
      'ZIPファイルとして読み込めませんでした。壊れているか、対応していないファイルです',
    )
  }
}

export async function importProjectZip(
  data: Uint8Array,
  codec: PngCodec,
  maxTotalBytes = MAX_TOTAL_BYTES,
): Promise<LoadedProject> {
  const entries = unzip(data, maxTotalBytes)
  const json = entries[PROJECT_FILE]
  if (!json) throw new Error('project.json が見つかりません')

  let raw: unknown
  try {
    raw = JSON.parse(strFromU8(json))
  } catch {
    throw new Error('project.json を読み取れませんでした')
  }
  const project = parseProject(raw)

  const bitmaps = new Map<string, Bitmap>()
  for (const ref of listAssets(project)) {
    const bytes = entries[assetPath(ref.assetId)]
    if (!bytes) throw new Error(`画像が見つかりません: ${ref.assetId}`)
    const bitmap = await codec.decode(bytes)
    if (bitmap.width !== ref.width || bitmap.height !== ref.height) {
      throw new Error(`画像サイズがコスチュームと一致しません: ${ref.assetId}`)
    }
    bitmaps.set(ref.assetId, bitmap)
  }
  return { project, bitmaps }
}
