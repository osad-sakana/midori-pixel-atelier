import {
  COIN_FRAMES,
  DIRT_ART,
  GRASS_ART,
  HEART_ART,
  HERO_FRAMES,
  SLIME_FRAMES,
} from './art'
import type { CostumeSpec, SpriteSpec, TemplateSpec } from './types'

const numbered = (
  prefix: string,
  frames: readonly (readonly string[] | undefined)[],
): CostumeSpec[] =>
  frames.map((rows, i) => ({
    name: `${prefix}_${i + 1}`,
    ...(rows ? { rows } : {}),
  }))

const blankFrames = (count: number): undefined[] =>
  Array.from({ length: count }, () => undefined)

// ---- お手本の部品（「お手本」と「ゲームの素材セット」で共有する） ----

const HERO: SpriteSpec = {
  name: 'hero',
  width: 16,
  height: 16,
  costumes: numbered('walk', HERO_FRAMES),
  sheet: { columns: 4, padding: 0, fps: 6 },
}

const COIN: SpriteSpec = {
  name: 'coin',
  width: 16,
  height: 16,
  costumes: numbered('spin', COIN_FRAMES),
  sheet: { columns: 4, padding: 0, fps: 8 },
}

const SLIME: SpriteSpec = {
  name: 'slime',
  width: 16,
  height: 16,
  costumes: numbered('bounce', SLIME_FRAMES),
  sheet: { columns: 2, padding: 0, fps: 3 },
}

const TILES: SpriteSpec = {
  name: 'tiles',
  width: 16,
  height: 16,
  costumes: [
    { name: 'grass', rows: GRASS_ART },
    { name: 'dirt', rows: DIRT_ART },
  ],
  sheet: { columns: 2, padding: 0, fps: 1 },
}

const HEART: SpriteSpec = {
  name: 'heart',
  width: 16,
  height: 16,
  costumes: [{ name: 'heart', rows: HEART_ART }],
  sheet: { columns: 1, padding: 0, fps: 1 },
}

const blankSprite = (
  name: string,
  size: number,
  frames: number,
  fps: number,
): SpriteSpec => ({
  name,
  width: size,
  height: size,
  costumes: numbered(name, blankFrames(frames)),
  sheet: { columns: Math.min(frames, 4), padding: 0, fps },
})

export const TEMPLATES: readonly TemplateSpec[] = [
  // ---- まっさら（サイズやコマ数だけ決めてある） ----
  {
    id: 'blank-small',
    category: 'blank',
    title: '小さな絵（16×16）',
    description: 'アイテムやアイコンにぴったりの小さなキャンバス。',
    sprites: [blankSprite('item', 16, 1, 1)],
  },
  {
    id: 'blank-character',
    category: 'blank',
    title: 'キャラクター（32×32）',
    description: 'ちょっと細かく描けるキャラクター用のキャンバス。',
    sprites: [blankSprite('character', 32, 1, 1)],
  },
  {
    id: 'blank-walk',
    category: 'blank',
    title: '歩くキャラ（4コマ）',
    description: '4コマのパラパラ漫画で、歩くアニメーションを作れます。',
    sprites: [blankSprite('player', 32, 4, 8)],
  },
  {
    id: 'blank-two-frames',
    category: 'blank',
    title: '2コマのアニメ',
    description: 'ぷるぷる動くスライムなど、かんたんなアニメ用です。',
    sprites: [blankSprite('enemy', 16, 2, 3)],
  },
  {
    id: 'blank-tile',
    category: 'blank',
    title: 'タイル（16×16）',
    description: '地面や壁など、ならべて使うマス目の絵用です。',
    sprites: [blankSprite('tile', 16, 1, 1)],
  },

  // ---- お手本（描きこみずみ。まねしたり、色をかえたりできます） ----
  {
    id: 'sample-heart',
    category: 'sample',
    title: 'ハート',
    description: 'ライフ表示に使えるハート。色をかえて遊んでみよう。',
    sprites: [HEART],
  },
  {
    id: 'sample-coin',
    category: 'sample',
    title: 'コイン（くるくる）',
    description: '4コマでくるくる回るコイン。アニメのお手本です。',
    sprites: [COIN],
  },
  {
    id: 'sample-slime',
    category: 'sample',
    title: 'スライム（ぷるぷる）',
    description: '2コマだけでも、ちゃんと動いて見えます。',
    sprites: [SLIME],
  },
  {
    id: 'sample-hero',
    category: 'sample',
    title: 'ぼうけんしゃ（歩く）',
    description: '4コマで歩くキャラクター。足の動かし方を見てみよう。',
    sprites: [HERO],
  },
  {
    id: 'sample-tiles',
    category: 'sample',
    title: 'タイル（くさ・つち）',
    description: 'ならべて使う地面のタイル。くさとつちの2まいです。',
    sprites: [TILES],
  },

  // ---- pygame ゲーム用（書き出すと、動かせるサンプルコード付き） ----
  {
    id: 'pygame-ready',
    category: 'pygame',
    title: 'ゲーム素材セット（かんせい版）',
    description:
      'ぼうけんしゃ・コイン・スライム・タイルが入っています。そのまま pygame で動かせます。',
    sprites: [HERO, COIN, SLIME, TILES],
  },
  {
    id: 'pygame-draw',
    category: 'pygame',
    title: 'ゲーム素材セット（自分で描く）',
    description:
      '主人公・コイン・てき・タイルの入れ物だけ用意。描いてゲームを作ろう。',
    sprites: [
      blankSprite('player', 16, 4, 6),
      blankSprite('coin', 16, 4, 8),
      blankSprite('enemy', 16, 2, 3),
      blankSprite('tile', 16, 1, 1),
    ],
  },
]

export const TEMPLATE_CATEGORIES = [
  { id: 'blank', label: 'まっさら' },
  { id: 'sample', label: 'お手本' },
  { id: 'pygame', label: 'pygame ゲーム用' },
] as const
