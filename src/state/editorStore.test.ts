import { beforeEach, describe, expect, it } from 'vitest'
import { getPixel, setPixel, type Rgba } from '../lib/bitmap/draw'
import type { ShapeFloating } from '../editor/floating'
import {
  addCostume,
  addLayer,
  addSprite,
  bitmaps,
  commitFloating,
  deleteCostume,
  deleteLayer,
  deleteSprite,
  duplicateCostume,
  editActiveLayer,
  getActive,
  newProject,
  redo,
  resizeCostume,
  setFloating,
  setToolOptions,
  transformCostume,
  undo,
  updateLayer,
  useEditor,
} from './editorStore'

const RED: Rgba = [255, 0, 0, 255]
const state = () => useEditor.getState()
const activeBitmap = () => bitmaps.get(getActive().layer.assetId)!

beforeEach(() => {
  newProject()
})

describe('初期状態', () => {
  it('スプライト1つ・コスチューム1つ・レイヤー1枚で、空の画像を持つ', () => {
    const { sprite, costume, layer } = getActive()
    expect(state().project.sprites).toHaveLength(1)
    expect(sprite.costumes).toHaveLength(1)
    expect(costume.layers).toHaveLength(1)
    expect(getPixel(bitmaps.get(layer.assetId)!, 0, 0)).toEqual([0, 0, 0, 0])
    expect(state().canUndo).toBe(false)
  })
})

describe('ピクセル編集の Undo/Redo', () => {
  it('編集 → undo で元に戻り、redo でやり直せる', () => {
    editActiveLayer('点', (d) => setPixel(d, 3, 3, RED))
    expect(getPixel(activeBitmap(), 3, 3)).toEqual(RED)
    expect(state().canUndo).toBe(true)

    undo()
    expect(getPixel(activeBitmap(), 3, 3)).toEqual([0, 0, 0, 0])
    expect(state().canRedo).toBe(true)

    redo()
    expect(getPixel(activeBitmap(), 3, 3)).toEqual(RED)
  })

  it('変化がない編集は履歴に積まない', () => {
    editActiveLayer('何もしない', () => {})
    expect(state().canUndo).toBe(false)
  })
})

describe('未確定オブジェクト', () => {
  const shape: ShapeFloating = {
    kind: 'shape',
    shape: 'rect',
    start: { x: 1, y: 1 },
    end: { x: 3, y: 3 },
    color: RED,
    size: 1,
    fill: true,
    brushShape: 'square',
  }

  it('確定するまでレイヤーは変わらず、確定で描かれる', () => {
    setFloating(shape)
    expect(getPixel(activeBitmap(), 2, 2)).toEqual([0, 0, 0, 0])
    commitFloating()
    expect(getPixel(activeBitmap(), 2, 2)).toEqual(RED)
    expect(state().floating).toBeNull()
    undo()
    expect(getPixel(activeBitmap(), 2, 2)).toEqual([0, 0, 0, 0])
  })

  it('未確定中の undo は未確定を破棄するだけ', () => {
    editActiveLayer('点', (d) => setPixel(d, 0, 0, RED))
    setFloating(shape)
    undo()
    expect(state().floating).toBeNull()
    expect(getPixel(activeBitmap(), 0, 0)).toEqual(RED)
  })

  it('色を変えると未確定の図形にも反映される', () => {
    setFloating(shape)
    setToolOptions({ color: '#0000ff' })
    const floating = state().floating
    expect(floating?.kind === 'shape' && floating.color).toEqual([
      0, 0, 255, 255,
    ])
  })
})

describe('レイヤー', () => {
  it('追加して選択され、undo で消える', () => {
    addLayer()
    expect(getActive().costume.layers).toHaveLength(2)
    const added = state().layerId
    undo()
    expect(getActive().costume.layers).toHaveLength(1)
    expect(state().layerId).not.toBe(added)
    redo()
    expect(getActive().costume.layers).toHaveLength(2)
    expect(bitmaps.get(getActive().costume.layers[1]!.assetId)).toBeDefined()
  })

  it('最後の1枚は削除できず、通知が出る', () => {
    deleteLayer(state().layerId)
    expect(getActive().costume.layers).toHaveLength(1)
    expect(state().message).toMatch(/最後/)
  })

  it('不透明度と表示を変更できる', () => {
    updateLayer(state().layerId, { opacity: 0.5, visible: false })
    expect(getActive().layer).toMatchObject({ opacity: 0.5, visible: false })
  })
})

describe('コスチューム', () => {
  it('複製は画像が独立している', () => {
    editActiveLayer('点', (d) => setPixel(d, 0, 0, RED))
    duplicateCostume(state().costumeId)
    expect(getActive().sprite.costumes).toHaveLength(2)
    editActiveLayer('消す', (d) => setPixel(d, 0, 0, [0, 0, 0, 0]))
    const first = getActive().sprite.costumes[0]!
    expect(getPixel(bitmaps.get(first.layers[0]!.assetId)!, 0, 0)).toEqual(RED)
  })

  it('最後の1つは削除できない', () => {
    deleteCostume(state().costumeId)
    expect(getActive().sprite.costumes).toHaveLength(1)
  })

  it('追加すると現在のサイズで増える', () => {
    addCostume()
    expect(getActive().sprite.costumes).toHaveLength(2)
    expect(getActive().costume.width).toBe(32)
  })

  it('左右反転と undo', () => {
    editActiveLayer('点', (d) => setPixel(d, 0, 0, RED))
    transformCostume('flipH')
    expect(getPixel(activeBitmap(), 31, 0)).toEqual(RED)
    undo()
    expect(getPixel(activeBitmap(), 0, 0)).toEqual(RED)
  })

  it('回転で幅と高さが入れ替わり、undo で戻る', () => {
    resizeCostume(16, 8)
    expect([getActive().costume.width, getActive().costume.height]).toEqual([
      16, 8,
    ])
    transformCostume('rotateCw')
    expect([getActive().costume.width, getActive().costume.height]).toEqual([
      8, 16,
    ])
    expect([activeBitmap().width, activeBitmap().height]).toEqual([8, 16])
    undo()
    expect([getActive().costume.width, getActive().costume.height]).toEqual([
      16, 8,
    ])
    expect([activeBitmap().width, activeBitmap().height]).toEqual([16, 8])
  })

  it('範囲外のサイズ変更は拒否して通知する', () => {
    resizeCostume(0, 10)
    expect(getActive().costume.width).toBe(32)
    expect(state().message).toMatch(/サイズ/)
  })
})

describe('スプライト', () => {
  it('追加すると選択され、最後の1つは消せない', () => {
    addSprite()
    expect(state().project.sprites).toHaveLength(2)
    deleteSprite(state().spriteId)
    expect(state().project.sprites).toHaveLength(1)
    deleteSprite(state().spriteId)
    expect(state().project.sprites).toHaveLength(1)
  })
})
