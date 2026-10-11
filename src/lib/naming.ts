const PYTHON_KEYWORDS = new Set([
  'False',
  'None',
  'True',
  'and',
  'as',
  'assert',
  'async',
  'await',
  'break',
  'class',
  'continue',
  'def',
  'del',
  'elif',
  'else',
  'except',
  'finally',
  'for',
  'from',
  'global',
  'if',
  'import',
  'in',
  'is',
  'lambda',
  'nonlocal',
  'not',
  'or',
  'pass',
  'raise',
  'return',
  'try',
  'while',
  'with',
  'yield',
])

/** ファイル名にも Python の変数名にも使える ASCII の名前にする */
export function toSafeName(name: string, fallback: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  if (base === '') return fallback
  const safe = /^[0-9]/.test(base) ? `_${base}` : base
  return PYTHON_KEYWORDS.has(safe) ? `${safe}_` : safe
}

/** 重複した名前に _2, _3 ... を付けて一意にする（他の名前とも衝突しない番号を選ぶ） */
export function uniqueNames(names: readonly string[]): string[] {
  const reserved = new Set(names)
  const used = new Set<string>()
  return names.map((name) => {
    let candidate = name
    let n = 1
    while (used.has(candidate) || (n > 1 && reserved.has(candidate))) {
      n += 1
      candidate = `${name}_${n}`
    }
    used.add(candidate)
    return candidate
  })
}
