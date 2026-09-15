import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Apple, Plus, UtensilsCrossed } from 'lucide-react'
import { db } from '../db/db'
import type { FoodLog, MealType } from '../db/types'
import { useDate } from '../context/date'
import { useSettings } from '../hooks/useSettings'
import { Card, CardHead, Empty, Ring, Stat } from '../components/ui'
import { MiniBars } from '../components/charts'
import { useToast } from '../context/toast'
import { FoodSheet } from '../components/sheets'
import { MEALS, mealMeta } from '../lib/constants'
import { addDays, formatCN, rangeKeys, today, weekdayCN } from '../lib/date'

const COMMON: { name: string; calories: number; meal: MealType; emoji: string }[] = [
  { name: '燕麦牛奶', calories: 260, meal: 'breakfast', emoji: '🥣' },
  { name: '水煮蛋 ×2', calories: 140, meal: 'breakfast', emoji: '🥚' },
  { name: '杂粮饭 + 青菜 + 鸡胸', calories: 480, meal: 'lunch', emoji: '🍱' },
  { name: '牛肉粉/面', calories: 520, meal: 'lunch', emoji: '🍜' },
  { name: '沙拉 + 三文鱼', calories: 420, meal: 'dinner', emoji: '🥗' },
  { name: '水果一份', calories: 90, meal: 'snack', emoji: '🍎' },
  { name: '无糖酸奶', calories: 110, meal: 'snack', emoji: '🥛' },
  { name: '奶茶（中杯）', calories: 350, meal: 'snack', emoji: '🧋' },
]

