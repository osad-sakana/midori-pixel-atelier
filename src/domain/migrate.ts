type Migration = (data: Record<string, unknown>) => Record<string, unknown>

/**
 * 版 N → N+1 の純粋関数。キーは「移行元の版」。
 * 例: スキーマ v2 を作るとき `1: (d) => ({ ...d, schemaVersion: 2, ... })` を足す
 */
const migrations: Readonly<Record<number, Migration>> = {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function migrateToCurrent(input: unknown, currentVersion: number): unknown {
  if (!isRecord(input)) throw new Error('プロジェクトデータの形式が正しくありません')

  const version = input.schemaVersion
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    throw new Error('プロジェクトのバージョンが不正です')
  }
  if (version > currentVersion) {
    throw new Error(
      `このファイルはより新しいバージョン(v${version})で作られています。アプリを更新してください`,
    )
  }

  let data: Record<string, unknown> = input
  for (let v = version; v < currentVersion; v++) {
    const migrate = migrations[v]
    if (!migrate) throw new Error(`v${v} からの移行処理がありません`)
    data = migrate(data)
  }
  return data
}
