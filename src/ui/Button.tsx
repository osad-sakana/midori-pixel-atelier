import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

/** 文字つきのボタン。primary は画面で一番大事な操作にだけ使う */
export function Button(props: {
  children: ReactNode
  onClick: () => void
  icon?: LucideIcon
  variant?: 'primary' | 'secondary' | 'ghost'
  disabled?: boolean
  block?: boolean
  pressed?: boolean
}) {
  const {
    children,
    onClick,
    icon: Icon,
    variant = 'secondary',
    disabled,
    block,
    pressed,
  } = props
  return (
    <button
      type="button"
      className={`btn ${variant} ${block ? 'block' : ''}`}
      disabled={disabled}
      aria-pressed={pressed}
      onClick={onClick}
    >
      {Icon && <Icon size={16} strokeWidth={2} aria-hidden />}
      <span>{children}</span>
    </button>
  )
}
