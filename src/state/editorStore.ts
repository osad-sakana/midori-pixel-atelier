import { create } from 'zustand'
import {
  addLayer as addLayerOp,
  findCostume,
  moveItem,
  removeCostume,
  removeLayer,
  removeSprite,
  renameCostume,
  renameSprite,
  setLayerProps,
  setSheetSettings,
  updateCostume,
  updateSprite,
} from '../domain/ops'
import {
  createCostume,
  createProject,
  createRasterLayer,
  createSprite,
  newId,
} from '../domain/factory'
import type {
  Costume,
  Layer,
  Project,
  SheetSettings,
  Sprite,
} from '../domain/types'
import { cloneBitmap, createBitmap, type Bitmap } from '../lib/bitmap/bitmap'
import { createBitmapStore } from '../lib/bitmap/bitmapStore'
import type { BrushShape } from '../lib/bitmap/draw'
import { flipH, flipV, rotate90, crop } from '../lib/bitmap/transform'
import { hexToRgba } from '../lib/color'
import {
  applyPatch,
  diffBitmaps,
  patchBytes,
  type Patch,
} from '../lib/history/patch'
import { createHistory, type HistoryEntry } from '../lib/history/history'
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
} from '../lib/storage/settings'
import { renderFloating, type Floating, type Rect } from '../editor/floating'

export type Tool =
  | 'brush'
  | 'eraser'
  | 'fill'
  | 'line'
  | 'rect'
  | 'ellipse'
  | 'select'
  | 'eyedropper'

export type CostumeTransform = 'flipH' | 'flipV' | 'rotateCw' | 'rotateCcw'

export const MAX_COSTUME_SIZE = 1024
const HISTORY_LIMIT_BYTES = 128 * 1024 * 1024
const DEFAULT_COSTUME_SIZE = 32

/** ピクセルの正データ。Zustand には入れず、revision だけを state に反映する */
export const bitmaps = createBitmapStore()
const history = createHistory<Project>(HISTORY_LIMIT_BYTES)

export type EditorState = {
  project: Project
  spriteId: string
  costumeId: string
  layerId: string
  tool: Tool
  color: string
  brushSize: number
  brushShape: BrushShape
  fill: boolean
  showGrid: boolean
  zoom: number
  floating: Floating | null
  /** ドラッグ中の範囲選択の枠 */
  selectionDraft: Rect | null
  /** 画像が変わるたびに増える（再描画のきっかけ） */
  revision: number
  canUndo: boolean
  canRedo: boolean
  message: string | null
}

type Selection = Pick<EditorState, 'spriteId' | 'costumeId' | 'layerId'>

function registerCostume(costume: Costume): Costume {
  for (const layer of costume.layers)
    bitmaps.create(layer.assetId, costume.width, costume.height)
  return costume
}

function createInitial(): { project: Project; selection: Selection } {
  const sprite = createSprite('sprite1')
  const costume = registerCostume(
    createCostume({
      name: 'costume1',
      width: DEFAULT_COSTUME_SIZE,
      height: DEFAULT_COSTUME_SIZE,
    }),
  )
  const project = createProject('新しいプロジェクト')
  const full = { ...project, sprites: [{ ...sprite, costumes: [costume] }] }
  return {
    project: full,
    selection: {
      spriteId: sprite.id,
      costumeId: costume.id,
      layerId: costume.layers[0]!.id,
    },
  }
}

/** 指定の選択が有効ならそれを、無効なら先頭を選ぶ */
function validSelection(
  project: Project,
  prefer: Partial<Selection>,
): Selection {
  const sprite =
    project.sprites.find((s) => s.id === prefer.spriteId) ?? project.sprites[0]
  if (!sprite) throw new Error('スプライトがありません')
  const costume =
    sprite.costumes.find((c) => c.id === prefer.costumeId) ?? sprite.costumes[0]
  if (!costume) throw new Error('コスチュームがありません')
  const layer =
    costume.layers.find((l) => l.id === prefer.layerId) ??
    costume.layers[costume.layers.length - 1]
  if (!layer) throw new Error('レイヤーがありません')
  return { spriteId: sprite.id, costumeId: costume.id, layerId: layer.id }
}

