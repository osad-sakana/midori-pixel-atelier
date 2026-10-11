import { useEffect, useMemo, useRef, useState } from 'react'
import {
  buildSheet,
  downloadCostumePng,
  downloadSheetPng,
  downloadSpriteBundle,
  importSpriteSheet,
} from '../app/actions'
import { planSpriteExport } from '../lib/export/exportPlan'
import { drawBitmap } from '../platform/browser'
import { getActive, updateSheet, useEditor } from '../state/editorStore'
import { BitmapCanvas } from './BitmapCanvas'

function AnimationPreview(props: {
  sheetCanvas: HTMLCanvasElement | null
  frames: readonly { x: number; y: number }[]
  width: number
  height: number
  fps: number
}) {
  const { sheetCanvas, frames, width, height, fps } = props
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || !sheetCanvas || frames.length === 0) return
    canvas.width = width
    canvas.height = height
    let raf = 0
    const start = performance.now()
    const tick = (now: number): void => {
      const i = Math.floor(((now - start) / 1000) * fps) % frames.length
      const frame = frames[i]
      ctx.clearRect(0, 0, width, height)
      if (frame)
        ctx.drawImage(
          sheetCanvas,
          frame.x,
          frame.y,
          width,
          height,
          0,
          0,
          width,
          height,
        )
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [sheetCanvas, frames, width, height, fps])

  const scale = Math.max(1, Math.floor(128 / Math.max(width, height)))
  return (
    <canvas
      ref={ref}
      className="pixel checker"
      aria-label="アニメーションのプレビュー"
      style={{ width: width * scale, height: height * scale }}
    />
  )
}

export function SheetPanel() {
  const project = useEditor((s) => s.project)
  const spriteId = useEditor((s) => s.spriteId)
  const revision = useEditor((s) => s.revision)
  const costume = useEditor((s) => getActive(s).costume)
  const sprite = project.sprites.find((s) => s.id === spriteId)
  const index = project.sprites.findIndex((s) => s.id === spriteId)
  const [slice, setSlice] = useState({ w: '', h: '', padding: '0' })
  const sheetCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const [sheetCanvas, setSheetCanvas] = useState<HTMLCanvasElement | null>(null)

  const plan = useMemo(
    () => (sprite ? planSpriteExport(sprite, index) : undefined),
    [sprite, index],
  )
  const sheet = useMemo(
    () => (plan ? buildSheet() : undefined),
    // 画像の変更（revision）で作り直す
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [plan, revision],
  )

  useEffect(() => {
    if (!sheet) return
    const canvas = sheetCanvasRef.current ?? document.createElement('canvas')
    drawBitmap(canvas, sheet)
    sheetCanvasRef.current = canvas
    setSheetCanvas(canvas)
  }, [sheet])

  if (!sprite || !plan || !sheet) return null
  const { settings, layout } = plan

  const sliceW = Number(slice.w || costume.width)
  const sliceH = Number(slice.h || costume.height)

  return (
    <div className="panel-body">
      <h3>シートの設定</h3>
      <div className="grid-form">
        <label>
          1行の枚数
          <input
            type="number"
            min={1}
            max={64}
            value={settings.columns}
            onChange={(e) =>
              updateSheet({ ...settings, columns: Number(e.target.value) })
            }
          />
        </label>
        <label>
          すき間(px)
          <input
            type="number"
            min={0}
            max={64}
            value={settings.padding}
            onChange={(e) =>
              updateSheet({ ...settings, padding: Number(e.target.value) })
            }
          />
        </label>
        <label>
          速さ(fps)
          <input
            type="number"
            min={1}
            max={60}
            value={settings.fps}
            onChange={(e) =>
              updateSheet({ ...settings, fps: Number(e.target.value) })
            }
          />
        </label>
      </div>
      <p className="hint">
        1枚の大きさ {layout.frameWidth}×{layout.frameHeight}px ・{' '}
        {layout.frames.length} 枚 ・ シート全体 {layout.sheetWidth}×
        {layout.sheetHeight}px
      </p>

      <h3>プレビュー</h3>
      <div className="preview-row">
        <div className="preview-box">
          <BitmapCanvas bitmap={sheet} className="checker" maxSize={240} />
          <span>スプライトシート</span>
        </div>
        <div className="preview-box">
          <AnimationPreview
            sheetCanvas={sheetCanvas}
            frames={layout.frames}
            width={layout.frameWidth}
            height={layout.frameHeight}
            fps={settings.fps}
          />
          <span>アニメーション</span>
        </div>
      </div>

      <h3>ダウンロード</h3>
      <div className="stack">
        <button
          type="button"
          className="primary"
          onClick={() => void downloadSpriteBundle(1)}
        >
          素材セット（ZIP）をダウンロード
        </button>
        <button type="button" onClick={() => void downloadSheetPng()}>
          シート画像（{plan.sheetFile}）
        </button>
        <button type="button" onClick={() => void downloadCostumePng()}>
          いまのコスチュームだけ（PNG）
        </button>
      </div>
      <p className="hint">
        素材セットには、各コスチュームのPNG・シートPNG・動かせる main.py
        が入っています。
      </p>

      <h3>シート画像から切り出す</h3>
      <div className="grid-form">
        <label>
          1枚の幅
          <input
            type="number"
            min={1}
            placeholder={String(costume.width)}
            value={slice.w}
            onChange={(e) => setSlice({ ...slice, w: e.target.value })}
          />
        </label>
        <label>
          1枚の高さ
          <input
            type="number"
            min={1}
            placeholder={String(costume.height)}
            value={slice.h}
            onChange={(e) => setSlice({ ...slice, h: e.target.value })}
          />
        </label>
        <label>
          すき間(px)
          <input
            type="number"
            min={0}
            value={slice.padding}
            onChange={(e) => setSlice({ ...slice, padding: e.target.value })}
          />
        </label>
      </div>
      <button
        type="button"
        onClick={() =>
          void importSpriteSheet({
            cellWidth: sliceW,
            cellHeight: sliceH,
            padding: Number(slice.padding || 0),
          })
        }
      >
        画像を選んで切り出す
      </button>
    </div>
  )
}
