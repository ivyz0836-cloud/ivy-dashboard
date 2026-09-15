import { createContext, useContext } from 'react'

export type ToastKind = 'ok' | 'warn' | 'info'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface ToastApi {
  toast: (text: string, kind?: ToastKind, action?: ToastAction) => void
}

export const ToastCtx = createContext<ToastApi>({ toast: () => {} })

export function useToast(): ToastApi {
  return useContext(ToastCtx)
}
