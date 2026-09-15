import { useEffect, useState } from 'react'
import { AlertTriangle, Check, MapPin, Trash2 } from 'lucide-react'
import { db } from '../db/db'
import type { EventCategory, Recurrence, ScheduleEvent } from '../db/types'
import {
  EVENT_CATEGORIES,
  EVENT_COLORS,
  RECURRENCES,
  REMINDER_OPTIONS,
  categoryMeta,
  colorHex,
  defaultEnd as defaultEndFor,
  durationText,
  validateDraft,
  type EventDraft,
} from '../lib/schedule'
import { Sheet } from './ui'
import { useToast } from '../context/toast'

function emptyDraft(date: string, start?: string, category: EventCategory = 'study'): EventDraft {
  const meta = categoryMeta(category)
  const s = start ?? '09:00'
  return {
    title: '',
    date,
    allDay: 0,
    start: s,
    end: defaultEndFor(s),
    category,
    color: meta.color,
    location: '',
    notes: '',
    reminderMinutes: 10,
    recurrence: 'none',
    recurrenceUntil: '',
  }
}

function toDraft(ev: ScheduleEvent): EventDraft {
  return {
    title: ev.title,
    date: ev.date,
    allDay: ev.allDay,
    start: ev.start ?? '09:00',
    end: ev.end ?? '10:00',
    category: ev.category,
    color: ev.color,
    location: ev.location ?? '',
    notes: ev.notes ?? '',
    reminderMinutes: ev.reminderMinutes ?? null,
    recurrence: ev.recurrence,
    recurrenceUntil: ev.recurrenceUntil ?? '',
  }
}