const initial = createInitial()
const prefs = loadSettings()

export const useEditor = create<EditorState>(() => ({
  project: initial.project,
  ...initial.selection,
  tool: 'brush',
  color: prefs.color,
  brushSize: prefs.brushSize,
  brushShape: prefs.brushShape,
  fill: prefs.fill,
  showGrid: prefs.showGrid,
  zoom: 12,
  floating: null,
  selectionDraft: null,
  revision: 0,
  canUndo: false,
  canRedo: false,
  message: null,
}))

const get = useEditor.getState
const set = useEditor.setState

bitmaps.subscribe(() => set((s) => ({ revision: s.revision + 1 })))

let messageTimer: ReturnType<typeof setTimeout> | undefined
export function notify(message: string): void {
  set({ message })
  clearTimeout(messageTimer)
  messageTimer = setTimeout(() => set({ message: null }), 4000)
}

const syncHistoryFlags = (): void =>
  set({ canUndo: history.canUndo(), canRedo: history.canRedo() })

// ---- 現在の選択 ----

export function getActive(state: EditorState = get()): {
  sprite: Sprite
  costume: Costume
  layer: Layer
} {
  const sprite = state.project.sprites.find((s) => s.id === state.spriteId)
  const costume = sprite?.costumes.find((c) => c.id === state.costumeId)
  const layer = costume?.layers.find((l) => l.id === state.layerId)
  if (!sprite || !costume || !layer) throw new Error('選択が不正です')
  return { sprite, costume, layer }
}

// ---- 履歴 ----

type PixelChange = { before: Bitmap | undefined; after: Bitmap | undefined }

/** プロジェクト構造とピクセルの変更を、1回の Undo 単位として記録する */
function commitEdit(
  label: string,
  nextProject: Project,
  changes: ReadonlyMap<string, PixelChange> = new Map(),
  nextSelection?: Partial<Selection>,
): void {
  const state = get()
  const patches: Patch[] = []
  for (const [assetId, change] of changes) {
    const patch = diffBitmaps(assetId, change.before, change.after)
    if (patch) patches.push(patch)
  }
  if (patches.length === 0 && nextProject === state.project) return

  const entry: HistoryEntry<Project> = {
    label,
    before: state.project,
    after: nextProject,
    patches,
    bytes: patches.reduce((sum, p) => sum + patchBytes(p), 0),
  }
  history.push(entry)
  set({
    project: nextProject,
    ...validSelection(nextProject, { ...state, ...nextSelection }),
  })
  syncHistoryFlags()
}

function applyEntry(
  entry: HistoryEntry<Project>,
  direction: 'before' | 'after',
): void {
  const patches =
    direction === 'before' ? [...entry.patches].reverse() : entry.patches
  for (const patch of patches) {
    if (patch.kind === 'full') {
      const target = patch[direction]
      if (target) bitmaps.replace(patch.assetId, target)
      else bitmaps.delete(patch.assetId)
    } else {
      bitmaps.update(
        patch.assetId,
        (draft) => void applyPatch(draft, patch, direction),
      )
    }
  }
  const project = entry[direction]
  set({ project, floating: null, ...validSelection(project, get()) })
}

let abortGesture: (() => boolean) | null = null

/** 操作中（ドラッグ中）の描画を取り消す関数を登録する。操作を中断したら true を返す */
export function registerGestureAbort(fn: () => boolean): void {
  abortGesture = fn
}

export function undo(): void {
  // ドラッグの途中なら、その操作を取り消すだけ（履歴を壊さない）
  if (abortGesture?.()) return
  if (get().floating) {
    set({ floating: null })
    return
  }
  const entry = history.undo()
  if (entry) applyEntry(entry, 'before')
  syncHistoryFlags()
}

