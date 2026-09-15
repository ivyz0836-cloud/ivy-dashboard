export type ID = number

/** YYYY-MM-DD */
export type DateKey = string

export type TaskCategory = 'study' | 'body' | 'life' | 'english' | 'other'

export interface Task {
  id?: ID
  title: string
  category: TaskCategory
  date: DateKey
  done: 0 | 1
  doneAt?: number
  createdAt: number
  order: number
  /** 每日重复任务模板 id，非模板时为 undefined */
  templateId?: ID
}

/** 每日重复任务模板（会自动为当天生成实例） */
export interface TaskTemplate {
  id?: ID
  title: string
  category: TaskCategory
  createdAt: number
  archived: 0 | 1
}

export type ExerciseType = 'pilates' | 'badminton' | 'running' | 'walking'

export interface ExerciseLog {
  id?: ID
  date: DateKey
  type: ExerciseType
  minutes: number
  calories: number
  note?: string
  createdAt: number
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export interface FoodLog {
  id?: ID
  date: DateKey
  meal: MealType
  name: string
  calories: number
  note?: string
  createdAt: number
}

export interface ReadingLog {
  id?: ID
  date: DateKey
  book: string
  pages: number
  minutes: number
  note?: string
  createdAt: number
}

export type EnglishActivity = 'vocab' | 'reading' | 'listening' | 'speaking'

export interface EnglishLog {
  id?: ID
  date: DateKey
  activity: EnglishActivity
  /** vocab => 单词数；其他 => 分钟数 */
  value: number
  note?: string
  createdAt: number
}

export interface AiTip {
  id?: ID
  title: string
  body: string
  category: string
  /** 是否收藏 */
  saved: 0 | 1
  /** 是否已实践 */
  applied: 0 | 1
  appliedAt?: number
  createdAt: number
}

export interface NewsReview {
  id?: ID
  date: DateKey
  title: string
  source: string
  summary: string
  opinion: string
  /** 1-5 星 */
  rating: number
  url?: string
  createdAt: number
}

export interface MoodEntry {
  id?: ID
  date: DateKey
  /** 1-5 */
  score: number
  emoji: string
  tags: string[]
  note?: string
  createdAt: number
  updatedAt: number
}

export type SummaryPeriod = 'week' | 'month' | 'year'

export interface SummaryNote {
  id?: ID
  /** 例如 2026-W37 / 2026-09 / 2026 */
  periodKey: string
  period: SummaryPeriod
  wins: string
  misses: string
  plan: string
  updatedAt: number
}

export interface Setting {
  key: string
  value: unknown
}

/* ----------------------------- 日程 / 日历 ----------------------------- */

export type EventCategory = 'study' | 'english' | 'body' | 'life' | 'social' | 'other'

/** none = 不重复 */
export type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly'

export interface ScheduleEvent {
  id?: ID
  title: string
  /** YYYY-MM-DD（Asia/Shanghai） */
  date: DateKey
  /** HH:mm，24 小时制；全天事件为 undefined */
  start?: string
  end?: string
  allDay: 0 | 1
  category: EventCategory
  /** 颜色键，见 lib/schedule.ts EVENT_COLORS */
  color: string
  location?: string
  notes?: string
  /** 提前多少分钟提醒；null / undefined 表示不提醒 */
  reminderMinutes?: number | null
  recurrence: Recurrence
  /** 重复截止日 YYYY-MM-DD；为空表示不限 */
  recurrenceUntil?: string
  done: 0 | 1
  /** 若由任务联动创建，记录来源任务 id */
  taskId?: ID
  createdAt: number
  updatedAt: number
}
