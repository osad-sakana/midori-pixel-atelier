import { useMemo } from 'react'
import { composeCostume } from '../editor/compose'
import type { Costume } from '../domain/types'
import { bitmaps, useEditor } from '../state/editorStore'

/** コスチューム群の画像の版（各レイヤーの revision）。変更のあったコスチュームだけ作り直すための鍵 */
export function costumesKey(costumes: readonly Costume[]): string {
  return costumes
    .flatMap((c) => c.layers.map((l) => bitmaps.revision(l.assetId)))
    .join(',')
}

/** コスチュームの合成画像。そのコスチュームの画像が変わったときだけ作り直す */
export function useComposed(costume: Costume) {
  // 全体の revision を購読して再描画のきっかけにする（再合成は下の key が変わったときだけ）
  useEditor((s) => s.revision)
  const key = costumesKey([costume])
  return useMemo(
    () => composeCostume(costume, (id) => bitmaps.get(id)),
    // key は画像の変更を知らせるためだけに依存させる
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [costume, key],
  )
}
