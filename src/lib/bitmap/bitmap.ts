/** ストレート（非乗算）RGBA 8bit。Canvas は表示専用で、正データはこちらを持つ */
export type Bitmap = {
  readonly width: number
  readonly height: number
  readonly data: Uint8ClampedArray
}

export function createBitmap(width: number, height: number): Bitmap {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    throw new Error(`画像サイズが不正です: ${width}x${height}`)
  }
  return { width, height, data: new Uint8ClampedArray(width * height * 4) }
}

export function cloneBitmap(bitmap: Bitmap): Bitmap {
  return { width: bitmap.width, height: bitmap.height, data: bitmap.data.slice() }
}
