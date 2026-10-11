import {
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  EyeOff,
  Lock,
  LockOpen,
  Plus,
  Trash2,
} from 'lucide-react'
import {
  addLayer,
  bitmaps,
  deleteLayer,
  duplicateLayer,
  getActive,
  moveLayer,
  selectLayer,
  updateLayer,
  useEditor,
} from '../state/editorStore'
import type { Layer } from '../domain/types'
import { IconButton } from '../ui/IconButton'
import { SliderField } from '../ui/SliderField'
import { BitmapCanvas } from './BitmapCanvas'
import { EditableText } from './EditableText'

function LayerThumb({ layer }: { layer: Layer }) {
  useEditor((s) => s.revision)
  const bitmap = bitmaps.get(layer.assetId)
  return bitmap ? (
    <BitmapCanvas bitmap={bitmap} className="checker" maxSize={36} />
  ) : null
}

export function LayersPanel() {
  const costume = useEditor((s) => getActive(s).costume)
  const layerId = useEditor((s) => s.layerId)
  const layers = costume.layers
  const selectedIndex = layers.findIndex((l) => l.id === layerId)
  const selected = layers[selectedIndex]

  return (
    <div className="panel-body">
      <div className="panel-toolbar">
        <IconButton icon={Plus} label="レイヤーを追加" onClick={addLayer} />
        <IconButton
          icon={Copy}
          label="レイヤーを複製"
          onClick={() => selected && duplicateLayer(selected.id)}
        />
        <IconButton
          icon={ChevronUp}
          label="レイヤーを上へ"
          onClick={() => moveLayer(selectedIndex, selectedIndex + 1)}
          disabled={selectedIndex >= layers.length - 1}
        />
        <IconButton
          icon={ChevronDown}
          label="レイヤーを下へ"
          onClick={() => moveLayer(selectedIndex, selectedIndex - 1)}
          disabled={selectedIndex <= 0}
        />
        <IconButton
          icon={Trash2}
          label="レイヤーを削除"
          tone="danger"
          onClick={() => selected && deleteLayer(selected.id)}
          disabled={layers.length <= 1}
        />
      </div>

      <ul className="layer-list">
        {/* 上のレイヤーが先頭に見えるよう逆順で表示する */}
        {[...layers].reverse().map((layer) => (
          <li
            key={layer.id}
            className={`layer-row ${layer.id === layerId ? 'selected' : ''}`}
          >
            <button
              type="button"
              className="layer-thumb"
              aria-label={`${layer.name} を選ぶ`}
              aria-pressed={layer.id === layerId}
              onClick={() => selectLayer(layer.id)}
            >
              <LayerThumb layer={layer} />
            </button>
            <EditableText
              label="レイヤー名"
              value={layer.name}
              onCommit={(name) => updateLayer(layer.id, { name })}
            />
            <IconButton
              icon={layer.locked ? Lock : LockOpen}
              label={`${layer.name} のロック`}
              size="sm"
              pressed={layer.locked}
              onClick={() => updateLayer(layer.id, { locked: !layer.locked })}
            />
            <IconButton
              icon={layer.visible ? Eye : EyeOff}
              label={`${layer.name} の表示`}
              size="sm"
              pressed={layer.visible}
              onClick={() => updateLayer(layer.id, { visible: !layer.visible })}
            />
          </li>
        ))}
      </ul>

      {selected && (
        <SliderField
          label="不透明度"
          min={0}
          max={100}
          unit="%"
          value={Math.round(selected.opacity * 100)}
          onChange={(v) => updateLayer(selected.id, { opacity: v / 100 })}
        />
      )}

      <p className="hint">
        上にあるレイヤーが手前に見えます。図形や選択範囲は、確定する（Enter
        か別のツールに切り替え）まで、動かしたり色を変えたりできます。
      </p>
    </div>
  )
}
