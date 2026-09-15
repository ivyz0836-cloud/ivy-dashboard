import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  BookMarked,
  BookOpen,
  Languages,
  Lightbulb,
  Newspaper,
  Plus,
  RefreshCw,
  Sparkles,
} from 'lucide-react'
import { db } from '../db/db'
import type { AiTip, EnglishLog, NewsReview, ReadingLog } from '../db/types'
import { useDate } from '../context/date'
import { useSettings } from '../hooks/useSettings'
import { useRangeStats } from '../hooks/useRangeStats'
import { Card, CardHead, Empty, Segmented, Stat } from '../components/ui'
import { MiniBars } from '../components/charts'
import { useToast } from '../context/toast'
import { EnglishSheet, NewsSheet, ReadingSheet } from '../components/sheets'
import { ENGLISH_ACTIVITIES, englishMeta } from '../lib/constants'
import { addDays, formatCN, rangeKeys, today, weekdayCN } from '../lib/date'

type Tab = 'reading' | 'english' | 'tips' | 'news'

const TABS: { value: Tab; label: string }[] = [
  { value: 'reading', label: '阅读' },
  { value: 'english', label: '英语' },
  { value: 'tips', label: 'AI 贴士' },
  { value: 'news', label: '新闻评论' },
]

export default function LearnPage() {
  const [tab, setTab] = useState<Tab>('reading')
  const settings = useSettings()
  const stats = useRangeStats(today(), 'week')

  return (
    <>
      <div style={{ marginBottom: 14 }}>
        <Segmented options={TABS} value={tab} onChange={setTab} block />
      </div>

      {tab === 'reading' && <ReadingTab />}
      {tab === 'english' && <EnglishTab />}
      {tab === 'tips' && <TipsTab />}
      {tab === 'news' && <NewsTab />}

      <Card>
        <CardHead icon={<Sparkles size={17} />} eyebrow="近 7 天" title="学习总览" />
        <div className="grid g4">
          <Stat
            label="阅读页数"
            value={stats?.readingPages ?? 0}
            unit="页"
            hint={`目标 ${settings.dailyReadingGoal} 页/天`}
            progress={(stats?.readingPages ?? 0) / Math.max(1, settings.dailyReadingGoal * 7)}
          />
          <Stat label="阅读时长" value={stats?.readingMinutes ?? 0} unit="分钟" barClass="sky" />
          <Stat
            label="英语单词"
            value={stats?.englishVocab ?? 0}
            unit="个"
            barClass="violet"
            progress={(stats?.englishVocab ?? 0) / Math.max(1, 210)}
          />
          <Stat
            label="听说读时长"
            value={stats?.englishMinutes ?? 0}
            unit="分钟"
            hint={`目标 ${settings.dailyEnglishGoal} 分钟/天`}
            progress={(stats?.englishMinutes ?? 0) / Math.max(1, settings.dailyEnglishGoal * 7)}
          />
        </div>
      </Card>
    </>
  )
}

/* ============================  阅读  ============================ */

