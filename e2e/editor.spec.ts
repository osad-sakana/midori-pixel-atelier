import { expect, test, type Page } from '@playwright/test'

/** メインキャンバスの (x, y) ピクセルの RGBA を読む */
async function pixelAt(page: Page, x: number, y: number): Promise<number[]> {
  return page.locator('canvas.canvas-main').evaluate(
    (canvas, [px, py]) => {
      const c = canvas as HTMLCanvasElement
      return Array.from(c.getContext('2d')!.getImageData(px!, py!, 1, 1).data)
    },
    [x, y],
  )
}

/** キャンバス上の画像ピクセル座標をクリック/ドラッグする（32x32 を想定） */
async function dragOnCanvas(
  page: Page,
  from: [number, number],
  to: [number, number],
) {
  const box = (await page.getByLabel('描画キャンバス').boundingBox())!
  const toScreen = ([x, y]: [number, number]) => ({
    x: box.x + ((x + 0.5) * box.width) / 32,
    y: box.y + ((y + 0.5) * box.height) / 32,
  })
  const a = toScreen(from)
  const b = toScreen(to)
  await page.mouse.move(a.x, a.y)
  await page.mouse.down()
  await page.mouse.move(b.x, b.y, { steps: 6 })
  await page.mouse.up()
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: 'pygame素材メーカー' }),
  ).toBeVisible()
})

test('ブラシで描け、Undo/Redo できる', async ({ page }) => {
  await dragOnCanvas(page, [2, 2], [10, 2])
  const [r, g, b, a] = await pixelAt(page, 5, 2)
  expect(a).toBe(255)
  expect([r, g, b]).not.toEqual([0, 0, 0])

  await page.getByRole('button', { name: '元に戻す' }).click()
  expect((await pixelAt(page, 5, 2))[3]).toBe(0)

  await page.getByRole('button', { name: 'やり直す' }).click()
  expect((await pixelAt(page, 5, 2))[3]).toBe(255)
})

test('図形は確定するまで動かせる', async ({ page }) => {
  await page.getByRole('button', { name: '四角', exact: true }).click()
  await dragOnCanvas(page, [4, 4], [8, 8])
  // 本体をドラッグして右へ10px移動
  await dragOnCanvas(page, [6, 6], [16, 6])
  await page.keyboard.press('Enter')
  expect((await pixelAt(page, 16, 6))[3]).toBe(255)
  expect((await pixelAt(page, 6, 6))[3]).toBe(0)
})

test('レイヤーを追加・非表示にできる', async ({ page }) => {
  await dragOnCanvas(page, [2, 2], [10, 2])
  await page.getByRole('button', { name: 'レイヤーを追加' }).click()
  await expect(page.getByLabel('レイヤー名')).toHaveCount(2)
  await expect(page.getByLabel('レイヤー名').first()).toHaveValue('レイヤー2')
  await page.getByRole('button', { name: 'レイヤー1 の表示' }).click()
  expect((await pixelAt(page, 5, 2))[3]).toBe(0)
  await page.getByRole('button', { name: 'レイヤー1 の表示' }).click()
  expect((await pixelAt(page, 5, 2))[3]).toBe(255)
})

test('コスチュームを追加するとシートが2枚になる', async ({ page }) => {
  await page.getByRole('button', { name: '空のコスチュームを追加' }).click()
  await page.getByRole('tab', { name: 'シート' }).click()
  await expect(page.getByText('2 枚')).toBeVisible()
})

test('プロジェクトを ZIP で保存して読み込める', async ({ page }) => {
  await dragOnCanvas(page, [2, 2], [10, 2])
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: '保存（ZIP）' }).click()
  const file = await download
  expect(file.suggestedFilename()).toMatch(/\.zip$/)
  const path = await file.path()

  // 新規にしてから読み込み直す
  await page.getByRole('button', { name: '新規' }).click()
  await page.getByRole('button', { name: '新しく作る' }).click()
  expect((await pixelAt(page, 5, 2))[3]).toBe(0)

  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: '開く' }).click()
  await (await chooser).setFiles(path)
  await expect(page.getByText('プロジェクトを読み込みました')).toBeVisible()
  expect((await pixelAt(page, 5, 2))[3]).toBe(255)
})

test('リロードしても自動保存から復元される', async ({ page }) => {
  await dragOnCanvas(page, [2, 2], [10, 2])
  await expect(page.getByText('ブラウザに自動保存しました')).toBeVisible({
    timeout: 10_000,
  })
  await page.reload()
  await expect(page.getByLabel('描画キャンバス')).toBeVisible()
  expect((await pixelAt(page, 5, 2))[3]).toBe(255)
})

test('素材セットをダウンロードできる', async ({ page }) => {
  await page.getByRole('tab', { name: 'シート' }).click()
  const download = page.waitForEvent('download')
  await page
    .getByRole('button', { name: '素材セット（ZIP）をダウンロード' })
    .click()
  expect((await download).suggestedFilename()).toBe('sprite1_assets.zip')
})
