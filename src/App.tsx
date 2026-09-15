import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  BarChart3,
  BookOpen,
  CalendarCheck,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Settings as SettingsIcon,
  UtensilsCrossed,
  Volleyball,
} from 'lucide-react'
import { NavLink, Navigate, Route, Routes, useLocation, useSearchParams } from 'react-router-dom'
import { db } from './db/db'
import { DateProvider } from './context/DateProvider'
import { useDate } from './context/date'
import { ToastProvider } from './components/Toast'
import { useToast } from './context/toast'
import { prettyDate, today } from './lib/date'
import { ensureSeed, materializeDay } from './lib/seed'
import TodayPage from './pages/Today'
import MovePage from './pages/Move'
import FoodPage from './pages/Food'
import LearnPage from './pages/Learn'
import ReviewPage from './pages/Review'
import SchedulePage from './pages/Schedule'
import SettingsPage from './pages/Settings'

interface NavDef {
  to: string
  label: string
  icon: typeof CalendarCheck
}

const NAV: NavDef[] = [
  { to: '/', label: '今日', icon: CalendarCheck },
  { to: '/schedule', label: '日程', icon: CalendarDays },
  { to: '/move', label: '运动', icon: Volleyball },
  { to: '/food', label: '饮食', icon: UtensilsCrossed },
  { to: '/learn', label: '学习', icon: BookOpen },
  { to: '/review', label: '总结', icon: BarChart3 },
]

function usePendingCount(): number {
  return (
    useLiveQuery(async () => {
      const list = await db.tasks.where('date').equals(today()).toArray()
      return list.filter((t) => !t.done).length
    }, []) ?? 0
  )
}

function Sidebar() {
  const pending = usePendingCount()
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">I</div>
        <div className="brand-text">
          <strong>Ivy 成长工作台</strong>
          <span>每天进步一点点</span>
        </div>
      </div>
      <nav className="nav-list">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.to === '/'}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <n.icon size={19} strokeWidth={2.1} />
            <span>{n.label}</span>
            {n.to === '/' && pending > 0 && <span className="badge">{pending}</span>}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-foot">
        <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <SettingsIcon size={19} strokeWidth={2.1} />
          <span>设置</span>
        </NavLink>
      </div>
    </aside>
  )
}

function BottomNav() {
  return (
    <nav className="bottom-nav">
      {NAV.map((n) => (
        <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
          <span className="bn-icon">
            <n.icon size={20} strokeWidth={2.1} />
          </span>
          <span>{n.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

function DateBar() {
  const { date, shift, goToday, isToday } = useDate()
  return (
    <div className="topbar">
      <button type="button" className="icon-btn" onClick={() => shift(-1)} aria-label="前一天">
        <ChevronLeft size={18} />
      </button>
      <div>
        <h1>{prettyDate(date)}</h1>
        <div className="sub">{date}</div>
      </div>
      <div className="topbar-actions">
        {!isToday && (
          <button type="button" className="btn ghost sm" onClick={goToday}>
            回到今天
          </button>
        )}
        <button
          type="button"
          className="icon-btn"
          onClick={() => shift(1)}
          aria-label="后一天"
          disabled={isToday}
          style={isToday ? { opacity: 0.4, pointerEvents: 'none' } : undefined}
        >
          <ChevronRight size={18} />
        </button>
        <NavLink to="/settings" className="icon-btn" aria-label="设置">
          <SettingsIcon size={18} />
        </NavLink>
      </div>
    </div>
  )
}

/**
 * 处理 iOS 小组件的深链。
 *
 * 原生壳把 ivy://task/12 翻译成 #/?task=12、ivy://event/12 翻译成
 * #/schedule?event=12，这里读取参数并给出明确反馈。
 * 纯 Web 下没有这些参数，组件什么都不做。
 */
function DeepLinkHandler() {
  const [params] = useSearchParams()
  const { toast } = useToast()
  const handled = useRef('')

  const taskId = params.get('task')
  const eventId = params.get('event')

  useEffect(() => {
    if (!taskId && !eventId) return
    const key = `${taskId ?? ''}|${eventId ?? ''}`
    if (handled.current === key) return
    handled.current = key

    void (async () => {
      if (taskId) {
        const task = await db.tasks.get(Number(taskId))
        if (task) toast(`小组件跳转：${task.title}`, 'info')
        else toast('小组件跳转：没有找到这条任务', 'warn')
        return
      }
      if (eventId) {
        const ev = await db.events.get(Number(eventId))
        if (ev) toast(`小组件跳转：${ev.title}`, 'info')
        else toast('小组件跳转：没有找到这条日程', 'warn')
      }
    })()
  }, [taskId, eventId, toast])

  return null
}

function Shell() {
  const location = useLocation()
  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <div className="content">
          <DateBar />
          <DeepLinkHandler />
          <div className="page" key={location.pathname}>
            <Routes>
              <Route path="/" element={<TodayPage />} />
              <Route path="/schedule" element={<SchedulePage />} />
              <Route path="/move" element={<MovePage />} />
              <Route path="/food" element={<FoodPage />} />
              <Route path="/learn" element={<LearnPage />} />
              <Route path="/review" element={<ReviewPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  )
}

export default function App() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      await ensureSeed()
      await materializeDay(today())
      if (!cancelled) setReady(true)
    })()
    // 每分钟检查一次是否跨天，跨天则补齐当天任务
    const timer = window.setInterval(() => {
      void materializeDay(today())
    }, 60_000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [])

  if (!ready) {
    return (
      <div className="app">
        <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--ink-3)', padding: 40 }}>
          <div style={{ fontSize: 34, marginBottom: 8 }}>🌱</div>
          <div className="small">正在准备你的工作台…</div>
        </div>
      </div>
    )
  }

  return (
    <DateProvider>
      <ToastProvider>
        <Shell />
      </ToastProvider>
    </DateProvider>
  )
}
