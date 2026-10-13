import { createStore, del, get, set } from 'idb-keyval'
import { parseProject } from '../../domain/schema'
import type { Project } from '../../domain/types'
import { createBitmap, type Bitmap } from '../bitmap/bitmap'
import { listAssets, type LoadedProject } from './projectArchive'

const KEY = 'autosave'
/** 同じオリジン（<user>.github.io）の他アプリと保存領域が衝突しないよう専用の DB を使う */
const store = createStore('midori-pixel-atelier', 'autosave')

type StoredAsset = {
  readonly assetId: string
  readonly width: number
  readonly height: number
  readonly data: Uint8ClampedArray
}

type StoredSnapshot = {
  readonly project: Project
  readonly assets: readonly StoredAsset[]
}

/** IndexedDB は構造化複製で型付き配列をそのまま保存できる（PNG 変換は不要） */
export async function saveAutosave(
  project: Project,
  getBitmap: (assetId: string) => Bitmap | undefined,
): Promise<void> {
  const assets = listAssets(project).flatMap((ref) => {
    const bitmap = getBitmap(ref.assetId)
    return bitmap
      ? [
          {
            assetId: ref.assetId,
            width: bitmap.width,
            height: bitmap.height,
            data: bitmap.data,
          },
        ]
      : []
  })
  const snapshot: StoredSnapshot = { project, assets }
  await set(KEY, snapshot, store)
}

/** 壊れている/読めない場合は undefined（新規プロジェクトで始める） */
export async function loadAutosave(): Promise<LoadedProject | undefined> {
  try {
    const stored = (await get(KEY, store)) as StoredSnapshot | undefined
    if (!stored) return undefined
    const project = parseProject(stored.project)
    const stash = new Map(stored.assets.map((a) => [a.assetId, a]))
    const bitmaps = new Map<string, Bitmap>()
    for (const ref of listAssets(project)) {
      const asset = stash.get(ref.assetId)
      const valid =
        asset &&
        asset.data instanceof Uint8ClampedArray &&
        asset.width === ref.width &&
        asset.height === ref.height &&
        asset.data.length === ref.width * ref.height * 4
      bitmaps.set(
        ref.assetId,
        valid
          ? { width: asset.width, height: asset.height, data: asset.data }
          : createBitmap(ref.width, ref.height),
      )
    }
    return { project, bitmaps }
  } catch {
    return undefined
  }
}

export async function clearAutosave(): Promise<void> {
  await del(KEY, store)
}

/** ブラウザに自動削除されにくくするよう依頼する（失敗しても無視） */
export async function requestPersistence(): Promise<void> {
  try {
    await navigator.storage?.persist?.()
  } catch {
    // 非対応環境では何もしない
  }
}
