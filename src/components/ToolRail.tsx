import {
  Brush,
  BoxSelect,
  Circle,
  Eraser,
  PaintBucket,
  Pipette,
  Slash,
  Square,
  type LucideIcon,
} from 'lucide-react'
import { IconButton } from '../ui/IconButton'
import { setTool, useEditor, type Tool } from '../state/editorStore'

const TOOLS: readonly {
  tool: Tool
  label: string
  key: string
  icon: LucideIcon
}[] = [
  { tool: 'brush', label: 'ブラシ', key: 'B', icon: Brush },
  { tool: 'eraser', label: '消しゴム', key: 'E', icon: Eraser },
  { tool: 'fill', label: '塗りつぶし', key: 'G', icon: PaintBucket },
  { tool: 'line', label: '線', key: 'L', icon: Slash },
  { tool: 'rect', label: '四角', key: 'R', icon: Square },
  { tool: 'ellipse', label: '円', key: 'O', icon: Circle },
  { tool: 'select', label: '選択', key: 'S', icon: BoxSelect },
  { tool: 'eyedropper', label: 'スポイト', key: 'I', icon: Pipette },
]

export function ToolRail() {
  const tool = useEditor((s) => s.tool)
  return (
    <div
      className="tool-rail"
      role="toolbar"
      aria-label="ツール"
      aria-orientation="vertical"
    >
      {TOOLS.map((t) => (
        <IconButton
          key={t.tool}
          icon={t.icon}
          label={t.label}
          shortcut={t.key}
          pressed={tool === t.tool}
          onClick={() => setTool(t.tool)}
        />
      ))}
    </div>
  )
}
