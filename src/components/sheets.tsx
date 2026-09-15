import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Trash2 } from 'lucide-react'
import { db } from '../db/db'
import type {
  EnglishActivity,
  EnglishLog,
  ExerciseLog,
  ExerciseType,
  FoodLog,
  MealType,
  MoodEntry,
  NewsReview,
  ReadingLog,
} from '../db/types'
import {
  ENGLISH_ACTIVITIES,
  EXERCISES,
  MEALS,
  MOODS,
  MOOD_TAGS,
  READING_SUGGESTIONS,
  englishMeta,
  exerciseMeta,
} from '../lib/constants'
import { Sheet, Stars, Stepper } from './ui'
import { useToast } from '../context/toast'

type FldProps = { label: string; children: ReactNode }

function Field({ label, children }: FldProps) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  )
}

function SaveBar({
  onSave,
  onDelete,
  onClose,
  saveLabel = '保存',
}: {
  onSave: () => void
  onDelete?: () => void
  onClose: () => void
  saveLabel?: string
}) {
  return (
    <div className="sheet-actions">
      {onDelete && (
        <button type="button" className="btn danger" onClick={onDelete}>
          <Trash2 size={15} /> 删除
        </button>
      )}
      <button type="button" className="btn ghost" onClick={onClose}>
        取消
      </button>
      <button type="button" className="btn primary" onClick={onSave}>
        {saveLabel}
      </button>
    </div>
  )
}

/* ============================  运动  ============================ */

export function ExerciseSheet({
  open,
  onClose,
  date,
  edit,
  defaultType,
}: {
  open: boolean
  onClose: () => void
  date: string
  edit?: ExerciseLog
  defaultType?: ExerciseType
}) {
  const { toast } = useToast()
  const [type, setType] = useState<ExerciseType>(defaultType ?? 'pilates')
  const [minutes, setMinutes] = useState(30)
  const [calories, setCalories] = useState(135)
  const [autoCal, setAutoCal] = useState(true)
  const [note, setNote] = useState('')

  useEffect(() => {
    if (!open) return
    setType(edit?.type ?? defaultType ?? 'pilates')
    setMinutes(edit?.minutes ?? 30)
    setCalories(edit?.calories ?? Math.round(30 * exerciseMeta(edit?.type ?? defaultType ?? 'pilates').kcalPerMin))
    setAutoCal(!edit)
    setNote(edit?.note ?? '')
  }, [open, edit, defaultType])

  useEffect(() => {
    if (autoCal) setCalories(Math.round(minutes * exerciseMeta(type).kcalPerMin))
  }, [minutes, type, autoCal])

  const save = async () => {
    if (minutes <= 0) {
      toast('时长要大于 0 哦', 'warn')
      return
    }
    const payload = { date, type, minutes, calories, note: note.trim() || undefined }
    if (edit?.id) await db.exerciseLogs.update(edit.id, payload)
    else await db.exerciseLogs.add({ ...payload, createdAt: Date.now() })
    toast(edit ? '已更新运动记录' : `已记录 ${minutes} 分钟${exerciseMeta(type).label}`)
    onClose()
  }

  const del = async () => {
    if (edit?.id) await db.exerciseLogs.delete(edit.id)
    toast('已删除记录', 'info')
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title={edit ? '编辑运动' : '记录运动'}>
      <Field label="项目">
        <div className="exo-grid">
          {EXERCISES.map((e) => (
            <button
              key={e.type}
              type="button"
              className={`exo ${type === e.type ? 'active' : ''}`}
              onClick={() => {
                setType(e.type)
                if (autoCal) setCalories(Math.round(minutes * e.kcalPerMin))
              }}
            >
              <span className="exo-emoji">{e.emoji}</span>
              <span className="exo-name">{e.label}</span>
              <span className="exo-hint">{e.hint}</span>
            </button>
          ))}
        </div>
      </Field>

      <div className="field-row">
        <Field label="时长（分钟）">
          <Stepper value={minutes} onChange={setMinutes} min={0} max={600} step={5} />
        </Field>
        <Field label="消耗（千卡）">
          <Stepper
            value={calories}
            onChange={(v) => {
              setAutoCal(false)
              setCalories(v)
            }}
            min={0}
            max={3000}
            step={10}
          />
        </Field>
      </div>
      {!autoCal && (
        <button type="button" className="btn ghost xs" onClick={() => setAutoCal(true)}>
          ↺ 恢复自动估算
        </button>
      )}

      <Field label="备注">
        <textarea
          className="textarea"
          placeholder="感受、强度、跟谁一起…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </Field>

      <SaveBar onSave={save} onDelete={edit?.id ? del : undefined} onClose={onClose} />
    </Sheet>
  )
}

