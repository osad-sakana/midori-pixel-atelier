import { describe, expect, it } from 'vitest'
import { createHistory, type HistoryEntry } from './history'

const entry = (label: string, bytes = 10): HistoryEntry<string> => ({
  label,
  before: `${label}-before`,
  after: `${label}-after`,
  patches: [],
  bytes,
})

describe('history', () => {
  it('最初は undo/redo できない', () => {
    const h = createHistory<string>(1000)
    expect(h.canUndo()).toBe(false)
    expect(h.canRedo()).toBe(false)
    expect(h.undo()).toBeUndefined()
    expect(h.redo()).toBeUndefined()
  })

  it('push → undo → redo の順に取り出せる', () => {
    const h = createHistory<string>(1000)
    h.push(entry('a'))
    h.push(entry('b'))
    expect(h.undo()?.label).toBe('b')
    expect(h.undo()?.label).toBe('a')
    expect(h.canUndo()).toBe(false)
    expect(h.redo()?.label).toBe('a')
    expect(h.redo()?.label).toBe('b')
  })

  it('undo 後に push すると redo は消える', () => {
    const h = createHistory<string>(1000)
    h.push(entry('a'))
    h.undo()
    h.push(entry('b'))
    expect(h.canRedo()).toBe(false)
  })

  it('バイト上限を超えたら古いものから捨てる（最新1件は残す）', () => {
    const h = createHistory<string>(25)
    h.push(entry('a', 10))
    h.push(entry('b', 10))
    h.push(entry('c', 10))
    expect(h.undo()?.label).toBe('c')
    expect(h.undo()?.label).toBe('b')
    expect(h.undo()).toBeUndefined()
  })

  it('上限より大きい1件でも最新は残す', () => {
    const h = createHistory<string>(5)
    h.push(entry('big', 100))
    expect(h.undo()?.label).toBe('big')
  })

  it('clear で空になる', () => {
    const h = createHistory<string>(100)
    h.push(entry('a'))
    h.clear()
    expect(h.canUndo()).toBe(false)
  })
})