export function redo(): void {
  if (abortGesture?.()) return
  // 未確定のオブジェクトを黙って捨てないよう、確定または破棄するまで redo しない
  if (get().floating) return
  const entry = history.redo()
  if (entry) applyEntry(entry, 'after')
  syncHistoryFlags()
}

// ---- ピクセル編集 ----

export type StrokeSession = {
  readonly assetId: string
  readonly before: Bitmap
  readonly draft: Bitmap
}

export function beginStroke(): StrokeSession | undefined {
  const { layer } = getActive()
  const before = bitmaps.get(layer.assetId)
  if (!before) return undefined
  const draft = cloneBitmap(before)
  return { assetId: layer.assetId, before, draft }
}

/** ドラフトに描き足した内容を画面に反映する（履歴にはまだ積まない） */
export function updateStroke(session: StrokeSession): void {
  bitmaps.replace(session.assetId, session.draft)
}

export function endStroke(label: string, session: StrokeSession): void {
  const changes = new Map([
    [session.assetId, { before: session.before, after: session.draft }],
  ])
  commitEdit(label, get().project, changes)
}

/** 現在のレイヤーに対する1回きりの編集 */
export function editActiveLayer(
  label: string,
  draw: (draft: Bitmap) => void,
): void {
  const session = beginStroke()
  if (!session) return
  draw(session.draft)
  updateStroke(session)
  endStroke(label, session)
}

export function setFloating(floating: Floating | null): void {
  set({ floating })
}

export function commitFloating(): void {
  const { floating } = get()
  if (!floating) return
  const { layer } = getActive()
  const base = bitmaps.get(layer.assetId)
  // ロック中/非表示のレイヤーには書き込まず、破棄して理由を知らせる
  if (!canEditActiveLayer()) {
    set({ floating: null })
    return
  }
  set({ floating: null })
  if (!base) return
  const after = renderFloating(base, floating)
  bitmaps.replace(layer.assetId, after)
  commitEdit(
    floating.kind === 'shape' ? '図形を確定' : '選択範囲を移動',
    get().project,
    new Map([[layer.assetId, { before: base, after }]]),
  )
}

/** 編集してよいレイヤーか。だめなら理由を通知する */
export function canEditActiveLayer(): boolean {
  const { layer } = getActive()
  if (layer.locked) notify('このレイヤーはロックされています')
  else if (!layer.visible) notify('このレイヤーは非表示です')
  return !layer.locked && layer.visible
}

// ---- ツール設定 ----

function persistPrefs(): void {
  const { color, brushSize, brushShape, fill, showGrid } = get()
  saveSettings({
    ...DEFAULT_SETTINGS,
    color,
    brushSize,
    brushShape,
    fill,
    showGrid,
  })
}

/** 未確定の図形があれば、スタイル変更をそのまま反映する（後から編集できる） */
function restyleFloating(
  patch: Partial<
    Pick<EditorState, 'color' | 'brushSize' | 'brushShape' | 'fill'>
  >,
): void {
  const { floating } = get()
  if (floating?.kind !== 'shape') return
  set({
    floating: {
      ...floating,
      ...(patch.color === undefined ? {} : { color: hexToRgba(patch.color) }),
      ...(patch.brushSize === undefined ? {} : { size: patch.brushSize }),
      ...(patch.brushShape === undefined
        ? {}
        : { brushShape: patch.brushShape }),
      ...(patch.fill === undefined ? {} : { fill: patch.fill }),
    },
  })
}

export function setTool(tool: Tool): void {
  commitFloating()
  set({ tool, selectionDraft: null })
}

export function setToolOptions(
  patch: Partial<
    Pick<
      EditorState,
      'color' | 'brushSize' | 'brushShape' | 'fill' | 'showGrid'
    >
  >,
): void {
  set(patch)
  restyleFloating(patch)
  persistPrefs()
}

