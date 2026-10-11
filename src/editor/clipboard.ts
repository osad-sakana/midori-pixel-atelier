import type { Bitmap } from '../lib/bitmap/bitmap'

/** アプリ内のクリップボード（選択範囲のコピー&貼り付け用） */
let content: Bitmap | null = null

export const copyToClipboard = (bitmap: Bitmap): void => {
  content = bitmap
}
export const readClipboard = (): Bitmap | null => content