function ReadingTab() {
  const { date } = useDate()
  const { toast } = useToast()
  const [sheet, setSheet] = useState<{ open: boolean; edit?: ReadingLog }>({ open: false })

  const logs =
    useLiveQuery(
      async () => {
        const all = await db.readingLogs.orderBy('date').reverse().limit(200).toArray()
        return all.sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : b.date.localeCompare(a.date)))
      },
      [],
      [],
    )

  const chartEnd = today() < date ? today() : date
  const bars = useMemo(() => {
    const keys = rangeKeys(addDays(date, -6), chartEnd)
    return keys.map((k) => ({
      label: weekdayCN(k).replace('周', ''),
      value: logs.filter((l) => l.date === k).reduce((s, l) => s + l.pages, 0),
    }))
  }, [logs, date, chartEnd])

  const dayLogs = logs.filter((l) => l.date === date)
  const books = useMemo(() => {
    const map = new Map<string, { pages: number; minutes: number }>()
    for (const l of logs) {
      const cur = map.get(l.book) ?? { pages: 0, minutes: 0 }
      map.set(l.book, { pages: cur.pages + l.pages, minutes: cur.minutes + l.minutes })
    }
    return [...map.entries()].sort((a, b) => b[1].pages - a[1].pages).slice(0, 6)
  }, [logs])

  return (
    <>
      <Card>
        <CardHead
          icon={<BookOpen size={17} />}
          eyebrow={formatCN(date)}
          title="阅读记录"
          right={
            <button type="button" className="btn primary sm" onClick={() => setSheet({ open: true })}>
              <Plus size={15} /> 记录
            </button>
          }
        />
        <div className="grid g2">
          <Stat label="今日页数" value={dayLogs.reduce((s, l) => s + l.pages, 0)} unit="页" />
          <Stat label="今日时长" value={dayLogs.reduce((s, l) => s + l.minutes, 0)} unit="分钟" barClass="sky" />
        </div>
        <div className="divider" />
        <MiniBars data={bars} unit=" 页" color="#5b8fa8" />
      </Card>

      {books.length > 0 && (
        <Card>
          <CardHead icon={<BookMarked size={17} />} eyebrow="累计" title="在读的书" />
          {books.map(([book, v]) => (
            <div key={book} className="row">
              <div className="row-emoji">📖</div>
              <div className="row-body">
                <div className="row-title">{book}</div>
                <div className="row-sub">
                  {v.pages} 页 · {v.minutes} 分钟
                </div>
              </div>
            </div>
          ))}
        </Card>
      )}

      <Card>
        <CardHead icon={<BookOpen size={17} />} eyebrow={`共 ${logs.length} 条`} title="全部记录" />
        {logs.length === 0 ? (
          <Empty emoji="📚" text="还没有阅读记录" />
        ) : (
          logs.slice(0, 40).map((l) => (
            <div key={l.id} className="row">
              <div className="row-emoji">📖</div>
              <div className="row-body">
                <div className="row-title">
                  {l.book} · {l.pages} 页
                </div>
                <div className="row-sub">
                  {formatCN(l.date)} {weekdayCN(l.date)} · {l.minutes} 分钟
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
                    if (l.id) await db.readingLogs.delete(l.id)
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

      <ReadingSheet open={sheet.open} onClose={() => setSheet({ open: false })} date={date} edit={sheet.edit} />
    </>
  )
}

/* ============================  英语  ============================ */

function EnglishTab() {
  const { date } = useDate()
  const { toast } = useToast()
  const [sheet, setSheet] = useState<{ open: boolean; edit?: EnglishLog }>({ open: false })

  const logs =
    useLiveQuery(
      async () => {
        const all = await db.englishLogs.orderBy('date').reverse().limit(200).toArray()
        return all.sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : b.date.localeCompare(a.date)))
      },
      [],
      [],
    )

  const chartEnd = today() < date ? today() : date
  const bars = useMemo(() => {
    const keys = rangeKeys(addDays(date, -6), chartEnd)
    return keys.map((k) => ({
      label: weekdayCN(k).replace('周', ''),
      value: logs
        .filter((l) => l.date === k)
        .reduce((s, l) => s + (l.activity === 'vocab' ? l.value : l.value / 2), 0),
    }))
  }, [logs, date, chartEnd])

  const dayLogs = logs.filter((l) => l.date === date)

  return (
    <>
      <Card>
        <CardHead
          icon={<Languages size={17} />}
          eyebrow={formatCN(date)}
          title="今日英语"
          right={
            <button type="button" className="btn primary sm" onClick={() => setSheet({ open: true })}>
              <Plus size={15} /> 记录
            </button>
          }
        />
        <div className="grid g4">
          {ENGLISH_ACTIVITIES.map((a) => {
            const v = dayLogs.filter((l) => l.activity === a.activity).reduce((s, l) => s + l.value, 0)
            return (
              <div key={a.activity} className="stat">
                <div className="label">
                  {a.emoji} {a.label}
                </div>
                <div className="value">
                  {v}
                  <span className="unit">{a.unit}</span>
                </div>
                <button type="button" className="btn ghost xs" style={{ marginTop: 8 }} onClick={() => setSheet({ open: true })}>
                  记录
                </button>
              </div>
            )
          })}
        </div>
        <div className="divider" />
        <MiniBars data={bars} unit=" 分" color="#7d6ba8" />
        <div className="legend">
          <span>综合分 = 单词数 + 其他分钟数 / 2</span>
        </div>
      </Card>

      <Card>
        <CardHead icon={<Languages size={17} />} eyebrow={`共 ${logs.length} 条`} title="全部记录" />
        {logs.length === 0 ? (
          <Empty emoji="🔤" text="还没有英语练习记录" />
        ) : (
          logs.slice(0, 40).map((l) => {
            const meta = englishMeta(l.activity)
            return (
              <div key={l.id} className="row">
                <div className="row-emoji">{meta.emoji}</div>
                <div className="row-body">
                  <div className="row-title">
                    {meta.label} · {l.value} {meta.unit}
                  </div>
                  <div className="row-sub">
                    {formatCN(l.date)} {weekdayCN(l.date)}
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
                      if (l.id) await db.englishLogs.delete(l.id)
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

      <EnglishSheet open={sheet.open} onClose={() => setSheet({ open: false })} date={date} edit={sheet.edit} />
    </>
  )
}

/* ==========================  AI 小贴士  ========================== */

function TipsTab() {
  const { toast } = useToast()
  const [filter, setFilter] = useState<'all' | 'saved' | 'applied'>('all')

  const tips = useLiveQuery(() => db.aiTips.toArray(), [], [])
  const [idx, setIdx] = useState(0)

  const categories = useMemo(() => ['全部', ...new Set(tips.map((t) => t.category))], [tips])
  const [cat, setCat] = useState('全部')

  const pool = useMemo(
    () => tips.filter((t) => (cat === '全部' ? true : t.category === cat)),
    [tips, cat],
  )

  const current: AiTip | undefined = pool.length ? pool[idx % pool.length] : undefined

  const visible = useMemo(
    () =>
      tips.filter((t) => {
        if (filter === 'saved') return t.saved === 1
        if (filter === 'applied') return t.applied === 1
        return true
      }),
    [tips, filter],
  )

  const toggleSaved = async (t: AiTip) => {
    if (!t.id) return
    await db.aiTips.update(t.id, { saved: t.saved ? 0 : 1 })
    toast(t.saved ? '已取消收藏' : '已收藏，可在「收藏」里找到')
  }

  const toggleApplied = async (t: AiTip) => {
    if (!t.id) return
    await db.aiTips.update(t.id, { applied: t.applied ? 0 : 1, appliedAt: t.applied ? undefined : Date.now() })
    toast(t.applied ? '已取消标记' : '很棒，标记为已实践 🎉')
  }

  return (
    <>
      <Card tint>
        <CardHead
          icon={<Lightbulb size={17} />}
          eyebrow="每天一条，知行合一"
          title="今日 AI 小贴士"
          right={
            <button
              type="button"
              className="btn ghost xs"
              onClick={() => setIdx((i) => i + 1)}
              disabled={pool.length <= 1}
            >
              <RefreshCw size={13} /> 换一条
            </button>
          }
        />
        {!current ? (
          <Empty emoji="💡" text="小贴士加载中…" />
        ) : (
          <>
            <div className="tip-card" style={{ background: '#fff' }}>
              <h4>{current.title}</h4>
              <p>{current.body}</p>
            </div>
            <div className="fab-row">
              <button type="button" className={`btn ${current.saved ? 'primary' : 'ghost'}`} onClick={() => void toggleSaved(current)}>
                {current.saved ? '★ 已收藏' : '☆ 收藏'}
              </button>
              <button
                type="button"
                className={`btn ${current.applied ? 'primary' : 'ghost'}`}
                onClick={() => void toggleApplied(current)}
              >
                {current.applied ? '✓ 已实践' : '标记为已实践'}
              </button>
            </div>
          </>
        )}
      </Card>

      <Card>
        <CardHead icon={<Sparkles size={17} />} eyebrow="按分类筛选" title="贴士库" />
        <div className="scroll-x" style={{ marginBottom: 10 }}>
          {categories.map((c) => (
            <button key={c} type="button" className={`chip ${c === cat ? 'on' : ''}`} onClick={() => { setCat(c); setIdx(0) }}>
              {c}
            </button>
          ))}
        </div>
        <div className="chip-row">
          {(['all', 'saved', 'applied'] as const).map((f) => (
            <button key={f} type="button" className={`chip ${filter === f ? 'on amber' : ''}`} onClick={() => setFilter(f)}>
              {f === 'all' ? '全部' : f === 'saved' ? `收藏 ${tips.filter((t) => t.saved).length}` : `已实践 ${tips.filter((t) => t.applied).length}`}
            </button>
          ))}
        </div>
        <div className="divider" />
        {visible.length === 0 ? (
          <Empty emoji="🔍" text="这里还没有内容" />
        ) : (
          visible.map((t) => (
            <div key={t.id} className="row" style={{ alignItems: 'flex-start' }}>
              <div className="row-emoji">💡</div>
              <div className="row-body">
                <div className="row-title">{t.title}</div>
                <div className="row-sub">{t.category}</div>
                <div className="row-note">{t.body}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <button type="button" className="btn ghost xs" onClick={() => void toggleSaved(t)}>
                  {t.saved ? '★ 已收藏' : '☆ 收藏'}
                </button>
                <button type="button" className="btn ghost xs" onClick={() => void toggleApplied(t)}>
                  {t.applied ? '✓ 已实践' : '标为已实践'}
                </button>
              </div>
            </div>
          ))
        )}
      </Card>
    </>
  )
}

/* ==========================  新闻评论  ========================== */

function NewsTab() {
  const { date } = useDate()
  const { toast } = useToast()
  const [sheet, setSheet] = useState<{ open: boolean; edit?: NewsReview }>({ open: false })

  const logs =
    useLiveQuery(
      async () => {
        const all = await db.newsReviews.orderBy('date').reverse().limit(200).toArray()
        return all.sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : b.date.localeCompare(a.date)))
      },
      [],
      [],
    )

  return (
    <>
      <Card>
        <CardHead
          icon={<Newspaper size={17} />}
          eyebrow="读新闻 + 写观点，练批判性思维"
          title="新闻评论"
          right={
            <button type="button" className="btn primary sm" onClick={() => setSheet({ open: true })}>
              <Plus size={15} /> 写一条
            </button>
          }
        />
        <p className="small muted" style={{ marginTop: 0 }}>
          推荐模板：<b>事实是什么 → 作者立场 → 我同意什么 / 存疑什么</b>。每周三条，三个月后思考质量会不一样。
        </p>
        {logs.length === 0 ? (
          <Empty emoji="📰" text="还没有新闻评论，写第一条吧" />
        ) : (
          logs.slice(0, 40).map((n) => (
            <div key={n.id} className="row" style={{ alignItems: 'flex-start' }}>
              <div className="row-emoji">📰</div>
              <div className="row-body">
                <div className="row-title">{n.title}</div>
                <div className="row-sub">
                  {formatCN(n.date)} · {n.source || '未标注来源'}
                  {n.url && (
                    <>
                      {' · '}
                      <a href={n.url} target="_blank" rel="noreferrer">
                        原文
                      </a>
                    </>
                  )}
                </div>
                {n.summary && (
                  <div className="row-note">
                    <b>事实：</b>
                    {n.summary}
                  </div>
                )}
                {n.opinion && (
                  <div className="row-note">
                    <b>我的观点：</b>
                    {n.opinion}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                <span className="pill amber">{n.rating}★</span>
                <button type="button" className="btn ghost xs" onClick={() => setSheet({ open: true, edit: n })}>
                  编辑
                </button>
                <button
                  type="button"
                  className="btn ghost xs"
                  onClick={async () => {
                    if (n.id) await db.newsReviews.delete(n.id)
                    toast('已删除评论', 'info')
                  }}
                >
                  删除
                </button>
              </div>
            </div>
          ))
        )}
      </Card>

      <NewsSheet open={sheet.open} onClose={() => setSheet({ open: false })} date={date} edit={sheet.edit} />
    </>
  )
}
