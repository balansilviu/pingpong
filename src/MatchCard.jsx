import React, { useState } from 'react'
import { ScoreInput } from './components.jsx'
import { valScore } from './utils.js'

export default function MatchCard({ m, getPlayer, isClosed, onSave }) {
  const [open, setOpen] = useState(false)
  const [s1, setS1] = useState('0')
  const [s2, setS2] = useState('0')
  const [err, setErr] = useState('')

  const p1 = getPlayer(m.p1)
  const p2 = getPlayer(m.p2)
  const isA = m.st === 'a'
  const w1 = isA && m.score[0] > m.score[1]
  const w2 = isA && m.score[1] > m.score[0]

  function save() {
    const a = parseInt(s1), b = parseInt(s2)
    const e = valScore(a, b)
    if (e) { setErr(e); return }
    onSave(m.id, a, b)
    setOpen(false); setS1('0'); setS2('0'); setErr('')
  }

  function toggle() {
    setOpen(o => {
      if (o) { setS1('0'); setS2('0'); setErr('') }
      return !o
    })
  }

  return (
    <div
      className="card"
      style={{
        padding: '4px 8px',
        borderColor: isA ? 'var(--acb)' : open ? 'var(--ac)' : undefined
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
        <span style={{ flex: 1, textAlign: 'right', fontWeight: w1 ? 500 : 400, color: w1 ? 'var(--ac)' : 'var(--color-text-primary)', fontSize: 22 }}>
          {p1?.name}
        </span>
        <div style={{ minWidth: 70, textAlign: 'center', flexShrink: 0 }}>
          {isA
            ? <span style={{ fontSize: 21, fontWeight: 500 }}>{m.score[0]} - {m.score[1]}</span>
            : isClosed
              ? <span className="mu" style={{ fontSize: 22 }}>nejucat</span>
              : <button
                  className="btn ac sm"
                  onClick={toggle}
                  style={open ? { background: 'var(--color-background-secondary)', color: 'var(--color-text-primary)', borderColor: 'var(--color-border-secondary)' } : {}}
                >
                  {open ? '✕' : '+ scor'}
                </button>
          }
        </div>
        <span style={{ flex: 1, fontWeight: w2 ? 500 : 400, color: w2 ? 'var(--ac)' : 'var(--color-text-primary)', fontSize: 22 }}>
          {p2?.name}
        </span>
      </div>

      {open && (
        <div style={{ marginTop: 4, paddingTop: 4, borderTop: '0.5px solid var(--color-border-tertiary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
            <ScoreInput value={s1} onChange={v => { setS1(v); setErr('') }} onEnter={save} label={p1?.name} />
            <span style={{ color: 'var(--color-text-secondary)', fontSize: 21, paddingTop: 8 }}>-</span>
            <ScoreInput value={s2} onChange={v => { setS2(v); setErr('') }} onEnter={save} label={p2?.name} />
            <button className="btn ac sm" style={{ marginTop: 8, flexShrink: 0 }} onClick={save}>Salvează</button>
          </div>
          {err && <div className="er" style={{ textAlign: 'center', marginTop: 6 }}>{err}</div>}
        </div>
      )}
    </div>
  )
}
