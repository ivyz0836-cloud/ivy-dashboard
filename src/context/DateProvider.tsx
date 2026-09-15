import { useMemo, useState, type ReactNode } from 'react'
import { DateCtx, type DateCtxValue } from './date'
import { addDays, today as todayKey } from '../lib/date'

export function DateProvider({ children }: { children: ReactNode }) {
  const [date, setDate] = useState<string>(todayKey())
  const value = useMemo<DateCtxValue>(
    () => ({
      date,
      setDate,
      goToday: () => setDate(todayKey()),
      shift: (n: number) => setDate(addDays(date, n)),
      isToday: date === todayKey(),
    }),
    [date],
  )
  return <DateCtx.Provider value={value}>{children}</DateCtx.Provider>
}
