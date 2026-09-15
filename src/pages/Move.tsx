import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Flame, Plus, Timer, TrendingUp, Volleyball } from 'lucide-react'
import { db } from '../db/db'
import type { ExerciseLog, ExerciseType } from '../db/types'
import { useDate } from '../context/date'
import { useSettings } from '../hooks/useSettings'
import { useRangeStats } from '../hooks/useRangeStats'
import { Card, CardHead, Empty, Stat } from '../components/ui'
import { MiniBars, StackBar } from '../components/charts'
import { useToast } from '../context/toast'
import { ExerciseSheet } from '../components/sheets'
import { EXERCISES, exerciseMeta } from '../lib/constants'
import { addDays, formatCN, rangeKeys, today, weekdayCN } from '../lib/date'

const COLORS: Record<ExerciseType, string> = {
  pilates: '#7d6ba8',
  badminton: '#2e6b55',
  running: '#dd9a4b',
  walking: '#5b8fa8',
}

export default function MovePage() {
  const { date } = useDate()
  const settings = useSettings()
  const { toast } = useToast()
  const stats = useRangeStats(date, 'week')
  const [sheet, setSheet] = useState<{ open: boolean; edit?: ExerciseLog; type?: ExerciseType }>({ open: false })

  const recent =
    useLiveQuery(
      async () => {
        const all = await db.exerciseLogs.orderBy('date').reverse().limit(200).toArray()
        return all.sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : b.date.localeCompare(a.date)))
      },
      [],
      [],
    )

  const chartEnd = today() < date ? today() : date

  const weekBars = useMemo(() => {
    const keys = rangeKeys(addDays(date, -6), chartEnd)
    const map = new Map<string, number>()
    for (const l of recent) map.set(l.date, (map.get(l.date) ?? 0) + l.minutes)
    return keys.map((k) => ({
      label: weekdayCN(k).replace('周', ''),
      value: map.get(k) ?? 0,
      sub: formatCN(k),
    }))
  }, [recent, date, chartEnd])

  const dist = useMemo(() => {
    const keys = new Set(rangeKeys(addDays(date, -6), chartEnd))
    return EXERCISES.map((e) => ({
      label: e.label,
      color: COLORS[e.type],
      value: recent.filter((l) => keys.has(l.date) && l.type === e.type).reduce((s, l) => s + l.minutes, 0),
    }))
  }, [recent, date, chartEnd])

  const quick = async (type: ExerciseType) => {
    const meta = exerciseMeta(type)
    const calories = Math.round(30 * meta.kcalPerMin)
    const id = await db.exerciseLogs.add({ date, type, minutes: 30, calories, createdAt: Date.now() })
    toast(`已记录 30 分钟${meta.label}`, 'ok', { label: '撤销', onClick: () => void db.exerciseLogs.delete(id) })
  }

  const totalMinutes = stats?.exerciseMinutes ?? 0
  const goalDays = stats?.exerciseDays ?? 0

  return (
    <>
      <Card>
        <CardHead
          icon={<Volleyball size={17} />}
          eyebrow="近 7 天"
          title="运动概览"
          right={
            <button type="button" className="btn primary sm" onClick={() => setSheet({ open: true })}>
              <Plus size={15} /> 记录
            </button>
          }
        />
        <div className="grid g4">
          <Stat label="总时长" value={totalMinutes} unit="分钟" hint={`${stats?.exerciseSessions ?? 0} 次`} />
          <Stat
            label="消耗"
            value={stats?.exerciseCalories ?? 0}
            unit="千卡"
            hint={`日均 ${Math.round((stats?.exerciseCalories ?? 0) / Math.max(1, stats?.days ?? 1))}`}
            barClass="amber"
            progress={Math.min(1, (stats?.exerciseCalories ?? 0) / Math.max(1, 7 * 250))}
          />
          <Stat
            label="达标天数"
            value={goalDays}
            unit="天"
            hint={`≥ ${settings.dailyExerciseGoal} 分钟`}
            progress={goalDays / 7}
          />
          <Stat
            label="坚持率"
            value={Math.round((goalDays / Math.max(1, stats?.days ?? 1)) * 100)}
            unit="%"
            hint={`统计 ${stats?.days ?? 0} 天`}
            barClass="violet"
            progress={goalDays / Math.max(1, stats?.days ?? 1)}
          />
        </div>
      </Card>

      <div className="grid g2">
        <Card>
          <CardHead icon={<TrendingUp size={17} />} eyebrow="分钟 / 天" title="近 7 天趋势" />
          <MiniBars data={weekBars} goal={settings.dailyExerciseGoal} unit=" 分" />
          <div className="legend">
            <span>
              <i style={{ background: '#dd9a4b' }} />目标线 {settings.dailyExerciseGoal} 分钟
            </span>
          </div>
        </Card>

        <Card>
          <CardHead icon={<Timer size={17} />} eyebrow="按项目" title="时间分布" />
          <StackBar parts={dist} />
          <div className="divider" />
          <div className="card-h" style={{ marginBottom: 8 }}>
            <h3 style={{ fontSize: 14 }}>一键 30 分钟</h3>
          </div>
          <div className="exo-grid">
            {EXERCISES.map((e) => (
              <button key={e.type} type="button" className="exo" onClick={() => void quick(e.type)} title={e.hint}>
                <span className="exo-emoji">{e.emoji}</span>
                <span className="exo-name">{e.label}</span>
                <span className="exo-kcal">{Math.round(30 * e.kcalPerMin)} 千卡</span>
              </button>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <CardHead icon={<Flame size={17} />} eyebrow={`共 ${recent.length} 条`} title="运动记录" />
        {recent.length === 0 ? (
          <Empty emoji="🏸" text="还没有运动记录，点上面的项目开始吧" />
        ) : (
          recent.slice(0, 40).map((l) => {
            const meta = exerciseMeta(l.type)
            return (
              <div key={l.id} className="row">
                <div className="row-emoji" style={{ background: `${COLORS[l.type]}1a` }}>
                  {meta.emoji}
                </div>
                <div className="row-body">
                  <div className="row-title">
                    {meta.label} · {l.minutes} 分钟
                  </div>
                  <div className="row-sub">
                    {formatCN(l.date)} {weekdayCN(l.date)} · {l.calories} 千卡
                  </div>
                  {l.note && <div className="row-note">{l.note}</div>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <button type="button" className="btn ghost xs" onClick={() => setSheet({ open: true, edit: l })}>
                    编辑
                  </button>
                  <button
                    type="button"
                    className="btn ghost xs"
                    onClick={async () => {
                      if (l.id) await db.exerciseLogs.delete(l.id)
                      toast('已删除记录', 'info')
                    }}
                  >
                    删除
                  </button>
                </div>
              </div>
            )
          })
        )}
      </Card>

      <ExerciseSheet
        open={sheet.open}
        onClose={() => setSheet({ open: false })}
        date={date}
        edit={sheet.edit}
        defaultType={sheet.type}
      />
    </>
  )
}
