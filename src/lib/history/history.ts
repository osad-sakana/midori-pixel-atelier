import type { Patch } from './patch'

/** S はプロジェクト構造のスナップショット（イミュータブルなので参照を持つだけで安い） */
export type HistoryEntry<S> = {
  readonly label: string
  readonly before: S
  readonly after: S
  readonly patches: readonly Patch[]
  readonly bytes: number
}

export type History<S> = {
  push(entry: HistoryEntry<S>): void
  undo(): HistoryEntry<S> | undefined
  redo(): HistoryEntry<S> | undefined
  canUndo(): boolean
  canRedo(): boolean
  clear(): void
}

/** 手数ではなくバイト数で上限を決める。最新1件は上限を超えても残す */
export function createHistory<S>(limitBytes: number): History<S> {
  let undoStack: HistoryEntry<S>[] = []
  let redoStack: HistoryEntry<S>[] = []

  const total = (): number => undoStack.reduce((sum, e) => sum + e.bytes, 0)

  return {
    push(entry) {
      redoStack = []
      undoStack = [...undoStack, entry]
      while (undoStack.length > 1 && total() > limitBytes) undoStack = undoStack.slice(1)
    },
    undo() {
      const entry = undoStack[undoStack.length - 1]
      if (!entry) return undefined
      undoStack = undoStack.slice(0, -1)
      redoStack = [...redoStack, entry]
      return entry
    },
    redo() {
      const entry = redoStack[redoStack.length - 1]
      if (!entry) return undefined
      redoStack = redoStack.slice(0, -1)
      undoStack = [...undoStack, entry]
      return entry
    },
    canUndo: () => undoStack.length > 0,
    canRedo: () => redoStack.length > 0,
    clear() {
      undoStack = []
      redoStack = []
    },
  }
}
