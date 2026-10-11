import { useMemo, useState } from 'react'
import { codeFor, downloadCodeFile } from '../app/actions'
import { getActive, notify, useEditor } from '../state/editorStore'
import type { CodeMode } from '../lib/export/pygameCode'

const MODES: readonly { mode: CodeMode; label: string; help: string }[] = [
  {
    mode: 'single',
    label: '1枚の画像',
    help: 'いまのコスチュームを load して表示',
  },
  {
    mode: 'sheet',
    label: 'シートでアニメ',
    help: 'subsurface で切り出して順番に表示',
  },
  {
    mode: 'class',
    label: 'Sprite クラス',
    help: 'pygame.sprite.Sprite を使った書き方',
  },
]

const SCALES = [1, 2, 3, 4, 6, 8] as const

export function CodePanel() {
  const project = useEditor((s) => s.project)
  const costume = useEditor((s) => getActive(s).costume)
  const spriteId = useEditor((s) => s.spriteId)
  const [mode, setMode] = useState<CodeMode>('single')
  const [scale, setScale] = useState(1)

  // 名前やシート設定が変わったときにコードを作り直す
  const code = useMemo(
    () => codeFor(mode, scale),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- project/costume の変更でコード内のファイル名・サイズが変わる
    [mode, scale, project, costume, spriteId],
  )

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(code)
      notify('コードをコピーしました')
    } catch {
      notify('コピーできませんでした。コードを選択してコピーしてください')
    }
  }

  return (
    <div className="panel-body">
      <div className="segmented" role="radiogroup" aria-label="コードの種類">
        {MODES.map((m) => (
          <button
            key={m.mode}
            type="button"
            role="radio"
            aria-checked={mode === m.mode}
            title={m.help}
            onClick={() => setMode(m.mode)}
          >
            {m.label}
          </button>
        ))}
      </div>
      <p className="hint">{MODES.find((m) => m.mode === mode)?.help}</p>

      <label className="slider-row">
        画面での拡大
        <select
          value={scale}
          onChange={(e) => setScale(Number(e.target.value))}
        >
          {SCALES.map((n) => (
            <option key={n} value={n}>
              {n}倍
            </option>
          ))}
        </select>
      </label>

      <pre className="code" aria-label="pygame のコード">
        <code>{code}</code>
      </pre>
      <div className="row wrap">
        <button type="button" className="primary" onClick={() => void copy()}>
          コピー
        </button>
        <button type="button" onClick={() => downloadCodeFile(code)}>
          main.py をダウンロード
        </button>
      </div>
      <p className="hint">
        画像ファイルは main.py
        と同じフォルダに置きます。ファイル名は英数字に直されます（日本語の名前は
        sprite1 のような連番になります）。
      </p>
    </div>
  )
}
