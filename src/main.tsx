import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { restoreAutosave, startAutosave } from './state/autosave'
import './styles.css'

const root = document.getElementById('root')
if (!root) throw new Error('#root が見つかりません')

// 前回の自動保存を先に復元してから描画する（復元に失敗しても新規で始める）
restoreAutosave()
  .catch(() => undefined)
  .finally(() => {
    startAutosave()
    createRoot(root).render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  })