export const setZoom = (zoom: number): void =>
  set({ zoom: Math.min(48, Math.max(1, Math.round(zoom))) })
export const setSelectionDraft = (selectionDraft: Rect | null): void =>
  set({ selectionDraft })

// ---- 選択 ----

export function selectSprite(spriteId: string): void {
  commitFloating()
  set(validSelection(get().project, { spriteId }))
}

export function selectCostume(costumeId: string): void {
  commitFloating()
  const { spriteId } = get()
  set(validSelection(get().project, { spriteId, costumeId }))
}

export function selectLayer(layerId: string): void {
  commitFloating()
  set({ layerId })
}

// ---- スプライト / コスチューム ----

function cloneLayers(costume: Costume): Layer[] {
  return costume.layers.map((layer) => {
    const assetId = newId()
    const src = bitmaps.get(layer.assetId)
    bitmaps.replace(
      assetId,
      src ? cloneBitmap(src) : createBitmap(costume.width, costume.height),
    )
    return { ...layer, id: newId(), assetId }
  })
}

const nextName = (
  base: string,
  existing: readonly { name: string }[],
): string => `${base}${existing.length + 1}`

export function addSprite(): void {
  commitFloating()
  const { project } = get()
  const sprite = createSprite(nextName('sprite', project.sprites))
  const costume = registerCostume(
    createCostume({
      name: 'costume1',
      width: DEFAULT_COSTUME_SIZE,
      height: DEFAULT_COSTUME_SIZE,
    }),
  )
  const next = {
    ...project,
    sprites: [...project.sprites, { ...sprite, costumes: [costume] }],
  }
  commitEdit('スプライトを追加', next, new Map(), {
    spriteId: sprite.id,
    costumeId: costume.id,
    layerId: costume.layers[0]!.id,
  })
}

export function deleteSprite(spriteId: string): void {
  const { project } = get()
  if (project.sprites.length <= 1)
    return notify('最後のスプライトは削除できません')
  commitFloating()
  commitEdit('スプライトを削除', removeSprite(project, spriteId), new Map(), {
    spriteId: undefined,
  })
}

export const rename = {
  sprite: (id: string, name: string): void =>
    commitEdit('スプライト名を変更', renameSprite(get().project, id, name)),
  costume: (id: string, name: string): void =>
    commitEdit(
      'コスチューム名を変更',
      renameCostume(get().project, get().spriteId, id, name),
    ),
  project: (name: string): void =>
    commitEdit('プロジェクト名を変更', { ...get().project, name }),
}

export function addCostume(width?: number, height?: number): void {
  commitFloating()
  const { project, spriteId } = get()
  const { sprite, costume: current } = getActive()
  const costume = registerCostume(
    createCostume({
      name: nextName('costume', sprite.costumes),
      width: width ?? current.width,
      height: height ?? current.height,
    }),
  )
  const next = updateSprite(project, spriteId, (s) => ({
    ...s,
    costumes: [...s.costumes, costume],
  }))
  commitEdit('コスチュームを追加', next, new Map(), {
    costumeId: costume.id,
    layerId: costume.layers[0]!.id,
  })
}

/** 画像（読み込み/スライス結果）から新しいコスチュームを追加する。1回の Undo でまとめて戻せる */
export function addCostumesFromBitmaps(
  items: readonly { name: string; bitmap: Bitmap }[],
  label: string,
): void {
  if (items.length === 0) return
  commitFloating()
  const { project, spriteId } = get()
  const costumes = items.map(({ name, bitmap }) => {
    const costume = createCostume({
      name,
      width: bitmap.width,
      height: bitmap.height,
    })
    bitmaps.replace(costume.layers[0]!.assetId, bitmap)
    return costume
  })
  const next = updateSprite(project, spriteId, (s) => ({
    ...s,
    costumes: [...s.costumes, ...costumes],
  }))
  const last = costumes[costumes.length - 1]!
  commitEdit(label, next, new Map(), {
    costumeId: last.id,
    layerId: last.layers[0]!.id,
  })
}

