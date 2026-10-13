import { z } from 'zod'

const KEY = 'midori-pixel-atelier:settings'

const settingsSchema = z.object({
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  brushSize: z.number().int().min(1).max(64),
  brushShape: z.enum(['square', 'round']),
  fill: z.boolean(),
  showGrid: z.boolean(),
})

export type Settings = z.infer<typeof settingsSchema>

export const DEFAULT_SETTINGS: Settings = {
  color: '#e63946',
  brushSize: 1,
  brushShape: 'square',
  fill: true,
  showGrid: true,
}

/** localStorage は「ブラウザの好み」だけを置く。使えない環境でも落とさない */
export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULT_SETTINGS
    const parsed = settingsSchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : DEFAULT_SETTINGS
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings))
  } catch {
    // 保存できなくても動作には影響しない
  }
}
