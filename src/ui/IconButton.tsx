import type { LucideIcon } from 'lucide-react'
import { Tip } from './Tip'

/** アイコンだけのボタン。名前は aria-label とツールチップの両方に使う */
export function IconButton(props: {
  icon: LucideIcon
  label: string
  shortcut?: string
  onClick: () => void
  pressed?: boolean
  disabled?: boolean
  size?: 'sm' | 'md'
  tone?: 'default' | 'danger'
}) {
  const {
    icon: Icon,
    label,
    shortcut,
    onClick,
    pressed,
    disabled,
    size = 'md',
    tone = 'default',
  } = props
  return (
    <Tip label={label} shortcut={shortcut}>
      <button
        type="button"
        className={`icon-btn ${size} ${tone}`}
        aria-label={label}
        aria-pressed={pressed}
        disabled={disabled}
        onClick={onClick}
      >
        <Icon size={size === 'sm' ? 16 : 18} strokeWidth={2} aria-hidden />
      </button>
    </Tip>
  )
}
