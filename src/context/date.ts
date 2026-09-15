import { createContext, useContext } from 'react'

export interface DateCtxValue {
  date: string
  setDate: (d: string) => void
  goToday: () => void
  shift: (n: number) => void
  isToday: boolean
}

export const DateCtx = createContext<DateCtxValue>({
  date: '',
  setDate: () => {},
  goToday: () => {},
  shift: () => {},
  isToday: true,
})

export function useDate(): DateCtxValue {
  return useContext(DateCtx)
}