export function duplicateCostume(costumeId: string): void {
  commitFloating()
  const { project, spriteId } = get()
  const found = findCostume(project, spriteId, costumeId)
  if (!found) return
  const copy: Costume = {
    ...found.costume,
    id: newId(),
    name: `${found.costume.name}_copy`,
    layers: cloneLayers(found.costume),
  }
  const next = updateSprite(project, spriteId, (s) => {
    const at = s.costumes.findIndex((c) => c.id === costumeId)
    return {
      ...s,
      costumes: [
        ...s.costumes.slice(0, at + 1),
        copy,
        ...s.costumes.slice(at + 1),
      ],
    }
  })
  commitEdit('コスチュームを複製', next, new Map(), {
    costumeId: copy.id,
    layerId: copy.layers[copy.layers.length - 1]!.id,
  })
}

export function deleteCostume(costumeId: string): void {
  const { project, spriteId } = get()
  const { sprite } = getActive()
  if (sprite.costumes.length <= 1)
    return notify('最後のコスチュームは削除できません')
  commitFloating()
  commitEdit(
    'コスチュームを削除',
    removeCostume(project, spriteId, costumeId),
    new Map(),
    {
      costumeId: undefined,
    },
  )
}

export function moveCostume(from: number, to: number): void {
  const { project, spriteId } = get()
  commitEdit(
    'コスチュームを並べ替え',
    updateSprite(project, spriteId, (s) => ({
      ...s,
      costumes: moveItem(s.costumes, from, to),
    })),
  )
}

export function updateSheet(settings: SheetSettings): void {
  const { project, spriteId } = get()
  commitEdit('シート設定を変更', setSheetSettings(project, spriteId, settings))
}

// ---- レイヤー ----

export function addLayer(): void {
  commitFloating()
  const { project, spriteId, costumeId } = get()
  const { costume } = getActive()
  const layer = createRasterLayer(`レイヤー${costume.layers.length + 1}`)
  bitmaps.create(layer.assetId, costume.width, costume.height)
  commitEdit(
    'レイヤーを追加',
    addLayerOp(project, spriteId, costumeId, layer),
    new Map(),
    {
      layerId: layer.id,
    },
  )
}

export function duplicateLayer(layerId: string): void {
  commitFloating()
  const { project, spriteId, costumeId } = get()
  const { costume } = getActive()
  const source = costume.layers.find((l) => l.id === layerId)
  if (!source) return
  const assetId = newId()
  const src = bitmaps.get(source.assetId)
  bitmaps.replace(
    assetId,
    src ? cloneBitmap(src) : createBitmap(costume.width, costume.height),
  )
  const copy: Layer = {
    ...source,
    id: newId(),
    assetId,
    name: `${source.name}_copy`,
  }
  const next = updateCostume(project, spriteId, costumeId, (c) => {
    const at = c.layers.findIndex((l) => l.id === layerId)
    return {
      ...c,
      layers: [...c.layers.slice(0, at + 1), copy, ...c.layers.slice(at + 1)],
    }
  })
  commitEdit('レイヤーを複製', next, new Map(), { layerId: copy.id })
}

export function deleteLayer(layerId: string): void {
  const { project, spriteId, costumeId } = get()
  const { costume } = getActive()
  if (costume.layers.length <= 1)
    return notify('最後のレイヤーは削除できません')
  commitFloating()
  commitEdit(
    'レイヤーを削除',
    removeLayer(project, spriteId, costumeId, layerId),
    new Map(),
    {
      layerId: undefined,
    },
  )
}

export function updateLayer(
  layerId: string,
  props: Partial<Pick<Layer, 'name' | 'visible' | 'locked' | 'opacity'>>,
): void {
  commitFloating()
  const { project, spriteId, costumeId } = get()
  commitEdit(
    'レイヤーを変更',
    setLayerProps(project, spriteId, costumeId, layerId, props),
  )
}

