import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'
import { ToastCtx, type ToastAction, type ToastApi, type ToastKind } from '../context/toast'

interface ToastItem {
  id: number
  text: string
  kind: ToastKind
  action?: ToastAction
}

let seq = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    (text: string, kind: ToastKind = 'ok', action?: ToastAction) => {
      seq += 1
      const id = seq
      setItems((prev) => [...prev.slice(-2), { id, text, kind, action }])
      window.setTimeout(() => dismiss(id), action ? 4200 : 2200)
    },
    [dismiss],
  )

  const value = useMemo<ToastApi>(() => ({ toast }), [toast])

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="toasts" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`.trim()}>
            {t.kind === 'ok' && <CheckCircle2 size={15} />}
            {t.kind === 'warn' && <AlertTriangle size={15} />}
            {t.kind === 'info' && <Info size={15} />}
            <span>{t.text}</span>
            {t.action && (
              <button
                type="button"
                onClick={() => {
                  t.action?.onClick()
                  dismiss(t.id)
                }}
                style={{
                  pointerEvents: 'auto',
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: 99,
                  padding: '3px 10px',
                  fontWeight: 700,
                  fontSize: 12.5,
                  color: '#fff',
                }}
              >
                {t.action.label}
              </button>
            )}
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="关闭提示"
              style={{ pointerEvents: 'auto', color: 'rgba(255,255,255,0.7)', display: 'grid', placeItems: 'center' }}
            >
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}
