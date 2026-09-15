import { db } from '../db/db'
import { TIP_SEED } from './tips'
import { addDays, startOfWeek, today } from './date'
import type { ScheduleEvent, TaskTemplate } from '../db/types'

const SEED_FLAG = 'seeded:v1'
const EVENT_SEED_FLAG = 'seeded:events:v1'

/** 演示日程（标题统一带【示例】前缀，方便一眼识别并删除） */
function demoEvents(base: string): Omit<ScheduleEvent, 'id'>[] {
  const monday = startOfWeek(base)
  const now = Date.now()
  const mk = (e: Partial<ScheduleEvent> & { title: string; date: string }): Omit<ScheduleEvent, 'id'> => ({
    allDay: 0,
    category: 'study',
    color: 'green',
    recurrence: 'none',
    done: 0,
    createdAt: now,
    updatedAt: now,
    ...e,
  })
  return [
    mk({
      title: '【示例】早读：外刊精读 30 分钟',
      date: base,
      start: '07:30',
      end: '08:00',
      category: 'english',
      color: 'sky',
      location: '宿舍 / 自习室',
      notes: '三遍法：通读 → 查生词 → 摘一句仿写',
      reminderMinutes: 10,
      recurrence: 'daily',
    }),
    mk({
      title: '【示例】高等数学课',
      date: base,
      start: '10:00',
      end: '11:40',
      category: 'study',
      color: 'green',
      location: '教学楼 A302',
      reminderMinutes: 30,
      recurrence: 'weekly',
    }),
    mk({
      title: '【示例】30 分钟普拉提',
      date: base,
      start: '18:00',
      end: '18:30',
      category: 'body',
      color: 'teal',
      location: '操场 / 宿舍',
      notes: '状态差的时候允许只做 5 分钟，但必须开始',
      recurrence: 'daily',
    }),
    mk({
      title: '【示例】图书馆固定自习',
      date: monday,
      start: '14:00',
      end: '17:00',
      category: 'study',
      color: 'violet',
      location: '图书馆 3F',
      recurrence: 'weekly',
    }),
    mk({
      title: '【示例】和朋友吃饭',
      date: addDays(base, 2),
      start: '19:00',
      end: '20:30',
      category: 'social',
      color: 'rose',
      location: '学校后街',
    }),
    mk({
      title: '【示例】月度复盘（全天）',
      date: addDays(base, 4),
      allDay: 1,
      category: 'life',
      color: 'amber',
      notes: '三句话模板：成就感 / 没做到 / 只改一件事',
    }),
  ]
}

export async function ensureSeed(): Promise<void> {
  const flag = await db.settings.get(SEED_FLAG)
  if (!flag) {
    await db.transaction('rw', db.aiTips, db.taskTemplates, db.tasks, db.settings, async () => {
    const tipCount = await db.aiTips.count()
    if (tipCount === 0) {
      await db.aiTips.bulkAdd(TIP_SEED.map((t, i) => ({ ...t, createdAt: Date.now() + i })))
    }

    const tplCount = await db.taskTemplates.count()
    if (tplCount === 0) {
      const templates: Omit<TaskTemplate, 'id'>[] = [
        { title: '背 30 个英语单词', category: 'english', createdAt: Date.now(), archived: 0 },
        { title: '读一篇外刊 / 做一篇四级阅读', category: 'english', createdAt: Date.now(), archived: 0 },
        { title: '看 20 分钟美剧（开英文字幕）', category: 'english', createdAt: Date.now(), archived: 0 },
        { title: '30 分钟运动', category: 'body', createdAt: Date.now(), archived: 0 },
        { title: '阅读 20 页书', category: 'study', createdAt: Date.now(), archived: 0 },
        { title: '练 15 分钟 Excel', category: 'study', createdAt: Date.now(), archived: 0 },
        { title: '记录今日饮食', category: 'life', createdAt: Date.now(), archived: 0 },
        { title: '睡前写 3 句复盘', category: 'life', createdAt: Date.now(), archived: 0 },
      ]
      await db.taskTemplates.bulkAdd(templates)
    }

      await db.settings.put({ key: SEED_FLAG, value: true })
    })
  }

  // 演示日程：仅在 events 表为空时写入，且使用独立标记，
  // 老用户升级到 v2 后也能看到示例，同时绝不会覆盖已有日程。
  const evFlag = await db.settings.get(EVENT_SEED_FLAG)
  if (!evFlag) {
    const count = await db.events.count()
    if (count === 0) {
      await db.events.bulkAdd(demoEvents(today()))
    }
    await db.settings.put({ key: EVENT_SEED_FLAG, value: true })
  }

  // 为今天生成一次任务实例
  await materializeDay(today())
}

/** 把未归档的每日模板实例化到指定日期（已存在则跳过） */
export async function materializeDay(date: string): Promise<void> {
  const templates = await db.taskTemplates.filter((t) => t.archived === 0).toArray()
  if (templates.length === 0) return
  const existing = await db.tasks.where('date').equals(date).toArray()
  const existingTpl = new Set(existing.map((t) => t.templateId).filter(Boolean))

  const missing = templates.filter((t) => t.id !== undefined && !existingTpl.has(t.id))
  if (missing.length === 0) return

  const baseOrder = existing.length
  await db.tasks.bulkAdd(
    missing.map((t, i) => ({
      title: t.title,
      category: t.category,
      date,
      done: 0 as const,
      createdAt: Date.now() + i,
      order: baseOrder + i,
      templateId: t.id,
    })),
  )
}
