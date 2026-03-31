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
    <div className={`m-card${isA ? ' done' : ''}`} style={open ? { border: '2px solid var(--green)' } : {}}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 52 }}>
        <span style={{
          flex: 1, textAlign: 'right',
          fontWeight: w1 ? 700 : 500,
          color: w1 ? 'var(--green)' : 'var(--text)',
          fontSize: 19,
        }}>
          {p1?.name}
        </span>

        <div style={{ minWidth: 100, textAlign: 'center', flexShrink: 0 }}>
          {isA
            ? <span style={{
                fontSize: 22, fontWeight: 800, letterSpacing: 2,
                color: 'var(--text)',
              }}>{m.score[0]} – {m.score[1]}</span>
            : isClosed
              ? <span style={{ fontSize: 14, color: 'var(--text2)' }}>nejucat</span>
              : <button
                  className="btn ac sm"
                  onClick={toggle}
                  style={open
                    ? { background: 'var(--muted)', color: 'var(--text)', borderColor: 'rgba(0,0,0,0.12)' }
                    : {}}
                >
                  {open ? '✕' : '+ scor'}
                </button>
          }
        </div>

        <span style={{
          flex: 1,
          fontWeight: w2 ? 700 : 500,
          color: w2 ? 'var(--green)' : 'var(--text)',
          fontSize: 19,
        }}>
          {p2?.name}
        </span>
      </div>

      {open && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, justifyContent: 'center' }}>
            <ScoreInput value={s1} onChange={v => { setS1(v); setErr('') }} onEnter={save} label={p1?.name} />
            <span style={{ color: 'var(--text2)', fontSize: 24, paddingBottom: 22 }}>–</span>
            <ScoreInput value={s2} onChange={v => { setS2(v); setErr('') }} onEnter={save} label={p2?.name} />
            <button className="btn ac sm" style={{ marginBottom: 4, flexShrink: 0 }} onClick={save}>Salvează</button>
          </div>
          {err && <div className="er" style={{ textAlign: 'center', marginTop: 8 }}>{err}</div>}
        </div>
      )}
    </div>
  )
}
