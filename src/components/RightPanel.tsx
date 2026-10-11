import * as Tabs from '@radix-ui/react-tabs'
import { Film, Layers } from 'lucide-react'
import { LayersPanel } from './LayersPanel'
import { SheetPanel } from './SheetPanel'

export function RightPanel() {
  return (
    <aside className="right-panel" aria-label="パネル">
      <Tabs.Root defaultValue="layers" className="tabs-root">
        <Tabs.List className="tabs" aria-label="パネルの切り替え">
          <Tabs.Trigger value="layers" className="tab">
            <Layers size={16} aria-hidden />
            レイヤー
          </Tabs.Trigger>
          <Tabs.Trigger value="sheet" className="tab">
            <Film size={16} aria-hidden />
            シート
          </Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="layers" className="tab-content">
          <LayersPanel />
        </Tabs.Content>
        <Tabs.Content value="sheet" className="tab-content">
          <SheetPanel />
        </Tabs.Content>
      </Tabs.Root>
    </aside>
  )
}
