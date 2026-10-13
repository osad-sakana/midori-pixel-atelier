import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from './settings'

const memory = new Map<string, string>()

beforeEach(() => {
  memory.clear()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => memory.get(k) ?? null,
    setItem: (k: string, v: string) => void memory.set(k, v),
  })
})

describe('settings', () => {
  it('未保存なら既定値', () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
  })

  it('保存した値を読み戻す', () => {
    saveSettings({ ...DEFAULT_SETTINGS, brushSize: 5, color: '#ff0000' })
    expect(loadSettings()).toMatchObject({ brushSize: 5, color: '#ff0000' })
  })

  it('壊れた JSON や不正な値は既定値に戻す', () => {
    memory.set('midori-pixel-atelier:settings', '{oops')
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
    memory.set(
      'midori-pixel-atelier:settings',
      JSON.stringify({ brushSize: -5, color: 'red' }),
    )
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
  })

  it('localStorage が使えなくても落ちない', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    })
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
    expect(() => saveSettings(DEFAULT_SETTINGS)).not.toThrow()
  })
})
