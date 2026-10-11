import {
  addLayer,
  deleteLayer,
  duplicateLayer,
  getActive,
  moveLayer,
  selectLayer,
  updateLayer,
  useEditor,
} from '../state/editorStore'
import { EditableText } from './EditableText'

export function LayersPanel() {
  const costume = useEditor((s) => getActive(s).costume)
  const layerId = useEditor((s) => s.layerId)
  const layers = costume.layers
  const selectedIndex = layers.findIndex((l) => l.id === layerId)
  const selected = layers[selectedIndex]

  return (
    <div className="panel-body">
      <ul className="layer-list">
        {/* 上のレイヤーが先頭に見えるよう逆順で表示する */}
        {[...layers].reverse().map((layer) => (
          <li
            key={layer.id}
            className={`layer-row ${layer.id === layerId ? 'selected' : ''}`}
          >
            <input
              type="checkbox"
              aria-label={`${layer.name} を表示`}
              checked={layer.visible}
              onChange={(e) =>
                updateLayer(layer.id, { visible: e.target.checked })
              }
            />
            <button
              type="button"
              className="layer-select"
              aria-pressed={layer.id === layerId}
              onClick={() => selectLayer(layer.id)}
            >
              選択
            </button>
            <EditableText
              label="レイヤー名"
              value={layer.name}
              onCommit={(name) => updateLayer(layer.id, { name })}
            />
            <button
              type="button"
              aria-pressed={layer.locked}
              title="ロック（編集できなくする）"
              onClick={() => updateLayer(layer.id, { locked: !layer.locked })}
            >
              {layer.locked ? 'ロック中' : 'ロック'}
            </button>
          </li>
        ))}
      </ul>

      {selected && (
        <label className="slider-row">
          不透明度
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(selected.opacity * 100)}
            onChange={(e) =>
              updateLayer(selected.id, {
                opacity: Number(e.target.value) / 100,
              })
            }
          />
          <output>{Math.round(selected.opacity * 100)}%</output>
        </label>
      )}

      <div className="row wrap">
        <button type="button" onClick={addLayer}>
          ＋ 追加
        </button>
        <button
          type="button"
          onClick={() => selected && duplicateLayer(selected.id)}
        >
          複製
        </button>
        <button
          type="button"
          onClick={() =>
            selectedIndex < layers.length - 1 &&
            moveLayer(selectedIndex, selectedIndex + 1)
          }
          disabled={selectedIndex >= layers.length - 1}
        >
          ↑ 上へ
        </button>
        <button
          type="button"
          onClick={() =>
            selectedIndex > 0 && moveLayer(selectedIndex, selectedIndex - 1)
          }
          disabled={selectedIndex <= 0}
        >
          ↓ 下へ
        </button>
        <button
          type="button"
          onClick={() => selected && deleteLayer(selected.id)}
          disabled={layers.length <= 1}
        >
          削除
        </button>
      </div>
      <p className="hint">
        上にあるレイヤーが手前に表示されます。図形や選択範囲は、確定する（Enter・別のツールに切り替え）まで動かしたり色を変えたりできます。
      </p>
    </div>
  )
}
