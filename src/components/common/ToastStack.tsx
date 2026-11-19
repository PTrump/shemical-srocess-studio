import {
  AlertTriangle,
  CircleCheck,
  Info,
  X,
} from 'lucide-react'
import type { ToastItem } from '../../hooks/useToast'
import './ToastStack.css'

interface ToastStackProps {
  toasts: ToastItem[]
  onDismiss: (id: string) => void
}

export function ToastStack({ toasts, onDismiss }: ToastStackProps) {
  if (toasts.length === 0) {
    return null
  }

  return (
    <div className="toast-stack" aria-live="polite">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast toast--${toast.kind}`}
          role={toast.kind === 'error' ? 'alert' : 'status'}
        >
          <span className="toast__icon">
            {toast.kind === 'success' && (
              <CircleCheck size={14} strokeWidth={1.9} />
            )}
            {toast.kind === 'info' && (
              <Info size={14} strokeWidth={1.9} />
            )}
            {toast.kind === 'error' && (
              <AlertTriangle size={14} strokeWidth={1.9} />
            )}
          </span>
          <span className="toast__copy">
            <strong>{toast.title}</strong>
            {toast.detail && <span>{toast.detail}</span>}
          </span>
          <button
            type="button"
            className="toast__close"
            onClick={() => onDismiss(toast.id)}
            aria-label="关闭提示"
          >
            <X size={11} strokeWidth={2} />
          </button>
        </div>
      ))}
    </div>
  )
}
