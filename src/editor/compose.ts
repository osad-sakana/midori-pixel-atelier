import type { Costume } from '../domain/types'
import { createBitmap, type Bitmap } from '../lib/bitmap/bitmap'
import { flatten } from '../lib/bitmap/transform'

/** コスチュームの全レイヤーを1枚に合成する。overrides でレイヤーの画像を差し替えられる（未確定の描画用） */
export function composeCostume(
  costume: Costume,
  getBitmap: (assetId: string) => Bitmap | undefined,
  overrides: ReadonlyMap<string, Bitmap> = new Map(),
): Bitmap {
  return flatten(
    costume.width,
    costume.height,
    costume.layers.map((layer) => ({
      bitmap:
        overrides.get(layer.id) ??
        getBitmap(layer.assetId) ??
        createBitmap(costume.width, costume.height),
      opacity: layer.opacity,
      visible: layer.visible,
    })),
  )
}
