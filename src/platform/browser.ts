import type { Bitmap } from '../lib/bitmap/bitmap'
import { readPngSize } from '../lib/image/pngHeader'
import type { PngCodec } from '../lib/storage/projectArchive'

/** 読み込める画像の上限（1辺）。巨大画像でブラウザが固まるのを防ぐ */
export const MAX_IMPORT_SIZE = 4096

function toImageData(bitmap: Bitmap): ImageData {
  return new ImageData(
    new Uint8ClampedArray(bitmap.data),
    bitmap.width,
    bitmap.height,
  )
}

export function drawBitmap(canvas: HTMLCanvasElement, bitmap: Bitmap): void {
  if (canvas.width !== bitmap.width) canvas.width = bitmap.width
  if (canvas.height !== bitmap.height) canvas.height = bitmap.height
  canvas.getContext('2d')?.putImageData(toImageData(bitmap), 0, 0)
}

/** Canvas を使った PNG の符号化/復号（PNG/JPEG などブラウザが読める形式に対応） */
export const pngCodec: PngCodec = {
  async encode(bitmap) {
    const canvas = document.createElement('canvas')
    drawBitmap(canvas, bitmap)
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/png'),
    )
    if (!blob) throw new Error('PNG への変換に失敗しました')
    return new Uint8Array(await blob.arrayBuffer())
  },
  async decode(bytes) {
    // フルデコードの前に、ヘッダーだけで巨大な PNG を弾く
    const header = readPngSize(bytes)
    if (
      header &&
      (header.width > MAX_IMPORT_SIZE || header.height > MAX_IMPORT_SIZE)
    ) {
      throw new Error(`画像が大きすぎます（1辺 ${MAX_IMPORT_SIZE}px まで）`)
    }
    let image: ImageBitmap
    try {
      image = await createImageBitmap(new Blob([new Uint8Array(bytes)]))
    } catch {
      throw new Error(
        '画像を読み込めませんでした。PNG / JPEG / GIF / WebP に対応しています',
      )
    }
    try {
      if (image.width > MAX_IMPORT_SIZE || image.height > MAX_IMPORT_SIZE) {
        throw new Error(`画像が大きすぎます（1辺 ${MAX_IMPORT_SIZE}px まで）`)
      }
      const canvas = document.createElement('canvas')
      canvas.width = image.width
      canvas.height = image.height
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) throw new Error('Canvas を初期化できませんでした')
      ctx.drawImage(image, 0, 0)
      const { data } = ctx.getImageData(0, 0, image.width, image.height)
      return { width: image.width, height: image.height, data }
    } finally {
      image.close()
    }
  },
}

export function downloadBytes(
  fileName: string,
  bytes: Uint8Array,
  mime: string,
): void {
  const url = URL.createObjectURL(
    new Blob([new Uint8Array(bytes)], { type: mime }),
  )
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const downloadText = (fileName: string, text: string): void =>
  downloadBytes(
    fileName,
    new TextEncoder().encode(text),
    'text/plain;charset=utf-8',
  )

export function openFileDialog(accept: string): Promise<File | undefined> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.addEventListener('change', () => resolve(input.files?.[0]))
    input.addEventListener('cancel', () => resolve(undefined))
    input.click()
  })
}

export async function readFileBytes(file: File): Promise<Uint8Array> {
  return new Uint8Array(await file.arrayBuffer())
}
