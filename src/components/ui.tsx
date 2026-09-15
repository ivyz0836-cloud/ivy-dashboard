import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

/* ------------------------------- Card ------------------------------- */

export function Card({
  children,
  className = '',
  tint,
}: {
  children: ReactNode
  className?: string
  tint?: boolean
}) {
  return <section className={`card ${tint ? 'tint' : ''} ${className}`}>{children}</section>
}

export function CardHead({
  icon,
  title,
  eyebrow,
  right,
}: {
  icon?: ReactNode
  title: string
  eyebrow?: string
  right?: ReactNode
}) {
  return (
    <div className="card-h">
      {icon && <div className="card-icon">{icon}</div>}
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h3>{title}</h3>
      </div>
      {right && <div className="right">{right}</div>}
    </div>
  )
}

/* ------------------------------- Empty ------------------------------ */

export function Empty({ emoji = '🌱', text, action }: { emoji?: string; text: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <span className="e-emoji">{emoji}</span>
      <p>{text}</p>
      {action && <div style={{ marginTop: 12 }}>{action}</div>}
    </div>
  )
}

/* -------------------------------- Ring ------------------------------ */

export function Ring({
  value,
  size = 84,
  stroke = 9,
  color = '#ffffff',
  track = 'rgba(255,255,255,0.22)',
  children,
}: {
  value: number
  size?: number
  stroke?: number
  color?: string
  track?: string
  children?: ReactNode
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(1, value))
  return (
    <div className="ring-wrap" style={{ width: size, height: size, flex: `0 0 ${size}px` }}>
      <svg width={size} height={size} style={{ display: 'block' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <div className="ring-center">{children}</div>
    </div>
  )
}

/* ------------------------------ Stat -------------------------------- */

export function Stat({
  icon,
  label,
  value,
  unit,
  hint,
  progress,
  barClass = '',
}: {
  icon?: ReactNode
  label: string
  value: string | number
  unit?: string
  hint?: string
  progress?: number
  barClass?: string
}) {
  return (
    <div className="stat">
      <div className="label">
        {icon}
        {label}
      </div>
      <div className="value">
        {value}
        {unit && <span className="unit">{unit}</span>}
      </div>
      {hint && <div className="hint">{hint}</div>}
      {progress !== undefined && (
        <div className={`bar ${barClass}`}>
          <i style={{ width: `${Math.max(0, Math.min(1, progress)) * 100}%` }} />
        </div>
      )}
    </div>
  )
}

/* ----------------------------- Segmented ---------------------------- */

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  block,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
  block?: boolean
}) {
  return (
    <div className={`seg ${block ? 'block' : ''}`} role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={o.value === value}
          className={o.value === value ? 'on' : ''}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* ------------------------------ Sheet ------------------------------- */

export function Sheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="overlay" onClick={onClose} role="presentation">
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={title}>
        <div className="grabber" />
        <div className="sheet-h">
          <h3>{title}</h3>
          <button type="button" className="x" onClick={onClose} aria-label="关闭">
            <X size={17} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

/* ------------------------------ Stepper ----------------------------- */

export function Stepper({
  value,
  onChange,
  min = 0,
  max = 9999,
  step = 1,
  suffix,
}: {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  suffix?: string
}) {
  const clamp = (n: number) => Math.max(min, Math.min(max, n))
  return (
    <div className="stepper">
      <button type="button" onClick={() => onChange(clamp(value - step))} aria-label="减少">
        −
      </button>
      <span className="val">
        {value}
        {suffix && <span style={{ fontSize: 12, color: 'var(--ink-3)' }}> {suffix}</span>}
      </span>
      <button type="button" onClick={() => onChange(clamp(value + step))} aria-label="增加">
        +
      </button>
    </div>
  )
}

/* ------------------------------- Stars ------------------------------ */

export function Stars({
  value,
  onChange,
  size = 16,
}: {
  value: number
  onChange?: (v: number) => void
  size?: number
}) {
  return (
    <span className="stars">
      {[1, 2, 3, 4, 5].map((n) =>
        onChange ? (
          <button
            key={n}
            type="button"
            className={`star-btn ${n <= value ? 'on' : ''}`}
            onClick={() => onChange(n)}
            aria-label={`${n} 星`}
          >
            <svg width={size} height={size} viewBox="0 0 24 24" fill={n <= value ? 'currentColor' : 'currentColor'}>
              <path d="M12 2.5l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3-5.8 3 1.1-6.5L2.6 9.3l6.5-.9z" />
            </svg>
          </button>
        ) : (
          <svg
            key={n}
            width={size}
            height={size}
            viewBox="0 0 24 24"
            style={{ color: n <= value ? 'var(--amber)' : 'var(--surface-3)' }}
            fill="currentColor"
          >
            <path d="M12 2.5l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3-5.8 3 1.1-6.5L2.6 9.3l6.5-.9z" />
          </svg>
        ),
      )}
    </span>
  )
}
