import * as Tooltip from '@radix-ui/react-tooltip'
import { EditorCanvas } from './components/EditorCanvas'
import { Header } from './components/Header'
import { OptionsBar } from './components/OptionsBar'
import { RightPanel } from './components/RightPanel'
import { SpritePanel } from './components/SpritePanel'
import { Toast } from './components/Toast'
import { ToolRail } from './components/ToolRail'
import { useShortcuts } from './editor/shortcuts'

export function App() {
  useShortcuts()
  return (
    <Tooltip.Provider>
      <div className="app">
        <Header />
        <main className="workspace">
          <SpritePanel />
          <section className="center" aria-label="エディタ">
            <OptionsBar />
            <div className="editor-body">
              <ToolRail />
              <EditorCanvas />
            </div>
          </section>
          <RightPanel />
        </main>
        <Toast />
      </div>
    </Tooltip.Provider>
  )
}
