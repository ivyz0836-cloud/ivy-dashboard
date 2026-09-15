import type {
  EventCategory,
  Recurrence,
  ScheduleEvent,
} from '../db/types'
import { addDays, daysBetween, fromKey, toKey, weekdayCN } from './date'

/* ================================================================== */
/* 时区：统一使用 Asia/Shanghai                                        */
/* ================================================================== */

export const TZ = 'Asia/Shanghai'

const dateParts = new Intl.DateTimeFormat('en-US', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  weekday: 'short',
})
const timeParts = new Intl.DateTimeFormat('en-US', {
  timeZone: TZ,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

function pick(parts: Intl.DateTimeFormatPart[], type: string): string {
  return parts.find((p) => p.type === type)?.value ?? ''
}

/** 当前上海时区的日期键 YYYY-MM-DD */
export function shanghaiDateKey(d: Date = new Date()): string {
  const p = dateParts.formatToParts(d)
  return `${pick(p, 'year')}-${pick(p, 'month')}-${pick(p, 'day')}`
}

/** 当前上海时区的「自零点起分钟数」0–1439 */
export function shanghaiMinutes(d: Date = new Date()): number {
  const p = timeParts.formatToParts(d)
  let h = Number(pick(p, 'hour'))
  // 某些 ICU 在午夜会返回 24
  if (h === 24) h = 0
  return h * 60 + Number(pick(p, 'minute'))
}

/* ================================================================== */
/* 时间字符串工具                                                      */
/* ================================================================== */

export function timeToMinutes(t: string | undefined): number {
  if (!t) return 0
  const [h, m] = t.split(':').map((n) => Number(n))
  if (Number.isNaN(h) || Number.isNaN(m)) return 0
  return h * 60 + m
}

export function minutesToTime(min: number): string {
  const clamped = Math.max(0, Math.min(1439, Math.round(min)))
  const h = Math.floor(clamped / 60)
  const m = clamped % 60
  return `${`${h}`.padStart(2, '0')}:${`${m}`.padStart(2, '0')}`
}

export function durationText(start: string | undefined, end: string | undefined): string {
  const s = timeToMinutes(start)
  const e = timeToMinutes(end)
  const d = Math.max(0, e - s)
  const h = Math.floor(d / 60)
  const m = d % 60
  if (h === 0) return `${m} 分钟`
  if (m === 0) return `${h} 小时`
  return `${h} 小时 ${m} 分钟`
}

/* ================================================================== */
/* 中文标签                                                            */
/* ================================================================== */

/** 周一排第一 */
export const WEEK_SHORT = ['一', '二', '三', '四', '五', '六', '日']

export function monthTitle(key: string): string {
  const d = fromKey(key)
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月`
}

export function dateTitle(key: string): string {
  const d = fromKey(key)
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日 ${weekdayCN(key)}`
}

/* ================================================================== */
/* 分类与配色                                                          */
/* ================================================================== */

export const EVENT_COLORS: { key: string; label: string; hex: string; soft: string }[] = [
  { key: 'green', label: '深绿', hex: '#2e6b55', soft: '#e4efe8' },
  { key: 'teal', label: '青绿', hex: '#4f8f80', soft: '#e2f0ec' },
  { key: 'amber', label: '暖橙', hex: '#dd9a4b', soft: '#fbeedd' },
  { key: 'rose', label: '陶红', hex: '#c9705f', soft: '#f9e6e1' },
  { key: 'sky', label: '雾蓝', hex: '#5b8fa8', soft: '#e3eef3' },
  { key: 'violet', label: '紫藤', hex: '#7d6ba8', soft: '#ece7f5' },
]

export function colorHex(key: string): string {
  return (EVENT_COLORS.find((c) => c.key === key) ?? EVENT_COLORS[0]).hex
}

export function colorSoft(key: string): string {
  return (EVENT_COLORS.find((c) => c.key === key) ?? EVENT_COLORS[0]).soft
}

export const EVENT_CATEGORIES: {
  value: EventCategory
  label: string
  emoji: string
  color: string
}[] = [
  { value: 'study', label: '学习', emoji: '📚', color: 'green' },
  { value: 'english', label: '英语', emoji: '🔤', color: 'sky' },
  { value: 'body', label: '运动', emoji: '💪', color: 'teal' },
  { value: 'life', label: '生活', emoji: '🌿', color: 'amber' },
  { value: 'social', label: '社交', emoji: '☕', color: 'rose' },
  { value: 'other', label: '其他', emoji: '✨', color: 'violet' },
]

export function categoryMeta(value: EventCategory) {
  return EVENT_CATEGORIES.find((c) => c.value === value) ?? EVENT_CATEGORIES[0]
}

export const RECURRENCES: { value: Recurrence; label: string }[] = [
  { value: 'none', label: '不重复' },
  { value: 'daily', label: '每天' },
  { value: 'weekly', label: '每周' },
  { value: 'monthly', label: '每月' },
]

export const REMINDER_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: '不提醒' },
  { value: 0, label: '开始时' },
  { value: 5, label: '提前 5 分钟' },
  { value: 10, label: '提前 10 分钟' },
  { value: 30, label: '提前 30 分钟' },
  { value: 60, label: '提前 1 小时' },
  { value: 1440, label: '提前 1 天' },
]

