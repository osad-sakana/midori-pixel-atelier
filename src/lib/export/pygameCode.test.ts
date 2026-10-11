import { execFileSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'
import { generatePygameCode, type CodeInput } from './pygameCode'

const input: CodeInput = {
  spriteName: 'player',
  costumeFile: 'player_idle.png',
  sheetFile: 'player_sheet.png',
  frameWidth: 32,
  frameHeight: 48,
  frameCount: 6,
  columns: 3,
  padding: 2,
  fps: 8,
  scale: 1,
}

const hasPython = (() => {
  try {
    execFileSync('python3', ['--version'], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
})()

const compiles = (code: string): void => {
  execFileSync(
    'python3',
    ['-I', '-c', 'import ast,sys; ast.parse(sys.stdin.read())'],
    {
      input: code,
    },
  )
}

describe('generatePygameCode', () => {
  it('single: load と convert_alpha（set_mode の後）を出す', () => {
    const code = generatePygameCode(input, 'single')
    expect(code).toContain('pygame.image.load(ASSETS / "player_idle.png")')
    expect(code.indexOf('set_mode')).toBeLessThan(code.indexOf('convert_alpha'))
    expect(code).toContain('Path(__file__).parent')
  })

  it('sheet: subsurface で切り出し、padding を含める', () => {
    const code = generatePygameCode(input, 'sheet')
    expect(code).toContain('player_sheet.png')
    expect(code).toContain('subsurface')
    expect(code).toContain('FRAME_WIDTH = 32')
    expect(code).toContain('FRAME_HEIGHT = 48')
    expect(code).toContain('COLUMNS = 3')
    expect(code).toContain('PADDING = 2')
    expect(code).toContain('FRAME_COUNT = 6')
    expect(code).toContain('ANIMATION_FPS = 8')
    expect(code).toContain('.copy()')
  })

  it('class: Sprite を継承したアニメーションクラスを出す', () => {
    const code = generatePygameCode(input, 'class')
    expect(code).toContain('class Player(pygame.sprite.Sprite)')
    expect(code).toContain('def update')
  })

  it('scale>1 のときは transform.scale（smoothscale は使わない）', () => {
    const code = generatePygameCode({ ...input, scale: 4 }, 'sheet')
    expect(code).toContain('pygame.transform.scale')
    expect(code).not.toContain('smoothscale')
  })

  it('scale=1 では transform を使わない', () => {
    expect(generatePygameCode(input, 'sheet')).not.toContain('transform')
  })

  it('スプライト名が Python の識別子として不正でも安全なクラス名になる', () => {
    const code = generatePygameCode(
      { ...input, spriteName: '1 my-hero' },
      'class',
    )
    expect(code).toMatch(
      /class [A-Za-z_][A-Za-z0-9_]*\(pygame\.sprite\.Sprite\)/,
    )
  })

  it.skipIf(!hasPython)('3種類とも Python として構文が正しい', () => {
    for (const mode of ['single', 'sheet', 'class'] as const) {
      expect(() => compiles(generatePygameCode(input, mode))).not.toThrow()
      expect(() =>
        compiles(generatePygameCode({ ...input, scale: 3 }, mode)),
      ).not.toThrow()
    }
  })
})
