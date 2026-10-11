import { toSafeName } from '../naming'

export type CodeMode = 'single' | 'sheet' | 'class'

export type CodeInput = {
  readonly spriteName: string
  /** 現在のコスチュームの PNG ファイル名 */
  readonly costumeFile: string
  readonly sheetFile: string
  readonly frameWidth: number
  readonly frameHeight: number
  readonly frameCount: number
  readonly columns: number
  readonly padding: number
  readonly fps: number
  /** 画面での拡大率（ピクセルアートは整数倍） */
  readonly scale: number
}

const toClassName = (name: string): string => {
  const parts = toSafeName(name, 'sprite').split('_').filter(Boolean)
  const pascal = parts
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join('')
  return /^[0-9]/.test(pascal) ? `Sprite${pascal}` : pascal
}

const header = `import pygame
from pathlib import Path

# 画像ファイルは、このファイルと同じフォルダに置いてください
ASSETS = Path(__file__).parent

pygame.init()
screen = pygame.display.set_mode((640, 480))
clock = pygame.time.Clock()
`

const quitLoopStart = `running = True
while running:
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False

    screen.fill((30, 30, 30))
`

const loopEnd = `    pygame.display.flip()
    clock.tick(60)

pygame.quit()
`

const scaleLine = (scale: number, indent: string, variable: string): string =>
  scale > 1
    ? `${indent}${variable} = pygame.transform.scale(${variable}, (${variable}.get_width() * SCALE, ${variable}.get_height() * SCALE))\n`
    : ''

const scaleConst = (scale: number): string =>
  scale > 1 ? `SCALE = ${scale}\n` : ''

function single(input: CodeInput): string {
  const variable = toSafeName(input.costumeFile.replace(/\.png$/, ''), 'image')
  return `${header}
${scaleConst(input.scale)}# convert_alpha() は set_mode() のあとで呼びます
${variable} = pygame.image.load(ASSETS / "${input.costumeFile}").convert_alpha()
${scaleLine(input.scale, '', variable)}
${quitLoopStart}    screen.blit(${variable}, (100, 100))
${loopEnd}`
}

const frameConstants = (
  input: CodeInput,
): string => `FRAME_WIDTH = ${input.frameWidth}
FRAME_HEIGHT = ${input.frameHeight}
FRAME_COUNT = ${input.frameCount}
COLUMNS = ${input.columns}
PADDING = ${input.padding}
ANIMATION_FPS = ${input.fps}
${scaleConst(input.scale)}`

const loadFrames = (input: CodeInput): string => `def load_frames():
    sheet = pygame.image.load(ASSETS / "${input.sheetFile}").convert_alpha()
    frames = []
    for i in range(FRAME_COUNT):
        col = i % COLUMNS
        row = i // COLUMNS
        x = col * (FRAME_WIDTH + PADDING)
        y = row * (FRAME_HEIGHT + PADDING)
        frame = sheet.subsurface((x, y, FRAME_WIDTH, FRAME_HEIGHT)).copy()
${scaleLine(input.scale, '        ', 'frame')}        frames.append(frame)
    return frames
`

function sheet(input: CodeInput): string {
  return `${header}
${frameConstants(input)}

${loadFrames(input)}
frames = load_frames()

${quitLoopStart}    index = pygame.time.get_ticks() * ANIMATION_FPS // 1000 % FRAME_COUNT
    screen.blit(frames[index], (100, 100))
${loopEnd}`
}

function spriteClass(input: CodeInput): string {
  const className = toClassName(input.spriteName)
  return `${header}
${frameConstants(input)}

${loadFrames(input)}

class ${className}(pygame.sprite.Sprite):
    def __init__(self, x, y):
        super().__init__()
        self.frames = load_frames()
        self.frame_index = 0.0
        self.image = self.frames[0]
        self.rect = self.image.get_rect(topleft=(x, y))

    def update(self, dt):
        self.frame_index = (self.frame_index + ANIMATION_FPS * dt) % len(self.frames)
        self.image = self.frames[int(self.frame_index)]


sprite = ${className}(100, 100)
group = pygame.sprite.Group(sprite)

running = True
while running:
    dt = clock.tick(60) / 1000
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False

    group.update(dt)
    screen.fill((30, 30, 30))
    group.draw(screen)
    pygame.display.flip()

pygame.quit()
`
}

export function generatePygameCode(input: CodeInput, mode: CodeMode): string {
  if (mode === 'single') return single(input)
  if (mode === 'sheet') return sheet(input)
  return spriteClass(input)
}
