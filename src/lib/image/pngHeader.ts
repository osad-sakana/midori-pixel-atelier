const SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10]
const IHDR = [73, 72, 68, 82]

/**
 * PNG の IHDR から画像サイズだけを読む。フルデコードの前に巨大画像を弾くために使う。
 * PNG 以外（または壊れたヘッダー）は undefined。
 */
export function readPngSize(
  bytes: Uint8Array,
): { width: number; height: number } | undefined {
  if (bytes.length < 24) return undefined
  if (!SIGNATURE.every((v, i) => bytes[i] === v)) return undefined
  if (!IHDR.every((v, i) => bytes[12 + i] === v)) return undefined
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  return { width: view.getUint32(16), height: view.getUint32(20) }
}
