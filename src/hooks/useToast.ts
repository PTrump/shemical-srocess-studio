import { useCallback, useEffect, useRef, useState } from 'react'
import { createId } from '../utils/format'

export type ToastKind = 'success' | 'info' | 'error'

export interface ToastItem {
  id: string
  kind: ToastKind
  title: string
  detail?: string
}

export interface UseToastResult {
  toasts: ToastItem[]
  notify: (kind: ToastKind, title: string, detail?: string) => void
  dismiss: (id: string) => void
}

export function useToast(): UseToastResult {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timers = useRef(new Map<string, number>())

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id)
    if (timer !== undefined) {
      window.clearTimeout(timer)
      timers.current.delete(id)
    }
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const notify = useCallback(
    (kind: ToastKind, title: string, detail?: string) => {
      const id = createId('toast')
      setToasts((current) => [
        ...current.slice(-2),
        { id, kind, title, detail },
      ])

      const timer = window.setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id))
        timers.current.delete(id)
      }, 3600)
      timers.current.set(id, timer)
    },
    [],
  )

  useEffect(() => {
    const activeTimers = timers.current
    return () => {
      for (const timer of activeTimers.values()) {
        window.clearTimeout(timer)
      }
      activeTimers.clear()
    }
  }, [])

  return { toasts, notify, dismiss }
}
