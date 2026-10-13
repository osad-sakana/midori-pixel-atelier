import type { SpriteExportPlan } from './exportPlan'

const MAX_DISPLAY_PX = 96
const MAX_SCALE = 8

/** ウィンドウで見やすいように、小さい絵を整数倍に拡大する倍率 */
function displayScale(width: number, height: number): number {
  const scale = Math.floor(MAX_DISPLAY_PX / Math.max(width, height, 1))
  return Math.min(MAX_SCALE, Math.max(1, scale))
}

export const exampleFileName = (plan: SpriteExportPlan): string =>
  `${plan.spriteName}_example.py`

/**
 * 書き出したシート画像を pygame で動かす、初心者向けのサンプルコード。
 * 名前はすべて ASCII の安全な名前なので、そのまま Python の文字列に埋め込める
 */
export function buildPygameExample(plan: SpriteExportPlan): string {
  const { layout, settings, sheetFile, spriteName } = plan
  const frames = layout.frames.map((f) => `(${f.x}, ${f.y})`).join(', ')
  const scale = displayScale(layout.frameWidth, layout.frameHeight)

  return `# ${sheetFile} を使って、キャラクターを動かすサンプルです。
#
# 使いかた
#   1. ターミナルで  pip install pygame  を実行する（はじめの1回だけ）
#   2. ZIP を展開して、このファイルがあるフォルダで  python ${exampleFileName(plan)}  を実行する
#   3. 矢印キー（または W A S D）で動かせます。ウィンドウを閉じると終わります。

import pygame

SHEET_FILE = ${JSON.stringify(sheetFile)}  # スプライトシートの画像
FRAME_W = ${layout.frameWidth}  # 1コマの幅
FRAME_H = ${layout.frameHeight}  # 1コマの高さ
FRAMES = [${frames}]  # 各コマの左上の位置 (x, y)
FPS = ${settings.fps}  # 1秒間に切りかわるコマの数
SCALE = ${scale}  # 画面で何倍に大きくするか
SPEED = 4  # 1回の更新で動くピクセル数

pygame.init()
screen = pygame.display.set_mode((640, 480))
pygame.display.set_caption(${JSON.stringify(spriteName)})
clock = pygame.time.Clock()

# シート画像を読みこんで、コマごとに切り出す
sheet = pygame.image.load(SHEET_FILE).convert_alpha()
images = []
for x, y in FRAMES:
    frame = sheet.subsurface((x, y, FRAME_W, FRAME_H))
    # ピクセルがにじまないように、なめらかにしない拡大（scale）を使う
    images.append(pygame.transform.scale(frame, (FRAME_W * SCALE, FRAME_H * SCALE)))

x, y = 320, 240  # キャラクターの位置（中心）
frame_number = 0.0  # いま何コマ目か

running = True
while running:
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False

    keys = pygame.key.get_pressed()
    dx = 0
    dy = 0
    if keys[pygame.K_LEFT] or keys[pygame.K_a]:
        dx -= SPEED
    if keys[pygame.K_RIGHT] or keys[pygame.K_d]:
        dx += SPEED
    if keys[pygame.K_UP] or keys[pygame.K_w]:
        dy -= SPEED
    if keys[pygame.K_DOWN] or keys[pygame.K_s]:
        dy += SPEED
    x += dx
    y += dy

    # 動いているあいだだけ、コマを進める
    if dx != 0 or dy != 0:
        frame_number += FPS / 60

    image = images[int(frame_number) % len(images)]

    screen.fill((40, 44, 60))
    screen.blit(image, image.get_rect(center=(x, y)))
    pygame.display.flip()
    clock.tick(60)

pygame.quit()
`
}