export function EventSheet({
  open,
  onClose,
  date,
  event,
  defaultStart,
  defaultEnd,
}: {
  open: boolean
  onClose: () => void
  date: string
  event?: ScheduleEvent
  defaultStart?: string
  defaultEnd?: string
}) {
  const { toast } = useToast()
  const [draft, setDraft] = useState<EventDraft>(emptyDraft(date))
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (!open) return
    setError(null)
    setConfirmDelete(false)
    if (event) setDraft(toDraft(event))
    else setDraft(emptyDraft(date, defaultStart))
    if (defaultEnd && !event) setDraft((d) => ({ ...d, end: defaultEnd }))
  }, [open, event, date, defaultStart, defaultEnd])

  const patch = (p: Partial<EventDraft>) => {
    setDraft((d) => ({ ...d, ...p }))
    setError(null)
  }

  const pickCategory = (c: EventCategory) => {
    const meta = categoryMeta(c)
    setDraft((d) => ({ ...d, category: c, color: meta.color }))
    setError(null)
  }

  const save = async () => {
    const err = validateDraft(draft)
    if (err) {
      setError(err)
      toast(err, 'warn')
      return
    }
    const now = Date.now()
    const payload = {
      title: draft.title.trim(),
      date: draft.date,
      allDay: draft.allDay,
      start: draft.allDay === 1 ? undefined : draft.start,
      end: draft.allDay === 1 ? undefined : draft.end,
      category: draft.category,
      color: draft.color,
      location: draft.location?.trim() || undefined,
      notes: draft.notes?.trim() || undefined,
      reminderMinutes: draft.reminderMinutes ?? null,
      recurrence: draft.recurrence,
      recurrenceUntil: draft.recurrence !== 'none' && draft.recurrenceUntil ? draft.recurrenceUntil : undefined,
      updatedAt: now,
    }
    if (event?.id !== undefined) {
      await db.events.update(event.id, payload)
      toast('日程已更新')
    } else {
      await db.events.add({ ...payload, done: 0, createdAt: now })
      toast('日程已创建')
    }
    onClose()
  }

  const remove = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    if (event?.id !== undefined) await db.events.delete(event.id)
    toast('日程已删除', 'info')
    onClose()
  }

  const toggleDone = async () => {
    if (event?.id === undefined) return
    await db.events.update(event.id, { done: event.done ? 0 : 1, updatedAt: Date.now() })
    toast(event.done ? '已标记为未完成' : '已完成，干得漂亮 🎉')
    onClose()
  }

  const meta = categoryMeta(draft.category)

  return (
    <Sheet open={open} onClose={onClose} title={event ? '编辑日程' : '新建日程'}>
      <div className="field">
        <label>标题</label>
        <input
          className="input"
          placeholder="例如：英语精读 / 羽毛球"
          value={draft.title}
          onChange={(e) => patch({ title: e.target.value })}
        />
      </div>

      <div className="field">
        <label>日期</label>
        <input className="input" type="date" value={draft.date} onChange={(e) => patch({ date: e.target.value })} />
      </div>

      <div className="field">
        <label>时段</label>
        <div className="chip-row" style={{ marginBottom: 8 }}>
          <button
            type="button"
            className={`chip ${draft.allDay === 1 ? 'on' : ''}`}
            onClick={() =>
              patch({
                allDay: draft.allDay === 1 ? 0 : 1,
                end: draft.allDay === 1 ? draft.end : defaultEndFor(draft.start ?? '09:00'),
              })
            }
          >
            {draft.allDay === 1 ? '✓ ' : ''}全天
          </button>
          {draft.allDay === 0 && draft.start && draft.end && (
            <span className="pill green">{durationText(draft.start, draft.end)}</span>
          )}
        </div>
        {draft.allDay === 0 && (
          <div className="field-row">
            <input
              className="input"
              type="time"
              value={draft.start ?? '09:00'}
              onChange={(e) => patch({ start: e.target.value })}
              aria-label="开始时间"
            />
            <input
              className="input"
              type="time"
              value={draft.end ?? '10:00'}
              onChange={(e) => patch({ end: e.target.value })}
              aria-label="结束时间"
            />
          </div>
        )}
      </div>

      <div className="field">
        <label>分类</label>
        <div className="chip-row">
          {EVENT_CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              className={`chip ${draft.category === c.value ? 'on' : ''}`}
              onClick={() => pickCategory(c.value)}
            >
              {c.emoji} {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label>颜色</label>
        <div className="chip-row">
          {EVENT_COLORS.map((c) => (
            <button
              key={c.key}
              type="button"
              aria-label={c.label}
              onClick={() => patch({ color: c.key })}
              style={{
                width: 32,
                height: 32,
                borderRadius: 11,
                background: c.hex,
                border: draft.color === c.key ? '3px solid #1c2b26' : '3px solid transparent',
                boxShadow: draft.color === c.key ? '0 0 0 2px #fff inset' : undefined,
              }}
            />
          ))}
        </div>
        <div className="small muted" style={{ marginTop: 6 }}>
          当前：{meta.emoji} {meta.label} · {colorHex(draft.color)}
        </div>
      </div>

      <div className="field">
        <label>地点（可选）</label>
        <input
          className="input"
          placeholder="例如：图书馆 3F"
          value={draft.location ?? ''}
          onChange={(e) => patch({ location: e.target.value })}
        />
      </div>

      <div className="field">
        <label>重复</label>
        <select
          className="select"
          value={draft.recurrence}
          onChange={(e) => patch({ recurrence: e.target.value as Recurrence })}
        >
          {RECURRENCES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        {draft.recurrence !== 'none' && (
          <div style={{ marginTop: 8 }}>
            <input
              className="input"
              type="date"
              value={draft.recurrenceUntil ?? ''}
              onChange={(e) => patch({ recurrenceUntil: e.target.value })}
              aria-label="重复截止日"
            />
            <div className="small muted" style={{ marginTop: 4 }}>
              留空表示一直重复
            </div>
          </div>
        )}
      </div>

      <div className="field">
        <label>提醒</label>
        <select
          className="select"
          value={draft.reminderMinutes === null || draft.reminderMinutes === undefined ? '' : String(draft.reminderMinutes)}
          onChange={(e) => patch({ reminderMinutes: e.target.value === '' ? null : Number(e.target.value) })}
        >
          {REMINDER_OPTIONS.map((o) => (
            <option key={String(o.value)} value={o.value === null ? '' : String(o.value)}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label>备注（可选）</label>
        <textarea
          className="textarea"
          placeholder="要带什么、要注意什么…"
          value={draft.notes ?? ''}
          onChange={(e) => patch({ notes: e.target.value })}
        />
      </div>

      {error && (
        <div className="banner warn" style={{ marginBottom: 12 }}>
          <AlertTriangle size={15} /> {error}
        </div>
      )}

      {event && (
        <div className="fab-row">
          <button type="button" className={`btn ${event.done ? 'primary' : 'ghost'}`} onClick={() => void toggleDone()}>
            <Check size={15} /> {event.done ? '已完成（点击取消）' : '标记为已完成'}
          </button>
        </div>
      )}

      <div className="sheet-actions">
        {event && (
          <button type="button" className={`btn ${confirmDelete ? 'danger' : 'ghost'}`} onClick={() => void remove()}>
            <Trash2 size={15} /> {confirmDelete ? '确认删除？' : '删除'}
          </button>
        )}
        {confirmDelete && (
          <button type="button" className="btn ghost" onClick={() => setConfirmDelete(false)}>
            取消
          </button>
        )}
        <button type="button" className="btn ghost" onClick={onClose}>
          关闭
        </button>
        <button type="button" className="btn primary" onClick={() => void save()}>
          保存
        </button>
      </div>

      {confirmDelete && (
        <p className="small muted" style={{ marginTop: 8 }}>
          再点一次「确认删除？」将永久删除这条日程
          {event?.recurrence !== 'none' ? '（含全部重复实例）' : ''}。
        </p>
      )}
    </Sheet>
  )
}

/** 单条日程的展示行（用于日议程、今日概览等） */
export function EventRow({
  occ,
  onOpen,
  onToggleDone,
}: {
  occ: { event: ScheduleEvent; date: string; recurring: boolean; allDay: boolean }
  onOpen: () => void
  onToggleDone?: () => void
}) {
  const { event, allDay, recurring } = occ
  const hex = colorHex(event.color)
  return (
    <div className="row ev-row">
      <button
        type="button"
        className="ev-bar"
        style={{ background: hex }}
        onClick={onOpen}
        aria-label="打开日程"
      />
      <button type="button" className="row-body" style={{ textAlign: 'left' }} onClick={onOpen}>
        <div className="row-title" style={event.done ? { textDecoration: 'line-through', color: 'var(--ink-3)' } : undefined}>
          {event.title}
        </div>
        <div className="row-sub">
          {allDay ? '全天' : `${event.start} – ${event.end}`}
          {recurring && ' · 重复'}
          {event.location && (
            <>
              {' · '}
              <MapPin size={10} style={{ verticalAlign: -1 }} /> {event.location}
            </>
          )}
        </div>
      </button>
      {onToggleDone && (
        <button
          type="button"
          className="tick"
          style={event.done ? { background: hex, borderColor: hex, color: '#fff' } : { borderColor: hex, color: 'transparent' }}
          onClick={onToggleDone}
          aria-label="切换完成"
        >
          <Check size={14} strokeWidth={3} />
        </button>
      )}
    </div>
  )
}
