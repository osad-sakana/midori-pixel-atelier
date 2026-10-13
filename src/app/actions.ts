import { strToU8, zipSync, type Zippable } from 'fflate'
import { composeCostume } from '../editor/compose'
import type { Bitmap } from '../lib/bitmap/bitmap'
import { planSpriteExport } from '../lib/export/exportPlan'
import {
  buildPygameExample,
  exampleFileName,
} from '../lib/export/pygameExample'
import { renderSheet, sliceSheet } from '../lib/export/spritesheet'
import { toSafeName } from '../lib/naming'
import {
  exportProjectZip,
  importProjectZip,
} from '../lib/storage/projectArchive'
import { buildTemplate } from '../templates/build'
import type { TemplateSpec } from '../templates/types'
import {
  downloadBytes,
  openFileDialog,
  pngCodec,
  readFileBytes,
} from '../platform/browser'
import {
  addCostumesFromBitmaps,
  bitmaps,
  commitFloating,
  getActive,
  loadProject,
  MAX_COSTUME_SIZE,
  notify,
  useEditor,
} from '../state/editorStore'

const getBitmap = (assetId: string) => bitmaps.get(assetId)
const errorMessage = (e: unknown): string =>
  e instanceof Error ? e.message : '不明なエラー'

/** 失敗しても画面を壊さず、通知として見せる */
async function guarded(task: () => Promise<void>): Promise<void> {
  try {
    await task()
  } catch (e) {
    notify(errorMessage(e))
  }
}

function currentPlan() {
  const { project, spriteId } = useEditor.getState()
  const index = project.sprites.findIndex((s) => s.id === spriteId)
  return planSpriteExport(getActive().sprite, index)
}

function flattenedCostumes(): Bitmap[] {
  return getActive().sprite.costumes.map((c) => composeCostume(c, getBitmap))
}

// ---- プロジェクトファイル ----

export const saveProjectFile = (): Promise<void> =>
  guarded(async () => {
    commitFloating()
    const { project } = useEditor.getState()
    const bytes = await exportProjectZip(project, getBitmap, pngCodec)
    downloadBytes(
      `${toSafeName(project.name, 'project')}.zip`,
      bytes,
      'application/zip',
    )
  })

export const openProjectFile = (): Promise<void> =>
  guarded(async () => {
    const file = await openFileDialog('.zip,application/zip')
    if (!file) return
    const loaded = await importProjectZip(await readFileBytes(file), pngCodec)
    loadProject(loaded.project, loaded.bitmaps)
    notify('プロジェクトを読み込みました')
  })

// ---- 画像の取り込み ----

const baseName = (fileName: string): string =>
  fileName.replace(/\.[^.]+$/, '') || 'image'

export const importImage = (): Promise<void> =>
  guarded(async () => {
    const file = await openFileDialog('image/*')
    if (!file) return
    const bitmap = await pngCodec.decode(await readFileBytes(file))
    if (bitmap.width > MAX_COSTUME_SIZE || bitmap.height > MAX_COSTUME_SIZE) {
      throw new Error(`画像が大きすぎます（1辺 ${MAX_COSTUME_SIZE}px まで）`)
    }
    addCostumesFromBitmaps(
      [{ name: baseName(file.name), bitmap }],
      '画像を読み込み',
    )
  })

export type SliceOptions = {
  cellWidth: number
  cellHeight: number
  padding: number
}

export const importSpriteSheet = (options: SliceOptions): Promise<void> =>
  guarded(async () => {
    const file = await openFileDialog('image/*')
    if (!file) return
    const sheet = await pngCodec.decode(await readFileBytes(file))
    const { cellWidth, cellHeight, padding } = options
    if (
      cellWidth < 1 ||
      cellHeight < 1 ||
      cellWidth > MAX_COSTUME_SIZE ||
      cellHeight > MAX_COSTUME_SIZE
    ) {
      throw new Error('セルのサイズを正しく入力してください')
    }
    const frames = sliceSheet(
      sheet,
      cellWidth,
      cellHeight,
      Math.max(0, padding),
    )
    const name = toSafeName(baseName(file.name), 'frame')
    addCostumesFromBitmaps(
      frames.map((bitmap, i) => ({ name: `${name}_${i + 1}`, bitmap })),
      'スプライトシートから切り出し',
    )
    notify(`${frames.length} 枚のコスチュームを追加しました`)
  })

// ---- 書き出し ----

export const downloadCostumePng = (): Promise<void> =>
  guarded(async () => {
    commitFloating()
    const { sprite, costume } = getActive()
    const plan = currentPlan()
    const index = sprite.costumes.findIndex((c) => c.id === costume.id)
    const bytes = await pngCodec.encode(composeCostume(costume, getBitmap))
    downloadBytes(plan.costumeFiles[index] ?? 'image.png', bytes, 'image/png')
  })

export function buildSheet(): Bitmap {
  return renderSheet(flattenedCostumes(), currentPlan().layout)
}

export const downloadSheetPng = (): Promise<void> =>
  guarded(async () => {
    commitFloating()
    const bytes = await pngCodec.encode(buildSheet())
    downloadBytes(currentPlan().sheetFile, bytes, 'image/png')
  })

/** 素材セット: 各コスチュームのPNG + シートPNG + pygame のサンプルコード */
export const downloadSpriteBundle = (): Promise<void> =>
  guarded(async () => {
    commitFloating()
    const plan = currentPlan()
    const frames = flattenedCostumes()
    const files: Zippable = {}
    for (const [i, file] of plan.costumeFiles.entries()) {
      files[file] = [await pngCodec.encode(frames[i] as Bitmap), { level: 0 }]
    }
    files[plan.sheetFile] = [await pngCodec.encode(buildSheet()), { level: 0 }]
    files[exampleFileName(plan)] = strToU8(buildPygameExample(plan))
    downloadBytes(
      `${plan.spriteName}_assets.zip`,
      zipSync(files),
      'application/zip',
    )
  })

// ---- テンプレート ----

/** いまのプロジェクトをテンプレートで置きかえる（確認は呼ぶ側で行う） */
export function startFromTemplate(spec: TemplateSpec): void {
  try {
    const loaded = buildTemplate(spec)
    loadProject(loaded.project, loaded.bitmaps)
    notify(`「${spec.title}」で始めました`)
  } catch (e) {
    notify(errorMessage(e))
  }
}
