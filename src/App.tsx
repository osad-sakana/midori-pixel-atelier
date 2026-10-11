import { EditorCanvas } from './components/EditorCanvas'
import { Header } from './components/Header'
import { RightPanel } from './components/RightPanel'
import { SpritePanel } from './components/SpritePanel'
import { Toast } from './components/Toast'
import { Toolbar } from './components/Toolbar'
import { useShortcuts } from './editor/shortcuts'

export function App() {
  useShortcuts()
  return (
    <div className="app">
      <Header />
      <main className="workspace">
        <SpritePanel />
        <section className="center" aria-label="エディタ">
          <Toolbar />
          <EditorCanvas />
        </section>
        <RightPanel />
      </main>
      <Toast />
    </div>
  )
}
