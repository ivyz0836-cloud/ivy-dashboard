import { useLiveQuery } from 'dexie-react-hooks'
import { computeRangeStats, rangeBounds, type RangeStats } from '../lib/stats'
import { today } from '../lib/date'

export type Period = 'week' | 'month' | 'year'

/**
 * 统计 [区间起点, min(区间终点, 今天)] 的数据。
 * 传入的 anchor 决定属于哪一周 / 月 / 年。
 */
export function useRangeStats(anchor: string, period: Period): RangeStats | null {
  const { start, end } = rangeBounds(anchor, period)
  const clamped = end > today() ? today() : end
  return useLiveQuery(() => computeRangeStats(start, clamped, period), [start, clamped, period], null)
}

export function useRangeBounds(anchor: string, period: Period) {
  const { start, end } = rangeBounds(anchor, period)
  const clamped = end > today() ? today() : end
  return { start, end, clamped }
}
