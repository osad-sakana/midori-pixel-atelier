import { createBitmap, type Bitmap } from '../bitmap/bitmap'

/** 画像の変更差分。通常は変更した矩形だけを持ち、サイズ変更や作成/削除は丸ごと持つ */
export type RectPatch = {
  readonly kind: 'rect'
  readonly assetId: string
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
  readonly before: Uint8ClampedArray
  readonly after: Uint8ClampedArray
}

export type FullPatch = {
  readonly kind: 'full'
  readonly assetId: string
  readonly before: Bitmap | undefined
  readonly after: Bitmap | undefined
}

export type Patch = RectPatch | FullPatch

export type Direction = 'before' | 'after'

function sameBytes(a: Uint8ClampedArray, b: Uint8ClampedArray, offset: number): boolean {
  return (
    a[offset] === b[offset] &&
    a[offset + 1] === b[offset + 1] &&
    a[offset + 2] === b[offset + 2] &&
    a[offset + 3] === b[offset + 3]
  )
}

function copyRect(
  src: Bitmap,
  x: number,
  y: number,
  width: number,
  height: number,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(width * height * 4)
  for (let row = 0; row < height; row++) {
    const from = ((y + row) * src.width + x) * 4
    out.set(src.data.subarray(from, from + width * 4), row * width * 4)
  }
  return out
}

export function diffBitmaps(
  assetId: string,
  before: Bitmap | undefined,
  after: Bitmap | undefined,
): Patch | null {
  if (!before && !after) return null
  if (!before || !after || before.width !== after.width || before.height !== after.height) {
    return { kind: 'full', assetId, before, after }
  }

  let minX = after.width
  let minY = after.height
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < after.height; y++) {
    for (let x = 0; x < after.width; x++) {
      if (sameBytes(before.data, after.data, (y * after.width + x) * 4)) continue
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }
  if (maxX < 0) return null

  const width = maxX - minX + 1
  const height = maxY - minY + 1
  return {
    kind: 'rect',
    assetId,
    x: minX,
    y: minY,
    width,
    height,
    before: copyRect(before, minX, minY, width, height),
    after: copyRect(after, minX, minY, width, height),
  }
}

/**
 * パッチを適用する。rect は bmp（作業用コピー）を直接書き換えて返し、
 * full は対象の画像（無ければ undefined）を返す
 */
export function applyPatch(
  bmp: Bitmap | undefined,
  patch: Patch,
  direction: Direction,
): Bitmap | undefined {
  if (patch.kind === 'full') return patch[direction]
  if (!bmp) return createBitmap(1, 1)
  const source = patch[direction]
  for (let row = 0; row < patch.height; row++) {
    const to = ((patch.y + row) * bmp.width + patch.x) * 4
    bmp.data.set(source.subarray(row * patch.width * 4, (row + 1) * patch.width * 4), to)
  }
  return bmp
}

export function patchBytes(patch: Patch): number {
  if (patch.kind === 'rect') return patch.before.byteLength + patch.after.byteLength
  return (patch.before?.data.byteLength ?? 0) + (patch.after?.data.byteLength ?? 0)
}
