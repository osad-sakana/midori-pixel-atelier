import * as AlertDialog from '@radix-ui/react-alert-dialog'
import type { ReactNode } from 'react'

/** 取り消せない操作の前に確認する */
export function ConfirmDialog(props: {
  trigger: ReactNode
  title: string
  description: string
  confirmLabel: string
  onConfirm: () => void
}) {
  const { trigger, title, description, confirmLabel, onConfirm } = props
  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger asChild>{trigger}</AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="dialog-overlay" />
        <AlertDialog.Content className="dialog">
          <AlertDialog.Title className="dialog-title">
            {title}
          </AlertDialog.Title>
          <AlertDialog.Description className="dialog-desc">
            {description}
          </AlertDialog.Description>
          <div className="dialog-actions">
            <AlertDialog.Cancel asChild>
              <button type="button" className="btn secondary">
                キャンセル
              </button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <button type="button" className="btn danger" onClick={onConfirm}>
                {confirmLabel}
              </button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
