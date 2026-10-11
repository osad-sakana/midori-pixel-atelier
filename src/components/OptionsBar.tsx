import * as Popover from '@radix-ui/react-popover'
import {
  Circle,
  FlipHorizontal2,
  FlipVertical2,
  Maximize2,
  RotateCcw,
  RotateCw,
  Square,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '../ui/Button'
import { IconButton } from '../ui/IconButton'
import { NumberField } from '../ui/NumberField'
import { Segmented } from '../ui/Segmented'
import { SliderField } from '../ui/SliderField'
import {
  getActive,
  resizeCostume,
  setToolOptions,
  transformCostume,
  useEditor,
} from '../state/editorStore'
import { ColorPicker } from './ColorPicker'

function CanvasSize() {
  const costume = useEditor((s) => getActive(s).costume)
  const [open, setOpen] = useState(false)
  const [size, setSize] = useState<{ w: string; h: string } | null>(null)
  const w = size?.w ?? String(costume.width)
  const h = size?.h ?? String(costume.height)

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setSize(null)
      }}
    >
      <Popover.Trigger asChild>
        <button
          type="button"
          className="btn secondary compact"
          aria-label="キャンバスのサイズ"
        >
          <Maximize2 size={15} aria-hidden />
          <span>
            {costume.width} × {costume.height}
          </span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="popover size-popover"
          sideOffset={8}
          align="end"
        >
          <p className="popover-title">キャンバスのサイズ</p>
          <div className="field-row">
            <NumberField
              label="幅"
              min={1}
              max={1024}
              value={w}
              onChange={(v) => setSize({ w: v, h })}
            />
            <NumberField
              label="高さ"
              min={1}
              max={1024}
              value={h}
              onChange={(v) => setSize({ w, h: v })}
            />
          </div>
          <p className="hint">
            小さくすると右と下がけずられます。大きくすると透明な部分が増えます。
          </p>
          <Button
            variant="primary"
            block
            onClick={() => {
              resizeCostume(Number(w), Number(h))
              setOpen(false)
            }}
          >
            サイズを変える
          </Button>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

export function OptionsBar() {
  const tool = useEditor((s) => s.tool)
  const brushSize = useEditor((s) => s.brushSize)
  const brushShape = useEditor((s) => s.brushShape)
  const fill = useEditor((s) => s.fill)
  const usesStroke = tool === 'brush' || tool === 'eraser' || tool === 'line'
  const usesFill = tool === 'rect' || tool === 'ellipse'

  return (
    <div className="options-bar">
      <div className="options-group">
        <ColorPicker />
        {(usesStroke || usesFill) && (
          <SliderField
            label={usesFill ? '枠の太さ' : '太さ'}
            min={1}
            max={32}
            value={brushSize}
            unit="px"
            onChange={(v) => setToolOptions({ brushSize: v })}
          />
        )}
        {usesStroke && (
          <Segmented
            label="ペンの形"
            value={brushShape}
            options={[
              { value: 'square', label: '四角', icon: Square },
              { value: 'round', label: '丸', icon: Circle },
            ]}
            onChange={(v) => setToolOptions({ brushShape: v })}
          />
        )}
        {usesFill && (
          <Segmented
            label="図形の塗り"
            value={fill ? 'fill' : 'outline'}
            options={[
              { value: 'fill', label: '塗りつぶし' },
              { value: 'outline', label: '枠だけ' },
            ]}
            onChange={(v) => setToolOptions({ fill: v === 'fill' })}
          />
        )}
      </div>

      <div className="options-group">
        <IconButton
          icon={FlipHorizontal2}
          label="左右反転"
          onClick={() => transformCostume('flipH')}
        />
        <IconButton
          icon={FlipVertical2}
          label="上下反転"
          onClick={() => transformCostume('flipV')}
        />
        <IconButton
          icon={RotateCcw}
          label="左に90度回転"
          onClick={() => transformCostume('rotateCcw')}
        />
        <IconButton
          icon={RotateCw}
          label="右に90度回転"
          onClick={() => transformCostume('rotateCw')}
        />
        <span className="divider" aria-hidden />
        <CanvasSize />
      </div>
    </div>
  )
}
