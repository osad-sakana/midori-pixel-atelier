import { useMemo } from 'react'
import { composeCostume } from '../editor/compose'
import type { Costume } from '../domain/types'
import { bitmaps, useEditor } from '../state/editorStore'

/** コスチュームの合成画像。画像が変わる（revision）たびに作り直す */
export function useComposed(costume: Costume) {
  const revision = useEditor((s) => s.revision)
  return useMemo(
    () => composeCostume(costume, (id) => bitmaps.get(id)),
    // revision は画像の変更を知らせるためだけに依存させる
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [costume, revision],
  )
}
