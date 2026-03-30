import React from 'react'

export const PIN = '1234'

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
      fontSize: 11, background: bg, color: c,
      padding: '2px 8px', borderRadius: 9999,
      display: 'inline-flex', alignItems: 'center'
    }}>
      {children}
    </span>
  )
}

export function BackBtn({ onClick }) {
  return (
    <button className="btn sm" style={{ border: 'none', padding: '4px 8px', flex: 1, maxWidth: 80, justifyContent: 'center' }} onClick={onClick}>
      ←
    </button>
  )
}

export function Medal({ rank }) {
  const medals = { 1: '🥇', 2: '🥈', 3: '🥉' }
  if (medals[rank]) return <span style={{ fontSize: 18, lineHeight: 1 }}>{medals[rank]}</span>
  return <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', minWidth: 20, textAlign: 'center' }}>{rank}</span>
}

export function StandingsTable({ rows }) {
  return (
    <div className="card" style={{ padding: '12px 16px' }}>
      <table className="tbl">
        <thead>
          <tr>
            <th style={{ width: '40%' }}>Jucător</th>
            <th>% Vic</th>
            <th>V</th>
            <th>Î</th>
            <th>Pct</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s, i) => {
            const pct = s.n > 0 ? Math.round(s.w / s.n * 100) + '%' : '-'
            return (
              <tr key={s.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Medal rank={i + 1} />
                    <span style={{ fontWeight: i === 0 ? 500 : 400 }}>{s.name}</span>
                  </div>
                </td>
                <td style={{ fontWeight: 500, color: 'var(--ac)' }}>{pct}</td>
                <td style={{ color: 'var(--ac)' }}>{s.w}</td>
                <td style={{ color: 'var(--danger)' }}>{s.l}</td>
                <td>{s.pf}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div style={{ marginTop: 10, fontSize: 11, color: 'var(--color-text-secondary)' }}>
        Departajare la egalitate: total puncte marcate
      </div>
    </div>
  )
}

export function ScoreInput({ value, onChange, onEnter, label }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div className="mu" style={{ fontSize: 10, marginBottom: 1 }}>{label}</div>
      <input
        className="sinp"
        type="number" min="0" max="30"
        value={value}
        onFocus={e => { if (e.target.value === '0') e.target.value = '' }}
        onBlur={e => { if (e.target.value === '') onChange('0') }}
        onInput={e => onChange(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && onEnter()}
      />
    </div>
  )
}

export function ConfirmModal({ title, children, onConfirm, onCancel, confirmLabel = 'Confirmă', danger = false }) {
  return (
    <div className="pg" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 60 }}>
      <div className="card" style={{ width: '100%', maxWidth: 340 }}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          {children}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" style={{ flex: 1, justifyContent: 'center' }} onClick={onCancel}>Anulează</button>
          <button
            className="btn"
            style={{
              flex: 1, justifyContent: 'center',
              ...(danger ? { background: 'var(--danger)', borderColor: 'var(--danger)', color: '#fff' } : { background: 'var(--ac)', borderColor: 'var(--ac)', color: '#fff' })
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
