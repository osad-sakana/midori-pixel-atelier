import { describe, expect, it } from 'vitest'
import { toSafeName, uniqueNames } from './naming'

describe('toSafeName', () => {
  it('英数字とアンダースコアの小文字にする', () => {
    expect(toSafeName('My Player-1', 'x')).toBe('my_player_1')
  })

  it('日本語だけなら fallback を使う', () => {
    expect(toSafeName('プレイヤー', 'sprite')).toBe('sprite')
  })

  it('数字で始まれば先頭に _ を足す', () => {
    expect(toSafeName('1up', 'x')).toBe('_1up')
  })

  it('連続・前後のアンダースコアを整理する', () => {
    expect(toSafeName('  a  b  ', 'x')).toBe('a_b')
  })

  it('Python の予約語は避ける', () => {
    expect(toSafeName('class', 'x')).toBe('class_')
  })
})

describe('uniqueNames', () => {
  it('重複に連番を付ける', () => {
    expect(uniqueNames(['a', 'a', 'b', 'a'])).toEqual(['a', 'a_2', 'b', 'a_3'])
  })
})
