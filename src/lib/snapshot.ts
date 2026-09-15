import { liveQuery } from 'dexie'
import { db, getSettings } from '../db/db'
import { expandOccurrences, shanghaiMinutes } from './schedule'
import { fromKey, today, weekdayCN } from './date'
import { isNativeIos, writeSnapshotToWidget } from './iosBridge'

/**
 * 给 iOS 小组件用的紧凑 JSON 快照。
 *
 * 结构必须与 ios/Shared/IvySnapshot.swift 中的 Codable 模型严格一致，
 * 字段名一旦改动需要同时改两侧。
 */

export interface IvyItem {
  id: string
  title: string
  start?: string
  end?: string
  allDay: boolean
  colorKey: string
  kind: 'event' | 'task'
  done: boolean
  link: string
}

export interface IvyProgress {
  value: number
  goal: number
  unit: string
  label: string
}

export interface IvySnapshotPayload {
  version: number
  /** epoch 秒 */
  generatedAt: number
  dateKey: string
  display: { monthDay: string; weekday: string }
  tasks: { total: number; done: number }
  nextItems: IvyItem[]
  agenda: IvyItem[]
  exercise: IvyProgress
  food: IvyProgress
  english: IvyProgress
  reading: IvyProgress
  mood: number | null
  hasData: boolean
}

const SNAPSHOT_VERSION = 1

export async function buildSnapshot(dateKey: string): Promise<IvySnapshotPayload> {
  const [tasks, events, exercise, food, reading, english, moods, settings] = await Promise.all([
    db.tasks.where('date').equals(dateKey).toArray(),
    db.events.toArray(),
    db.exerciseLogs.where('date').equals(dateKey).toArray(),
    db.foodLogs.where('date').equals(dateKey).toArray(),
    db.readingLogs.where('date').equals(dateKey).toArray(),
    db.englishLogs.where('date').equals(dateKey).toArray(),
    db.moods.where('date').equals(dateKey).toArray(),
    getSettings(),
  ])

  const occs = expandOccurrences(events, dateKey, dateKey)

  const items: (IvyItem & { sortMin: number })[] = []

  for (const o of occs) {
    items.push({
      id: `e${o.event.id ?? 0}`,
      title: o.event.title,
      start: o.allDay ? undefined : o.event.start,
      end: o.allDay ? undefined : o.event.end,
      allDay: o.allDay,
      colorKey: o.event.color,
      kind: 'event',
      done: o.event.done === 1,
      link: `ivy://event/${o.event.id ?? 0}`,
      sortMin: o.allDay ? -1 : o.startMin,
    })
  }
  for (const t of tasks) {
    items.push({
      id: `t${t.id ?? 0}`,
      title: t.title,
      allDay: true,
      colorKey: 'green',
      kind: 'task',
      done: t.done === 1,
      link: `ivy://task/${t.id ?? 0}`,
      sortMin: 24 * 60, // 任务没有时间，排在日程之后
    })
  }

  items.sort((a, b) => a.sortMin - b.sortMin)
  const agenda = items.slice(0, 6).map(({ sortMin: _sortMin, ...rest }) => rest)

  const nowMin = shanghaiMinutes()
  const upcoming = items.filter(
    (i) => !i.done && (i.allDay || i.sortMin === 24 * 60 || i.sortMin >= nowMin),
  )
  const nextItems = (upcoming.length >= 3 ? upcoming : [...upcoming, ...items.filter((i) => !i.done)])
    .slice(0, 3)
    .map(({ sortMin: _sortMin, ...rest }) => rest)

  const exerciseMinutes = exercise.reduce((s, e) => s + e.minutes, 0)
  const calories = food.reduce((s, f) => s + f.calories, 0)
  const pages = reading.reduce((s, r) => s + r.pages, 0)
  const englishVocab = english.filter((e) => e.activity === 'vocab').reduce((s, e) => s + e.value, 0)
  const englishMinutes = english.filter((e) => e.activity !== 'vocab').reduce((s, e) => s + e.value, 0)

  const d = fromKey(dateKey)

  return {
    version: SNAPSHOT_VERSION,
    generatedAt: Math.floor(Date.now() / 1000),
    dateKey,
    display: {
      monthDay: `${d.getMonth() + 1} 月 ${d.getDate()} 日`,
      weekday: weekdayCN(dateKey),
    },
    tasks: {
      total: tasks.length,
      done: tasks.filter((t) => t.done).length,
    },
    nextItems,
    agenda,
    exercise: { value: exerciseMinutes, goal: settings.dailyExerciseGoal, unit: '分钟', label: '运动' },
    food: { value: calories, goal: settings.dailyCalorieGoal, unit: '千卡', label: '饮食' },
    english: { value: englishVocab + englishMinutes, goal: settings.dailyEnglishGoal, unit: '词/分', label: '英语' },
    reading: { value: pages, goal: settings.dailyReadingGoal, unit: '页', label: '阅读' },
    mood: moods[0]?.score ?? null,
    hasData:
      tasks.length > 0 ||
      occs.length > 0 ||
      exercise.length > 0 ||
      food.length > 0 ||
      reading.length > 0 ||
      english.length > 0 ||
      moods.length > 0,
  }
}

/**
 * 订阅 IndexedDB 变化，任务 / 日程 / 运动 / 饮食 / 阅读 / 英语 / 心情
 * 任一改动都会重新生成快照并推送给 iOS 原生层。
 *
 * 非 iOS 环境下直接空转，对现有 Web 功能零影响。
 */
export function startSnapshotSync(): () => void {
  if (!isNativeIos()) return () => {}

  let lastJson = ''
  const push = (payload: IvySnapshotPayload) => {
    const json = JSON.stringify(payload)
    if (json === lastJson) return
    lastJson = json
    void writeSnapshotToWidget(json)
  }

  const sub = liveQuery(() => buildSnapshot(today())).subscribe({
    next: (payload) => push(payload),
    error: () => {
      /* 忽略：快照失败不应影响 Web 使用 */
    },
  })

  // 兜底：每 15 分钟重算一次（跨天、时区切换等场景）
  const recompute = () => void buildSnapshot(today()).then(push)
  const timer = window.setInterval(recompute, 15 * 60 * 1000)
  // 回到前台时立即同步一次
  const onVisible = () => {
    if (document.visibilityState === 'visible') recompute()
  }
  document.addEventListener('visibilitychange', onVisible)

  return () => {
    sub.unsubscribe()
    window.clearInterval(timer)
    document.removeEventListener('visibilitychange', onVisible)
  }
}
