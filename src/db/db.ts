import Dexie, { type Table } from 'dexie'
import type {
  AiTip,
  EnglishLog,
  ExerciseLog,
  FoodLog,
  MoodEntry,
  NewsReview,
  ReadingLog,
  ScheduleEvent,
  Setting,
  SummaryNote,
  Task,
  TaskTemplate,
} from './types'

export class IvyDB extends Dexie {
  tasks!: Table<Task, number>
  taskTemplates!: Table<TaskTemplate, number>
  exerciseLogs!: Table<ExerciseLog, number>
  foodLogs!: Table<FoodLog, number>
  readingLogs!: Table<ReadingLog, number>
  englishLogs!: Table<EnglishLog, number>
  aiTips!: Table<AiTip, number>
  newsReviews!: Table<NewsReview, number>
  moods!: Table<MoodEntry, number>
  summaryNotes!: Table<SummaryNote, number>
  settings!: Table<Setting, string>
  events!: Table<ScheduleEvent, number>

  constructor() {
    super('ivy-growth-dashboard')
    // v1：原始 schema。此处必须保持原样，已有用户数据依赖它。
    this.version(1).stores({
      tasks: '++id, date, done, category, templateId, createdAt',
      taskTemplates: '++id, archived, createdAt',
      exerciseLogs: '++id, date, type, createdAt',
      foodLogs: '++id, date, meal, createdAt',
      readingLogs: '++id, date, createdAt',
      englishLogs: '++id, date, activity, createdAt',
      aiTips: '++id, saved, applied, category, createdAt',
      newsReviews: '++id, date, createdAt',
      moods: '++id, &date, createdAt',
      summaryNotes: '++id, &periodKey, period, updatedAt',
      settings: 'key',
    })
    // v2：只新增 events 表。未在此列出的表会沿用 v1 的索引定义，
    // 因此不会重建/清空任何已有数据（纯 additive 迁移）。
    this.version(2).stores({
      events: '++id, date, category, recurrence, done, createdAt',
    })
  }
}

export const db = new IvyDB()

/* ------------------------------------------------------------------ */
/* 默认设置                                                            */
/* ------------------------------------------------------------------ */

export interface AppSettings {
  name: string
  dailyCalorieGoal: number
  dailyExerciseGoal: number
  dailyReadingGoal: number
  dailyEnglishGoal: number
  /** 是否把「今日任务」显示到日历里 */
  showTasksInCalendar: 0 | 1
  /** 新建日程时的默认提醒（分钟），null 表示不提醒 */
  defaultReminderMinutes: number | null
  /** 日程提醒开关 */
  remindersEnabled: 0 | 1
}

export const DEFAULT_SETTINGS: AppSettings = {
  name: 'Ivy',
  dailyCalorieGoal: 1800,
  dailyExerciseGoal: 30,
  dailyReadingGoal: 20,
  dailyEnglishGoal: 30,
  showTasksInCalendar: 1,
  defaultReminderMinutes: 10,
  remindersEnabled: 1,
}

export async function getSettings(): Promise<AppSettings> {
  const row = await db.settings.get('app')
  if (!row) return { ...DEFAULT_SETTINGS }
  return { ...DEFAULT_SETTINGS, ...(row.value as Partial<AppSettings>) }
}

export async function saveSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const current = await getSettings()
  const next = { ...current, ...patch }
  await db.settings.put({ key: 'app', value: next })
  return next
}
