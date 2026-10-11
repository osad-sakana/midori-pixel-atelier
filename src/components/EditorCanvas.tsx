import { Grid3x3, ZoomIn, ZoomOut } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { composeCostume } from '../editor/compose'
import { renderFloating, type Floating } from '../editor/floating'
import { pointerDown, pointerMove, pointerUp } from '../editor/gesture'
import { drawBitmap } from '../platform/browser'
import {
  bitmaps,
  getActive,
  setToolOptions,
  setZoom,
  useEditor,
} from '../state/editorStore'
import { IconButton } from '../ui/IconButton'

const GRID_MIN_ZOOM = 6
const HANDLE_PX = 10

/** グリッド線の色。テーマ（ライト/ダーク）に合わせて CSS の値を使う */
function gridColor(): string {
  return (
    getComputedStyle(document.documentElement)
      .getPropertyValue('--grid-line')
      .trim() || 'rgba(0,0,0,0.18)'
  )
}

function drawOverlay(
  canvas: HTMLCanvasElement,
  opts: {
    width: number
    height: number
    zoom: number
    grid: boolean
    floating: Floating | null
    draft: { x: number; y: number; width: number; height: number } | null
  },
): void {
  const { width, height, zoom } = opts
  canvas.width = width * zoom
  canvas.height = height * zoom
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  if (opts.grid && zoom >= GRID_MIN_ZOOM) {
    ctx.strokeStyle = gridColor()
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let x = 1; x < width; x++) {
      ctx.moveTo(x * zoom + 0.5, 0)
      ctx.lineTo(x * zoom + 0.5, canvas.height)
    }
    for (let y = 1; y < height; y++) {
      ctx.moveTo(0, y * zoom + 0.5)
      ctx.lineTo(canvas.width, y * zoom + 0.5)
    }
    ctx.stroke()
  }

  const dashed = (x: number, y: number, w: number, h: number): void => {
    ctx.save()
    ctx.lineWidth = 2
    ctx.strokeStyle = '#fff'
    ctx.strokeRect(x * zoom, y * zoom, w * zoom, h * zoom)
    ctx.setLineDash([6, 4])
    ctx.strokeStyle = '#6366f1'
    ctx.strokeRect(x * zoom, y * zoom, w * zoom, h * zoom)
    ctx.restore()
  }

  const { floating, draft } = opts
  if (draft) dashed(draft.x, draft.y, draft.width, draft.height)
  if (floating?.kind === 'selection') {
    dashed(
      floating.offset.x,
      floating.offset.y,
      floating.pixels.width,
      floating.pixels.height,
    )
  }
  if (floating?.kind === 'shape') {
    const x0 = Math.min(floating.start.x, floating.end.x)
    const y0 = Math.min(floating.start.y, floating.end.y)
    dashed(
      x0,
      y0,
      Math.abs(floating.end.x - floating.start.x) + 1,
      Math.abs(floating.end.y - floating.start.y) + 1,
    )
    for (const p of [floating.start, floating.end]) {
      const size = Math.max(HANDLE_PX, zoom)
      const cx = (p.x + 0.5) * zoom
      const cy = (p.y + 0.5) * zoom
      ctx.fillStyle = '#fff'
      ctx.strokeStyle = '#6366f1'
      ctx.lineWidth = 2
      ctx.fillRect(cx - size / 2, cy - size / 2, size, size)
      ctx.strokeRect(cx - size / 2, cy - size / 2, size, size)
    }
  }
}

