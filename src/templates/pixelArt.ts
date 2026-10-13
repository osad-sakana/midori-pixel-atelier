import { createBitmap, type Bitmap } from '../lib/bitmap/bitmap'

/** ドット絵の文字と色の対応。`.` は透明 */
const PALETTE: Readonly<Record<string, readonly [number, number, number]>> = {
  k: [0x2b, 0x2b, 0x3a],
  w: [0xff, 0xff, 0xff],
  r: [0xe5, 0x48, 0x4d],
  R: [0xa8, 0x28, 0x2d],
  p: [0xff, 0x9a, 0xa8],
  y: [0xff, 0xd4, 0x3b],
  Y: [0xc9, 0x8a, 0x00],
  o: [0xff, 0xf3, 0xa8],
  g: [0x3f, 0xb9, 0x6b],
  G: [0x1f, 0x7d, 0x44],
  l: [0x8f, 0xe3, 0xa5],
  s: [0xff, 0xd7, 0xb5],
  b: [0x3f, 0x7b, 0xe0],
  B: [0x2a, 0x4f, 0xa0],
  n: [0x8b, 0x5a, 0x2b],
  N: [0x5e, 0x3a, 0x1a],
  d: [0xa8, 0x74, 0x44],
}

export function decodePixelArt(
  rows: readonly string[],
  width: number,
  height: number,
): Bitmap {
  if (rows.length !== height) {
    throw new Error(`ドット絵の高さが合いません: ${rows.length} / ${height}`)
  }
  const bitmap = createBitmap(width, height)
  rows.forEach((row, y) => {
    if (row.length !== width) {
      throw new Error(
        `ドット絵の ${y + 1} 行目の幅が合いません: ${row.length} / ${width}`,
      )
    }
    ;[...row].forEach((char, x) => {
      if (char === '.') return
      const color = PALETTE[char]
      if (!color) throw new Error(`未定義の色です: "${char}"`)
      bitmap.data.set([...color, 255], (y * width + x) * 4)
    })
  })
  return bitmap
}
