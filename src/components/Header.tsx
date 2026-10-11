import { openProjectFile, saveProjectFile } from '../app/actions'
import { newProject, redo, rename, undo, useEditor } from '../state/editorStore'
import { useSaveStatus } from '../state/autosave'
import { EditableText } from './EditableText'

const STATUS_LABEL = {
  idle: '',
  saving: '自動保存中…',
  saved: 'ブラウザに自動保存しました',
  error: '自動保存に失敗しました（「保存」でファイルに残してください）',
} as const

export function Header() {
  const name = useEditor((s) => s.project.name)
  const canUndo = useEditor((s) => s.canUndo || s.floating !== null)
  const canRedo = useEditor((s) => s.canRedo)
  const status = useSaveStatus((s) => s.status)

  const confirmNew = (): void => {
    if (
      window.confirm(
        '新しいプロジェクトを作ります。いまの内容は消えます（先に「保存」しておくと安心です）。',
      )
    ) {
      newProject()
    }
  }

  return (
    <header className="app-header">
      <h1>pygame素材メーカー</h1>
      <EditableText
        className="project-name"
        label="プロジェクト名"
        value={name}
        onCommit={rename.project}
      />
      <div className="header-actions">
        <button type="button" onClick={confirmNew}>
          新規
        </button>
        <button type="button" onClick={() => void openProjectFile()}>
          開く
        </button>
        <button
          type="button"
          className="primary"
          onClick={() => void saveProjectFile()}
        >
          保存（ZIP）
        </button>
        <button
          type="button"
          onClick={undo}
          disabled={!canUndo}
          title="元に戻す（Ctrl+Z）"
        >
          ↶ 戻す
        </button>
        <button
          type="button"
          onClick={redo}
          disabled={!canRedo}
          title="やり直す（Ctrl+Shift+Z）"
        >
          ↷ やり直す
        </button>
      </div>
      <span className="save-status" role="status">
        {STATUS_LABEL[status]}
      </span>
    </header>
  )
}
