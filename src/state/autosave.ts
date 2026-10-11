import { create } from 'zustand'
import {
  loadAutosave,
  requestPersistence,
  saveAutosave,
} from '../lib/storage/autosave'
import { bitmaps, loadProject, useEditor } from './editorStore'

type SaveState = { status: 'idle' | 'saving' | 'saved' | 'error' }

export const useSaveStatus = create<SaveState>(() => ({ status: 'idle' }))

const DEBOUNCE_MS = 1000

/** 起動時に前回の自動保存を復元する（無ければ何もしない） */
export async function restoreAutosave(): Promise<void> {
  const saved = await loadAutosave()
  if (saved) loadProject(saved.project, saved.bitmaps)
}

/** 変更から少し待ってから IndexedDB に保存する。タブを閉じる/隠すときは即保存 */
export function startAutosave(): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined
  let dirty = false

  const flush = async (): Promise<void> => {
    clearTimeout(timer)
    if (!dirty) return
    dirty = false
    useSaveStatus.setState({ status: 'saving' })
    try {
      await saveAutosave(useEditor.getState().project, (id) => bitmaps.get(id))
      useSaveStatus.setState({ status: 'saved' })
    } catch {
      useSaveStatus.setState({ status: 'error' })
    }
  }

  const unsubscribe = useEditor.subscribe((state, prev) => {
    if (state.project === prev.project && state.revision === prev.revision)
      return
    dirty = true
    clearTimeout(timer)
    timer = setTimeout(() => void flush(), DEBOUNCE_MS)
  })
  const onHide = (): void => {
    if (document.visibilityState === 'hidden') void flush()
  }
  document.addEventListener('visibilitychange', onHide)
  void requestPersistence()

  return () => {
    unsubscribe()
    document.removeEventListener('visibilitychange', onHide)
    clearTimeout(timer)
  }
}
