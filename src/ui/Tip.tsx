import * as Tooltip from '@radix-ui/react-tooltip'
import type { ReactNode } from 'react'

/** ツールチップ。ショートカットキーがあれば併記する */
export function Tip(props: {
  label: string
  shortcut?: string
  children: ReactNode
}) {
  const { label, shortcut, children } = props
  return (
    <Tooltip.Root delayDuration={350}>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content className="tooltip" side="bottom" sideOffset={8}>
          {label}
          {shortcut && <kbd>{shortcut}</kbd>}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}