/* ============================  饮食  ============================ */

export function FoodSheet({
  open,
  onClose,
  date,
  edit,
  defaultMeal,
}: {
  open: boolean
  onClose: () => void
  date: string
  edit?: FoodLog
  defaultMeal?: MealType
}) {
  const { toast } = useToast()
  const [meal, setMeal] = useState<MealType>('breakfast')
  const [name, setName] = useState('')
  const [calories, setCalories] = useState(300)
  const [note, setNote] = useState('')

  useEffect(() => {
    if (!open) return
    setMeal(edit?.meal ?? defaultMeal ?? 'breakfast')
    setName(edit?.name ?? '')
    setCalories(edit?.calories ?? 300)
    setNote(edit?.note ?? '')
  }, [open, edit, defaultMeal])

  const save = async () => {
    if (!name.trim()) {
      toast('先写一下吃了什么', 'warn')
      return
    }
    const payload = { date, meal, name: name.trim(), calories, note: note.trim() || undefined }
    if (edit?.id) await db.foodLogs.update(edit.id, payload)
    else await db.foodLogs.add({ ...payload, createdAt: Date.now() })
    toast(edit ? '已更新饮食记录' : `已记录 ${name.trim()} ${calories} 千卡`)
    onClose()
  }

  const del = async () => {
    if (edit?.id) await db.foodLogs.delete(edit.id)
    toast('已删除记录', 'info')
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title={edit ? '编辑饮食' : '记录饮食'}>
      <Field label="餐次">
        <div className="chip-row">
          {MEALS.map((m) => (
            <button
              key={m.meal}
              type="button"
              className={`chip ${meal === m.meal ? 'on' : ''}`}
              onClick={() => setMeal(m.meal)}
            >
              {m.emoji} {m.label}
            </button>
          ))}
        </div>
      </Field>
      <Field label="吃了什么">
        <input
          className="input"
          placeholder="例如：燕麦牛奶 + 水煮蛋"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </Field>
      <Field label="热量（千卡）">
        <Stepper value={calories} onChange={setCalories} min={0} max={3000} step={25} />
      </Field>
      <Field label="备注">
        <textarea
          className="textarea"
          placeholder="饱腹感、情绪性进食…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </Field>
      <SaveBar onSave={save} onDelete={edit?.id ? del : undefined} onClose={onClose} />
    </Sheet>
  )
}

/* ============================  阅读  ============================ */

export function ReadingSheet({
  open,
  onClose,
  date,
  edit,
}: {
  open: boolean
  onClose: () => void
  date: string
  edit?: ReadingLog
}) {
  const { toast } = useToast()
  const [book, setBook] = useState('')
  const [pages, setPages] = useState(20)
  const [minutes, setMinutes] = useState(30)
  const [note, setNote] = useState('')

  useEffect(() => {
    if (!open) return
    setBook(edit?.book ?? '')
    setPages(edit?.pages ?? 20)
    setMinutes(edit?.minutes ?? 30)
    setNote(edit?.note ?? '')
  }, [open, edit])

  const save = async () => {
    if (!book.trim()) {
      toast('先写书名/篇名', 'warn')
      return
    }
    const payload = { date, book: book.trim(), pages, minutes, note: note.trim() || undefined }
    if (edit?.id) await db.readingLogs.update(edit.id, payload)
    else await db.readingLogs.add({ ...payload, createdAt: Date.now() })
    toast(edit ? '已更新阅读记录' : `已记录《${book.trim()}》${pages} 页`)
    onClose()
  }

  const del = async () => {
    if (edit?.id) await db.readingLogs.delete(edit.id)
    toast('已删除记录', 'info')
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title={edit ? '编辑阅读' : '记录阅读'}>
      <Field label="书名 / 篇名">
        <input className="input" placeholder="例如：原子习惯" value={book} onChange={(e) => setBook(e.target.value)} />
        <div className="chip-row" style={{ marginTop: 8 }}>
          {READING_SUGGESTIONS.map((s) => (
            <button key={s} type="button" className="chip" onClick={() => setBook(s)}>
              {s}
            </button>
          ))}
        </div>
      </Field>
      <div className="field-row">
        <Field label="页数">
          <Stepper value={pages} onChange={setPages} min={0} max={2000} step={5} />
        </Field>
        <Field label="时长（分钟）">
          <Stepper value={minutes} onChange={setMinutes} min={0} max={600} step={5} />
        </Field>
      </div>
      <Field label="摘录 / 想法">
        <textarea
          className="textarea"
          placeholder="今天最有触动的一句话…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </Field>
      <SaveBar onSave={save} onDelete={edit?.id ? del : undefined} onClose={onClose} />
    </Sheet>
  )
}

