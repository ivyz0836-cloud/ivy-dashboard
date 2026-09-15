import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Activity,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Flame,
  Heart,
  Newspaper,
  Plus,
  Smile,
  UtensilsCrossed,
  Volleyball,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { db } from '../db/db'
import type { ExerciseType, ScheduleEvent } from '../db/types'
import { useDate } from '../context/date'
import { useDay } from '../hooks/useDay'
import { useSettings } from '../hooks/useSettings'
import { TaskBoard } from '../components/TaskBoard'
import { Card, CardHead, Empty, Ring, Stat } from '../components/ui'
import { useToast } from '../context/toast'
import { EventRow, EventSheet } from '../components/EventSheet'
import {
  EnglishSheet,
  ExerciseSheet,
  FoodSheet,
  MoodSheet,
  NewsSheet,
  ReadingSheet,
} from '../components/sheets'
import { EXERCISES, MOODS, exerciseMeta } from '../lib/constants'
import { colorHex, expandOccurrences, shanghaiMinutes } from '../lib/schedule'
import { today } from '../lib/date'

function greeting(): string {
  const h = new Date().getHours()
  if (h < 6) return '还早呢，早点休息'
  if (h < 11) return '早上好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  if (h < 23) return '晚上好'
  return '夜深了'
}

export default function TodayPage() {
  const { date, isToday } = useDate()
  const day = useDay(date)
  const settings = useSettings()
  const { toast } = useToast()

  const [exSheet, setExSheet] = useState<{ open: boolean; type?: ExerciseType }>({ open: false })
  const [foodOpen, setFoodOpen] = useState(false)
  const [readOpen, setReadOpen] = useState(false)
  const [engOpen, setEngOpen] = useState(false)
  const [newsOpen, setNewsOpen] = useState(false)
  const [moodOpen, setMoodOpen] = useState(false)
  const [evSheet, setEvSheet] = useState<{ open: boolean; event?: ScheduleEvent }>({ open: false })

  const events = useLiveQuery(() => db.events.toArray(), [], [])
  const dayOccs = useMemo(() => expandOccurrences(events, date, date), [events, date])
  const nowMin = isToday ? shanghaiMinutes() : -1
  const nextUp = dayOccs.filter((o) => !o.allDay && o.startMin > nowMin && !o.event.done)
  const remaining = dayOccs.filter((o) => !o.event.done).length
  const plannedMinutes = dayOccs
    .filter((o) => !o.allDay)
    .reduce((s, o) => s + (o.endMin - o.startMin), 0)

  const doneCount = day.tasks.filter((t) => t.done).length
  const rate = day.tasks.length === 0 ? 0 : doneCount / day.tasks.length
  const exMinutes = day.exercise.reduce((s, e) => s + e.minutes, 0)
  const exCal = day.exercise.reduce((s, e) => s + e.calories, 0)
  const calIn = day.food.reduce((s, f) => s + f.calories, 0)
  const pages = day.reading.reduce((s, r) => s + r.pages, 0)
  const engVocab = day.english.filter((e) => e.activity === 'vocab').reduce((s, e) => s + e.value, 0)
  const engMinutes = day.english.filter((e) => e.activity !== 'vocab').reduce((s, e) => s + e.value, 0)

  const minutesByType = (type: ExerciseType) =>
    day.exercise.filter((e) => e.type === type).reduce((s, e) => s + e.minutes, 0)

  const quickLogExercise = async (type: ExerciseType) => {
    const meta = exerciseMeta(type)
    const minutes = 30
    const calories = Math.round(minutes * meta.kcalPerMin)
    const id = await db.exerciseLogs.add({ date, type, minutes, calories, createdAt: Date.now() })
    toast(`已记录 ${minutes} 分钟${meta.label} · 约 ${calories} 千卡`, 'ok', {
      label: '撤销',
      onClick: () => void db.exerciseLogs.delete(id),
    })
  }

  const quickMood = async (score: number) => {
    const now = Date.now()
    const patch = {
      score,
      emoji: MOODS.find((m) => m.score === score)?.emoji ?? '😐',
      tags: day.mood?.tags ?? [],
      note: day.mood?.note,
      updatedAt: now,
    }
    if (day.mood?.id !== undefined) {
      await db.moods.update(day.mood.id, patch)
    } else {
      await db.moods.add({ date, ...patch, createdAt: now })
    }
    toast('心情已记录')
  }

  return (
    <>
      {/* ------------------------------ Hero ------------------------------ */}
      <div className="hero">
        <div className="hero-top">
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2>
              {greeting()}，{settings.name}
              {isToday ? '' : ' · 回顾'}
            </h2>
            <div className="hero-sub">
              {day.tasks.length === 0
                ? '今天还没有任务，先加一条吧'
                : doneCount === day.tasks.length
                  ? '今天的任务全部完成，厉害 🎉'
                  : `还有 ${day.tasks.length - doneCount} 件事等你完成`}
            </div>
          </div>
          <Ring value={rate}>
            <b>{Math.round(rate * 100)}%</b>
            <span>任务</span>
          </Ring>
        </div>
        <div className="hero-stats">
          <div className="hero-stat">
            <b>{exMinutes}</b>
            <span>运动分钟</span>
          </div>
          <div className="hero-stat">
            <b>{calIn}</b>
            <span>摄入千卡</span>
          </div>
          <div className="hero-stat">
            <b>{day.mood ? day.mood.score : '–'}</b>
            <span>心情指数</span>
          </div>
        </div>
      </div>

      {/* --------------------------- 今日日程概览 --------------------------- */}
      <Card>
        <CardHead
          icon={<CalendarDays size={17} />}
          eyebrow={
            dayOccs.length === 0
              ? '今天还没有安排'
              : `${dayOccs.length} 项 · 待办 ${remaining} · 计划 ${Math.round(plannedMinutes / 60)} 小时`
          }
          title="今日日程"
          right={
            <>
              <Link to="/schedule" className="btn ghost xs">
                日历 <ArrowRight size={12} />
              </Link>
              <button type="button" className="btn primary xs" onClick={() => setEvSheet({ open: true })}>
                <Plus size={13} /> 新建
              </button>
            </>
          }
        />

        {dayOccs.length === 0 ? (
          <Empty
            emoji="🗓️"
            text="今天还没有日程，去日历里排一排吧"
            action={
              <Link to="/schedule" className="btn primary sm">
                打开日程
              </Link>
            }
          />
        ) : (
          <>
            {nextUp.length > 0 && (
              <div className="banner" style={{ marginBottom: 12 }}>
                <CalendarDays size={15} /> 下一项：{nextUp[0].event.start} · {nextUp[0].event.title}
              </div>
            )}
            {dayOccs.slice(0, 4).map((o) => (
              <EventRow
                key={o.key}
                occ={{ event: o.event, date: o.date, recurring: o.recurring, allDay: o.allDay }}
                onOpen={() => setEvSheet({ open: true, event: o.event })}
                onToggleDone={() => {
                  if (o.event.id !== undefined) {
                    void db.events.update(o.event.id, { done: o.event.done ? 0 : 1, updatedAt: Date.now() })
                  }
                }}
              />
            ))}
            {dayOccs.length > 4 && (
              <Link to="/schedule" className="btn ghost block" style={{ marginTop: 8 }}>
                查看全部 {dayOccs.length} 项 <ArrowRight size={13} />
              </Link>
            )}
            <div className="legend">
              {dayOccs.slice(0, 6).map((o) => (
                <span key={o.key}>
                  <i style={{ background: colorHex(o.event.color), borderRadius: 99 }} />
                  {o.allDay ? '全天' : o.event.start}
                </span>
              ))}
            </div>
          </>
        )}
      </Card>

      {/* ------------------------------ 任务 ------------------------------ */}
      <TaskBoard date={date} tasks={day.tasks} />

      {/* --------------------------- 30 分钟运动 --------------------------- */}
      <Card>
        <CardHead
          icon={<Volleyball size={17} />}
          eyebrow="一键记录 30 分钟"
          title="今天动一动"
          right={
            <button type="button" className="btn ghost xs" onClick={() => setExSheet({ open: true })}>
              自定义
            </button>
          }
        />
        <div className="exo-grid">
          {EXERCISES.map((e) => {
            const mins = minutesByType(e.type)
            return (
              <button
                key={e.type}
                type="button"
                className={`exo ${mins > 0 ? 'active' : ''}`}
                onClick={() => void quickLogExercise(e.type)}
                title={mins > 0 ? `今天已记录 ${mins} 分钟` : e.hint}
              >
                <span className="exo-emoji">{e.emoji}</span>
                <span className="exo-name">{e.label}</span>
                <span className="exo-hint">{mins > 0 ? `今日 ${mins} 分钟` : e.hint}</span>
                <span className="exo-kcal">30 分钟 ≈ {Math.round(30 * e.kcalPerMin)} 千卡</span>
              </button>
            )
          })}
        </div>
        {day.exercise.length > 0 && (
          <div style={{ marginTop: 12 }}>
            {day.exercise.slice(0, 4).map((e) => {
              const meta = exerciseMeta(e.type)
              return (
                <div key={e.id} className="row">
                  <div className="row-emoji">{meta.emoji}</div>
                  <div className="row-body">
                    <div className="row-title">{meta.label}</div>
                    <div className="row-sub">
                      {e.minutes} 分钟 · {e.calories} 千卡
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn ghost xs"
                    onClick={async () => {
                      if (e.id) await db.exerciseLogs.delete(e.id)
                      toast('已删除记录', 'info')
                    }}
                  >
                    删除
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* ------------------------------ 心情 ------------------------------ */}
      <Card>
        <CardHead
          icon={<Smile size={17} />}
          eyebrow={day.mood ? '今天已记录' : '点一下就好'}
          title="今日心情"
          right={
            <button type="button" className="btn ghost xs" onClick={() => setMoodOpen(true)}>
              {day.mood ? '编辑' : '写两句'}
            </button>
          }
        />
        <div className="mood-row">
          {MOODS.map((m) => (
            <button
              key={m.score}
              type="button"
              className={`mood-btn ${day.mood?.score === m.score ? 'on' : ''}`}
              onClick={() => void quickMood(m.score)}
            >
              <span className="mood-emoji">{m.emoji}</span>
              <span className="mood-label">{m.label}</span>
            </button>
          ))}
        </div>
        {day.mood && (
          <div style={{ marginTop: 12 }}>
            {day.mood.tags.length > 0 && (
              <div className="chip-row" style={{ marginBottom: 8 }}>
                {day.mood.tags.map((t) => (
                  <span key={t} className="pill amber">
                    {t}
                  </span>
                ))}
              </div>
            )}
            {day.mood.note && <div className="row-note">{day.mood.note}</div>}
          </div>
        )}
      </Card>

      {/* ---------------------------- 今日速记 ---------------------------- */}
      <Card>
        <CardHead icon={<Plus size={17} />} eyebrow="随手记一笔" title="快速记录" />
        <div className="grid g4">
          <button type="button" className="btn ghost" onClick={() => setFoodOpen(true)}>
            <UtensilsCrossed size={15} /> 记饮食
          </button>
          <button type="button" className="btn ghost" onClick={() => setReadOpen(true)}>
            <BookOpen size={15} /> 记阅读
          </button>
          <button type="button" className="btn ghost" onClick={() => setEngOpen(true)}>
            <Activity size={15} /> 记英语
          </button>
          <button type="button" className="btn ghost" onClick={() => setNewsOpen(true)}>
            <Newspaper size={15} /> 写评论
          </button>
        </div>
      </Card>

      {/* ---------------------------- 今日概览 ---------------------------- */}
      <Card>
        <CardHead icon={<Flame size={17} />} eyebrow="对照每日目标" title="今日进度" />
        <div className="grid g4">
          <Stat
            label="运动"
            value={exMinutes}
            unit="分钟"
            hint={`目标 ${settings.dailyExerciseGoal} · 消耗 ${exCal} 千卡`}
            progress={exMinutes / Math.max(1, settings.dailyExerciseGoal)}
          />
          <Stat
            label="摄入"
            value={calIn}
            unit="千卡"
            hint={`目标 ${settings.dailyCalorieGoal}`}
            progress={calIn / Math.max(1, settings.dailyCalorieGoal)}
            barClass="amber"
          />
          <Stat
            label="阅读"
            value={pages}
            unit="页"
            hint={`目标 ${settings.dailyReadingGoal} 页`}
            progress={pages / Math.max(1, settings.dailyReadingGoal)}
            barClass="sky"
          />
          <Stat
            label="英语"
            value={engVocab}
            unit="词"
            hint={`听说读写 ${engMinutes} 分钟 · 目标 ${settings.dailyEnglishGoal}`}
            progress={Math.min(1, (engVocab + engMinutes) / Math.max(1, settings.dailyEnglishGoal))}
            barClass="violet"
          />
        </div>

        {day.food.length > 0 && (
          <>
            <div className="divider" />
            <div className="card-h" style={{ marginBottom: 8 }}>
              <h3 style={{ fontSize: 14 }}>今日饮食</h3>
              <span className="muted small">{day.food.length} 条</span>
            </div>
            {day.food.slice(0, 5).map((f) => (
              <div key={f.id} className="row">
                <div className="row-emoji">🍽️</div>
                <div className="row-body">
                  <div className="row-title">{f.name}</div>
                  <div className="row-sub">
                    {f.meal === 'breakfast' ? '早餐' : f.meal === 'lunch' ? '午餐' : f.meal === 'dinner' ? '晚餐' : '加餐'}
                  </div>
                </div>
                <div className="row-value">{f.calories} 千卡</div>
                <button
                  type="button"
                  className="task-del"
                  style={{ opacity: 1 }}
                  onClick={async () => {
                    if (f.id) await db.foodLogs.delete(f.id)
                    toast('已删除记录', 'info')
                  }}
                  aria-label="删除"
                >
                  删除
                </button>
              </div>
            ))}
          </>
        )}

        {day.news.length === 0 && day.reading.length === 0 && day.english.length === 0 && (
          <Empty emoji="🌿" text="今天还没有阅读、英语或新闻记录" />
        )}
      </Card>

      {date !== today() && (
        <div className="banner">
          <Heart size={15} /> 你正在查看历史日期，记录依然可以编辑补充。
        </div>
      )}

      {/* ------------------------------ 弹层 ------------------------------ */}
      <ExerciseSheet
        open={exSheet.open}
        onClose={() => setExSheet({ open: false })}
        date={date}
        defaultType={exSheet.type}
      />
      <FoodSheet open={foodOpen} onClose={() => setFoodOpen(false)} date={date} />
      <ReadingSheet open={readOpen} onClose={() => setReadOpen(false)} date={date} />
      <EnglishSheet open={engOpen} onClose={() => setEngOpen(false)} date={date} />
      <NewsSheet open={newsOpen} onClose={() => setNewsOpen(false)} date={date} />
      <MoodSheet open={moodOpen} onClose={() => setMoodOpen(false)} date={date} entry={day.mood} />
      <EventSheet
        open={evSheet.open}
        onClose={() => setEvSheet({ open: false })}
        date={date}
        event={evSheet.event}
      />
    </>
  )
}
