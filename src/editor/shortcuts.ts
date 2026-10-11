import { useEffect } from 'react'
import { copyToClipboard, readClipboard } from './clipboard'
import { deleteSelection, pasteSelection } from './floating'
import {
  commitFloating,
  redo,
  setFloating,
  setSelectionDraft,
  setTool,
  setZoom,
  undo,
  useEditor,
  type Tool,
} from '../state/editorStore'

const TOOL_KEYS: Readonly<Record<string, Tool>> = {
  b: 'brush',
  e: 'eraser',
  g: 'fill',
  l: 'line',
  r: 'rect',
  o: 'ellipse',
  s: 'select',
  i: 'eyedropper',
}

const isTyping = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))

function handleModifierKey(e: KeyboardEvent): boolean {
  const key = e.key.toLowerCase()
  const { floating } = useEditor.getState()
  if (key === 'z') {
    if (e.shiftKey) redo()
    else undo()
  } else if (key === 'y') {
    redo()
  } else if (key === 'c' && floating?.kind === 'selection') {
    copyToClipboard(floating.pixels)
  } else if (key === 'v') {
    const clip = readClipboard()
    if (!clip) return false
    commitFloating()
    setTool('select')
    setFloating(pasteSelection(clip, { x: 0, y: 0 }))
  } else {
    return false
  }
  return true
}

function handlePlainKey(e: KeyboardEvent): boolean {
  const { floating, zoom } = useEditor.getState()
  if (e.key === 'Enter') commitFloating()
  else if (e.key === 'Escape') {
    setFloating(null)
    setSelectionDraft(null)
  } else if (
    (e.key === 'Delete' || e.key === 'Backspace') &&
    floating?.kind === 'selection'
  ) {
    setFloating(deleteSelection(floating))
    commitFloating()
  } else if (e.key === '+' || e.key === '=') setZoom(zoom + 1)
  else if (e.key === '-') setZoom(zoom - 1)
  else if (TOOL_KEYS[e.key.toLowerCase()])
    setTool(TOOL_KEYS[e.key.toLowerCase()] as Tool)
  else return false
  return true
}

export function useShortcuts(): void {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if (isTyping(e.target) || e.altKey) return
      const handled =
        e.ctrlKey || e.metaKey ? handleModifierKey(e) : handlePlainKey(e)
      if (handled) e.preventDefault()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