export function reminderLabel(v: number | null | undefined): string {
  if (v === null || v === undefined) return '不提醒'
  return REMINDER_OPTIONS.find((o) => o.value === v)?.label ?? `提前 ${v} 分钟`
}

/* ================================================================== */
/* 校验                                                                */
/* ================================================================== */

export interface EventDraft {
  title: string
  date: string
  allDay: 0 | 1
  start?: string
  end?: string
  category: EventCategory
  color: string
  location?: string
  notes?: string
  reminderMinutes?: number | null
  recurrence: Recurrence
  recurrenceUntil?: string
}

/** 返回错误文案；无错误返回 null */
export function validateDraft(d: EventDraft): string | null {
  if (!d.title.trim()) return '请填写日程标题'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date)) return '日期格式不正确'
  if (d.allDay === 0) {
    if (!d.start) return '请选择开始时间'
    if (!d.end) return '请选择结束时间'
    const s = timeToMinutes(d.start)
    const e = timeToMinutes(d.end)
    if (e <= s) return '结束时间必须晚于开始时间'
    if (e - s > 24 * 60) return '单个日程不能超过 24 小时'
  }
  if (d.recurrence !== 'none' && d.recurrenceUntil) {
    if (d.recurrenceUntil < d.date) return '重复截止日不能早于开始日期'
  }
  return null
}

/** 默认结束时间 = 开始 + 60 分钟 */
export function defaultEnd(start: string): string {
  return minutesToTime(timeToMinutes(start) + 60)
}

/* ================================================================== */
/* 重复展开                                                            */
/* ================================================================== */

export interface Occurrence {
  /** 唯一键：`${eventId}@${date}` */
  key: string
  event: ScheduleEvent
  date: string
  allDay: boolean
  startMin: number
  endMin: number
  /** 是否为重复生成出来的实例（非原始日期） */
  recurring: boolean
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate()
}

function monthlyKeys(anchor: string, until: string | undefined, start: string, end: string): string[] {
  const a = fromKey(anchor)
  const day = a.getDate()
  const baseY = a.getFullYear()
  const baseM = a.getMonth()
  const s = fromKey(start)
  let offset = (s.getFullYear() - baseY) * 12 + (s.getMonth() - baseM) - 1
  if (offset < 0) offset = 0

  const out: string[] = []
  for (let i = offset; i < offset + 400; i += 1) {
    const probe = new Date(baseY, baseM + i, 1)
    const yy = probe.getFullYear()
    const mm = probe.getMonth()
    const dd = Math.min(day, daysInMonth(yy, mm))
    const key = toKey(new Date(yy, mm, dd))
    if (key > end) break
    if (until && key > until) break
    if (key >= start) out.push(key)
  }
  return out
}

/**
 * 把事件（含重复规则）展开成 [startKey, endKey] 区间内的实例。
 * 不做写库操作，纯内存计算，因此新增/修改重复规则即时生效。
 */
