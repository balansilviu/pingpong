import React from 'react'

export const PIN = '2143'

export const INIT_PLAYERS = [
  { id: 'p1', name: 'Dănuț' },
  { id: 'p2', name: 'Paul' },
  { id: 'p3', name: 'Gabi' },
  { id: 'p4', name: 'Grigore' },
  { id: 'p5', name: 'Dragoș' },
  { id: 'p6', name: 'Marian' },
]

export function Badge({ bg, c, children }) {
  return (
    <span style={{
      fontSize: 13, background: bg, color: c,
      padding: '3px 10px', borderRadius: 9999,
      display: 'inline-flex', alignItems: 'center',
      fontWeight: 500,
    }}>
      {children}
    </span>
  )
}

export function BackBtn({ onClick, color }) {
  return (
    <button
      className="btn sm"
      style={{ border: 'none', background: 'transparent', minWidth: 48, justifyContent: 'center', fontSize: 22, color: color || 'inherit', boxShadow: 'none' }}
      onClick={onClick}
    >
      ←
    </button>
  )
}

export function HomeBtn({ onClick, color }) {
  return (
    <button
      className="btn sm"
      style={{ border: 'none', background: 'transparent', minWidth: 40, justifyContent: 'center', fontSize: 18, color: color || 'inherit', boxShadow: 'none' }}
      onClick={onClick}
    >
      🏠
    </button>
  )
}

export function Medal({ rank }) {
  const base = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, flexShrink: 0 }
  if (rank === 1) return <span style={{ ...base, fontSize: 22, lineHeight: 1 }}>🥇</span>
  return <span style={{ ...base, fontSize: 17, color: 'var(--text2)' }}>{rank}</span>
}

export function StandingsTable({ rows, onPlayerClick }) {
  return (
    <div className="card" style={{ padding: '20px 16px' }}>
      <table className="tbl">
        <thead>
          <tr>
            <th style={{ width: '40%' }}>Jucător</th>
            <th>V</th>
            <th>Î</th>
            <th style={{ color: 'var(--text2)', fontWeight: 500 }}>+/−</th>
            <th style={{ color: 'var(--text2)', fontWeight: 500 }}>+Pct</th>
            <th style={{ color: 'var(--text2)', fontWeight: 500 }}>−Pct</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s, i) => {
            const diff = s.w - s.l
            return (
              <tr key={s.id} onClick={onPlayerClick ? () => onPlayerClick(s.id) : undefined}
                style={onPlayerClick ? { cursor: 'pointer' } : undefined}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Medal rank={i + 1} />
                    <span style={{ fontWeight: i === 0 ? 700 : 500, fontSize: 17 }}>{s.name}</span>
                  </div>
                </td>
                <td style={{ fontWeight: 700, color: 'var(--ac)', fontSize: 19 }}>{s.w}</td>
                <td style={{ fontWeight: 700, color: 'var(--danger)', fontSize: 19 }}>{s.l}</td>
                <td style={{ fontSize: 15, color: diff > 0 ? 'var(--ac)' : diff < 0 ? 'var(--danger)' : 'var(--text2)' }}>
                  {diff > 0 ? '+' : ''}{diff}
                </td>
                <td style={{ fontSize: 15, color: 'var(--text2)' }}>{s.pf}</td>
                <td style={{ fontSize: 15, color: 'var(--text2)' }}>{s.pa}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div style={{ marginTop: 14, fontSize: 13, color: 'var(--text2)' }}>
        Departajare: meciuri directe, diferență V−Î, apoi puncte marcate
      </div>
    </div>
  )
}

export function ScoreInput({ value, onChange, label }) {
  const selected = parseInt(value) || 0
  const nums = [0,1,2,3,4,5,6,7,8,9,10,11,12]
  return (
    <div>
      <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 8, textAlign: 'center', fontWeight: 600 }}>{label}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
        {nums.map(n => (
          <button
            key={n} type="button"
            onClick={() => onChange(String(n))}
            style={{
              minHeight: 44, borderRadius: 10, border: 'none',
              background: selected === n ? 'var(--green)' : 'var(--muted)',
              color: selected === n ? '#fff' : 'var(--text)',
              fontSize: 17, fontWeight: selected === n ? 700 : 400,
              cursor: 'pointer', fontFamily: 'inherit',
              transition: 'background 0.1s',
            }}
          >{n}</button>
        ))}
      </div>
    </div>
  )
}

export function ConfirmModal({ title, children, onConfirm, onCancel, confirmLabel = 'Confirmă', danger = false }) {
  return (
    <div className="pg" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 80 }}>
      <div className="card" style={{ width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          {children}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn" style={{ flex: 1 }} onClick={onCancel}>Anulează</button>
          <button
            className="btn"
            style={{
              flex: 1,
              ...(danger
                ? { background: 'var(--danger)', borderColor: 'var(--danger)', color: '#fff' }
                : { background: 'var(--ac)', borderColor: 'var(--ac)', color: '#fff' })
            }}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
