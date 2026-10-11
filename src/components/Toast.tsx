import { Info } from 'lucide-react'
import { useEditor } from '../state/editorStore'

export function Toast() {
  const message = useEditor((s) => s.message)
  return (
    <div className="toast-region" role="status" aria-live="polite">
      {message && (
        <div className="toast">
          <Info size={16} aria-hidden />
          {message}
        </div>
      )}
    </div>
  )
}
