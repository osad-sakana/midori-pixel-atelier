import type { SheetSettings } from '../domain/types'

export type CostumeSpec = {
  readonly name: string
  /** ドット絵（1文字が1ピクセル、`.` は透明）。省略するとまっさら */
  readonly rows?: readonly string[]
}

export type SpriteSpec = {
  /** 書き出すファイル名になるので ASCII にする */
  readonly name: string
  readonly width: number
  readonly height: number
  readonly costumes: readonly CostumeSpec[]
  readonly sheet?: SheetSettings
}

export type TemplateCategory = 'blank' | 'sample' | 'pygame'

export type TemplateSpec = {
  readonly id: string
  readonly category: TemplateCategory
  readonly title: string
  readonly description: string
  readonly sprites: readonly SpriteSpec[]
}
