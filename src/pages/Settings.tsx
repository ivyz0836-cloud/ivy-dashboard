import { useRef, useState } from 'react'
import { CalendarDays, Download, HardDrive, RotateCcw, Sparkles, Trash2, Upload, User } from 'lucide-react'
import { db, saveSettings, DEFAULT_SETTINGS } from '../db/db'
import { useSettings } from '../hooks/useSettings'
import { Card, CardHead, Sheet, Stepper } from '../components/ui'
import { useToast } from '../context/toast'
import { REMINDER_OPTIONS } from '../lib/schedule'

const TABLES = [
  'tasks',
  'taskTemplates',
  'exerciseLogs',
  'foodLogs',
  'readingLogs',
  'englishLogs',
  'aiTips',
  'newsReviews',
  'moods',
  'summaryNotes',
  'events',
  'settings',
] as const

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <span className="switch">
      <button
        type="button"
        className={on ? 'on' : ''}
        onClick={() => onChange(!on)}
        role="switch"
        aria-checked={on}
        aria-label={label}
      >
        <i />
      </button>
      <span>{label}</span>
    </span>
  )
}

export default function SettingsPage() {
  const settings = useSettings()
  const { toast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [confirm, setConfirm] = useState<'clear' | 'reset' | null>(null)

  const exportData = async () => {
    const payload: Record<string, unknown> = { version: 1, exportedAt: new Date().toISOString() }
    for (const t of TABLES) {
      payload[t] = await (db as unknown as Record<string, { toArray: () => Promise<unknown[]> }>)[t].toArray()
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ivy-备份-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast('备份已导出')
  }

  const importData = async (file: File) => {
    try {
      const text = await file.text()
      const data = JSON.parse(text) as Record<string, unknown[]>
      await db.transaction('rw', db.tables, async () => {
        for (const t of TABLES) {
          const rows = data[t]
          if (!Array.isArray(rows)) continue
          const table = (db as unknown as Record<string, { clear: () => Promise<void>; bulkAdd: (r: unknown[]) => Promise<unknown> }>)[t]
          await table.clear()
          if (rows.length) await table.bulkAdd(rows)
        }
      })
      toast('数据已导入，正在刷新…')
      window.setTimeout(() => window.location.reload(), 900)
    } catch {
      toast('导入失败：文件格式不正确', 'warn')
    }
  }

  const clearAll = async () => {
    await db.transaction('rw', db.tables, async () => {
      for (const t of db.tables) await t.clear()
    })
    toast('已清空全部数据，正在刷新…')
    window.setTimeout(() => window.location.reload(), 900)
  }

  const resetSettings = async () => {
    await saveSettings(DEFAULT_SETTINGS)
    toast('目标已恢复默认')
  }

  const clearDemoEvents = async () => {
    const ids = await db.events.filter((e) => e.title.startsWith('【示例】')).primaryKeys()
    if (ids.length === 0) {
      toast('没有找到演示日程', 'info')
      return
    }
    await db.events.bulkDelete(ids)
    toast(`已清除 ${ids.length} 条演示日程`, 'info')
  }

  return (
    <>
      <Card>
        <CardHead icon={<User size={17} />} eyebrow="个人" title="基本信息" />
        <div className="field">
          <label>称呼</label>
          <input
            className="input"
            value={settings.name}
            onChange={(e) => void saveSettings({ name: e.target.value })}
            placeholder="你的名字"
          />
        </div>
      </Card>

      <Card>
        <CardHead
          icon={<HardDrive size={17} />}
          eyebrow="用于进度条与达标判断"
          title="每日目标"
          right={
            <button type="button" className="btn ghost xs" onClick={resetSettings}>
              <RotateCcw size={13} /> 恢复默认
            </button>
          }
        />
        <div className="grid g2">
          <div className="field">
            <label>运动（分钟）</label>
            <Stepper
              value={settings.dailyExerciseGoal}
              onChange={(v) => void saveSettings({ dailyExerciseGoal: v })}
              min={0}
              max={300}
              step={5}
            />
          </div>
          <div className="field">
            <label>热量摄入（千卡）</label>
            <Stepper
              value={settings.dailyCalorieGoal}
              onChange={(v) => void saveSettings({ dailyCalorieGoal: v })}
              min={800}
              max={4000}
              step={50}
            />
          </div>
          <div className="field">
            <label>阅读（页）</label>
            <Stepper
              value={settings.dailyReadingGoal}
              onChange={(v) => void saveSettings({ dailyReadingGoal: v })}
              min={0}
              max={300}
              step={5}
            />
          </div>
          <div className="field">
            <label>英语（词/分钟）</label>
            <Stepper
              value={settings.dailyEnglishGoal}
              onChange={(v) => void saveSettings({ dailyEnglishGoal: v })}
              min={0}
              max={300}
              step={5}
            />
          </div>
        </div>
      </Card>

      <Card>
        <CardHead icon={<CalendarDays size={17} />} eyebrow="日历 / 日程" title="日程偏好" />
        <div className="kv">
          <span className="k">
            <Toggle
              on={settings.showTasksInCalendar === 1}
              onChange={(v) => void saveSettings({ showTasksInCalendar: v ? 1 : 0 })}
              label="在日历中显示今日任务"
            />
          </span>
          <span className="v">{settings.showTasksInCalendar === 1 ? '开' : '关'}</span>
        </div>
        <div className="kv">
          <span className="k">
            <Toggle
              on={settings.remindersEnabled === 1}
              onChange={(v) => void saveSettings({ remindersEnabled: v ? 1 : 0 })}
              label="开启日程提醒"
            />
          </span>
          <span className="v">{settings.remindersEnabled === 1 ? '开' : '关'}</span>
        </div>
        <div className="field" style={{ marginTop: 12 }}>
          <label>新建日程的默认提醒</label>
          <select
            className="select"
            value={
              settings.defaultReminderMinutes === null ? '' : String(settings.defaultReminderMinutes)
            }
            onChange={(e) =>
              void saveSettings({ defaultReminderMinutes: e.target.value === '' ? null : Number(e.target.value) })
            }
          >
            {REMINDER_OPTIONS.map((o) => (
              <option key={String(o.value)} value={o.value === null ? '' : String(o.value)}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="divider" />
        <div className="fab-row">
          <button type="button" className="btn ghost" onClick={clearDemoEvents}>
            <Sparkles size={15} /> 清除【示例】演示日程
          </button>
        </div>
        <p className="small muted" style={{ marginBottom: 0 }}>
          演示日程仅在日程表为空时自动生成一次，标题带【示例】前缀，随时可以一键清除。
        </p>
      </Card>

      <Card>
        <CardHead icon={<Download size={17} />} eyebrow="数据都存在你这台设备上" title="备份与恢复" />
        <p className="small muted" style={{ marginTop: 0 }}>
          所有记录保存在浏览器本地数据库（IndexedDB），不会上传到任何服务器。换设备或清理浏览器前记得导出备份。
        </p>
        <div className="fab-row">
          <button type="button" className="btn primary" onClick={exportData}>
            <Download size={15} /> 导出备份
          </button>
          <button type="button" className="btn ghost" onClick={() => fileRef.current?.click()}>
            <Upload size={15} /> 导入备份
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void importData(f)
              e.target.value = ''
            }}
          />
        </div>
        <div className="divider" />
        <div className="fab-row">
          <button type="button" className="btn danger" onClick={() => setConfirm('clear')}>
            <Trash2 size={15} /> 清空全部数据
          </button>
        </div>
      </Card>

      <Card>
        <CardHead icon={<HardDrive size={17} />} eyebrow="关于" title="Ivy 成长工作台" />
        <div className="kv">
          <span className="k">版本</span>
          <span className="v">1.1.0（含日程模块）</span>
        </div>
        <div className="kv">
          <span className="k">存储方式</span>
          <span className="v">IndexedDB · 本地</span>
        </div>
        <div className="kv">
          <span className="k">可离线使用</span>
          <span className="v">支持（PWA）</span>
        </div>
        <p className="small muted" style={{ marginTop: 12 }}>
          想把工作台装到手机桌面：用手机浏览器打开这个地址，选择「添加到主屏幕」即可。
        </p>
      </Card>

      <Sheet
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={confirm === 'clear' ? '确认清空全部数据？' : '确认恢复默认？'}
      >
        <p className="small muted" style={{ marginTop: 0 }}>
          {confirm === 'clear'
            ? '这会删除所有任务、运动、饮食、阅读、英语、贴士、新闻、心情与复盘记录，且无法恢复。建议先导出备份。'
            : '每日目标会恢复为默认值，记录数据不受影响。'}
        </p>
        <div className="sheet-actions">
          <button type="button" className="btn ghost" onClick={() => setConfirm(null)}>
            取消
          </button>
          <button
            type="button"
            className="btn danger"
            onClick={async () => {
              if (confirm === 'clear') await clearAll()
              else await resetSettings()
              setConfirm(null)
            }}
          >
            确认{confirm === 'clear' ? '清空' : '恢复'}
          </button>
        </div>
      </Sheet>
    </>
  )
}
