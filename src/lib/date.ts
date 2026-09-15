/** YYYY-MM-DD（本地时区） */
export function toKey(d: Date): string {
  const y = d.getFullYear()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function fromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

export function today(): string {
  return toKey(new Date())
}

export function addDays(key: string, delta: number): string {
  const d = fromKey(key)
  d.setDate(d.getDate() + delta)
  return toKey(d)
}

export function daysBetween(a: string, b: string): number {
  const ms = fromKey(b).getTime() - fromKey(a).getTime()
  return Math.round(ms / 86_400_000)
}

/** 一周从周一算起 */
export function startOfWeek(key: string): string {
  const d = fromKey(key)
  const dow = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - dow)
  return toKey(d)
}

export function startOfMonth(key: string): string {
  const d = fromKey(key)
  return toKey(new Date(d.getFullYear(), d.getMonth(), 1))
}

export function startOfYear(key: string): string {
  const d = fromKey(key)
  return toKey(new Date(d.getFullYear(), 0, 1))
}

export function endOfRange(startKey: string, period: 'week' | 'month' | 'year'): string {
  if (period === 'week') return addDays(startKey, 6)
  if (period === 'month') {
    const d = fromKey(startKey)
    return toKey(new Date(d.getFullYear(), d.getMonth() + 1, 0))
  }
  const d = fromKey(startKey)
  return toKey(new Date(d.getFullYear(), 11, 31))
}

/** ISO 周序号，例如 2026-W37 */
export function weekKey(key: string): string {
  const d = fromKey(key)
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const dayNr = (target.getDay() + 6) % 7
  target.setDate(target.getDate() - dayNr + 3)
  const firstThursday = new Date(target.getFullYear(), 0, 4)
  const firstDayNr = (firstThursday.getDay() + 6) % 7
  firstThursday.setDate(firstThursday.getDate() - firstDayNr + 3)
  const week = 1 + Math.round((target.getTime() - firstThursday.getTime()) / (7 * 86_400_000))
  return `${target.getFullYear()}-W${`${week}`.padStart(2, '0')}`
}

export function monthKey(key: string): string {
  return key.slice(0, 7)
}

export function yearKey(key: string): string {
  return key.slice(0, 4)
}

export function periodKeyOf(key: string, period: 'week' | 'month' | 'year'): string {
  if (period === 'week') return weekKey(key)
  if (period === 'month') return monthKey(key)
  return yearKey(key)
}

export function formatCN(key: string): string {
  const d = fromKey(key)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

export function weekdayCN(key: string): string {
  return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][fromKey(key).getDay()]
}

export function rangeKeys(startKey: string, endKey: string): string[] {
  const out: string[] = []
  let cur = startKey
  // 安全上限，避免异常数据造成死循环
  let guard = 0
  while (daysBetween(cur, endKey) >= 0 && guard < 400) {
    out.push(cur)
    cur = addDays(cur, 1)
    guard += 1
  }
  return out
}

export function prettyDate(key: string): string {
  const t = today()
  if (key === t) return '今天'
  if (key === addDays(t, -1)) return '昨天'
  if (key === addDays(t, 1)) return '明天'
  return `${formatCN(key)} ${weekdayCN(key)}`
}
