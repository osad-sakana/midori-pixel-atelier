import { describe, expect, it } from 'vitest'
import { migrateToCurrent } from './migrate'

describe('migrateToCurrent', () => {
  it('現行版のデータはそのまま返す', () => {
    const data = { schemaVersion: 1, name: 'p' }
    expect(migrateToCurrent(data, 1)).toBe(data)
  })

  it('移行処理が未定義の古い版はエラー', () => {
    expect(() => migrateToCurrent({ schemaVersion: 1 }, 2)).toThrow(/移行処理/)
  })

  it('版が不正ならエラー', () => {
    expect(() => migrateToCurrent({ schemaVersion: 0 }, 1)).toThrow()
    expect(() => migrateToCurrent({ schemaVersion: 1.5 }, 2)).toThrow()
    expect(() => migrateToCurrent({}, 1)).toThrow()
  })
})
