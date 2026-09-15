import { useState } from 'react'

/* ---------------------------- 柱状图 ---------------------------- */

export interface BarDatum {
  label: string
  value: number
  sub?: string
}

export function MiniBars({
  data,
  height = 120,
  color = '#2e6b55',
  goal,
  unit = '',
}: {
  data: BarDatum[]
  height?: number
  color?: string
  goal?: number
  unit?: string
}) {
  const [active, setActive] = useState<number | null>(null)
  const max = Math.max(1, ...data.map((d) => d.value), goal ?? 0)
  const gap = 6
  const bw = 100 / Math.max(1, data.length)
  const barW = bw - gap * 0.55
  const showGoal = goal !== undefined && goal > 0
  const goalY = 100 - (goal! / max) * 100

  return (
    <div>
      <div style={{ position: 'relative' }}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height, display: 'block' }}>
          {[0, 0.5, 1].map((f) => (
            <line key={f} x1="0" x2="100" y1={f * 100} y2={f * 100} stroke="#efe8da" strokeWidth="0.6" />
          ))}
          {showGoal && (
            <line
              x1="0"
              x2="100"
              y1={goalY}
              y2={goalY}
              stroke="#dd9a4b"
              strokeWidth="0.8"
              strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke"
            />
          )}
          {data.map((d, i) => {
            const h = (d.value / max) * 100
            const x = i * bw + (bw - barW) / 2
            const y = 100 - h
            return (
              <rect
                key={d.label + i}
                x={x}
                y={y}
                width={barW}
                height={Math.max(d.value > 0 ? 1.2 : 0, h)}
                rx="1.6"
                fill={active === i ? '#1f4d3d' : color}
                opacity={active === null || active === i ? 1 : 0.55}
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
              />
            )
          })}
        </svg>
        {active !== null && data[active] && (
          <div
            style={{
              position: 'absolute',
              left: `${(active + 0.5) * bw}%`,
              top: 0,
              transform: 'translateX(-50%)',
              background: '#1c2b26',
              color: '#fff',
              padding: '3px 9px',
              borderRadius: 8,
              fontSize: 11.5,
              fontWeight: 700,
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
            }}
          >
            {data[active].value}
            {unit} · {data[active].label}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', marginTop: 4 }}>
        {data.map((d, i) => (
          <div
            key={d.label + i}
            style={{
              flex: 1,
              textAlign: 'center',
              fontSize: 10.5,
              color: active === i ? '#1f4d3d' : '#8a9a92',
              fontWeight: active === i ? 700 : 600,
            }}
          >
            {d.label}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ---------------------------- 心情折线 ---------------------------- */

export interface MoodDatum {
  label: string
  score: number | null
}

export function MoodChart({ data, height = 130 }: { data: MoodDatum[]; height?: number }) {
  const W = 300
  const H = 100
  const pad = 8
  const pts = data.map((d, i) => {
    const x = pad + (i * (W - pad * 2)) / Math.max(1, data.length - 1)
    const y = d.score === null ? null : H - pad - ((d.score - 1) / 4) * (H - pad * 2)
    return { x, y, ...d }
  })

  const segments: { x: number; y: number }[][] = []
  let cur: { x: number; y: number }[] = []
  for (const p of pts) {
    if (p.y === null) {
      if (cur.length) segments.push(cur)
      cur = []
    } else {
      cur.push({ x: p.x, y: p.y })
    }
  }
  if (cur.length) segments.push(cur)

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height, display: 'block' }}>
        {[1, 2, 3, 4, 5].map((s) => {
          const y = H - pad - ((s - 1) / 4) * (H - pad * 2)
          return <line key={s} x1={pad} x2={W - pad} y1={y} y2={y} stroke="#efe8da" strokeWidth="0.7" />
        })}
        {segments.map((seg, i) => (
          <polyline
            key={i}
            points={seg.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="#2e6b55"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {pts.map((p, i) =>
          p.y === null ? null : (
            <circle key={i} cx={p.x} cy={p.y} r="1.8" fill="#fbf8f1" stroke="#2e6b55" strokeWidth="1.1" />
          ),
        )}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: '#8a9a92', marginTop: 2 }}>
        {data.map((d, i) => (
          <span key={i} style={{ flex: 1, textAlign: 'center', fontWeight: 600 }}>
            {d.label}
          </span>
        ))}
      </div>
    </div>
  )
}

/* ---------------------------- 分布条 ---------------------------- */

export function StackBar({
  parts,
}: {
  parts: { label: string; value: number; color: string }[]
}) {
  const total = parts.reduce((s, p) => s + p.value, 0)
  if (total === 0) return <div className="muted small">暂无数据</div>
  return (
    <div>
      <div style={{ display: 'flex', height: 12, borderRadius: 99, overflow: 'hidden', background: '#efe8da' }}>
        {parts.map((p) => (
          <div
            key={p.label}
            title={`${p.label} ${p.value}`}
            style={{ width: `${(p.value / total) * 100}%`, background: p.color }}
          />
        ))}
      </div>
      <div className="legend">
        {parts
          .filter((p) => p.value > 0)
          .map((p) => (
            <span key={p.label}>
              <i style={{ background: p.color }} />
              {p.label} {p.value}
            </span>
          ))}
      </div>
    </div>
  )
}
