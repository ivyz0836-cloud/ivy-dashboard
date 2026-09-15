import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  ClipboardCopy,
  Heart,
  NotebookPen,
  Sparkles,
} from 'lucide-react'
import { db } from '../db/db'
import type { SummaryPeriod } from '../db/types'
import { Card, CardHead, Empty, Segmented, Stat } from '../components/ui'
import { MiniBars, MoodChart } from '../components/charts'
import { useToast } from '../context/toast'
import { useRangeBounds, useRangeStats, type Period } from '../hooks/useRangeStats'
import { avgMood, eventRate, taskRate } from '../lib/stats'
import { MOODS } from '../lib/constants'
import {
  addDays,
  endOfRange,
  formatCN,
  fromKey,
  periodKeyOf,
  rangeKeys,
  startOfMonth,
  startOfWeek,
  startOfYear,
  toKey,
  today,
  weekdayCN,
} from '../lib/date'

const PERIODS: { value: Period; label: string }[] = [
  { value: 'week', label: '周' },
  { value: 'month', label: '月' },
  { value: 'year', label: '年' },
]

function shiftPeriod(anchor: string, period: Period, delta: number): string {
  const d = fromKey(anchor)
  if (period === 'week') return addDays(anchor, 7 * delta)
  if (period === 'month') return toKey(new Date(d.getFullYear(), d.getMonth() + delta, 1))
  return toKey(new Date(d.getFullYear() + delta, 0, 1))
}

