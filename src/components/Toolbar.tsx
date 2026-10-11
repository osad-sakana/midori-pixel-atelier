import { useState } from 'react'
import {
  getActive,
  resizeCostume,
  setTool,
  setToolOptions,
  setZoom,
  transformCostume,
  useEditor,
  type Tool,
} from '../state/editorStore'

const TOOLS: readonly { tool: Tool; label: string; key: string }[] = [
  { tool: 'brush', label: 'ブラシ', key: 'B' },
  { tool: 'eraser', label: '消しゴム', key: 'E' },
  { tool: 'fill', label: '塗りつぶし', key: 'G' },
  { tool: 'line', label: '線', key: 'L' },
  { tool: 'rect', label: '四角', key: 'R' },
  { tool: 'ellipse', label: '円', key: 'O' },
  { tool: 'select', label: '選択', key: 'S' },
  { tool: 'eyedropper', label: 'スポイト', key: 'I' },
]

const PALETTE = [
  '#000000',
  '#5f574f',
  '#c2c3c7',
  '#ffffff',
  '#e63946',
  '#ff77a8',
  '#ffa300',
  '#ffec27',
  '#00e436',
  '#008751',
  '#29adff',
  '#1d2b53',
  '#83769c',
  '#7e2553',
  '#ab5236',
  '#ffccaa',
]

function SizeInputs() {
  const costume = useEditor((s) => getActive(s).costume)
  const [size, setSize] = useState<{ w: string; h: string } | null>(null)
  const w = size?.w ?? String(costume.width)
  const h = size?.h ?? String(costume.height)
  const apply = (): void => {
    resizeCostume(Number(w), Number(h))
    setSize(null)
  }
  return (
    <div
      className="option-group"
      title="キャンバスのサイズ（左上を基準に切り取り/拡張）"
    >
      <label>
        サイズ
        <input
          type="number"
          min={1}
          max={1024}
          value={w}
          aria-label="幅"
          onChange={(e) => setSize({ w: e.target.value, h })}
        />
      </label>
      ×
      <input
        type="number"
        min={1}
        max={1024}
        value={h}
        aria-label="高さ"
        onChange={(e) => setSize({ w, h: e.target.value })}
      />
      <button type="button" onClick={apply} disabled={!size}>
        変更
      </button>
    </div>
  )
}

export function Toolbar() {
  const tool = useEditor((s) => s.tool)
  const color = useEditor((s) => s.color)
  const brushSize = useEditor((s) => s.brushSize)
  const brushShape = useEditor((s) => s.brushShape)
  const fill = useEditor((s) => s.fill)
  const showGrid = useEditor((s) => s.showGrid)
  const zoom = useEditor((s) => s.zoom)
  const usesStroke = tool === 'brush' || tool === 'eraser' || tool === 'line'
  const usesFill = tool === 'rect' || tool === 'ellipse'

  return (
    <div className="toolbar">
      <div className="tool-row" role="toolbar" aria-label="ツール">
        {TOOLS.map((t) => (
          <button
            key={t.tool}
            type="button"
            className="tool"
            aria-pressed={tool === t.tool}
            title={`${t.label}（${t.key}）`}
            onClick={() => setTool(t.tool)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="option-row">
        <div className="option-group">
          <input
            type="color"
            aria-label="色"
            value={color}
            onChange={(e) => setToolOptions({ color: e.target.value })}
          />
          <div className="palette">
            {PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                className="swatch"
                aria-label={`色 ${c}`}
                aria-pressed={c === color}
                style={{ background: c }}
                onClick={() => setToolOptions({ color: c })}
              />
            ))}
          </div>
        </div>

        {(usesStroke || usesFill) && (
          <div className="option-group">
            <label>
              {usesFill ? '枠の太さ' : '太さ'}
              <input
                type="range"
                min={1}
                max={32}
                value={brushSize}
                onChange={(e) =>
                  setToolOptions({ brushSize: Number(e.target.value) })
                }
              />
              <output>{brushSize}</output>
            </label>
          </div>
        )}
        {usesStroke && (
          <div className="option-group">
            <button
              type="button"
              aria-pressed={brushShape === 'square'}
              onClick={() => setToolOptions({ brushShape: 'square' })}
            >
              四角ペン
            </button>
            <button
              type="button"
              aria-pressed={brushShape === 'round'}
              onClick={() => setToolOptions({ brushShape: 'round' })}
            >
              丸ペン
            </button>
          </div>
        )}
        {usesFill && (
          <div className="option-group">
            <button
              type="button"
              aria-pressed={fill}
              onClick={() => setToolOptions({ fill: true })}
            >
              塗りつぶし
            </button>
            <button
              type="button"
              aria-pressed={!fill}
              onClick={() => setToolOptions({ fill: false })}
            >
              枠だけ
            </button>
          </div>
        )}
      </div>

      <div className="option-row">
        <div className="option-group">
          <button
            type="button"
            onClick={() => transformCostume('flipH')}
            title="左右反転"
          >
            左右反転
          </button>
          <button
            type="button"
            onClick={() => transformCostume('flipV')}
            title="上下反転"
          >
            上下反転
          </button>
          <button
            type="button"
            onClick={() => transformCostume('rotateCcw')}
            title="左に90度回転"
          >
            ⟲ 90°
          </button>
          <button
            type="button"
            onClick={() => transformCostume('rotateCw')}
            title="右に90度回転"
          >
            ⟳ 90°
          </button>
        </div>
        <SizeInputs />
        <div className="option-group">
          <button
            type="button"
            onClick={() => setZoom(zoom - 1)}
            aria-label="縮小"
          >
            −
          </button>
          <span className="zoom-label">{zoom}x</span>
          <button
            type="button"
            onClick={() => setZoom(zoom + 1)}
            aria-label="拡大"
          >
            ＋
          </button>
          <button
            type="button"
            aria-pressed={showGrid}
            onClick={() => setToolOptions({ showGrid: !showGrid })}
          >
            グリッド
          </button>
        </div>
      </div>
    </div>
  )
}