export function moveLayer(from: number, to: number): void {
  commitFloating()
  const { project, spriteId, costumeId } = get()
  commitEdit(
    'レイヤーを並べ替え',
    updateCostume(project, spriteId, costumeId, (c) => ({
      ...c,
      layers: moveItem(c.layers, from, to),
    })),
  )
}

// ---- コスチューム全体の変形 ----

function transformedPivot(
  costume: Costume,
  kind: CostumeTransform,
): { x: number; y: number } {
  const { x, y } = costume.pivot
  if (kind === 'flipH') return { x: costume.width - x, y }
  if (kind === 'flipV') return { x, y: costume.height - y }
  if (kind === 'rotateCw') return { x: costume.height - y, y: x }
  return { x: y, y: costume.width - x }
}

export function transformCostume(kind: CostumeTransform): void {
  commitFloating()
  const { project, spriteId, costumeId } = get()
  const { costume } = getActive()
  const changes = new Map<string, PixelChange>()
  for (const layer of costume.layers) {
    const before = bitmaps.get(layer.assetId)
    if (!before) continue
    const after =
      kind === 'flipH'
        ? flipH(before)
        : kind === 'flipV'
          ? flipV(before)
          : rotate90(before, kind === 'rotateCw')
    bitmaps.replace(layer.assetId, after)
    changes.set(layer.assetId, { before, after })
  }
  const rotated = kind === 'rotateCw' || kind === 'rotateCcw'
  const next = updateCostume(project, spriteId, costumeId, (c) => ({
    ...c,
    width: rotated ? c.height : c.width,
    height: rotated ? c.width : c.height,
    pivot: transformedPivot(c, kind),
  }))
  commitEdit('コスチュームを変形', next, changes)
}

export function resizeCostume(width: number, height: number): void {
  const w = Math.round(width)
  const h = Math.round(height)
  if (w < 1 || h < 1 || w > MAX_COSTUME_SIZE || h > MAX_COSTUME_SIZE) {
    return notify(`サイズは 1〜${MAX_COSTUME_SIZE} の範囲で指定してください`)
  }
  commitFloating()
  const { project, spriteId, costumeId } = get()
  const { costume } = getActive()
  if (w === costume.width && h === costume.height) return
  const changes = new Map<string, PixelChange>()
  for (const layer of costume.layers) {
    const before = bitmaps.get(layer.assetId)
    if (!before) continue
    const after = crop(before, 0, 0, w, h)
    bitmaps.replace(layer.assetId, after)
    changes.set(layer.assetId, { before, after })
  }
  const next = updateCostume(project, spriteId, costumeId, (c) => ({
    ...c,
    width: w,
    height: h,
    pivot: { x: w / 2, y: h / 2 },
  }))
  commitEdit('キャンバスサイズを変更', next, changes)
}

// ---- プロジェクトの入れ替え ----

export function loadProject(
  project: Project,
  loaded: ReadonlyMap<string, Bitmap>,
): void {
  // 不正なプロジェクトで作業中のデータを失わないよう、先に検証してから入れ替える
  const selection = validSelection(project, {})
  bitmaps.clear()
  for (const [assetId, bitmap] of loaded) bitmaps.replace(assetId, bitmap)
  history.clear()
  set({
    project,
    floating: null,
    selectionDraft: null,
    ...selection,
  })
  syncHistoryFlags()
}

export function newProject(): void {
  const fresh = createInitial()
  bitmaps.clear()
  const loaded = new Map<string, Bitmap>()
  for (const sprite of fresh.project.sprites)
    for (const costume of sprite.costumes)
      for (const layer of costume.layers) {
        loaded.set(layer.assetId, createBitmap(costume.width, costume.height))
      }
  loadProject(fresh.project, loaded)
}
