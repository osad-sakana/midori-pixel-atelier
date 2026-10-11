import * as Popover from '@radix-ui/react-popover'
import { setToolOptions, useEditor } from '../state/editorStore'

const PALETTE = [
  '#000000',
  '#5f574f',
  '#c2c3c7',
  '#ffffff',
  '#e63946',
  '#ff77a8',
  '#ffa300',
  '#ffec27',
  '#00e436',
  '#008751',
  '#29adff',
  '#1d2b53',
  '#83769c',
  '#7e2553',
  '#ab5236',
  '#ffccaa',
]

export function ColorPicker() {
  const color = useEditor((s) => s.color)
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="color-trigger"
          aria-label={`色を選ぶ（いまは ${color}）`}
        >
          <span className="color-chip" style={{ background: color }} />
          <span className="color-code">{color.toUpperCase()}</span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="popover color-popover"
          sideOffset={8}
          align="start"
        >
          <div className="palette" role="group" aria-label="パレット">
            {PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                className="swatch"
                aria-label={`色 ${c}`}
                aria-pressed={c === color}
                style={{ background: c }}
                onClick={() => setToolOptions({ color: c })}
              />
            ))}
          </div>
          <label className="custom-color">
            <input
              type="color"
              value={color}
              aria-label="好きな色"
              onChange={(e) => setToolOptions({ color: e.target.value })}
            />
            <span>好きな色を選ぶ</span>
          </label>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
