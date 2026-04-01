import React, { useState, useEffect } from 'react'
import { valScore } from './utils.js'

const SCORES = [12,11,10,9,8,7,6,5,4,3,2,1,0]

function ScoreCol({ value, onChange, label }) {
  const selected = parseInt(value) || 0
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 600, marginBottom: 6, textAlign: 'center' }}>{label}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
        {SCORES.map(n => (
          <button
            key={n} type="button"
            onClick={() => onChange(String(n))}
            style={{
              height: 40, borderRadius: 10, border: 'none',
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

export default function MatchCard({ m, getPlayer, isClosed, onSave, openMatchId, setOpenMatchId }) {
  const [s1, setS1] = useState('0')
  const [s2, setS2] = useState('0')
  const [err, setErr] = useState('')

  const open = openMatchId === m.id
  const isA = m.st === 'a' && Array.isArray(m.score)
  const w1 = isA && m.score[0] > m.score[1]
  const w2 = isA && m.score[1] > m.score[0]

  useEffect(() => {
    if (open) {
      // Pre-completează cu scorul existent dacă meciul e deja jucat
      setS1(isA ? String(m.score[0]) : '0')
      setS2(isA ? String(m.score[1]) : '0')
      setErr('')
    } else {
      setS1('0'); setS2('0'); setErr('')
    }
  }, [open])

  const p1 = getPlayer(m.p1)
  const p2 = getPlayer(m.p2)

  function save() {
    const a = parseInt(s1), b = parseInt(s2)
    const e = valScore(a, b)
    if (e) { setErr(e); return }
    onSave(m.id, a, b)
    setOpenMatchId(null)
  }

  function toggle() {
    setOpenMatchId(open ? null : m.id)
    setErr('')
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
          {isA ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: 2 }}>{m.score[0]} – {m.score[1]}</span>
              {!isClosed && (
                <button
                  className="btn sm"
                  onClick={toggle}
                  style={{
                    fontSize: 12, minHeight: 26, padding: '2px 10px',
                    color: open ? 'var(--text)' : 'var(--text2)',
                    borderColor: open ? 'rgba(0,0,0,0.12)' : 'var(--border)',
                    background: open ? 'var(--muted)' : 'transparent',
                    boxShadow: 'none',
                  }}
                >
                  {open ? '✕ anulează' : '✏️ editează'}
                </button>
              )}
            </div>
          ) : isClosed ? (
            <span style={{ fontSize: 14, color: 'var(--text2)' }}>nejucat</span>
          ) : (
            <button
              className="btn ac sm"
              onClick={toggle}
              style={open ? { background: 'var(--muted)', color: 'var(--text)', borderColor: 'rgba(0,0,0,0.12)' } : {}}
            >
              {open ? '✕' : '+ scor'}
            </button>
          )}
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
          <div style={{ display: 'flex', gap: 10 }}>
            <ScoreCol value={s1} onChange={v => { setS1(v); setErr('') }} label={p1?.name} />
            <ScoreCol value={s2} onChange={v => { setS2(v); setErr('') }} label={p2?.name} />
          </div>
          {err && <div className="er" style={{ textAlign: 'center', marginTop: 8 }}>{err}</div>}
          <button className="btn ac" style={{ width: '100%', justifyContent: 'center', marginTop: 12 }} onClick={save}>Salvează</button>
        </div>
      )}
    </div>
  )
}
