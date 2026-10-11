import { useState } from 'react'
import { CodePanel } from './CodePanel'
import { LayersPanel } from './LayersPanel'
import { SheetPanel } from './SheetPanel'

const TABS = [
  { id: 'layers', label: 'レイヤー' },
  { id: 'sheet', label: 'シート' },
  { id: 'code', label: 'pygameコード' },
] as const

type TabId = (typeof TABS)[number]['id']

export function RightPanel() {
  const [tab, setTab] = useState<TabId>('layers')
  return (
    <aside className="right-panel" aria-label="パネル">
      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'layers' && <LayersPanel />}
      {tab === 'sheet' && <SheetPanel />}
      {tab === 'code' && <CodePanel />}
    </aside>
  )
}
