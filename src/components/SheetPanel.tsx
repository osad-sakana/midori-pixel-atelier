import { Film, Image, Package, Scissors } from 'lucide-react'
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
import { Button } from '../ui/Button'
import { NumberField } from '../ui/NumberField'
import { BitmapCanvas } from './BitmapCanvas'
import { costumesKey } from './useComposed'

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
  // 画像が変わるたびに再描画する（シートの再合成は下の key が変わったときだけ）
  useEditor((s) => s.revision)
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
    // key はこのスプライトの画像の変更を知らせるためだけに依存させる
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [plan, costumesKey(sprite?.costumes ?? [])],
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
  const set = (patch: Partial<typeof settings>) =>
    updateSheet({ ...settings, ...patch })

  return (
    <div className="panel-body">
      <section className="card">
        <h3>プレビュー</h3>
        <div className="preview-row">
          <figure className="preview-box">
            <BitmapCanvas bitmap={sheet} className="checker" maxSize={200} />
            <figcaption>スプライトシート</figcaption>
          </figure>
          <figure className="preview-box">
            <AnimationPreview
              sheetCanvas={sheetCanvas}
              frames={layout.frames}
              width={layout.frameWidth}
              height={layout.frameHeight}
              fps={settings.fps}
            />
            <figcaption>アニメーション</figcaption>
          </figure>
        </div>
        <p className="stat-line">
          <span>{layout.frames.length} 枚</span>
          <span>
            1枚 {layout.frameWidth}×{layout.frameHeight}px
          </span>
          <span>
            全体 {layout.sheetWidth}×{layout.sheetHeight}px
          </span>
        </p>
      </section>

      <section className="card">
        <h3>シートの設定</h3>
        <div className="field-row three">
          <NumberField
            label="1行の枚数"
            min={1}
            max={64}
            value={settings.columns}
            onChange={(v) => set({ columns: Number(v) })}
          />
          <NumberField
            label="すき間(px)"
            min={0}
            max={64}
            value={settings.padding}
            onChange={(v) => set({ padding: Number(v) })}
          />
          <NumberField
            label="速さ(fps)"
            min={1}
            max={60}
            value={settings.fps}
            onChange={(v) => set({ fps: Number(v) })}
          />
        </div>
      </section>

      <section className="card">
        <h3>書き出し</h3>
        <div className="stack">
          <Button
            variant="primary"
            icon={Package}
            block
            onClick={() => void downloadSpriteBundle()}
          >
            素材セット（ZIP）をダウンロード
          </Button>
          <Button icon={Film} block onClick={() => void downloadSheetPng()}>
            シート画像（{plan.sheetFile}）
          </Button>
          <Button icon={Image} block onClick={() => void downloadCostumePng()}>
            いまのコスチュームだけ（PNG）
          </Button>
        </div>
        <p className="hint">
          素材セットには、各コスチュームのPNG・シートPNG・pygame
          で動かせるサンプルコード（.py）が入っています。
        </p>
      </section>

      <section className="card">
        <h3>シート画像から切り出す</h3>
        <div className="field-row three">
          <NumberField
            label="1枚の幅"
            min={1}
            placeholder={String(costume.width)}
            value={slice.w}
            onChange={(v) => setSlice({ ...slice, w: v })}
          />
          <NumberField
            label="1枚の高さ"
            min={1}
            placeholder={String(costume.height)}
            value={slice.h}
            onChange={(v) => setSlice({ ...slice, h: v })}
          />
          <NumberField
            label="すき間(px)"
            min={0}
            value={slice.padding}
            onChange={(v) => setSlice({ ...slice, padding: v })}
          />
        </div>
        <Button
          icon={Scissors}
          block
          onClick={() =>
            void importSpriteSheet({
              cellWidth: sliceW,
              cellHeight: sliceH,
              padding: Number(slice.padding || 0),
            })
          }
        >
          画像を選んで切り出す
        </Button>
      </section>
    </div>
  )
}
