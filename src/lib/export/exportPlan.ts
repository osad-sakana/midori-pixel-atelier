import type { SheetSettings, Sprite } from '../../domain/types'
import { toSafeName, uniqueNames } from '../naming'
import {
  computeSheetLayout,
  DEFAULT_SHEET,
  type SheetLayout,
} from './spritesheet'

/** 書き出しのファイル名とシート配置。ファイル出力とコード出力で同じ名前を使うためにここで決める */
export type SpriteExportPlan = {
  readonly spriteName: string
  readonly costumeFiles: readonly string[]
  readonly sheetFile: string
  readonly settings: SheetSettings
  readonly layout: SheetLayout
}

export function planSpriteExport(
  sprite: Sprite,
  spriteIndex: number,
): SpriteExportPlan {
  const spriteName = toSafeName(sprite.name, `sprite${spriteIndex + 1}`)
  const costumeNames = uniqueNames(
    sprite.costumes.map((c, i) => toSafeName(c.name, `costume${i + 1}`)),
  )
  const settings = sprite.sheet ?? DEFAULT_SHEET
  return {
    spriteName,
    costumeFiles: costumeNames.map((name) => `${spriteName}_${name}.png`),
    sheetFile: `${spriteName}_sheet.png`,
    settings,
    layout: computeSheetLayout(sprite.costumes, settings),
  }
}
