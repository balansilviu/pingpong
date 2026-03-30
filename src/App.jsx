import React, { useState, useMemo } from 'react'
import { PIN, INIT_PLAYERS, Badge, BackBtn, StandingsTable, ConfirmModal } from './components.jsx'
import MatchCard from './MatchCard.jsx'
import { gid, autoName, mkRound, sortStandings, calcStandings, unequalWarn } from './utils.js'

export default function App() {
  const [players, setPlayers] = useState(INIT_PLAYERS)
  const [tournaments, setTournaments] = useState([])
  const [rounds, setRounds] = useState([])
  const [matches, setMatches] = useState([])

  const [view, setView] = useState('home') // home | c | t | g | a | al
  const [tid, setTid] = useState(null)
  const [tab, setTab] = useState('r') // r | s

  const [pin, setPin] = useState('')
  const [pinErr, setPinErr] = useState(false)
  const [tourneyName, setTourneyName] = useState('')
  const [selectedPlayers, setSelectedPlayers] = useState([])
  const [newPlayer, setNewPlayer] = useState('')

  const [delPlayerConf, setDelPlayerConf] = useState(null)
  const [delTourneyConf, setDelTourneyConf] = useState(null)
  const [closeConf, setCloseConf] = useState(null)

  const t = tournaments.find(x => x.id === tid)
  const tRounds = rounds.filter(r => r.tid === tid).sort((a, b) => a.num - b.num)
  const tMatches = matches.filter(m => m.tid === tid)
  const getPlayer = id => players.find(p => p.id === id)

  function go(v, opts = {}) {
    setView(v)
    if (opts.tid != null) setTid(opts.tid)
    if (opts.tab != null) setTab(opts.tab)
  }

  // ---- Tournament creation ----
  function openCreate() {
    setTourneyName(autoName(tournaments))
    setSelectedPlayers([])
    setView('c')
  }

  function createTourney() {
    if (!tourneyName.trim() || selectedPlayers.length < 2) return
    const tid2 = gid()
    const { round, ms } = mkRound(selectedPlayers, tid2, 1)
    setTournaments(p => [...p, {
      id: tid2,
      name: tourneyName.trim(),
      pids: [...selectedPlayers],
      date: new Date().toLocaleDateString('ro-RO'),
      closed: false
    }])
    setRounds(p => [...p, round])
    setMatches(p => [...p, ...ms])
    go('t', { tid: tid2, tab: 'r' })
  }

  function addRound() {
    if (!t || t.closed) return
    const { round, ms } = mkRound(t.pids, tid, tRounds.length + 1)
    setRounds(p => [...p, round])
    setMatches(p => [...p, ...ms])
  }

  function saveScore(mid, a, b) {
    setMatches(p => p.map(m => m.id === mid ? { ...m, score: [a, b], st: 'a' } : m))
  }

  // ---- Close tournament ----
  function tryClose() {
    const warn = unequalWarn(tMatches.filter(m => m.st === 'a'), t.pids)
    setCloseConf({ tid, warn })
  }

  function confirmClose() {
    if (!closeConf) return
    setTournaments(p => p.map(t => t.id === closeConf.tid ? { ...t, closed: true } : t))
    setMatches(p => p.map(m => m.tid === closeConf.tid && m.st === 's' ? { ...m, st: 'x' } : m))
    setCloseConf(null)
    go('t', { tid: closeConf.tid, tab: 's' })
  }

  // ---- Admin actions ----
  function addPlayer() {
    if (!newPlayer.trim()) return
    setPlayers(p => [...p, { id: gid(), name: newPlayer.trim() }])
    setNewPlayer('')
  }

  function confirmDelPlayer() {
    if (!delPlayerConf) return
    const id = delPlayerConf.id
    setPlayers(p => p.filter(x => x.id !== id))
    setMatches(p => p.filter(m => m.p1 !== id && m.p2 !== id))
    setTournaments(p => p.map(t => ({ ...t, pids: t.pids.filter(x => x !== id) })))
    setDelPlayerConf(null)
  }

  function confirmDelTourney() {
    const id = delTourneyConf
    setTournaments(p => p.filter(t => t.id !== id))
    setMatches(p => p.filter(m => m.tid !== id))
    setRounds(p => p.filter(r => r.tid !== id))
    setDelTourneyConf(null)
  }

  // ---- Computed stats ----
  const globalStats = useMemo(() => {
    const s = {}
    players.forEach(p => s[p.id] = { ...p, w: 0, l: 0, pf: 0, pa: 0, n: 0, tr: 0 })
    matches.filter(m => m.st === 'a').forEach(m => {
      const [a, b] = m.score
      if (!s[m.p1] || !s[m.p2]) return
      s[m.p1].n++; s[m.p2].n++
      s[m.p1].pf += a; s[m.p1].pa += b
      s[m.p2].pf += b; s[m.p2].pa += a
      if (a > b) { s[m.p1].w++; s[m.p2].l++ }
      else { s[m.p2].w++; s[m.p1].l++ }
    })
    tournaments.forEach(t => t.pids.forEach(id => { if (s[id]) s[id].tr++ }))
    return sortStandings(Object.values(s))
  }, [matches, players, tournaments])

  const tourneyStandings = useMemo(
    () => t ? calcStandings(tMatches, t.pids, players) : [],
    [tMatches, t, players]
  )

  const lastRound = tRounds[tRounds.length - 1]
  const lastRoundMs = lastRound ? matches.filter(m => m.rid === lastRound.id) : []
  const lastRoundDone = lastRoundMs.length > 0 && lastRoundMs.every(m => m.st === 'a' || m.st === 'x')

  // ---- Modals ----
  if (closeConf) return (
    <div className="pg" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 60 }}>
      <div className="card" style={{ width: '100%', maxWidth: 340 }}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🏁</div>
          <div style={{ fontWeight: 500, marginBottom: 10 }}>
            Închizi turneul <span style={{ color: 'var(--ac)' }}>{tournaments.find(x => x.id === closeConf.tid)?.name}</span>?
          </div>
          {closeConf.warn ? (
            <div className="warn" style={{ textAlign: 'left', marginBottom: 10 }}>
              <div style={{ fontWeight: 500, marginBottom: 6 }}>⚠️ Meciuri inegale!</div>
              {t?.pids.map(id => {
                const p = getPlayer(id), n = closeConf.warn.counts[id] || 0
                const isLow = n === closeConf.warn.min && closeConf.warn.min !== closeConf.warn.max
                return (
                  <div key={id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span>{p?.name}</span>
                    <span style={{ fontWeight: 500, color: isLow ? 'var(--danger)' : 'var(--color-text-primary)' }}>{n} meciuri</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="mu" style={{ marginBottom: 10 }}>Toți jucătorii au același număr de meciuri.</div>
          )}
          <div className="mu" style={{ fontSize: 12 }}>Meciurile rămase vor fi anulate.</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setCloseConf(null)}>Anulează</button>
          <button className="btn ac" style={{ flex: 1, justifyContent: 'center' }} onClick={confirmClose}>🏁 Închide</button>
        </div>
      </div>
    </div>
  )

  if (delPlayerConf) return (
    <ConfirmModal
      danger
      confirmLabel="Șterge"
      onConfirm={confirmDelPlayer}
      onCancel={() => setDelPlayerConf(null)}
    >
      <div style={{ fontSize: 28, marginBottom: 8 }}>⚠️</div>
      <div style={{ fontWeight: 500, marginBottom: 8 }}>
        Ștergi jucătorul <span style={{ color: 'var(--danger)' }}>{getPlayer(delPlayerConf.id)?.name}</span>?
      </div>
      {delPlayerConf.warn
        ? <div style={{ background: 'var(--dangerl)', color: 'var(--danger)', borderRadius: 8, padding: 10, fontSize: 13, textAlign: 'left', marginBottom: 8 }}>Participă în turnee existente. Se vor șterge și meciurile lui.</div>
        : <div className="mu" style={{ marginBottom: 8 }}>Această acțiune nu poate fi anulată.</div>}
    </ConfirmModal>
  )

  if (delTourneyConf) return (
    <ConfirmModal
      danger
      confirmLabel="Șterge"
      onConfirm={confirmDelTourney}
      onCancel={() => setDelTourneyConf(null)}
    >
      <div style={{ fontSize: 28, marginBottom: 8 }}>⚠️</div>
      <div style={{ fontWeight: 500, marginBottom: 8 }}>
        Ștergi turneul <span style={{ color: 'var(--danger)' }}>{tournaments.find(x => x.id === delTourneyConf)?.name}</span>?
      </div>
      <div className="mu" style={{ marginBottom: 8 }}>Se vor șterge toate rundele, meciurile și scorurile.</div>
    </ConfirmModal>
  )

  // ---- Admin login ----
  if (view === 'al') return (
    <div className="pg" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 60 }}>
      <div className="card" style={{ width: '100%', maxWidth: 300 }}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>🔐</div>
          <div style={{ fontWeight: 500 }}>Admin</div>
          <div className="mu" style={{ marginTop: 4 }}>Introdu PIN-ul de admin</div>
        </div>
        <input
          className="inp"
          type="password"
          value={pin}
          onInput={e => { setPin(e.target.value); setPinErr(false) }}
          onKeyDown={e => { if (e.key === 'Enter') { if (pin === PIN) { setPin(''); go('a') } else setPinErr(true) } }}
          style={{ textAlign: 'center', letterSpacing: 8, fontSize: 22, marginBottom: 8 }}
          placeholder="••••"
        />
        {pinErr && <div className="er" style={{ textAlign: 'center', marginBottom: 8 }}>PIN incorect</div>}
        <button className="btn ac" style={{ width: '100%', justifyContent: 'center' }}
          onClick={() => { if (pin === PIN) { setPin(''); go('a') } else setPinErr(true) }}>
          Intră
        </button>
        <button className="btn" style={{ width: '100%', justifyContent: 'center', marginTop: 8, border: 'none' }}
          onClick={() => setView('home')}>
          Anulează
        </button>
      </div>
    </div>
  )

  // ---- Admin panel ----
  if (view === 'a') return (
    <div className="pg">
      <div className="row" style={{ marginBottom: 16, paddingTop: 4 }}>
        <BackBtn onClick={() => setView('home')} />
        <span style={{ fontWeight: 500, fontSize: 15, flex: 1 }}>Admin</span>
        <Badge bg="var(--acl)" c="var(--act)">PIN: {PIN}</Badge>
      </div>

      <div style={{ fontWeight: 500, marginBottom: 8 }}>Jucători ({players.length})</div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input className="inp" placeholder="Nume jucător nou..." value={newPlayer}
            onInput={e => setNewPlayer(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addPlayer()} />
          <button className="btn ac sm" onClick={addPlayer} style={{ flexShrink: 0 }}>Adaugă</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {players.length === 0 && <div className="mu" style={{ textAlign: 'center', padding: 12 }}>Niciun jucător adăugat</div>}
          {players.map(p => {
            const inT = tournaments.some(t => t.pids.includes(p.id))
            return (
              <div key={p.id} className="row" style={{ padding: '6px 8px', borderRadius: 8, background: 'var(--color-background-secondary)' }}>
                <div className="av">{p.name[0]}</div>
                <span style={{ fontSize: 14, flex: 1 }}>{p.name}</span>
                {inT && <Badge bg="var(--acl)" c="var(--act)">{tournaments.filter(t => t.pids.includes(p.id)).length} turnee</Badge>}
                <button className="del" onClick={() => setDelPlayerConf({ id: p.id, warn: inT })}>✕</button>
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ fontWeight: 500, marginBottom: 8 }}>Turnee ({tournaments.length})</div>
      <div className="card">
        {tournaments.length === 0 && <div className="mu" style={{ textAlign: 'center', padding: 12 }}>Niciun turneu creat</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[...tournaments].reverse().map(tr => (
            <div key={tr.id} className="row" style={{ padding: 8, borderRadius: 8, background: 'var(--color-background-secondary)' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{tr.name}</div>
                <div className="mu" style={{ fontSize: 12 }}>{tr.pids.length} jucători · {rounds.filter(r => r.tid === tr.id).length} runde</div>
              </div>
              {tr.closed
                ? <Badge bg="var(--color-background-tertiary)" c="var(--color-text-secondary)">încheiat</Badge>
                : <Badge bg="var(--acl)" c="var(--act)">activ</Badge>}
              <button className="del" onClick={() => setDelTourneyConf(tr.id)}>✕</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  // ---- Create tournament ----
  if (view === 'c') {
    const nM = selectedPlayers.length * (selectedPlayers.length - 1) / 2
    return (
      <div className="pg">
        <div className="row" style={{ marginBottom: 16, paddingTop: 4 }}>
          <BackBtn onClick={() => setView('home')} />
          <span style={{ fontWeight: 500, fontSize: 15 }}>Turneu nou</span>
        </div>
        <div className="card">
          <div className="mu" style={{ marginBottom: 5 }}>Numele turneului</div>
          <input className="inp" value={tourneyName} onInput={e => setTourneyName(e.target.value)} style={{ marginBottom: 16 }} />
          <div className="mu" style={{ marginBottom: 8 }}>Selectează jucătorii ({selectedPlayers.length} selectați)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 16 }}>
            {players.map(p => {
              const on = selectedPlayers.includes(p.id)
              return (
                <button key={p.id} className="btn"
                  style={{ justifyContent: 'flex-start', gap: 10, ...(on ? { borderColor: 'var(--ac)', background: 'var(--acl)', color: 'var(--act)' } : {}) }}
                  onClick={() => setSelectedPlayers(prev => on ? prev.filter(x => x !== p.id) : [...prev, p.id])}>
                  <div style={{
                    width: 16, height: 16, borderRadius: '50%',
                    border: `1.5px solid ${on ? 'var(--ac)' : 'var(--color-border-secondary)'}`,
                    background: on ? 'var(--ac)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: 9
                  }}>{on ? '✓' : ''}</div>
                  {p.name}
                </button>
              )
            })}
          </div>
          {selectedPlayers.length >= 2 && (
            <div className="mu" style={{ marginBottom: 10 }}>
              Runda 1 va genera <span style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{nM}</span> meciuri (toți cu toți).
            </div>
          )}
          <button className="btn ac" style={{ width: '100%', justifyContent: 'center' }}
            disabled={!tourneyName.trim() || selectedPlayers.length < 2}
            onClick={createTourney}>
            Creează turneul + Runda 1
          </button>
        </div>
      </div>
    )
  }

  // ---- Global stats ----
  if (view === 'g') return (
    <div className="pg">
      <div className="row" style={{ marginBottom: 16, paddingTop: 4 }}>
        <BackBtn onClick={() => setView('home')} />
        <span style={{ fontWeight: 500, fontSize: 15 }}>Statistici globale</span>
      </div>
      {globalStats.every(s => s.n === 0)
        ? <div className="card mu" style={{ textAlign: 'center', padding: 24 }}>Niciun meci jucat încă</div>
        : <StandingsTable rows={globalStats} />}
    </div>
  )

  // ---- Tournament view ----
  if (view === 't' && t) {
    const isClosed = t.closed
    const totalPlayed = tMatches.filter(m => m.st === 'a').length
    const totalMs = tMatches.filter(m => m.st !== 'x').length
    
    // Info runda curentă
    const currentRound = tRounds[0]
    const currentRoundMatches = currentRound ? matches.filter(m => m.rid === currentRound.id && m.st !== 'x') : []
    const currentRoundPlayed = currentRoundMatches.filter(m => m.st === 'a').length

    return (
      <div className="pg" style={{ paddingTop: 140 }}>
        <div style={{ position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)', background: 'var(--color-background-tertiary)', zIndex: 10, width: 560, paddingLeft: 16, paddingRight: 16, boxSizing: 'border-box', maxWidth: 'calc(100vw - 32px)' }}>
          <div className="row" style={{ marginBottom: 2, paddingTop: 8, justifyContent: 'space-between' }}>
            <BackBtn onClick={() => setView('home')} />
            <span style={{ fontWeight: 500, fontSize: 13, textAlign: 'center', flex: 1 }}>{t.name}</span>
            {!isClosed && (
              <button className="btn sm" style={{ color: 'var(--danger)', borderColor: 'var(--danger)', flexShrink: 0 }} onClick={tryClose}>
                🏁 Închide
              </button>
            )}
          </div>
          <div className="prog" style={{ marginBottom: 10 }}>
            <div className="pf" style={{ width: `${currentRoundMatches.length ? Math.round(currentRoundPlayed / currentRoundMatches.length * 100) : 0}%` }} />
          </div>

          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            {[['r', 'Meciuri'], ['s', 'Clasament']].map(([k, lb]) => (
              <button key={k} className={`tab${tab === k ? ' on' : ''}`} onClick={() => setTab(k)}>{lb}</button>
            ))}
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, paddingBottom: 8, borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
            <span style={{ fontWeight: 500, fontSize: 13 }}>Runda {currentRound?.num}</span>
            <span className="mu" style={{ fontSize: 12 }}>{currentRoundPlayed}/{currentRoundMatches.length} meciuri</span>
          </div>
        </div>

        {tab === 'r' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {tRounds.map(r => {
              const rms = matches.filter(m => m.rid === r.id && m.st !== 'x')
              const rp = rms.filter(m => m.st === 'a').length
              const done = rms.length > 0 && rms.every(m => m.st === 'a')
              
              // Grupez meciurile după slot
              const slotGroups = {}
              rms.forEach(m => {
                const slot = m.slot !== undefined ? m.slot : 0
                if (!slotGroups[slot]) slotGroups[slot] = []
                slotGroups[slot].push(m)
              })
              
              return (
                <div key={r.id}>
                  {r.id !== currentRound?.id && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ fontWeight: 500, fontSize: 14 }}>Runda {r.num}</span>
                      {done
                        ? <Badge bg="var(--acl)" c="var(--act)">✓ completă</Badge>
                        : <span className="mu" style={{ fontSize: 12 }}>{rp}/{rms.length} meciuri</span>}
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {Object.keys(slotGroups).map((slot, idx) => (
                      <div key={slot}>
                        {idx > 0 && <div style={{ height: '1px', background: 'var(--color-border-tertiary)', margin: '8px 0', opacity: 0.6 }} />}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {slotGroups[slot].map(m => (
                            <MatchCard key={m.id} m={m} getPlayer={getPlayer} isClosed={isClosed} onSave={saveScore} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
            {!isClosed && (
              <div style={{ paddingTop: 4 }}>
                {lastRoundDone
                  ? <button className="btn ac" style={{ width: '100%', justifyContent: 'center' }} onClick={addRound}>+ Rundă nouă</button>
                  : <button className="btn" style={{ width: '100%', justifyContent: 'center', opacity: 0.4, cursor: 'default' }} disabled>
                      + Rundă nouă (completează runda curentă mai întâi)
                    </button>}
              </div>
            )}
          </div>
        ) : (
          tourneyStandings.every(s => s.n === 0)
            ? <div className="card mu" style={{ textAlign: 'center', padding: 20 }}>Niciun meci jucat încă</div>
            : <StandingsTable rows={tourneyStandings} />
        )}
      </div>
    )
  }

  // ---- Home ----
  return (
    <div className="pg">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 19, fontWeight: 500 }}>🏓 Ping pong</div>
          <div className="mu">Clasamentul grupului</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn sm" onClick={() => setView('g')}>📈 Stats</button>
          <button className="btn sm" onClick={() => { setView('al'); setPin(''); setPinErr(false) }}>🔐 Admin</button>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontWeight: 500 }}>Turnee</span>
        <button className="btn ac sm" onClick={openCreate}>+ turneu nou</button>
      </div>

      {tournaments.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 20px' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🏆</div>
          <div className="mu" style={{ marginBottom: 16 }}>Niciun turneu creat încă</div>
          <button className="btn ac" onClick={openCreate}>Creează primul turneu</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[...tournaments].reverse().map(tr => {
            const tms = matches.filter(m => m.tid === tr.id)
            const ap = tms.filter(m => m.st === 'a').length
            const tot = tms.filter(m => m.st !== 'x').length
            const nr = rounds.filter(r => r.tid === tr.id).length
            return (
              <div key={tr.id} className="card hov" onClick={() => go('t', { tid: tr.id, tab: 'r' })}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div className="row" style={{ gap: 8 }}>
                    <span style={{ fontWeight: 500 }}>{tr.name}</span>
                    {tr.closed
                      ? <Badge bg="var(--color-background-secondary)" c="var(--color-text-secondary)">🏁 încheiat</Badge>
                      : <Badge bg="var(--acl)" c="var(--act)">activ</Badge>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="mu">{tr.pids.length} jucători · {nr} runde · {ap}/{tot} meciuri</span>
                  <div className="prog" style={{ flex: 1, maxWidth: 70 }}>
                    <div className="pf" style={{ width: `${tot ? Math.round(ap / tot * 100) : 0}%` }} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
