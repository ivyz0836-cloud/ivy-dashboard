import { useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  ListChecks,
  MapPin,
  Plus,
  Repeat,
} from 'lucide-react'
import { db } from '../db/db'
import type { ScheduleEvent, Task } from '../db/types'
import { useDate } from '../context/date'
import { useSettings } from '../hooks/useSettings'
import { Card, CardHead, Empty, Segmented, Sheet } from '../components/ui'
import { useToast } from '../context/toast'
import { EventRow, EventSheet } from '../components/EventSheet'
import {
  WEEK_SHORT,
  addMonthsKey,
  categoryMeta,
  colorHex,
  colorSoft,
  dateTitle,
  expandOccurrences,
  layoutDay,
  monthMatrix,
  monthTitle,
  minutesToTime,
  reminderLabel,
  shanghaiDateKey,
  shanghaiMinutes,
  type Occurrence,
} from '../lib/schedule'
import { addDays, fromKey, rangeKeys, startOfWeek, today } from '../lib/date'

/** 与 CSS 变量 --hour-h 保持一致 */
const HOUR_H = 54
const MAX_MONTH_CHIPS = 2

type ViewMode = 'today' | 'week' | 'month'

const VIEWS: { value: ViewMode; label: string }[] = [
  { value: 'today', label: '今日' },
  { value: 'week', label: '周' },
  { value: 'month', label: '月' },
]

const HOURS = Array.from({ length: 24 }, (_, i) => i)

/* ================================================================== */
/* 主页面                                                              */
/* ================================================================== */

