import {
  ArrowLeft,
  ArrowRight,
  Copy,
  ImagePlus,
  Plus,
  Trash2,
} from 'lucide-react'
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
import type { Costume, Sprite } from '../domain/types'
import { Button } from '../ui/Button'
import { IconButton } from '../ui/IconButton'
import { BitmapCanvas } from './BitmapCanvas'
import { EditableText } from './EditableText'
import { useComposed } from './useComposed'

function SpriteRow(props: { sprite: Sprite; selected: boolean }) {
  const { sprite, selected } = props
  const first = sprite.costumes[0]
  return (
    <li className={`sprite-row ${selected ? 'selected' : ''}`}>
      <button
        type="button"
        className="sprite-pick"
        aria-label={`スプライト ${sprite.name} を選ぶ`}
        aria-pressed={selected}
        onClick={() => selectSprite(sprite.id)}
      >
        {first && <SpriteThumb costume={first} />}
      </button>
      <EditableText
        label={`スプライト名（${sprite.name}）`}
        value={sprite.name}
        onCommit={(name) => rename.sprite(sprite.id, name)}
      />
    </li>
  )
}

function SpriteThumb(props: { costume: Costume }) {
  const bitmap = useComposed(props.costume)
  return <BitmapCanvas bitmap={bitmap} className="checker" maxSize={32} />
}

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
        <BitmapCanvas bitmap={bitmap} className="checker" maxSize={88} />
      </button>
      <EditableText
        label={`コスチューム${index + 1}の名前`}
        value={costume.name}
        onCommit={(name) => rename.costume(costume.id, name)}
      />
      {selected && (
        <div className="card-actions">
          <IconButton
            icon={ArrowLeft}
            label="前へ"
            size="sm"
            onClick={() => moveCostume(index, index - 1)}
            disabled={index === 0}
          />
          <IconButton
            icon={ArrowRight}
            label="後ろへ"
            size="sm"
            onClick={() => moveCostume(index, index + 1)}
            disabled={index === count - 1}
          />
          <IconButton
            icon={Copy}
            label="複製"
            size="sm"
            onClick={() => duplicateCostume(costume.id)}
          />
          <IconButton
            icon={Trash2}
            label="削除"
            size="sm"
            tone="danger"
            onClick={() => deleteCostume(costume.id)}
            disabled={count <= 1}
          />
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
      <section className="side-section">
        <header className="section-head">
          <h2>スプライト</h2>
          <div className="section-actions">
            <IconButton
              icon={Plus}
              label="スプライトを追加"
              size="sm"
              onClick={addSprite}
            />
            <IconButton
              icon={Trash2}
              label="スプライトを削除"
              size="sm"
              tone="danger"
              onClick={() => deleteSprite(spriteId)}
              disabled={project.sprites.length <= 1}
            />
          </div>
        </header>
        <ul className="sprite-list">
          {project.sprites.map((s) => (
            <SpriteRow key={s.id} sprite={s} selected={s.id === spriteId} />
          ))}
        </ul>
      </section>

      <section className="side-section grow">
        <header className="section-head">
          <h2>コスチューム</h2>
          <span className="count-badge">{sprite?.costumes.length ?? 0}</span>
        </header>
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
      </section>

      <footer className="side-footer">
        <label className="field">
          <span className="field-label">新しいコスチュームの大きさ</span>
          <select
            className="input"
            value={String(newSize)}
            onChange={(e) =>
              setNewSize(
                e.target.value === 'current'
                  ? 'current'
                  : Number(e.target.value),
              )
            }
          >
            <option value="current">いまと同じ</option>
            {SIZES.map((n) => (
              <option key={n} value={n}>
                {n} × {n}
              </option>
            ))}
          </select>
        </label>
        <Button
          icon={Plus}
          block
          onClick={() =>
            newSize === 'current' ? addCostume() : addCostume(newSize, newSize)
          }
        >
          空のコスチュームを追加
        </Button>
        <Button
          icon={ImagePlus}
          block
          variant="ghost"
          onClick={() => void importImage()}
        >
          画像ファイルを読み込む
        </Button>
      </footer>
    </aside>
  )
}
