import { cloneBitmap, createBitmap, type Bitmap } from './bitmap'

type Entry = { readonly bitmap: Bitmap; readonly revision: number }

export type BitmapStore = {
  create(assetId: string, width: number, height: number): void
  get(assetId: string): Bitmap | undefined
  /** 複製に対して変更を加え、結果で差し替える（取得済みの旧参照は不変のまま） */
  update(assetId: string, mutate: (draft: Bitmap) => void): void
  delete(assetId: string): void
  revision(assetId: string): number
  subscribe(listener: () => void): () => void
}

/**
 * ピクセルの正データ置き場。Zustand の外に置き、store には assetId と revision だけを持たせる。
 */
export function createBitmapStore(): BitmapStore {
  const entries = new Map<string, Entry>()
  const listeners = new Set<() => void>()
  const notify = () => listeners.forEach((listener) => listener())

  const getEntry = (assetId: string): Entry => {
    const entry = entries.get(assetId)
    if (!entry) throw new Error(`画像が見つかりません: ${assetId}`)
    return entry
  }

  return {
    create(assetId, width, height) {
      entries.set(assetId, { bitmap: createBitmap(width, height), revision: 0 })
      notify()
    },
    get: (assetId) => entries.get(assetId)?.bitmap,
    update(assetId, mutate) {
      const entry = getEntry(assetId)
      const draft = cloneBitmap(entry.bitmap)
      mutate(draft)
      entries.set(assetId, { bitmap: draft, revision: entry.revision + 1 })
      notify()
    },
    delete(assetId) {
      if (entries.delete(assetId)) notify()
    },
    revision: (assetId) => getEntry(assetId).revision,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}