export default function SchedulePage() {
  const { date, setDate, goToday } = useDate()
  const settings = useSettings()
  const { toast } = useToast()

  const [view, setView] = useState<ViewMode>('week')
  const [sheet, setSheet] = useState<{ open: boolean; event?: ScheduleEvent; start?: string; end?: string }>({
    open: false,
  })
  const [agendaDate, setAgendaDate] = useState<string | null>(null)
  const [nowMin, setNowMin] = useState(() => shanghaiMinutes())
  const [nowKey, setNowKey] = useState(() => shanghaiDateKey())

  const events = useLiveQuery(() => db.events.toArray(), [], [])

  // 当前视图覆盖的日期区间
  const viewRange = useMemo<{ start: string; end: string }>(() => {
    if (view === 'today') return { start: date, end: date }
    if (view === 'week') {
      const s = startOfWeek(date)
      return { start: s, end: addDays(s, 6) }
    }
    const cells = monthMatrix(date)
    return { start: cells[0], end: cells[cells.length - 1] }
  }, [view, date])

  const tasks = useLiveQuery(
    () => db.tasks.where('date').between(viewRange.start, viewRange.end, true, true).toArray(),
    [viewRange.start, viewRange.end],
    [],
  )

  const occs = useMemo(
    () => expandOccurrences(events, viewRange.start, viewRange.end),
    [events, viewRange.start, viewRange.end],
  )

  const todayKey = today()
  const todayOccs = useMemo(() => expandOccurrences(events, todayKey, todayKey), [events, todayKey])

  /* 每分钟刷新「当前时间」指示线 */
  useEffect(() => {
    const tick = () => {
      setNowMin(shanghaiMinutes())
      setNowKey(shanghaiDateKey())
    }
    tick()
    const t = window.setInterval(tick, 30_000)
    return () => window.clearInterval(t)
  }, [])

  /* 提醒：到点后在应用内弹出提示（同一实例只提示一次） */
  const notified = useRef<Set<string>>(new Set())
  useEffect(() => {
    if (!settings.remindersEnabled) return
    const check = () => {
      const min = shanghaiMinutes()
      for (const occ of todayOccs) {
        const r = occ.event.reminderMinutes
        if (r === null || r === undefined) continue
        const fire = occ.startMin - r
        if (min >= fire && min <= occ.startMin + 5) {
          const id = `${occ.key}@${r}`
          if (!notified.current.has(id)) {
            notified.current.add(id)
            toast(`⏰ ${occ.event.title} · ${occ.allDay ? '全天' : occ.event.start ?? ''}`, 'warn')
          }
        }
      }
    }
    check()
    const t = window.setInterval(check, 30_000)
    return () => window.clearInterval(t)
  }, [todayOccs, settings.remindersEnabled, toast])

  const shift = (delta: number) => {
    if (view === 'today') setDate(addDays(date, delta))
    else if (view === 'week') setDate(addDays(date, 7 * delta))
    else setDate(addMonthsKey(date, delta))
  }

  const title =
    view === 'today'
      ? dateTitle(date)
      : view === 'week'
        ? `${monthTitle(startOfWeek(date))} · ${dateTitle(startOfWeek(date))} 起`
        : monthTitle(date)

  const toggleEventDone = async (ev: ScheduleEvent) => {
    if (ev.id === undefined) return
    await db.events.update(ev.id, { done: ev.done ? 0 : 1, updatedAt: Date.now() })
  }

  return (
    <>
      <Card>
        <CardHead
          icon={<CalendarDays size={17} />}
          eyebrow="每周从周一开始"
          title="日程"
          right={
            <button type="button" className="btn primary sm" onClick={() => setSheet({ open: true })}>
              <Plus size={15} /> 新建
            </button>
          }
        />

        <div className="cal-bar">
          <div className="title">{title}</div>
          <Segmented options={VIEWS} value={view} onChange={setView} />
          <button type="button" className="icon-btn" onClick={() => shift(-1)} aria-label="上一个">
            <ChevronLeft size={18} />
          </button>
          <button type="button" className="btn ghost sm" onClick={goToday}>
            今天
          </button>
          <button type="button" className="icon-btn" onClick={() => shift(1)} aria-label="下一个">
            <ChevronRight size={18} />
          </button>
        </div>

        {view === 'today' && (
          <TodayView
            date={date}
            occs={occs}
            tasks={tasks}
            showTasks={settings.showTasksInCalendar === 1}
            nowMin={nowMin}
            nowKey={nowKey}
            onOpenEvent={(ev) => setSheet({ open: true, event: ev })}
            onCreateAt={(start) => setSheet({ open: true, start })}
            onToggleDone={toggleEventDone}
          />
        )}

        {view === 'week' && (
          <WeekView
            weekStart={startOfWeek(date)}
            occs={occs}
            tasks={tasks}
            showTasks={settings.showTasksInCalendar === 1}
            nowMin={nowMin}
            nowKey={nowKey}
            onOpenEvent={(ev) => setSheet({ open: true, event: ev })}
            onCreateAt={(dayKey, start) => {
              setDate(dayKey)
              setSheet({ open: true, start })
            }}
            onPickDay={(dayKey) => {
              setDate(dayKey)
              setView('today')
            }}
          />
        )}

        {view === 'month' && (
          <MonthView
            anchor={date}
            occs={occs}
            tasks={tasks}
            showTasks={settings.showTasksInCalendar === 1}
            nowKey={nowKey}
            selected={date}
            onOpenDay={(dayKey) => {
              setDate(dayKey)
              setAgendaDate(dayKey)
            }}
          />
        )}
      </Card>

      <Card>
        <CardHead icon={<ListChecks size={17} />} eyebrow={`共 ${events.length} 条日程`} title="接下来 7 天" />
        <Upcoming
          events={events}
          onOpen={(ev) => setSheet({ open: true, event: ev })}
          onToggleDone={toggleEventDone}
        />
      </Card>

      <EventSheet
        open={sheet.open}
        onClose={() => setSheet({ open: false })}
        date={date}
        event={sheet.event}
        defaultStart={sheet.start}
        defaultEnd={sheet.end}
      />

      <DayAgendaSheet
        date={agendaDate}
        events={events}
        tasks={tasks}
        onClose={() => setAgendaDate(null)}
        onNew={() => {
          setAgendaDate(null)
          setSheet({ open: true })
        }}
        onOpenEvent={(ev) => {
          setAgendaDate(null)
          setSheet({ open: true, event: ev })
        }}
      />
    </>
  )
}

/* ================================================================== */
/* 今日：时间轴                                                        */
/* ================================================================== */