/* ============================  英语  ============================ */

export function EnglishSheet({
  open,
  onClose,
  date,
  edit,
  defaultActivity,
}: {
  open: boolean
  onClose: () => void
  date: string
  edit?: EnglishLog
  defaultActivity?: EnglishActivity
}) {
  const { toast } = useToast()
  const [activity, setActivity] = useState<EnglishActivity>('vocab')
  const [value, setValue] = useState(30)
  const [note, setNote] = useState('')

  const meta = useMemo(() => englishMeta(activity), [activity])

  useEffect(() => {
    if (!open) return
    const a = edit?.activity ?? defaultActivity ?? 'vocab'
    setActivity(a)
    setValue(edit?.value ?? (a === 'vocab' ? 30 : 20))
    setNote(edit?.note ?? '')
  }, [open, edit, defaultActivity])

  const save = async () => {
    if (value <= 0) {
      toast('数量要大于 0 哦', 'warn')
      return
    }
    const payload = { date, activity, value, note: note.trim() || undefined }
    if (edit?.id) await db.englishLogs.update(edit.id, payload)
    else await db.englishLogs.add({ ...payload, createdAt: Date.now() })
    toast(edit ? '已更新英语记录' : `已记录 ${meta.label} ${value} ${meta.unit}`)
    onClose()
  }

  const del = async () => {
    if (edit?.id) await db.englishLogs.delete(edit.id)
    toast('已删除记录', 'info')
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title={edit ? '编辑英语练习' : '记录英语练习'}>
      <Field label="类型">
        <div className="chip-row">
          {ENGLISH_ACTIVITIES.map((a) => (
            <button
              key={a.activity}
              type="button"
              className={`chip ${activity === a.activity ? 'on' : ''}`}
              onClick={() => {
                setActivity(a.activity)
                setValue(a.activity === 'vocab' ? 30 : 20)
              }}
            >
              {a.emoji} {a.label}
            </button>
          ))}
        </div>
        <div className="small muted" style={{ marginTop: 6 }}>
          {meta.hint}
        </div>
      </Field>
      <Field label={`数量（${meta.unit}）`}>
        <Stepper value={value} onChange={setValue} min={0} max={1000} step={activity === 'vocab' ? 5 : 5} />
      </Field>
      <Field label="备注">
        <textarea
          className="textarea"
          placeholder="今天学到的高频表达…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </Field>
      <SaveBar onSave={save} onDelete={edit?.id ? del : undefined} onClose={onClose} />
    </Sheet>
  )
}

/* ============================  新闻评论  ============================ */

