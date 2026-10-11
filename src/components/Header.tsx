import {
  Download,
  FilePlus2,
  FolderOpen,
  Redo2,
  Sparkles,
  Undo2,
} from 'lucide-react'
import { openProjectFile, saveProjectFile } from '../app/actions'
import { newProject, redo, rename, undo, useEditor } from '../state/editorStore'
import { useSaveStatus } from '../state/autosave'
import { Button } from '../ui/Button'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { IconButton } from '../ui/IconButton'
import { EditableText } from './EditableText'

const STATUS_LABEL = {
  idle: 'ブラウザに自動保存されます',
  saving: '自動保存中…',
  saved: 'ブラウザに自動保存しました',
  error: '自動保存できませんでした。「保存」でファイルに残してください',
} as const

export function Header() {
  const name = useEditor((s) => s.project.name)
  const canUndo = useEditor((s) => s.canUndo || s.floating !== null)
  const canRedo = useEditor((s) => s.canRedo)
  const status = useSaveStatus((s) => s.status)

  return (
    <header className="app-header">
      <div className="brand">
        <span className="brand-mark" aria-hidden>
          <Sparkles size={18} strokeWidth={2.2} />
        </span>
        <h1>pygame素材メーカー</h1>
      </div>

      <div className="project-name-wrap">
        <EditableText
          className="project-name"
          label="プロジェクト名"
          value={name}
          onCommit={rename.project}
        />
        <span className={`save-status ${status}`} role="status">
          <span className="save-dot" aria-hidden />
          {STATUS_LABEL[status]}
        </span>
      </div>

      <div className="header-actions">
        <IconButton
          icon={Undo2}
          label="元に戻す"
          shortcut="Ctrl+Z"
          onClick={undo}
          disabled={!canUndo}
        />
        <IconButton
          icon={Redo2}
          label="やり直す"
          shortcut="Ctrl+Shift+Z"
          onClick={redo}
          disabled={!canRedo}
        />
        <span className="divider" aria-hidden />
        <ConfirmDialog
          trigger={
            <button type="button" className="btn ghost">
              <FilePlus2 size={16} aria-hidden />
              <span>新規</span>
            </button>
          }
          title="新しいプロジェクトを作りますか？"
          description="いまの内容は消えます。残したいときは、先に「保存」でファイルにしておくと安心です。"
          confirmLabel="新しく作る"
          onConfirm={newProject}
        />
        <Button
          variant="ghost"
          icon={FolderOpen}
          onClick={() => void openProjectFile()}
        >
          開く
        </Button>
        <Button
          variant="primary"
          icon={Download}
          onClick={() => void saveProjectFile()}
        >
          保存（ZIP）
        </Button>
      </div>
    </header>
  )
}