export function EditorCanvas() {
  const mainRef = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const activePointer = useRef<number | null>(null)
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null)

  const costumeId = useEditor((s) => s.costumeId)
  const project = useEditor((s) => s.project)
  const revision = useEditor((s) => s.revision)
  const layerId = useEditor((s) => s.layerId)
  const floating = useEditor((s) => s.floating)
  const draft = useEditor((s) => s.selectionDraft)
  const zoom = useEditor((s) => s.zoom)
  const showGrid = useEditor((s) => s.showGrid)

  const { costume, layer } = getActive({
    ...useEditor.getState(),
    project,
    costumeId,
    layerId,
  })
  const { width, height } = costume

  // サイズが変わったときだけ、画面に収まる倍率に合わせる
  useEffect(() => {
    setZoom(
      Math.max(
        1,
        Math.min(32, Math.floor(Math.min(560 / width, 440 / height))),
      ),
    )
  }, [width, height])

  useEffect(() => {
    const canvas = mainRef.current
    if (!canvas) return
    const overrides = new Map()
    const base = bitmaps.get(layer.assetId)
    if (floating && base)
      overrides.set(layer.id, renderFloating(base, floating))
    drawBitmap(
      canvas,
      composeCostume(costume, (id) => bitmaps.get(id), overrides),
    )
  }, [costume, layer, revision, floating])

  useEffect(() => {
    if (overlayRef.current) {
      drawOverlay(overlayRef.current, {
        width,
        height,
        zoom,
        grid: showGrid,
        floating,
        draft,
      })
    }
  }, [width, height, zoom, showGrid, floating, draft])

  const toPixel = (e: React.PointerEvent): { x: number; y: number } => {
    const rect = e.currentTarget.getBoundingClientRect()
    return {
      x: Math.floor(((e.clientX - rect.left) * width) / rect.width),
      y: Math.floor(((e.clientY - rect.top) * height) / rect.height),
    }
  }

  return (
    <div className="canvas-area">
      <div className="canvas-scroll">
        <div
          className="canvas-stage"
          style={{ width: width * zoom, height: height * zoom }}
        >
          <canvas
            ref={mainRef}
            className="pixel canvas-main"
            style={{ width: width * zoom, height: height * zoom }}
          />
          <canvas
            ref={overlayRef}
            className="canvas-overlay"
            aria-label="描画キャンバス"
            style={{ width: width * zoom, height: height * zoom }}
            onPointerDown={(e) => {
              // 最初の1本のポインタだけを扱う（指と手のひら、ペンとマウスの併用対策）
              if (activePointer.current !== null) return
              activePointer.current = e.pointerId
              e.currentTarget.setPointerCapture(e.pointerId)
              pointerDown(toPixel(e), Math.max(1, Math.ceil(HANDLE_PX / zoom)))
            }}
            onPointerMove={(e) => {
              const p = toPixel(e)
              setCursor(p)
              if (
                activePointer.current === null ||
                activePointer.current === e.pointerId
              ) {
                pointerMove(p)
              }
            }}
            onPointerUp={(e) => {
              if (activePointer.current !== e.pointerId) return
              activePointer.current = null
              pointerUp()
            }}
            onPointerCancel={(e) => {
              if (activePointer.current !== e.pointerId) return
              activePointer.current = null
              pointerUp()
            }}
            onPointerLeave={() => setCursor(null)}
          />
        </div>
      </div>
      <div className="canvas-hud" role="group" aria-label="表示">
        <IconButton
          icon={ZoomOut}
          label="縮小"
          shortcut="-"
          size="sm"
          onClick={() => setZoom(zoom - 1)}
        />
        <span className="hud-zoom">{zoom}x</span>
        <IconButton
          icon={ZoomIn}
          label="拡大"
          shortcut="+"
          size="sm"
          onClick={() => setZoom(zoom + 1)}
        />
        <IconButton
          icon={Grid3x3}
          label="グリッド"
          size="sm"
          pressed={showGrid}
          onClick={() => setToolOptions({ showGrid: !showGrid })}
        />
        <span className="divider" aria-hidden />
        <span className="hud-text">
          {width} × {height} px
        </span>
        <span className="hud-text hud-cursor">
          {cursor &&
          cursor.x >= 0 &&
          cursor.y >= 0 &&
          cursor.x < width &&
          cursor.y < height
            ? `(${cursor.x}, ${cursor.y})`
            : ''}
        </span>
      </div>
    </div>
  )
}
