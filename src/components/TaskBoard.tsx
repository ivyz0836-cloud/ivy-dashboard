import { useEffect, useState } from 'react'
import { Check, ListChecks, Plus, Trash2 } from 'lucide-react'
import { db } from '../db/db'
import type { Task, TaskCategory } from '../db/types'
import { TASK_CATEGORIES, taskCategoryMeta } from '../lib/constants'
import { Card, CardHead, Empty, Sheet } from './ui'
import { useToast } from '../context/toast'

export function TaskBoard({ date, tasks }: { date: string; tasks: Task[] }) {
  const { toast } = useToast()
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<TaskCategory>('study')
  const [editing, setEditing] = useState<Task | null>(null)
  const [tplOpen, setTplOpen] = useState(false)

  const add = async () => {
    const t = title.trim()
    if (!t) {
      toast('先写点什么吧', 'warn')
      return
    }
    await db.tasks.add({
      title: t,
      category,
      date,
      done: 0,
      createdAt: Date.now(),
      order: tasks.length,
    })
    setTitle('')
    toast('已添加任务')
  }

  const toggle = async (task: Task) => {
    if (!task.id) return
    await db.tasks.update(task.id, { done: task.done ? 0 : 1, doneAt: task.done ? undefined : Date.now() })
  }

  const remove = async (task: Task) => {
    if (!task.id) return
    await db.tasks.delete(task.id)
    toast('已删除任务', 'info')
  }

  const clearDone = async () => {
    const done = tasks.filter((t) => t.done && t.id !== undefined)
    if (done.length === 0) {
      toast('还没有已完成的任务', 'info')
      return
    }
    await db.tasks.bulkDelete(done.map((t) => t.id as number))
    toast(`已清除 ${done.length} 条已完成任务`, 'info')
  }

  const doneCount = tasks.filter((t) => t.done).length

  return (
    <>
      <Card>
        <CardHead
          icon={<ListChecks size={17} />}
          eyebrow={`${doneCount} / ${tasks.length} 已完成`}
          title="今日任务"
          right={
            <>
              <button type="button" className="btn ghost xs" onClick={() => setTplOpen(true)}>
                每日模板
              </button>
              <button type="button" className="btn ghost xs" onClick={clearDone}>
                清除完成
              </button>
            </>
          }
        />

        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <input
            className="input"
            placeholder="添加一件今天要做的事…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void add()
            }}
          />
          <select
            className="select"
            style={{ width: 104, flex: '0 0 104px' }}
            value={category}
            onChange={(e) => setCategory(e.target.value as TaskCategory)}
            aria-label="任务分类"
          >
            {TASK_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.emoji} {c.label}
              </option>
            ))}
          </select>
          <button type="button" className="btn primary" onClick={add} aria-label="添加任务">
            <Plus size={17} />
          </button>
        </div>

        {tasks.length === 0 ? (
          <Empty emoji="📝" text="今天还没有任务，添加第一条吧" />
        ) : (
          tasks.map((t) => {
            const meta = taskCategoryMeta(t.category)
            return (
              <div key={t.id} className={`task ${t.done ? 'done' : ''}`}>
                <button type="button" className="tick" onClick={() => void toggle(t)} aria-label="切换完成">
                  <Check size={15} strokeWidth={3} />
                </button>
                <div className="task-body" onClick={() => setEditing(t)} style={{ cursor: 'pointer' }}>
                  <div className="task-title">{t.title}</div>
                  <div className="task-meta">
                    <span>
                      {meta.emoji} {meta.label}
                    </span>
                    {t.templateId && <span className="pill green">每日</span>}
                  </div>
                </div>
                <button type="button" className="task-del" onClick={() => void remove(t)} aria-label="删除任务">
                  <Trash2 size={15} />
                </button>
              </div>
            )
          })
        )}
      </Card>

      <TaskEditSheet task={editing} onClose={() => setEditing(null)} />
      <TemplateSheet open={tplOpen} onClose={() => setTplOpen(false)} date={date} />
    </>
  )
}

/* --------------------------- 编辑任务 --------------------------- */

