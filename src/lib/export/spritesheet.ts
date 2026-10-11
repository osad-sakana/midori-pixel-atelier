import { createBitmap, type Bitmap } from '../bitmap/bitmap'
import { blit, crop } from '../bitmap/transform'
import type { Point, SheetSettings } from '../../domain/types'

export const DEFAULT_SHEET: SheetSettings = { columns: 4, padding: 0, fps: 8 }

export type FrameSource = {
  readonly width: number
  readonly height: number
  readonly pivot: Point
}

export type FramePlacement = {
  /** シート上の枠の左上 */
  readonly x: number
  readonly y: number
  /** 枠の中での描画位置（サイズが違う画像を中央寄せ） */
  readonly offsetX: number
  readonly offsetY: number
}

export type SheetLayout = {
  readonly frameWidth: number
  readonly frameHeight: number
  readonly columns: number
  readonly rows: number
  readonly padding: number
  readonly sheetWidth: number
  readonly sheetHeight: number
  readonly frames: readonly FramePlacement[]
}

const clamp = (v: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, v))

/** 全コスチュームの最大サイズを枠にして、列数で折り返して並べる。枠の間にだけ padding を入れる */
export function computeSheetLayout(
  sources: readonly FrameSource[],
  settings: SheetSettings,
): SheetLayout {
  if (sources.length === 0) throw new Error('コスチュームがありません')
  const frameWidth = Math.max(...sources.map((s) => s.width))
  const frameHeight = Math.max(...sources.map((s) => s.height))
  const columns = clamp(Math.round(settings.columns), 1, sources.length)
  const rows = Math.ceil(sources.length / columns)
  const { padding } = settings

  return {
    frameWidth,
    frameHeight,
    columns,
    rows,
    padding,
    sheetWidth: columns * frameWidth + (columns - 1) * padding,
    sheetHeight: rows * frameHeight + (rows - 1) * padding,
    frames: sources.map((src, i) => ({
      x: (i % columns) * (frameWidth + padding),
      y: Math.floor(i / columns) * (frameHeight + padding),
      offsetX: clamp(
        Math.round(frameWidth / 2 - src.pivot.x),
        0,
        frameWidth - src.width,
      ),
      offsetY: clamp(
        Math.round(frameHeight / 2 - src.pivot.y),
        0,
        frameHeight - src.height,
      ),
    })),
  }
}

/** 合成済みのフレーム画像（コスチュームごと）をレイアウト通りに並べる */
export function renderSheet(
  frames: readonly Bitmap[],
  layout: SheetLayout,
): Bitmap {
  const sheet = createBitmap(layout.sheetWidth, layout.sheetHeight)
  frames.forEach((frame, i) => {
    const place = layout.frames[i]
    if (place)
      blit(sheet, frame, place.x + place.offsetX, place.y + place.offsetY)
  })
  return sheet
}

const isEmpty = (bmp: Bitmap): boolean => {
  for (let i = 3; i < bmp.data.length; i += 4)
    if (bmp.data[i] !== 0) return false
  return true
}

/** セルサイズで格子状に切り出す。末尾の透明なフレームは捨てる（最低1枚は返す） */
export function sliceSheet(
  sheet: Bitmap,
  cellWidth: number,
  cellHeight: number,
  padding: number,
): Bitmap[] {
  const columns = Math.floor((sheet.width + padding) / (cellWidth + padding))
  const rows = Math.floor((sheet.height + padding) / (cellHeight + padding))
  if (columns < 1 || rows < 1) throw new Error('セルサイズが画像より大きいです')

  const frames: Bitmap[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < columns; c++) {
      frames.push(
        crop(
          sheet,
          c * (cellWidth + padding),
          r * (cellHeight + padding),
          cellWidth,
          cellHeight,
        ),
      )
    }
  }
  while (frames.length > 1 && isEmpty(frames[frames.length - 1] as Bitmap))
    frames.pop()
  return frames
}
