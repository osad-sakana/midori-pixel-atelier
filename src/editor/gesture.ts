import type { Point } from '../domain/types'
import { drawLine, floodFill, getPixel, stamp } from '../lib/bitmap/draw'
import { hexToRgba, rgbaToHex } from '../lib/color'
import {
  beginStroke,
  bitmaps,
  canEditActiveLayer,
  commitFloating,
  editActiveLayer,
  endStroke,
  getActive,
  setFloating,
  setSelectionDraft,
  setToolOptions,
  useEditor,
  type StrokeSession,
} from '../state/editorStore'
import { composeCostume } from './compose'
import {
  createSelection,
  hitTestShape,
  moveSelection,
  moveShape,
  moveShapeHandle,
  type HandleName,
  type Rect,
  type ShapeFloating,
  type ShapeKind,
} from './floating'

type Session =
  | { type: 'stroke'; stroke: StrokeSession; last: Point; erase: boolean }
  | { type: 'shapeCreate' }
  | { type: 'shapeHandle'; handle: HandleName }
  | { type: 'shapeMove'; last: Point }
  | { type: 'selectCreate'; start: Point }
  | { type: 'selectMove'; last: Point }
  | { type: 'pick' }

let session: Session | null = null

const state = useEditor.getState

const brushOptions = (erase: boolean) => {
  const s = state()
  return {
    size: s.brushSize,
    shape: s.brushShape,
    color: hexToRgba(s.color),
    erase,
  }
}

function pickColor(p: Point): void {
  const { costume } = getActive()
  const composite = composeCostume(costume, (id) => bitmaps.get(id))
  const pixel = getPixel(composite, p.x, p.y)
  if (pixel[3] > 0) setToolOptions({ color: rgbaToHex(pixel) })
}

const isShapeTool = (tool: string): tool is ShapeKind =>
  tool === 'line' || tool === 'rect' || tool === 'ellipse'

function newShape(shape: ShapeKind, p: Point): ShapeFloating {
  const s = state()
  return {
    kind: 'shape',
    shape,
    start: p,
    end: p,
    color: hexToRgba(s.color),
    size: s.brushSize,
    fill: s.fill,
    brushShape: s.brushShape,
  }
}

function selectionRect(a: Point, b: Point): Rect {
  const { costume } = getActive()
  const x0 = Math.max(0, Math.min(a.x, b.x))
  const y0 = Math.max(0, Math.min(a.y, b.y))
  const x1 = Math.min(costume.width - 1, Math.max(a.x, b.x))
  const y1 = Math.min(costume.height - 1, Math.max(a.y, b.y))
  return { x: x0, y: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 }
}

const insideSelection = (p: Point): boolean => {
  const { floating } = state()
  if (floating?.kind !== 'selection') return false
  const { offset, pixels } = floating
  return (
    p.x >= offset.x &&
    p.y >= offset.y &&
    p.x < offset.x + pixels.width &&
    p.y < offset.y + pixels.height
  )
}

/** handleRadius: ハンドルをつかめる範囲（画像ピクセル単位。ズームに応じて呼び出し側が決める） */
export function pointerDown(p: Point, handleRadius = 1): void {
  const { tool, floating } = state()

  if (tool === 'eyedropper') {
    pickColor(p)
    session = { type: 'pick' }
    return
  }

  if (isShapeTool(tool)) {
    if (floating?.kind === 'shape') {
      const hit = hitTestShape(floating, p, handleRadius)
      if (hit === 'start' || hit === 'end') {
        session = { type: 'shapeHandle', handle: hit }
        return
      }
      if (hit === 'body') {
        session = { type: 'shapeMove', last: p }
        return
      }
    }
    commitFloating()
    if (!canEditActiveLayer()) return
    setFloating(newShape(tool, p))
    session = { type: 'shapeCreate' }
    return
  }

  if (tool === 'select') {
    if (insideSelection(p)) {
      session = { type: 'selectMove', last: p }
      return
    }
    commitFloating()
    if (!canEditActiveLayer()) return
    session = { type: 'selectCreate', start: p }
    setSelectionDraft(selectionRect(p, p))
    return
  }

  if (!canEditActiveLayer()) return

  if (tool === 'fill') {
    const color = hexToRgba(state().color)
    editActiveLayer('塗りつぶし', (draft) => floodFill(draft, p.x, p.y, color))
    return
  }

  // brush / eraser
  const stroke = beginStroke()
  if (!stroke) return
  const erase = tool === 'eraser'
  stamp(stroke.draft, p.x, p.y, brushOptions(erase))
  session = { type: 'stroke', stroke, last: p, erase }
  bitmaps.replace(stroke.assetId, stroke.draft)
}

export function pointerMove(p: Point): void {
  if (!session) return
  const { floating } = state()

  switch (session.type) {
    case 'stroke': {
      const { stroke, last, erase } = session
      drawLine(stroke.draft, last.x, last.y, p.x, p.y, brushOptions(erase))
      bitmaps.replace(stroke.assetId, stroke.draft)
      session = { ...session, last: p }
      return
    }
    case 'shapeCreate':
      if (floating?.kind === 'shape') setFloating({ ...floating, end: p })
      return
    case 'shapeHandle':
      if (floating?.kind === 'shape')
        setFloating(moveShapeHandle(floating, session.handle, p))
      return
    case 'shapeMove': {
      const [dx, dy] = [p.x - session.last.x, p.y - session.last.y]
      if (floating?.kind === 'shape' && (dx !== 0 || dy !== 0)) {
        setFloating(moveShape(floating, dx, dy))
        session = { ...session, last: p }
      }
      return
    }
    case 'selectMove': {
      const [dx, dy] = [p.x - session.last.x, p.y - session.last.y]
      if (floating?.kind === 'selection' && (dx !== 0 || dy !== 0)) {
        setFloating(moveSelection(floating, dx, dy))
        session = { ...session, last: p }
      }
      return
    }
    case 'selectCreate':
      setSelectionDraft(selectionRect(session.start, p))
      return
    case 'pick':
      pickColor(p)
  }
}

export function pointerUp(): void {
  const current = session
  session = null
  if (!current) return

  if (current.type === 'stroke') {
    endStroke(current.erase ? '消しゴム' : 'ブラシ', current.stroke)
  } else if (current.type === 'selectCreate') {
    const area = state().selectionDraft
    setSelectionDraft(null)
    const { layer } = getActive()
    const base = bitmaps.get(layer.assetId)
    if (area && base) setFloating(createSelection(base, area))
  }
}
