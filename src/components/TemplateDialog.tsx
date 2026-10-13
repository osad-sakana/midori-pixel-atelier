import * as Dialog from '@radix-ui/react-dialog'
import * as Tabs from '@radix-ui/react-tabs'
import { LayoutTemplate, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { startFromTemplate } from '../app/actions'
import { buildTemplate, templatePreviews } from '../templates/build'
import { TEMPLATE_CATEGORIES, TEMPLATES } from '../templates/catalog'
import type { TemplateSpec } from '../templates/types'
import { Button } from '../ui/Button'
import { BitmapCanvas } from './BitmapCanvas'

function TemplateCard(props: {
  spec: TemplateSpec
  selected: boolean
  onSelect: () => void
}) {
  const { spec, selected, onSelect } = props
  const previews = useMemo(() => templatePreviews(buildTemplate(spec)), [spec])
  return (
    <button
      type="button"
      className="template-card"
      aria-pressed={selected}
      onClick={onSelect}
    >
      <span className="template-thumbs" aria-hidden>
        {previews.map((bitmap, i) => (
          <BitmapCanvas
            key={i}
            bitmap={bitmap}
            className="checker"
            maxSize={previews.length > 1 ? 40 : 64}
          />
        ))}
      </span>
      <span className="template-title">{spec.title}</span>
      <span className="template-desc">{spec.description}</span>
    </button>
  )
}

function TemplatePicker(props: { onDone: () => void }) {
  const [selected, setSelected] = useState<TemplateSpec | null>(null)

  const start = (): void => {
    if (!selected) return
    startFromTemplate(selected)
    props.onDone()
  }

  return (
    <>
      <Tabs.Root defaultValue="blank" className="tabs-root template-tabs">
        <Tabs.List className="tabs" aria-label="テンプレートの種類">
          {TEMPLATE_CATEGORIES.map((c) => (
            <Tabs.Trigger key={c.id} value={c.id} className="tab">
              {c.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        {TEMPLATE_CATEGORIES.map((c) => (
          <Tabs.Content key={c.id} value={c.id} className="template-body">
            <div className="template-grid">
              {TEMPLATES.filter((t) => t.category === c.id).map((spec) => (
                <TemplateCard
                  key={spec.id}
                  spec={spec}
                  selected={selected?.id === spec.id}
                  onSelect={() => setSelected(spec)}
                />
              ))}
            </div>
          </Tabs.Content>
        ))}
      </Tabs.Root>

      <p className="hint template-note">
        いまの作品は置きかわります。残したいときは、先に「保存（ZIP）」しておこう。
      </p>
      <div className="dialog-actions">
        <Dialog.Close asChild>
          <button type="button" className="btn secondary">
            キャンセル
          </button>
        </Dialog.Close>
        <Button variant="primary" disabled={!selected} onClick={start}>
          {selected
            ? `「${selected.title}」で始める`
            : 'テンプレートを選んでね'}
        </Button>
      </div>
    </>
  )
}

/** テンプレートを選んで、新しいプロジェクトを始める */
export function TemplateDialog() {
  const [open, setOpen] = useState(false)
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button type="button" className="btn ghost">
          <LayoutTemplate size={16} aria-hidden />
          <span>テンプレート</span>
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog wide">
          <Dialog.Close asChild>
            <button type="button" className="dialog-close" aria-label="閉じる">
              <X size={18} aria-hidden />
            </button>
          </Dialog.Close>
          <Dialog.Title className="dialog-title">
            テンプレートから始める
          </Dialog.Title>
          <Dialog.Description className="dialog-desc">
            サイズやコマ数が決まった入れ物や、お手本の絵から選べます。
          </Dialog.Description>
          <TemplatePicker onDone={() => setOpen(false)} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
