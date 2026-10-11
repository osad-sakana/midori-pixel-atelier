import { useEffect, useState } from 'react'

/** クリック（またはダブルクリック）で編集でき、Enter/フォーカス外れで確定、Esc で取り消す */
export function EditableText(props: {
  value: string
  onCommit: (value: string) => void
  className?: string
  label: string
}) {
  const { value, onCommit, className, label } = props
  const [draft, setDraft] = useState(value)

  useEffect(() => setDraft(value), [value])

  const commit = (): void => {
    const next = draft.trim()
    if (next === '') setDraft(value)
    else if (next !== value) onCommit(next)
  }

  return (
    <input
      className={`editable ${className ?? ''}`}
      aria-label={label}
      value={draft}
      maxLength={40}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') {
          setDraft(value)
          e.currentTarget.blur()
        }
        e.stopPropagation()
      }}
    />
  )
}
