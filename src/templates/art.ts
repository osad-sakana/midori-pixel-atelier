/** お手本のドット絵。どれも 16×16 */
const SIZE = 16

type Cover = (x: number, y: number) => boolean

/** 範囲の外は「ぬりなし」として数える */
const around = (cover: Cover, x: number, y: number): boolean =>
  cover(x - 1, y) && cover(x + 1, y) && cover(x, y - 1) && cover(x, y + 1)

/** 形（cover）から、ふちどり付きの絵を作る。pick で中の色を決める */
function outlined(
  cover: Cover,
  outline: string,
  pick: (x: number, y: number) => string,
): string[] {
  return Array.from({ length: SIZE }, (_, y) =>
    Array.from({ length: SIZE }, (_, x) => {
      if (!cover(x, y)) return '.'
      return around(cover, x, y) ? pick(x, y) : outline
    }).join(''),
  )
}

const inRange = (x: number, y: number): boolean =>
  x >= 0 && y >= 0 && x < SIZE && y < SIZE

const hasPoint = (
  points: readonly (readonly [number, number])[],
  x: number,
  y: number,
): boolean => points.some(([px, py]) => px === x && py === y)

// ---- ハート ----

const heartCover: Cover = (px, py) => {
  if (!inRange(px, py)) return false
  const x = (px + 0.5 - 8) / 6.4
  const y = (8.5 - (py + 0.5)) / 6.4 + 0.1
  return (x * x + y * y - 1) ** 3 - x * x * y ** 3 <= 0
}

const HEART_SHINE = [
  [4, 5],
  [5, 5],
  [4, 6],
] as const

export const HEART_ART: readonly string[] = outlined(
  heartCover,
  'k',
  (x, y) => {
    if (hasPoint(HEART_SHINE, x, y)) return 'p'
    return x + y > 18 ? 'R' : 'r'
  },
)

// ---- コイン（まわる 4コマ） ----

function coinRows(scale: number): string[] {
  const cover: Cover = (x, y) => {
    if (!inRange(x, y)) return false
    const dy = y + 0.5 - 8
    const half = Math.max(1, Math.sqrt(Math.max(0, 64 - dy * dy)) * scale)
    return Math.abs(x + 0.5 - 8) <= half
  }
  return outlined(cover, 'Y', (x, y) => {
    if (scale >= 0.5 && (x === 7 || x === 8) && y >= 5 && y <= 10) return 'Y'
    if (scale === 1 && x >= 3 && x <= 5 && y >= 3 && y <= 5) return 'o'
    return 'y'
  })
}

export const COIN_FRAMES: readonly (readonly string[])[] = [
  coinRows(1),
  coinRows(0.6),
  coinRows(0.25),
  coinRows(0.6),
]

// ---- スライド（スライム 2コマ） ----

/** 上から順に、中心から左右へ何ピクセル広がるか（y は絵の中の行番号） */
function slimeRows(
  halves: Readonly<Record<number, number>>,
  eyes: readonly (readonly [number, number])[],
  shine: readonly (readonly [number, number])[],
): string[] {
  const cover: Cover = (x, y) => {
    const half = halves[y]
    return half !== undefined && inRange(x, y) && Math.abs(x + 0.5 - 8) <= half
  }
  return outlined(cover, 'k', (x, y) => {
    const eye = eyes.findIndex(
      ([ex, ey]) => x - ex >= 0 && x - ex < 2 && y - ey >= 0 && y - ey < 2,
    )
    if (eye >= 0) {
      const [ex, ey] = eyes[eye] as readonly [number, number]
      return x === ex && y === ey ? 'w' : 'k'
    }
    if (hasPoint(shine, x, y)) return 'l'
    return x + 0.5 - 8 > (halves[y] ?? 0) - 3 ? 'G' : 'g'
  })
}

export const SLIME_FRAMES: readonly (readonly string[])[] = [
  slimeRows(
    {
      4: 3,
      5: 5,
      6: 6,
      7: 7,
      8: 7,
      9: 8,
      10: 8,
      11: 8,
      12: 8,
      13: 8,
      14: 7,
      15: 6,
    },
    [
      [5, 9],
      [9, 9],
    ],
    [
      [4, 7],
      [5, 7],
      [4, 8],
    ],
  ),
  slimeRows(
    { 8: 4, 9: 6, 10: 7, 11: 8, 12: 8, 13: 8, 14: 8, 15: 7 },
    [
      [4, 11],
      [10, 11],
    ],
    [
      [3, 10],
      [4, 10],
    ],
  ),
]

// ---- ぼうけんしゃ（歩く 4コマ） ----

const HERO_UPPER = [
  '.....kkkkkk.....',
  '....kNNNNNNk....',
  '...kNNNNNNNNk...',
  '...kNssssssNk...',
  '...kskssssksk...',
  '...ksssrrsssk...',
  '....kssssssk....',
  '...kbbbbbbbbk...',
  '..ksbbbbbbbbsk..',
  '..ksbbBBBBbbsk..',
  '...kBBBBBBBBk...',
] as const

const HERO_LEGS = {
  stand: [
    '...knnk.knnk....',
    '...knnk.knnk....',
    '...knnk.knnk....',
    '..kNNNk.kNNNk...',
    '..kkkkk.kkkkk...',
  ],
  apart: [
    '...knnk...knnk..',
    '..knnk.....knnk.',
    '..knnk.....knnk.',
    '.kNNNk.....kNNNk',
    '.kkkkk.....kkkkk',
  ],
  together: [
    '....knnnnnnk....',
    '....knnnnnnk....',
    '....knnnnnnk....',
    '....kNNNNNNk....',
    '....kkkkkkkk....',
  ],
} as const

export const HERO_FRAMES: readonly (readonly string[])[] = [
  HERO_LEGS.stand,
  HERO_LEGS.apart,
  HERO_LEGS.together,
  HERO_LEGS.apart,
].map((legs) => [...HERO_UPPER, ...legs])

// ---- タイル（くさ・つち） ----

function tileRows(
  base: string,
  specks: readonly [string, string],
  seed: number,
): string[] {
  return Array.from({ length: SIZE }, (_, y) =>
    Array.from({ length: SIZE }, (_, x) => {
      const hash = ((x * 73856093) ^ (y * 19349663) ^ (seed * 83492791)) >>> 0
      const value = hash % 100
      if (value < 6) return specks[0]
      if (value < 10) return specks[1]
      return base
    }).join(''),
  )
}

export const GRASS_ART: readonly string[] = tileRows('g', ['G', 'l'], 3)
export const DIRT_ART: readonly string[] = tileRows('n', ['N', 'd'], 7)