export default function FoodPage() {
  const { date } = useDate()
  const settings = useSettings()
  const { toast } = useToast()
  const [sheet, setSheet] = useState<{ open: boolean; edit?: FoodLog; meal?: MealType }>({ open: false })

  const dayLogs = useLiveQuery(() => db.foodLogs.where('date').equals(date).toArray(), [date], [])
  const recent = useLiveQuery(
    async () => {
      const all = await db.foodLogs.orderBy('date').reverse().limit(200).toArray()
      return all.sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : b.date.localeCompare(a.date)))
    },
    [],
    [],
  )

  const total = (dayLogs ?? []).reduce((s, f) => s + f.calories, 0)
  const goal = settings.dailyCalorieGoal
  const left = goal - total

  const byMeal = useMemo(
    () =>
      MEALS.map((m) => ({
        ...m,
        value: (dayLogs ?? []).filter((f) => f.meal === m.meal).reduce((s, f) => s + f.calories, 0),
        items: (dayLogs ?? []).filter((f) => f.meal === m.meal),
      })),
    [dayLogs],
  )

  const chartEnd = today() < date ? today() : date
  const weekBars = useMemo(() => {
    const keys = rangeKeys(addDays(date, -6), chartEnd)
    return keys.map((k) => ({
      label: weekdayCN(k).replace('周', ''),
      value: (recent ?? []).filter((f) => f.date === k).reduce((s, f) => s + f.calories, 0),
    }))
  }, [recent, date, chartEnd])

  const quickAdd = async (item: (typeof COMMON)[number]) => {
    const id = await db.foodLogs.add({
      date,
      meal: item.meal,
      name: item.name,
      calories: item.calories,
      createdAt: Date.now(),
    })
    toast(`已记录 ${item.name} ${item.calories} 千卡`, 'ok', { label: '撤销', onClick: () => void db.foodLogs.delete(id) })
  }

  return (
    <>
      <Card>
        <CardHead
          icon={<UtensilsCrossed size={17} />}
          eyebrow={formatCN(date)}
          title="今日热量"
          right={
            <button type="button" className="btn primary sm" onClick={() => setSheet({ open: true })}>
              <Plus size={15} /> 记录
            </button>
          }
        />
        <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
          <div>
            <Ring
              value={total / Math.max(1, goal)}
              size={104}
              stroke={11}
              color={total > goal ? '#c9705f' : '#2e6b55'}
              track="#efe8da"
            >
              <b style={{ fontSize: 22, color: total > goal ? '#c9705f' : '#1f4d3d' }}>{total}</b>
              <span style={{ color: 'var(--ink-3)' }}>/ {goal}</span>
            </Ring>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="grid g2">
              <Stat
                label={left >= 0 ? '还可以吃' : '已超出'}
                value={Math.abs(left)}
                unit="千卡"
                barClass={left >= 0 ? '' : 'rose'}
                progress={Math.min(1, total / Math.max(1, goal))}
              />
              <Stat
                label="记录条数"
                value={(dayLogs ?? []).length}
                unit="条"
                hint="记录本身就能帮助控制"
              />
            </div>
          </div>
        </div>
        {left < 0 && (
          <div className="banner warn" style={{ marginTop: 14, marginBottom: 0 }}>
            今天已超出目标 {Math.abs(left)} 千卡，明天调整回来就好，别自责。
          </div>
        )}
      </Card>

      <div className="grid g2">
        <Card>
          <CardHead icon={<Apple size={17} />} eyebrow="点一下就记上" title="常见食物" />
          <div className="chip-row">
            {COMMON.map((c) => (
              <button key={c.name} type="button" className="chip" onClick={() => void quickAdd(c)}>
                {c.emoji} {c.name} · {c.calories}
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <CardHead icon={<UtensilsCrossed size={17} />} eyebrow="千卡 / 天" title="近 7 天摄入" />
          <MiniBars data={weekBars} goal={goal} unit=" 千卡" color="#dd9a4b" />
        </Card>
      </div>

      <Card>
        <CardHead icon={<UtensilsCrossed size={17} />} eyebrow={formatCN(date)} title="今日餐次" />
        {byMeal.map((m) => (
          <div key={m.meal} className="row" style={{ alignItems: 'flex-start' }}>
            <div className="row-emoji">{m.emoji}</div>
            <div className="row-body">
              <div className="row-title">
                {m.label} · {m.value} 千卡
              </div>
              {m.items.length === 0 ? (
                <div className="row-sub">未记录</div>
              ) : (
                m.items.map((f) => (
                  <div key={f.id} className="row-sub" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ flex: 1, color: 'var(--ink-2)' }}>
                      {f.name} · {f.calories} 千卡
                    </span>
                    <button
                      type="button"
                      className="btn ghost xs"
                      onClick={() => setSheet({ open: true, edit: f })}
                    >
                      编辑
                    </button>
                    <button
                      type="button"
                      className="btn ghost xs"
                      onClick={async () => {
                        if (f.id) await db.foodLogs.delete(f.id)
                        toast('已删除记录', 'info')
                      }}
                    >
                      删除
                    </button>
                  </div>
                ))
              )}
            </div>
            <button type="button" className="btn ghost xs" onClick={() => setSheet({ open: true, meal: m.meal })}>
              <Plus size={13} /> 添加
            </button>
          </div>
        ))}
      </Card>

      <Card>
        <CardHead icon={<UtensilsCrossed size={17} />} eyebrow={`共 ${(recent ?? []).length} 条`} title="历史饮食记录" />
        {(recent ?? []).length === 0 ? (
          <Empty emoji="🍽️" text="还没有饮食记录" />
        ) : (
          (recent ?? []).slice(0, 40).map((f) => (
            <div key={f.id} className="row">
              <div className="row-emoji">{mealMeta(f.meal).emoji}</div>
              <div className="row-body">
                <div className="row-title">{f.name}</div>
                <div className="row-sub">
                  {formatCN(f.date)} {weekdayCN(f.date)} · {mealMeta(f.meal).label}
                </div>
                {f.note && <div className="row-note">{f.note}</div>}
              </div>
              <div className="row-value">{f.calories} 千卡</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <button type="button" className="btn ghost xs" onClick={() => setSheet({ open: true, edit: f })}>
                  编辑
                </button>
                <button
                  type="button"
                  className="btn ghost xs"
                  onClick={async () => {
                    if (f.id) await db.foodLogs.delete(f.id)
                    toast('已删除记录', 'info')
                  }}
                >
                  删除
                </button>
              </div>
            </div>
          ))
        )}
      </Card>

      <FoodSheet
        open={sheet.open}
        onClose={() => setSheet({ open: false })}
        date={date}
        edit={sheet.edit}
        defaultMeal={sheet.meal}
      />
    </>
  )
}