export function expandOccurrences(
  events: ScheduleEvent[],
  startKey: string,
  endKey: string,
): Occurrence[] {
  const out: Occurrence[] = []
  if (startKey > endKey) return out

  for (const ev of events) {
    if (ev.id === undefined) continue
    const until = ev.recurrenceUntil || undefined

    let dates: string[] = []
    if (ev.recurrence === 'none') {
      if (ev.date >= startKey && ev.date <= endKey) dates = [ev.date]
    } else if (ev.recurrence === 'daily') {
      let cur = ev.date < startKey ? startKey : ev.date
      let guard = 0
      while (cur <= endKey && guard < 500) {
        dates.push(cur)
        cur = addDays(cur, 1)
        guard += 1
      }
      if (until) dates = dates.filter((d) => d <= until)
    } else if (ev.recurrence === 'weekly') {
      let cur = ev.date
      if (cur < startKey) {
        const diff = daysBetween(ev.date, startKey)
        cur = addDays(ev.date, Math.ceil(diff / 7) * 7)
      }
      let guard = 0
      while (cur <= endKey && guard < 400) {
        dates.push(cur)
        cur = addDays(cur, 7)
        guard += 1
      }
      if (until) dates = dates.filter((d) => d <= until)
    } else {
      dates = monthlyKeys(ev.date, until, startKey, endKey)
    }

    for (const d of dates) {
      out.push({
        key: `${ev.id}@${d}`,
        event: ev,
        date: d,
        allDay: ev.allDay === 1,
        startMin: ev.allDay === 1 ? 0 : timeToMinutes(ev.start),
        endMin: ev.allDay === 1 ? 1440 : timeToMinutes(ev.end),
        recurring: ev.recurrence !== 'none' && d !== ev.date,
      })
    }
  }

  out.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1
    if (a.allDay !== b.allDay) return a.allDay ? -1 : 1
    if (a.startMin !== b.startMin) return a.startMin - b.startMin
    return b.endMin - a.endMin
  })
  return out
}

/* ================================================================== */
/* 时间轴布局（处理重叠）                                               */
/* ================================================================== */

export interface Positioned {
  occ: Occurrence
  col: number
  cols: number
}

export function layoutDay(occs: Occurrence[]): Positioned[] {
  const sorted = [...occs].sort((a, b) => {
    if (a.startMin !== b.startMin) return a.startMin - b.startMin
    return b.endMin - a.endMin
  })
  const result: Positioned[] = []
  let cluster: Positioned[] = []
  let clusterEnd = -1

  const flush = () => {
    if (cluster.length === 0) return
    // 贪心分列
    const colEnds: number[] = []
    for (const p of cluster) {
      let placed = false
      for (let i = 0; i < colEnds.length; i += 1) {
        if (p.occ.startMin >= colEnds[i]) {
          p.col = i
          colEnds[i] = p.occ.endMin
          placed = true
          break
        }
      }
      if (!placed) {
        p.col = colEnds.length
        colEnds.push(p.occ.endMin)
      }
    }
    const total = Math.max(1, colEnds.length)
    for (const p of cluster) p.cols = total
    result.push(...cluster)
    cluster = []
    clusterEnd = -1
  }

  for (const occ of sorted) {
    if (cluster.length > 0 && occ.startMin >= clusterEnd) flush()
    cluster.push({ occ, col: 0, cols: 1 })
    clusterEnd = Math.max(clusterEnd, occ.endMin)
  }
  flush()
  return result
}

/* ================================================================== */
/* 月历矩阵（周一起，6 行 × 7 列）                                      */
/* ================================================================== */

export function monthMatrix(anchorKey: string): string[] {
  const d = fromKey(anchorKey)
  const first = new Date(d.getFullYear(), d.getMonth(), 1)
  // 周一为一周起点
  const dow = (first.getDay() + 6) % 7
  const start = new Date(first)
  start.setDate(first.getDate() - dow)
  const cells: string[] = []
  for (let i = 0; i < 42; i += 1) {
    const cur = new Date(start)
    cur.setDate(start.getDate() + i)
    cells.push(toKey(cur))
  }
  return cells
}

export function addMonthsKey(key: string, delta: number): string {
  const d = fromKey(key)
  const day = d.getDate()
  const target = new Date(d.getFullYear(), d.getMonth() + delta, 1)
  const dd = Math.min(day, daysInMonth(target.getFullYear(), target.getMonth()))
  return toKey(new Date(target.getFullYear(), target.getMonth(), dd))
}

