import { beforeEach, describe, expect, it } from 'vitest'
import { getPixel } from '../lib/bitmap/draw'
import {
  addLayer,
  bitmaps,
  getActive,
  newProject,
  redo,
  resizeCostume,
  setTool,
  setToolOptions,
  undo,
  updateLayer,
  useEditor,
} from '../state/editorStore'
import { pointerDown, pointerMove, pointerUp } from './gesture'

const RED = [255, 0, 0, 255]
const px = (x: number, y: number) =>
  getPixel(bitmaps.get(getActive().layer.assetId)!, x, y)
const state = () => useEditor.getState()

beforeEach(() => {
  newProject()
  setToolOptions({ color: '#ff0000', brushSize: 1, fill: true })
  setTool('brush')
})

const drag = (from: [number, number], to: [number, number], radius = 1) => {
  pointerDown({ x: from[0], y: from[1] }, radius)
  pointerMove({ x: to[0], y: to[1] })
  pointerUp()
}

describe('ブラシ', () => {
  it('ドラッグで線が引け、1回の undo で消える', () => {
    drag([1, 1], [6, 1])
    for (let x = 1; x <= 6; x++) expect(px(x, 1)).toEqual(RED)
    undo()
    expect(px(3, 1)).toEqual([0, 0, 0, 0])
    expect(state().canUndo).toBe(false)
  })

  it('消しゴムで消える', () => {
    drag([1, 1], [3, 1])
    setTool('eraser')
    drag([2, 1], [2, 1])
    expect(px(2, 1)).toEqual([0, 0, 0, 0])
    expect(px(1, 1)).toEqual(RED)
  })

  it('ロックされたレイヤーには描けない', () => {
    updateLayer(getActive().layer.id, { locked: true })
    drag([1, 1], [3, 1])
    expect(px(1, 1)).toEqual([0, 0, 0, 0])
    expect(state().message).toMatch(/ロック/)
  })

  it('非表示レイヤーには描けない', () => {
    updateLayer(getActive().layer.id, { visible: false })
    drag([1, 1], [3, 1])
    expect(px(1, 1)).toEqual([0, 0, 0, 0])
  })
})

describe('塗りつぶし', () => {
  it('クリックで全面が塗られる', () => {
    setTool('fill')
    drag([0, 0], [0, 0])
    expect(px(31, 31)).toEqual(RED)
  })
})

describe('スポイト', () => {
  it('合成結果から色を取る', () => {
    drag([5, 5], [5, 5])
    setToolOptions({ color: '#00ff00' })
    setTool('eyedropper')
    drag([5, 5], [5, 5])
    expect(state().color).toBe('#ff0000')
  })

  it('透明なところでは色を変えない', () => {
    setTool('eyedropper')
    drag([9, 9], [9, 9])
    expect(state().color).toBe('#ff0000')
  })
})

describe('図形（未確定オブジェクト）', () => {
  it('ドラッグ中は未確定で、別のツールに切り替えると確定する', () => {
    setTool('rect')
    drag([2, 2], [5, 5])
    expect(state().floating?.kind).toBe('shape')
    expect(px(3, 3)).toEqual([0, 0, 0, 0])
    setTool('brush')
    expect(state().floating).toBeNull()
    expect(px(3, 3)).toEqual(RED)
  })

  it('ハンドルをドラッグして大きさを変えられる', () => {
    setTool('rect')
    drag([2, 2], [5, 5])
    drag([5, 5], [8, 8])
    setTool('brush')
    expect(px(8, 8)).toEqual(RED)
  })

  it('本体をドラッグして移動できる', () => {
    setTool('rect')
    drag([2, 2], [6, 6])
    drag([4, 4], [14, 4])
    setTool('brush')
    expect(px(14, 2)).toEqual(RED)
    expect(px(3, 3)).toEqual([0, 0, 0, 0])
  })

  it('図形の外をクリックすると前の図形を確定して新しい図形を始める', () => {
    setTool('rect')
    drag([2, 2], [4, 4])
    drag([20, 20], [24, 24])
    expect(px(3, 3)).toEqual(RED)
    expect(state().floating?.kind).toBe('shape')
  })

  it('図形の確定は1回の undo で戻せる', () => {
    setTool('ellipse')
    drag([2, 2], [10, 10])
    setTool('brush')
    undo()
    expect(px(6, 6)).toEqual([0, 0, 0, 0])
  })
})

describe('範囲選択', () => {
  it('選択してドラッグで移動できる', () => {
    drag([3, 3], [3, 3])
    setTool('select')
    drag([2, 2], [4, 4])
    expect(state().floating?.kind).toBe('selection')
    drag([3, 3], [13, 3])
    setTool('brush')
    expect(px(13, 3)).toEqual(RED)
    expect(px(3, 3)).toEqual([0, 0, 0, 0])
  })

  it('選択範囲は画像の内側に収まる', () => {
    setTool('select')
    drag([-5, -5], [4, 4])
    const f = state().floating
    expect(
      f?.kind === 'selection' && [f.pixels.width, f.pixels.height],
    ).toEqual([5, 5])
  })
})

describe('レイヤー切り替え', () => {
  it('未確定の図形は元のレイヤーに確定される', () => {
    const firstLayer = getActive().layer.id
    setTool('rect')
    drag([2, 2], [4, 4])
    addLayer()
    expect(state().layerId).not.toBe(firstLayer)
    const first = getActive().costume.layers.find((l) => l.id === firstLayer)!
    expect(getPixel(bitmaps.get(first.assetId)!, 3, 3)).toEqual(RED)
  })
})

describe('操作の割り込み', () => {
  it('ストローク中の undo は、その描画を取り消すだけで履歴を壊さない', () => {
    resizeCostume(40, 40)
    pointerDown({ x: 1, y: 1 }, 1)
    undo()
    pointerMove({ x: 5, y: 1 })
    pointerUp()
    expect(px(3, 1)).toEqual([0, 0, 0, 0])
    const bmp = bitmaps.get(getActive().layer.assetId)!
    expect([bmp.width, bmp.height]).toEqual([40, 40])
    expect([getActive().costume.width, getActive().costume.height]).toEqual([
      40, 40,
    ])
    expect(state().canUndo).toBe(true)
  })

  it('ストローク中の redo も何も壊さない', () => {
    drag([1, 1], [2, 1])
    undo()
    pointerDown({ x: 5, y: 5 }, 1)
    redo()
    pointerUp()
    expect(state().canUndo).toBe(false)
    expect(px(1, 1)).toEqual([0, 0, 0, 0])
  })

  it('2本目のポインタ（マルチタッチ）は無視される', () => {
    pointerDown({ x: 0, y: 0 }, 1)
    pointerDown({ x: 10, y: 10 }, 1)
    pointerUp()
    pointerUp()
    expect(px(10, 10)).toEqual([0, 0, 0, 0])
    undo()
    expect(px(0, 0)).toEqual([0, 0, 0, 0])
  })
})
