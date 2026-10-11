import { useState } from 'react'
import { importImage } from '../app/actions'
import {
  addCostume,
  addSprite,
  deleteCostume,
  deleteSprite,
  duplicateCostume,
  moveCostume,
  rename,
  selectCostume,
  selectSprite,
  useEditor,
} from '../state/editorStore'
import type { Costume } from '../domain/types'
import { BitmapCanvas } from './BitmapCanvas'
import { EditableText } from './EditableText'
import { useComposed } from './useComposed'

function CostumeCard(props: {
  costume: Costume
  index: number
  count: number
  selected: boolean
}) {
  const { costume, index, count, selected } = props
  const bitmap = useComposed(costume)
  return (
    <li className={`costume-card ${selected ? 'selected' : ''}`}>
      <button
        type="button"
        className="costume-thumb"
        aria-pressed={selected}
        aria-label={`コスチューム ${index + 1}`}
        onClick={() => selectCostume(costume.id)}
      >
        <span className="costume-number">{index + 1}</span>
        <BitmapCanvas bitmap={bitmap} className="checker" maxSize={96} />
      </button>
      <EditableText
        label={`コスチューム${index + 1}の名前`}
        value={costume.name}
        onCommit={(name) => rename.costume(costume.id, name)}
      />
      {selected && (
        <div className="card-actions">
          <button
            type="button"
            onClick={() => moveCostume(index, index - 1)}
            disabled={index === 0}
            aria-label="前へ"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => moveCostume(index, index + 1)}
            disabled={index === count - 1}
            aria-label="後ろへ"
          >
            →
          </button>
          <button type="button" onClick={() => duplicateCostume(costume.id)}>
            複製
          </button>
          <button
            type="button"
            onClick={() => deleteCostume(costume.id)}
            disabled={count <= 1}
          >
            削除
          </button>
        </div>
      )}
    </li>
  )
}

const SIZES = [16, 32, 64, 128] as const

export function SpritePanel() {
  const project = useEditor((s) => s.project)
  const spriteId = useEditor((s) => s.spriteId)
  const costumeId = useEditor((s) => s.costumeId)
  const [newSize, setNewSize] = useState<'current' | number>('current')
  const sprite = project.sprites.find((s) => s.id === spriteId)

  return (
    <aside className="sprite-panel" aria-label="スプライトとコスチューム">
      <section>
        <h2>スプライト</h2>
        <ul className="sprite-list">
          {project.sprites.map((s) => (
            <li key={s.id}>
              {s.id === spriteId ? (
                <EditableText
                  label="スプライト名"
                  className="sprite-chip selected"
                  value={s.name}
                  onCommit={(n) => rename.sprite(s.id, n)}
                />
              ) : (
                <button
                  type="button"
                  className="sprite-chip"
                  onClick={() => selectSprite(s.id)}
                >
                  {s.name}
                </button>
              )}
            </li>
          ))}
        </ul>
        <div className="row">
          <button type="button" onClick={addSprite}>
            ＋ スプライト
          </button>
          <button
            type="button"
            onClick={() => deleteSprite(spriteId)}
            disabled={project.sprites.length <= 1}
          >
            削除
          </button>
        </div>
      </section>

      <section>
        <h2>コスチューム</h2>
        <ul className="costume-list">
          {sprite?.costumes.map((c, i) => (
            <CostumeCard
              key={c.id}
              costume={c}
              index={i}
              count={sprite.costumes.length}
              selected={c.id === costumeId}
            />
          ))}
        </ul>
        <div className="stack">
          <button
            type="button"
            onClick={() =>
              newSize === 'current'
                ? addCostume()
                : addCostume(newSize, newSize)
            }
          >
            ＋ 空のコスチューム
          </button>
          <select
            aria-label="新しいコスチュームのサイズ"
            value={String(newSize)}
            onChange={(e) =>
              setNewSize(
                e.target.value === 'current'
                  ? 'current'
                  : Number(e.target.value),
              )
            }
          >
            <option value="current">いまと同じサイズ</option>
            {SIZES.map((n) => (
              <option key={n} value={n}>
                {n}×{n}
              </option>
            ))}
          </select>
          <button type="button" onClick={() => void importImage()}>
            画像ファイルを読み込む
          </button>
        </div>
      </section>
    </aside>
  )
}
