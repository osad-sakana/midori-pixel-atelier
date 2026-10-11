export type Point = { readonly x: number; readonly y: number }

type LayerBase = {
  readonly id: string
  readonly name: string
  readonly visible: boolean
  readonly locked: boolean
  readonly opacity: number
}

/** ピクセルバッファを持つレイヤー。実データは BitmapStore に assetId で置く */
export type RasterLayer = LayerBase & {
  readonly type: 'raster'
  readonly assetId: string
}

/** 将来 'shape' 等を足せるよう union にしておく */
export type Layer = RasterLayer

export type Costume = {
  readonly id: string
  readonly name: string
  readonly width: number
  readonly height: number
  readonly pivot: Point
  /** false: ピクセルアート向け（なめらか描画しない） */
  readonly antialias: boolean
  /** 下 → 上の順 */
  readonly layers: readonly Layer[]
}

export type Sprite = {
  readonly id: string
  readonly name: string
  readonly costumes: readonly Costume[]
}

export type Project = {
  readonly schemaVersion: number
  readonly id: string
  readonly name: string
  readonly sprites: readonly Sprite[]
}