function periodLabel(anchor: string, period: Period): string {
  if (period === 'week') {
    const s = startOfWeek(anchor)
    const e = endOfRange(s, 'week')
    return `${formatCN(s)} – ${formatCN(e)}`
  }
  if (period === 'month') {
    const d = fromKey(startOfMonth(anchor))
    return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月`
  }
  return `${fromKey(startOfYear(anchor)).getFullYear()} 年`
}

export default function ReviewPage() {
  const [period, setPeriod] = useState<Period>('week')
  const [anchor, setAnchor] = useState<string>(today())
  const { toast } = useToast()

  const stats = useRangeStats(anchor, period)
  const bounds = useRangeBounds(anchor, period)
  const key = periodKeyOf(anchor, period)

  const note = useLiveQuery(() => db.summaryNotes.where('periodKey').equals(key).first(), [key], undefined)

  const moods =
    useLiveQuery(
      () => db.moods.where('date').between(bounds.start, bounds.clamped, true, true).toArray(),
      [bounds.start, bounds.clamped],
      [],
    )

  const exercise =
    useLiveQuery(
      () => db.exerciseLogs.where('date').between(bounds.start, bounds.clamped, true, true).toArray(),
      [bounds.start, bounds.clamped],
      [],
    )

  const moodSeries = useMemo(() => {
    const keys = rangeKeys(bounds.start, bounds.clamped)
    if (period === 'month' || period === 'year') {
      // 按月聚合
      const byMonth = new Map<string, number[]>()
      for (const k of keys) {
        const m = k.slice(0, 7)
        const arr = byMonth.get(m) ?? []
        const s = moods.find((x) => x.date === k)?.score
        if (s !== undefined) arr.push(s)
        byMonth.set(m, arr)
      }
      return [...byMonth.entries()].map(([m, arr]) => ({
        label: `${Number(m.slice(5))}月`,
        score: arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null,
      }))
    }
    return keys.map((k) => ({
      label: weekdayCN(k).replace('周', ''),
      score: moods.find((x) => x.date === k)?.score ?? null,
    }))
  }, [bounds.start, bounds.clamped, moods, period])

  const exBars = useMemo(() => {
    if (period === 'week') {
      const keys = rangeKeys(bounds.start, bounds.clamped)
      return keys.map((k) => ({
        label: weekdayCN(k).replace('周', ''),
        value: exercise.filter((e) => e.date === k).reduce((s, e) => s + e.minutes, 0),
      }))
    }
    const byMonth = new Map<string, number>()
    for (const e of exercise) {
      const m = e.date.slice(0, 7)
      byMonth.set(m, (byMonth.get(m) ?? 0) + e.minutes)
    }
    return [...byMonth.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([m, v]) => ({
      label: `${Number(m.slice(5))}月`,
      value: v,
    }))
  }, [bounds.start, bounds.clamped, exercise, period])

  const moodAvg = stats ? avgMood(stats) : null
  const rate = stats ? taskRate(stats) : 0
  const evRate = stats ? eventRate(stats) : 0

  const summaryText = useMemo(() => {
    if (!stats) return ''
    const p = period === 'week' ? '本周' : period === 'month' ? '本月' : '今年'
    return [
      `【${p}复盘】${periodLabel(anchor, period)}`,
      `任务完成 ${stats.tasksDone}/${stats.tasksTotal}（${Math.round(rate * 100)}%）`,
      `运动 ${stats.exerciseMinutes} 分钟 / ${stats.exerciseSessions} 次，消耗 ${stats.exerciseCalories} 千卡`,
      `阅读 ${stats.readingPages} 页 / ${stats.readingMinutes} 分钟`,
      `英语：单词 ${stats.englishVocab} 个，听说读 ${stats.englishMinutes} 分钟`,
      `新闻评论 ${stats.newsCount} 篇`,
      `日程 ${stats.eventCount} 项，完成 ${stats.eventDone} 项（${Math.round(evRate * 100)}%）`,
      `计划时长 ${((stats.plannedMinutes ?? 0) / 60).toFixed(1)} 小时`,
      `平均心情 ${moodAvg === null ? '未记录' : moodAvg.toFixed(1)} / 5`,
      `有效天数 ${stats.activeDays} / ${stats.days} 天`,
    ].join('\n')
  }, [stats, period, anchor, rate, moodAvg, evRate])

  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(summaryText)
      toast('总结已复制到剪贴板')
    } catch {
      toast('复制失败，请手动选择文本', 'warn')
    }
  }

  return (
    <>
      <Card>
        <CardHead
          icon={<CalendarRange size={17} />}
          eyebrow={periodLabel(anchor, period)}
          title="周期性复盘"
          right={<Segmented options={PERIODS} value={period} onChange={(p) => setPeriod(p)} />}
        />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button type="button" className="icon-btn" onClick={() => setAnchor(shiftPeriod(anchor, period, -1))} aria-label="上一周期">
            <ChevronLeft size={18} />
          </button>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontWeight: 700 }}>{periodLabel(anchor, period)}</div>
            <div className="small muted">
              {bounds.start} ~ {bounds.clamped} · 共 {stats?.days ?? 0} 天
            </div>
          </div>
          <button
            type="button"
            className="icon-btn"
            onClick={() => setAnchor(shiftPeriod(anchor, period, 1))}
            aria-label="下一周期"
            disabled={bounds.clamped >= today()}
            style={bounds.clamped >= today() ? { opacity: 0.4, pointerEvents: 'none' } : undefined}
          >
            <ChevronRight size={18} />
          </button>
          <button type="button" className="btn ghost sm" onClick={() => setAnchor(today())}>
            回到当前
          </button>
        </div>
      </Card>

      <Card>
        <CardHead icon={<Sparkles size={17} />} eyebrow="自动汇总" title="数据总览" />
        <div className="grid g4">
          <Stat
            label="任务完成率"
            value={Math.round(rate * 100)}
            unit="%"
            hint={`${stats?.tasksDone ?? 0} / ${stats?.tasksTotal ?? 0} 项`}
            progress={rate}
          />
          <Stat
            label="运动"
            value={stats?.exerciseMinutes ?? 0}
            unit="分钟"
            hint={`${stats?.exerciseSessions ?? 0} 次 · ${stats?.exerciseCalories ?? 0} 千卡`}
            progress={Math.min(1, (stats?.exerciseMinutes ?? 0) / Math.max(1, (stats?.days ?? 1) * 30))}
          />
          <Stat
            label="日均摄入"
            value={Math.round((stats?.caloriesIn ?? 0) / Math.max(1, stats?.days ?? 1))}
            unit="千卡"
            barClass="amber"
            hint={`合计 ${stats?.caloriesIn ?? 0}`}
          />
          <Stat
            label="阅读"
            value={stats?.readingPages ?? 0}
            unit="页"
            barClass="sky"
            hint={`${stats?.readingMinutes ?? 0} 分钟`}
            progress={(stats?.readingPages ?? 0) / Math.max(1, (stats?.days ?? 1) * 20)}
          />
          <Stat
            label="英语单词"
            value={stats?.englishVocab ?? 0}
            unit="个"
            barClass="violet"
            hint={`听说读 ${stats?.englishMinutes ?? 0} 分钟`}
          />
          <Stat label="新闻评论" value={stats?.newsCount ?? 0} unit="篇" />
          <Stat
            label="日程安排"
            value={stats?.eventCount ?? 0}
            unit="项"
            barClass="sky"
            hint={`完成 ${stats?.eventDone ?? 0} 项（含重复展开）`}
          />
          <Stat
            label="计划时长"
            value={Number(((stats?.plannedMinutes ?? 0) / 60).toFixed(1))}
            unit="小时"
            barClass="violet"
            hint={`日均 ${Math.round((stats?.plannedMinutes ?? 0) / Math.max(1, stats?.days ?? 1))} 分钟`}
          />
          <Stat
            label="日程完成率"
            value={Math.round(evRate * 100)}
            unit="%"
            hint={`${stats?.eventDone ?? 0} / ${stats?.eventCount ?? 0} 项`}
            progress={evRate}
          />
          <Stat
            label="平均心情"
            value={moodAvg === null ? '–' : moodAvg.toFixed(1)}
            unit={moodAvg === null ? undefined : '/ 5'}
            hint={`记录 ${stats?.moodCount ?? 0} 天`}
            barClass="rose"
            progress={moodAvg === null ? 0 : (moodAvg - 1) / 4}
          />
          <Stat
            label="有效天数"
            value={stats?.activeDays ?? 0}
            unit="天"
            hint={`占 ${stats?.days ?? 0} 天的 ${Math.round(((stats?.activeDays ?? 0) / Math.max(1, stats?.days ?? 1)) * 100)}%`}
            progress={(stats?.activeDays ?? 0) / Math.max(1, stats?.days ?? 1)}
          />
        </div>
      </Card>

      <div className="grid g2">
        <Card>
          <CardHead icon={<Heart size={17} />} eyebrow="1 – 5 分" title="心情趋势" />
          {moodSeries.every((m) => m.score === null) ? (
            <Empty emoji="🫧" text="这段时间还没有心情记录" />
          ) : (
            <MoodChart data={moodSeries} />
          )}
        </Card>
        <Card>
          <CardHead icon={<Sparkles size={17} />} eyebrow="分钟" title="运动分布" />
          <MiniBars data={exBars} unit=" 分" />
        </Card>
      </div>

      <Card>
        <CardHead
          icon={<NotebookPen size={17} />}
          eyebrow="写下来才真的复盘"
          title="三句话复盘"
          right={
            <button type="button" className="btn ghost sm" onClick={copySummary}>
              <ClipboardCopy size={14} /> 复制数据总结
            </button>
          }
        />
        <div className="tip-card" style={{ background: 'var(--surface-2)', marginBottom: 14 }}>
          <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{summaryText || '暂无数据'}</p>
        </div>
        <NoteEditor key={`${key}-${note?.id ?? 0}`} periodKey={key} period={period} note={note} />
      </Card>

      <Card>
        <CardHead icon={<Heart size={17} />} eyebrow={`${moods.length} 条`} title="心情记录" />
        {moods.length === 0 ? (
          <Empty emoji="🌤️" text="还没有心情记录，去「今日」点一下吧" />
        ) : (
          [...moods]
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((m) => (
              <div key={m.id} className="row" style={{ alignItems: 'flex-start' }}>
                <div className="row-emoji">{MOODS.find((x) => x.score === m.score)?.emoji ?? '😐'}</div>
                <div className="row-body">
                  <div className="row-title">
                    {m.score} 分 · {MOODS.find((x) => x.score === m.score)?.label}
                  </div>
                  <div className="row-sub">
                    {formatCN(m.date)} {weekdayCN(m.date)}
                  </div>
                  {m.tags.length > 0 && (
                    <div className="chip-row" style={{ marginTop: 6 }}>
                      {m.tags.map((t) => (
                        <span key={t} className="pill amber">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                  {m.note && <div className="row-note">{m.note}</div>}
                </div>
                <button
                  type="button"
                  className="btn ghost xs"
                  onClick={async () => {
                    if (m.id) await db.moods.delete(m.id)
                    toast('已删除心情记录', 'info')
                  }}
                >
                  删除
                </button>
              </div>
            ))
        )}
      </Card>
    </>
  )
}

/* --------------------------- 复盘笔记 --------------------------- */

function NoteEditor({
  periodKey,
  period,
  note,
}: {
  periodKey: string
  period: SummaryPeriod
  note: { id?: number; wins: string; misses: string; plan: string } | undefined
}) {
  const { toast } = useToast()
  const [wins, setWins] = useState(note?.wins ?? '')
  const [misses, setMisses] = useState(note?.misses ?? '')
  const [plan, setPlan] = useState(note?.plan ?? '')

  const save = async () => {
    const payload = { periodKey, period, wins: wins.trim(), misses: misses.trim(), plan: plan.trim(), updatedAt: Date.now() }
    const existing = note?.id
      ? note
      : await db.summaryNotes.where('periodKey').equals(periodKey).first()
    if (existing?.id) await db.summaryNotes.update(existing.id, payload)
    else await db.summaryNotes.add(payload)
    toast('复盘已保存')
  }

  return (
    <>
      <div className="field">
        <label>① 这段时间最有成就感的一件事</label>
        <textarea className="textarea" value={wins} onChange={(e) => setWins(e.target.value)} placeholder="例如：连续 5 天完成 30 分钟运动" />
      </div>
      <div className="field">
        <label>② 一件没做到、且原因具体的事</label>
        <textarea className="textarea" value={misses} onChange={(e) => setMisses(e.target.value)} placeholder="例如：四级阅读只做了 2 天，因为都排在晚上太累了" />
      </div>
      <div className="field">
        <label>③ 下个周期只改这一件事</label>
        <textarea className="textarea" value={plan} onChange={(e) => setPlan(e.target.value)} placeholder="例如：把英语阅读挪到早饭后" />
      </div>
      <button type="button" className="btn primary block" onClick={save}>
        保存复盘
      </button>
    </>
  )
}