function TodayView({
  date,
  occs,
  tasks,
  showTasks,
  nowMin,
  nowKey,
  onOpenEvent,
  onCreateAt,
  onToggleDone,
}: {
  date: string
  occs: Occurrence[]
  tasks: Task[]
  showTasks: boolean
  nowMin: number
  nowKey: string
  onOpenEvent: (ev: ScheduleEvent) => void
  onCreateAt: (start: string) => void
  onToggleDone: (ev: ScheduleEvent) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const isToday = date === nowKey

  const dayOccs = useMemo(() => occs.filter((o) => o.date === date), [occs, date])
  const allDay = dayOccs.filter((o) => o.allDay)
  const timed = dayOccs.filter((o) => !o.allDay)
  const positioned = useMemo(() => layoutDay(timed), [timed])
  const dayTasks = tasks.filter((t) => t.date === date)

  /* 首次进入把「现在」滚动到可见区域 */
  useEffect(() => {
    if (!isToday || !ref.current) return
    const top = (nowMin / 60) * HOUR_H
    ref.current.scrollTop = Math.max(0, top - 120)
  }, [isToday, date]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      {(allDay.length > 0 || (showTasks && dayTasks.length > 0)) && (
        <div className="tl-allday">
          {allDay.map((o) => (
            <button
              key={o.key}
              type="button"
              className="chip"
              style={{ background: colorSoft(o.event.color), color: colorHex(o.event.color) }}
              onClick={() => onOpenEvent(o.event)}
            >
              {categoryMeta(o.event.category).emoji} {o.event.title}
              {o.event.done ? ' ✓' : ''}
            </button>
          ))}
          {showTasks &&
            dayTasks.map((t) => (
              <span key={t.id} className="chip" style={{ background: 'var(--surface-3)' }}>
                {t.done ? '✓' : '○'} {t.title}
              </span>
            ))}
        </div>
      )}

      <div ref={ref} style={{ maxHeight: '62vh', overflowY: 'auto' }}>
        <div className="tl-body">
          {HOURS.map((h) => (
            <div className="tl-hour" key={h}>
              <div className="tl-hour-label">{h === 0 ? '' : `${`${h}`.padStart(2, '0')}:00`}</div>
              <div
                className="tl-hour-slot"
                onClick={() => onCreateAt(`${`${h}`.padStart(2, '0')}:00`)}
                title={`在 ${h}:00 新建日程`}
              />
            </div>
          ))}

          <div className="tl-layer">
            {positioned.map(({ occ, col, cols }) => (
              <button
                key={occ.key}
                type="button"
                className={`tl-ev ${occ.event.done ? 'done' : ''}`}
                style={{
                  top: (occ.startMin / 60) * HOUR_H,
                  height: Math.max(20, ((occ.endMin - occ.startMin) / 60) * HOUR_H - 2),
                  left: `calc(${(col / cols) * 100}% + 2px)`,
                  width: `calc(${100 / cols}% - 5px)`,
                  background: colorSoft(occ.event.color),
                  borderLeftColor: colorHex(occ.event.color),
                  color: colorHex(occ.event.color),
                }}
                onClick={() => onOpenEvent(occ.event)}
                onDoubleClick={() => void onToggleDone(occ.event)}
                title={`${occ.event.title}（双击切换完成）`}
              >
                <span className="t">{occ.event.title}</span>
                <span className="s">
                  {occ.event.start} – {occ.event.end}
                  {occ.event.location ? ` · ${occ.event.location}` : ''}
                </span>
              </button>
            ))}
          </div>

          {isToday && (
            <div className="tl-now" style={{ top: (nowMin / 60) * HOUR_H }}>
              <span>{minutesToTime(nowMin)}</span>
            </div>
          )}
        </div>
      </div>

      {dayOccs.length === 0 && <Empty emoji="🗓️" text="这一天还没有日程，点任意时间格即可新建" />}
    </div>
  )
}

/* ================================================================== */
/* 周视图                                                              */
/* ================================================================== */

function WeekView({
  weekStart,
  occs,
  tasks,
  showTasks,
  nowMin,
  nowKey,
  onOpenEvent,
  onCreateAt,
  onPickDay,
}: {
  weekStart: string
  occs: Occurrence[]
  tasks: Task[]
  showTasks: boolean
  nowMin: number
  nowKey: string
  onOpenEvent: (ev: ScheduleEvent) => void
  onCreateAt: (dayKey: string, start: string) => void
  onPickDay: (dayKey: string) => void
}) {
  const days = useMemo(() => rangeKeys(weekStart, addDays(weekStart, 6)), [weekStart])
  const byDay = useMemo(() => {
    const map = new Map<string, Occurrence[]>()
    for (const d of days) map.set(d, [])
    for (const o of occs) map.get(o.date)?.push(o)
    return map
  }, [days, occs])

  return (
    <div className="wk-scroll">
      <div className="wk-grid">
        <div className="wk-corner" />
        {days.map((d, i) => {
          const isToday = d === nowKey
          const day = fromKey(d)
          return (
            <button
              key={d}
              type="button"
              className={`wk-head ${isToday ? 'today' : ''}`}
              onClick={() => onPickDay(d)}
              title="查看这一天"
            >
              <div className="d">{WEEK_SHORT[i]}</div>
              <div className="n">{day.getDate()}</div>
            </button>
          )
        })}

        <div className="wk-allday-label">全天</div>
        {days.map((d) => {
          const list = (byDay.get(d) ?? []).filter((o) => o.allDay)
          const dayTasks = showTasks ? tasks.filter((t) => t.date === d) : []
          return (
            <div className="wk-allday wk-allday-cell" key={d}>
              {list.map((o) => (
                <button
                  key={o.key}
                  type="button"
                  className="chip-mini"
                  style={{ background: colorSoft(o.event.color), color: colorHex(o.event.color) }}
                  onClick={() => onOpenEvent(o.event)}
                >
                  {o.event.title}
                </button>
              ))}
              {dayTasks.slice(0, 2).map((t) => (
                <span
                  key={t.id}
                  className="chip-mini"
                  style={{ background: 'var(--surface-3)', color: 'var(--ink-2)' }}
                >
                  {t.done ? '✓' : '○'} {t.title}
                </span>
              ))}
            </div>
          )
        })}

        <div className="wk-gutter">
          {HOURS.map((h) => (
            <div className="wk-hourlabel" key={h}>
              {h === 0 ? '' : `${`${h}`.padStart(2, '0')}:00`}
            </div>
          ))}
        </div>

        {days.map((d) => {
          const list = (byDay.get(d) ?? []).filter((o) => !o.allDay)
          const positioned = layoutDay(list)
          const isToday = d === nowKey
          return (
            <div className={`wk-col ${isToday ? 'today' : ''}`} key={d}>
              {HOURS.map((h) => (
                <div
                  key={h}
                  className="wk-slot"
                  onClick={() => onCreateAt(d, `${`${h}`.padStart(2, '0')}:00`)}
                  title={`${d} ${h}:00 新建日程`}
                />
              ))}
              {positioned.map(({ occ, col, cols }) => (
                <button
                  key={occ.key}
                  type="button"
                  className={`wk-ev ${occ.event.done ? 'done' : ''}`}
                  style={{
                    top: (occ.startMin / 60) * HOUR_H,
                    height: Math.max(18, ((occ.endMin - occ.startMin) / 60) * HOUR_H - 2),
                    left: `calc(${(col / cols) * 100}% + 2px)`,
                    width: `calc(${100 / cols}% - 5px)`,
                    background: colorSoft(occ.event.color),
                    borderLeftColor: colorHex(occ.event.color),
                    color: colorHex(occ.event.color),
                  }}
                  onClick={() => onOpenEvent(occ.event)}
                  title={`${occ.event.title} ${occ.event.start}–${occ.event.end}`}
                >
                  <span className="t">{occ.event.title}</span>
                  <span className="s">{occ.event.start}</span>
                </button>
              ))}
              {isToday && (
                <div className="tl-now" style={{ top: (nowMin / 60) * HOUR_H }}>
                  <span>{minutesToTime(nowMin)}</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ================================================================== */
/* 月视图                                                              */
/* ================================================================== */

function MonthView({
  anchor,
  occs,
  tasks,
  showTasks,
  nowKey,
  selected,
  onOpenDay,
}: {
  anchor: string
  occs: Occurrence[]
  tasks: Task[]
  showTasks: boolean
  nowKey: string
  selected: string
  onOpenDay: (dayKey: string) => void
}) {
  const cells = useMemo(() => monthMatrix(anchor), [anchor])
  const curMonth = anchor.slice(0, 7)

  const byDay = useMemo(() => {
    const map = new Map<string, Occurrence[]>()
    for (const c of cells) map.set(c, [])
    for (const o of occs) map.get(o.date)?.push(o)
    return map
  }, [cells, occs])

  const taskCount = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of tasks) map.set(t.date, (map.get(t.date) ?? 0) + 1)
    return map
  }, [tasks])

  return (
    <div>
      <div className="mo-head">
        {WEEK_SHORT.map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>
      <div className="mo-grid">
        {cells.map((d) => {
          const list = byDay.get(d) ?? []
          const out = d.slice(0, 7) !== curMonth
          const isToday = d === nowKey
          const shown = list.slice(0, MAX_MONTH_CHIPS)
          const more = list.length - shown.length
          const tCount = showTasks ? (taskCount.get(d) ?? 0) : 0
          return (
            <button
              key={d}
              type="button"
              className={`mo-cell ${out ? 'out' : ''} ${isToday ? 'today' : ''} ${d === selected ? 'sel' : ''}`}
              onClick={() => onOpenDay(d)}
            >
              <span className="mo-num">{fromKey(d).getDate()}</span>
              <span className="mo-chip-row">
                {shown.map((o) => (
                  <span
                    key={o.key}
                    className="mo-chip"
                    style={{ background: colorSoft(o.event.color), color: colorHex(o.event.color) }}
                  >
                    <i className="mo-dot" style={{ background: colorHex(o.event.color) }} />
                    <span className="mo-chip-txt">{o.event.title}</span>
                  </span>
                ))}
              </span>
              {more > 0 && <span className="mo-more">+{more} 更多</span>}
              {tCount > 0 && (
                <span className="mo-task">
                  <ListChecks size={9} /> {tCount} 项任务
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ================================================================== */
/* 某一天的议程（月视图点格子弹出）                                     */
/* ================================================================== */

function DayAgendaSheet({
  date,
  events,
  tasks,
  onClose,
  onNew,
  onOpenEvent,
}: {
  date: string | null
  events: ScheduleEvent[]
  tasks: Task[]
  onClose: () => void
  onNew: () => void
  onOpenEvent: (ev: ScheduleEvent) => void
}) {
  const { toast } = useToast()
  const occs = useMemo(
    () => (date ? expandOccurrences(events, date, date) : []),
    [events, date],
  )
  const dayTasks = useMemo(() => (date ? tasks.filter((t) => t.date === date) : []), [tasks, date])

  return (
    <Sheet open={date !== null} onClose={onClose} title={date ? dateTitle(date) : ''}>
      {occs.length === 0 && dayTasks.length === 0 ? (
        <Empty emoji="🗓️" text="这一天还没有安排" />
      ) : (
        <>
          {occs.map((o) => (
            <EventRow
              key={o.key}
              occ={{ event: o.event, date: o.date, recurring: o.recurring, allDay: o.allDay }}
              onOpen={() => onOpenEvent(o.event)}
              onToggleDone={() => {
                if (o.event.id !== undefined) {
                  void db.events.update(o.event.id, { done: o.event.done ? 0 : 1, updatedAt: Date.now() })
                }
              }}
            />
          ))}
          {dayTasks.map((t) => (
            <div className="row" key={`t${t.id}`}>
              <div className="row-emoji">{t.done ? '✅' : '⬜'}</div>
              <div className="row-body">
                <div className="row-title">{t.title}</div>
                <div className="row-sub">今日任务</div>
              </div>
              <button
                type="button"
                className="tick"
                style={
                  t.done
                    ? { background: 'var(--green)', borderColor: 'var(--green)', color: '#fff' }
                    : undefined
                }
                onClick={async () => {
                  if (t.id === undefined) return
                  await db.tasks.update(t.id, { done: t.done ? 0 : 1, doneAt: t.done ? undefined : Date.now() })
                  toast(t.done ? '已标记为未完成' : '任务完成 👍')
                }}
                aria-label="切换任务完成"
              >
                <Check size={14} strokeWidth={3} />
              </button>
            </div>
          ))}
        </>
      )}
      <div className="sheet-actions">
        <button type="button" className="btn ghost" onClick={onClose}>
          关闭
        </button>
        <button type="button" className="btn primary" onClick={onNew}>
          <Plus size={15} /> 新建日程
        </button>
      </div>
    </Sheet>
  )
}

/* ================================================================== */
/* 接下来 7 天                                                         */
/* ================================================================== */

function Upcoming({
  events,
  onOpen,
  onToggleDone,
}: {
  events: ScheduleEvent[]
  onOpen: (ev: ScheduleEvent) => void
  onToggleDone: (ev: ScheduleEvent) => void
}) {
  const start = today()
  const occs = useMemo(() => expandOccurrences(events, start, addDays(start, 13)).slice(0, 12), [events, start])

  if (occs.length === 0) return <Empty emoji="🌤️" text="未来两周还没有日程" />

  return (
    <>
      {occs.map((o) => (
        <EventRow
          key={o.key}
          occ={{ event: o.event, date: o.date, recurring: o.recurring, allDay: o.allDay }}
          onOpen={() => onOpen(o.event)}
          onToggleDone={() => onToggleDone(o.event)}
        />
      ))}
      <div className="divider" />
      <div className="small muted">
        <Clock size={11} style={{ verticalAlign: -1 }} /> 提醒：{reminderLabel(10)} 起会在应用内弹出提示；
        <Repeat size={11} style={{ verticalAlign: -1 }} /> 重复日程按规则自动展开，修改即时生效。
        <ArrowRight size={11} style={{ verticalAlign: -1 }} /> 双击今日视图中的日程可快速标记完成。
      </div>
      {occs.some((o) => o.event.location) && (
        <div className="small muted" style={{ marginTop: 6 }}>
          <MapPin size={11} style={{ verticalAlign: -1 }} /> 带地点的日程会在卡片上显示位置。
        </div>
      )}
    </>
  )
}
