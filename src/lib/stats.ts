import { db } from '../db/db'
import type { DateKey, ExerciseLog, FoodLog, EnglishLog, ReadingLog, Task } from '../db/types'
import { endOfRange, rangeKeys, startOfMonth, startOfWeek, startOfYear } from './date'
import { expandOccurrences } from './schedule'

export interface DayStats {
  tasksTotal: number
  tasksDone: number
  exerciseMinutes: number
  exerciseCalories: number
  exerciseSessions: number
  caloriesIn: number
  readingPages: number
  readingMinutes: number
  englishVocab: number
  englishMinutes: number
  newsCount: number
  mood: number | null
  /** 日程数量（重复日程按天展开计） */
  eventCount: number
  /** 已完成的日程数量 */
  eventDone: number
  /** 计划时长（仅统计非全天日程） */
  plannedMinutes: number
}

export const EMPTY_DAY: DayStats = {
  tasksTotal: 0,
  tasksDone: 0,
  exerciseMinutes: 0,
  exerciseCalories: 0,
  exerciseSessions: 0,
  caloriesIn: 0,
  readingPages: 0,
  readingMinutes: 0,
  englishVocab: 0,
  englishMinutes: 0,
  newsCount: 0,
  mood: null,
  eventCount: 0,
  eventDone: 0,
  plannedMinutes: 0,
}

export interface RangeStats extends DayStats {
  days: number
  activeDays: number
  moodSum: number
  moodCount: number
  exerciseDays: number
  byDate: Record<DateKey, DayStats>
}

export interface LoadedRange {
  start: string
  end: string
  tasks: Task[]
  exercise: ExerciseLog[]
  food: FoodLog[]
  reading: ReadingLog[]
  english: EnglishLog[]
}

export async function loadRange(start: string, end: string): Promise<LoadedRange> {
  const [tasks, exercise, food, reading, english] = await Promise.all([
    db.tasks.where('date').between(start, end, true, true).toArray(),
    db.exerciseLogs.where('date').between(start, end, true, true).toArray(),
    db.foodLogs.where('date').between(start, end, true, true).toArray(),
    db.readingLogs.where('date').between(start, end, true, true).toArray(),
    db.englishLogs.where('date').between(start, end, true, true).toArray(),
  ])
  return { start, end, tasks, exercise, food, reading, english }
}

export async function computeRangeStats(
  start: string,
  end: string,
  period: 'week' | 'month' | 'year' = 'week',
): Promise<RangeStats> {
  const keys = rangeKeys(start, end)
  const [loaded, moods, news] = await Promise.all([
    loadRange(start, end),
    db.moods.where('date').between(start, end, true, true).toArray(),
    db.newsReviews.where('date').between(start, end, true, true).toArray(),
  ])
  // 日程含重复规则，需要展开到区间内的每一天
  const allEvents = await db.events.toArray()
  const occs = expandOccurrences(allEvents, start, end)

  const byDate: Record<DateKey, DayStats> = {}
  for (const k of keys) byDate[k] = { ...EMPTY_DAY }
  void endOfRange(start, period)

  const moodMap = new Map(moods.map((m) => [m.date, m.score]))
  for (const k of keys) byDate[k].mood = moodMap.get(k) ?? null

  for (const t of loaded.tasks) {
    const d = byDate[t.date]
    if (!d) continue
    d.tasksTotal += 1
    if (t.done) d.tasksDone += 1
  }
  for (const e of loaded.exercise) {
    const d = byDate[e.date]
    if (!d) continue
    d.exerciseMinutes += e.minutes
    d.exerciseCalories += e.calories
    d.exerciseSessions += 1
  }
  for (const f of loaded.food) {
    const d = byDate[f.date]
    if (!d) continue
    d.caloriesIn += f.calories
  }
  for (const r of loaded.reading) {
    const d = byDate[r.date]
    if (!d) continue
    d.readingPages += r.pages
    d.readingMinutes += r.minutes
  }
  for (const e of loaded.english) {
    const d = byDate[e.date]
    if (!d) continue
    if (e.activity === 'vocab') d.englishVocab += e.value
    else d.englishMinutes += e.value
  }
  for (const n of news) {
    const d = byDate[n.date]
    if (!d) continue
    d.newsCount += 1
  }
  for (const o of occs) {
    const d = byDate[o.date]
    if (!d) continue
    d.eventCount += 1
    if (o.event.done) d.eventDone += 1
    if (!o.allDay) d.plannedMinutes += Math.max(0, o.endMin - o.startMin)
  }

  const agg: RangeStats = { ...EMPTY_DAY, days: keys.length, activeDays: 0, moodSum: 0, moodCount: 0, exerciseDays: 0, byDate }
  for (const k of keys) {
    const d = byDate[k]
    agg.tasksTotal += d.tasksTotal
    agg.tasksDone += d.tasksDone
    agg.exerciseMinutes += d.exerciseMinutes
    agg.exerciseCalories += d.exerciseCalories
    agg.exerciseSessions += d.exerciseSessions
    agg.caloriesIn += d.caloriesIn
    agg.readingPages += d.readingPages
    agg.readingMinutes += d.readingMinutes
    agg.englishVocab += d.englishVocab
    agg.englishMinutes += d.englishMinutes
    agg.newsCount += d.newsCount
    agg.eventCount += d.eventCount
    agg.eventDone += d.eventDone
    agg.plannedMinutes += d.plannedMinutes
    if (d.mood !== null) {
      agg.moodSum += d.mood
      agg.moodCount += 1
    }
    if (d.tasksDone > 0 || d.exerciseMinutes > 0 || d.readingPages > 0 || d.eventDone > 0) agg.activeDays += 1
    if (d.exerciseMinutes > 0) agg.exerciseDays += 1
  }
  return agg
}

export function avgMood(s: RangeStats): number | null {
  return s.moodCount === 0 ? null : s.moodSum / s.moodCount
}

export function taskRate(s: DayStats | RangeStats): number {
  return s.tasksTotal === 0 ? 0 : s.tasksDone / s.tasksTotal
}

/** 日程完成率 */
export function eventRate(s: DayStats | RangeStats): number {
  return s.eventCount === 0 ? 0 : s.eventDone / s.eventCount
}

export function rangeBounds(dateKey: string, period: 'week' | 'month' | 'year') {
  const start =
    period === 'week' ? startOfWeek(dateKey) : period === 'month' ? startOfMonth(dateKey) : startOfYear(dateKey)
  const end = endOfRange(start, period)
  const clampedEnd = end > dateKey ? dateKey : end
  return { start, end, clampedEnd }
}