export function NewsSheet({
  open,
  onClose,
  date,
  edit,
}: {
  open: boolean
  onClose: () => void
  date: string
  edit?: NewsReview
}) {
  const { toast } = useToast()
  const [title, setTitle] = useState('')
  const [source, setSource] = useState('')
  const [url, setUrl] = useState('')
  const [summary, setSummary] = useState('')
  const [opinion, setOpinion] = useState('')
  const [rating, setRating] = useState(3)

  useEffect(() => {
    if (!open) return
    setTitle(edit?.title ?? '')
    setSource(edit?.source ?? '')
    setUrl(edit?.url ?? '')
    setSummary(edit?.summary ?? '')
    setOpinion(edit?.opinion ?? '')
    setRating(edit?.rating ?? 3)
  }, [open, edit])

  const save = async () => {
    if (!title.trim()) {
      toast('先写新闻标题', 'warn')
      return
    }
    const payload = {
      date,
      title: title.trim(),
      source: source.trim(),
      summary: summary.trim(),
      opinion: opinion.trim(),
      rating,
      url: url.trim() || undefined,
    }
    if (edit?.id) await db.newsReviews.update(edit.id, payload)
    else await db.newsReviews.add({ ...payload, createdAt: Date.now() })
    toast(edit ? '已更新评论' : '已保存新闻评论')
    onClose()
  }

  const del = async () => {
    if (edit?.id) await db.newsReviews.delete(edit.id)
    toast('已删除评论', 'info')
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title={edit ? '编辑新闻评论' : '写一条新闻评论'}>
      <Field label="标题">
        <input className="input" placeholder="这则新闻讲了什么" value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <div className="field-row">
        <Field label="来源">
          <input className="input" placeholder="如：BBC / 财新" value={source} onChange={(e) => setSource(e.target.value)} />
        </Field>
        <Field label="链接（可选）">
          <input className="input" placeholder="https://" value={url} onChange={(e) => setUrl(e.target.value)} />
        </Field>
      </div>
      <Field label="事实摘要">
        <textarea
          className="textarea"
          placeholder="用两三句话写清楚客观事实…"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
        />
      </Field>
      <Field label="我的观点">
        <textarea
          className="textarea"
          placeholder="我同意什么 / 存疑什么 / 还有什么信息缺失？"
          value={opinion}
          onChange={(e) => setOpinion(e.target.value)}
        />
      </Field>
      <Field label="内容价值">
        <Stars value={rating} onChange={setRating} size={22} />
      </Field>
      <SaveBar onSave={save} onDelete={edit?.id ? del : undefined} onClose={onClose} />
    </Sheet>
  )
}

/* ============================  心情  ============================ */

export function MoodSheet({
  open,
  onClose,
  date,
  entry,
}: {
  open: boolean
  onClose: () => void
  date: string
  entry?: MoodEntry
}) {
  const { toast } = useToast()
  const [score, setScore] = useState(3)
  const [tags, setTags] = useState<string[]>([])
  const [note, setNote] = useState('')

  useEffect(() => {
    if (!open) return
    setScore(entry?.score ?? 3)
    setTags(entry?.tags ?? [])
    setNote(entry?.note ?? '')
  }, [open, entry])

  const toggleTag = (t: string) => {
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))
  }

  const save = async () => {
    const now = Date.now()
    if (entry?.id) {
      await db.moods.update(entry.id, { score, tags, note: note.trim() || undefined, updatedAt: now })
    } else {
      await db.moods.add({
        date,
        score,
        emoji: MOODS.find((m) => m.score === score)?.emoji ?? '😐',
        tags,
        note: note.trim() || undefined,
        createdAt: now,
        updatedAt: now,
      })
    }
    toast(entry ? '已更新心情' : '已记录今天的心情')
    onClose()
  }

  const del = async () => {
    if (entry?.id) await db.moods.delete(entry.id)
    toast('已删除心情记录', 'info')
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title={entry ? '编辑心情' : '今天心情如何？'}>
      <Field label="整体状态">
        <div className="mood-row">
          {MOODS.map((m) => (
            <button
              key={m.score}
              type="button"
              className={`mood-btn ${score === m.score ? 'on' : ''}`}
              onClick={() => setScore(m.score)}
            >
              <span className="mood-emoji">{m.emoji}</span>
              <span className="mood-label">{m.label}</span>
            </button>
          ))}
        </div>
      </Field>
      <Field label="标签（可多选）">
        <div className="chip-row">
          {MOOD_TAGS.map((t) => (
            <button key={t} type="button" className={`chip ${tags.includes(t) ? 'on amber' : ''}`} onClick={() => toggleTag(t)}>
              {t}
            </button>
          ))}
        </div>
      </Field>
      <Field label="发生了什么">
        <textarea
          className="textarea"
          placeholder="一句话记录今天…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </Field>
      <SaveBar onSave={save} onDelete={entry?.id ? del : undefined} onClose={onClose} />
    </Sheet>
  )
}