function TaskEditSheet({ task, onClose }: { task: Task | null; onClose: () => void }) {
  const { toast } = useToast()
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<TaskCategory>('study')

  useEffect(() => {
    if (!task) return
    setTitle(task.title)
    setCategory(task.category)
  }, [task])

  if (!task) return null

  const save = async () => {
    const t = title.trim()
    if (!t || !task.id) return
    await db.tasks.update(task.id, { title: t, category })
    toast('已更新任务')
    onClose()
  }

  return (
    <Sheet open={!!task} onClose={onClose} title="编辑任务">
      <div className="field">
        <label>任务内容</label>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="field">
        <label>分类</label>
        <div className="chip-row">
          {TASK_CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              className={`chip ${category === c.value ? 'on' : ''}`}
              onClick={() => setCategory(c.value)}
            >
              {c.emoji} {c.label}
            </button>
          ))}
        </div>
      </div>
      <div className="sheet-actions">
        <button
          type="button"
          className="btn danger"
          onClick={async () => {
            if (task.id) await db.tasks.delete(task.id)
            toast('已删除任务', 'info')
            onClose()
          }}
        >
          删除
        </button>
        <button type="button" className="btn ghost" onClick={onClose}>
          取消
        </button>
        <button type="button" className="btn primary" onClick={save}>
          保存
        </button>
      </div>
    </Sheet>
  )
}

/* --------------------------- 每日模板 --------------------------- */

function TemplateSheet({ open, onClose, date }: { open: boolean; onClose: () => void; date: string }) {
  const { toast } = useToast()
  const [items, setItems] = useState<{ id?: number; title: string; category: TaskCategory }[]>([])
  const [draft, setDraft] = useState('')

  useEffect(() => {
    if (!open) return
    void db.taskTemplates.filter((t) => t.archived === 0).toArray().then((list) => setItems(list))
  }, [open])

  const addTpl = async () => {
    const t = draft.trim()
    if (!t) return
    await db.taskTemplates.add({ title: t, category: 'study', createdAt: Date.now(), archived: 0 })
    setDraft('')
    setItems(await db.taskTemplates.filter((x) => x.archived === 0).toArray())
  }

  const removeTpl = async (id?: number) => {
    if (!id) return
    await db.taskTemplates.delete(id)
    setItems(await db.taskTemplates.filter((x) => x.archived === 0).toArray())
    toast('已从每日模板移除', 'info')
  }

  const applyToToday = async () => {
    await db.transaction('rw', db.taskTemplates, db.tasks, async () => {
      const tpls = await db.taskTemplates.filter((t) => t.archived === 0).toArray()
      const existing = await db.tasks.where('date').equals(date).toArray()
      const have = new Set(existing.map((t) => t.templateId).filter(Boolean))
      const missing = tpls.filter((t) => t.id !== undefined && !have.has(t.id))
      await db.tasks.bulkAdd(
        missing.map((t, i) => ({
          title: t.title,
          category: t.category,
          date,
          done: 0 as const,
          createdAt: Date.now() + i,
          order: existing.length + i,
          templateId: t.id,
        })),
      )
      toast(`已补充 ${missing.length} 条任务`)
    })
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="每日任务模板">
      <p className="small muted" style={{ marginTop: 0 }}>
        模板里的事项会在每天第一次打开应用时自动生成，不用重复输入。
      </p>
      {items.length === 0 ? (
        <Empty emoji="📋" text="还没有模板" />
      ) : (
        items.map((t) => (
          <div key={t.id} className="row">
            <div className="row-emoji">🔁</div>
            <div className="row-body">
              <div className="row-title">{t.title}</div>
            </div>
            <button type="button" className="task-del" style={{ opacity: 1 }} onClick={() => void removeTpl(t.id)}>
              <Trash2 size={15} />
            </button>
          </div>
        ))
      )}
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <input
          className="input"
          placeholder="新增一条每日任务…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void addTpl()
          }}
        />
        <button type="button" className="btn primary" onClick={addTpl}>
          添加
        </button>
      </div>
      <div className="sheet-actions">
        <button type="button" className="btn ghost" onClick={onClose}>
          关闭
        </button>
        <button type="button" className="btn primary" onClick={applyToToday}>
          补到今天
        </button>
      </div>
    </Sheet>
  )
}
