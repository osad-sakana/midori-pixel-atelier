import * as ToggleGroup from '@radix-ui/react-toggle-group'
import type { LucideIcon } from 'lucide-react'

export type SegmentedOption<T extends string> = {
  value: T
  label: string
  icon?: LucideIcon
}

/** 2〜3個の選択肢から1つ選ぶ。選択中のものを外せない */
export function Segmented<T extends string>(props: {
  value: T
  options: readonly SegmentedOption<T>[]
  onChange: (value: T) => void
  label: string
}) {
  const { value, options, onChange, label } = props
  return (
    <ToggleGroup.Root
      type="single"
      className="segmented"
      value={value}
      aria-label={label}
      onValueChange={(next) => next && onChange(next as T)}
    >
      {options.map(({ value: v, label: text, icon: Icon }) => (
        <ToggleGroup.Item key={v} value={v} className="segmented-item">
          {Icon && <Icon size={15} aria-hidden />}
          {text}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  )
}
