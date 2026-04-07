import React, { useState, useMemo, useEffect, useRef } from 'react'
import { PIN, INIT_PLAYERS, Badge, BackBtn, Medal, StandingsTable, ConfirmModal } from './components.jsx'
import MatchCard from './MatchCard.jsx'
import { gid, autoName, mkRound, sortStandingsGlobal, calcStandings, unequalWarn } from './utils.js'
import { loadPlayers, loadTournaments, loadRounds, loadMatches, savePlayers, saveAll, clearAllData } from './supabase.js'

export default function App() {
  const [players, setPlayers] = useState(INIT_PLAYERS)
  const [tournaments, setTournaments] = useState([])
  const [rounds, setRounds] = useState([])
  const [matches, setMatches] = useState([])

  const loaded = useRef(false)
  const [loading, setLoading] = useState(true)

  const [view, setView] = useState('home') // home | c | t | g | a | al | p
  const [tid, setTid] = useState(null)
  const [tab, setTab] = useState('r') // r | s
  const [pid, setPid] = useState(null)

  const [pin, setPin] = useState('')
  const [pinErr, setPinErr] = useState(false)
  const [tourneyName, setTourneyName] = useState('')
  const [selectedPlayers, setSelectedPlayers] = useState([])
  const [numTables, setNumTables] = useState(1)
  const [newPlayer, setNewPlayer] = useState('')

  const [delPlayerConf, setDelPlayerConf] = useState(null)
  const [delTourneyConf, setDelTourneyConf] = useState(null)
  const [closeConf, setCloseConf] = useState(null)
  const [switchTourneyConf, setSwitchTourneyConf] = useState(null)
  const [cancelTourneyConf, setCancelTourneyConf] = useState(false)
  const [openMatchId, setOpenMatchId] = useState(null)
  const [restoreConf, setRestoreConf] = useState(null)
  const [clearAllConf, setClearAllConf] = useState(0) // 0=off, 1=step1, 2=step2
  const [clearAllInput, setClearAllInput] = useState('')
  const fileInputRef = useRef(null)
  const [syncStatus, setSyncStatus] = useState('ok') // 'ok' | 'saving' | 'error'

  const t = tournaments.find(x => x.id === tid)
  const hasActiveTournament = tournaments.some(t => !t.closed)
  const tRounds = rounds.filter(r => r.tid === tid).sort((a, b) => a.num - b.num)
  const tMatches = matches.filter(m => m.tid === tid)
  const getPlayer = id => players.find(p => p.id === id)

  function go(v, opts = {}) {
    // Previne deschiderea unui alt turneu daca este deja un turneu deschis
    if (v === 't' && opts.tid && tid && tid !== opts.tid && !t?.closed) {
      setSwitchTourneyConf({ newTid: opts.tid, newTab: opts.tab })
      return
    }
    setView(v)
    if (opts.tid != null) setTid(opts.tid)
    if (opts.tab != null) setTab(opts.tab)
  }

  // Load data from Supabase on mount
  useEffect(() => {
    async function loadData() {
      const [p, t, r, m] = await Promise.all([
        loadPlayers(),
        loadTournaments(),
        loadRounds(),
        loadMatches()
      ])
      if (p.length > 0) setPlayers(p)
      if (t.length > 0) setTournaments(t)
      if (r.length > 0) setRounds(r)
      if (m.length > 0) setMatches(m)
      await new Promise(resolve => setTimeout(resolve, 0))
      loaded.current = true
      setLoading(false)
    }
    loadData()
  }, [])

  // Resetează tab la 'r' dacă turneul nu e încheiat și tab-ul e 's'
  useEffect(() => {
    if (view === 't' && t && !t.closed && tab === 's') setTab('r')
  }, [view, tid, tab])

  // Auto-save to Supabase (only after initial load)
  useEffect(() => {
    if (!loaded.current) return
    setSyncStatus('saving')
    savePlayers(players).then(ok => setSyncStatus(ok ? 'ok' : 'error'))
  }, [players])

  // Salvează tournaments → rounds → matches în ordine (FK constraints)
  useEffect(() => {
    if (!loaded.current) return
    setSyncStatus('saving')
    saveAll(tournaments, rounds, matches).then(ok => setSyncStatus(ok ? 'ok' : 'error'))
  }, [tournaments, rounds, matches])

  // ---- Tournament creation ----
  function openCreate() {
    setTourneyName(autoName(tournaments))
    setSelectedPlayers([])
    setNumTables(1)
    setView('c')
  }

  function createTourney() {
    if (!tourneyName.trim() || selectedPlayers.length < 2 || numTables < 1) return
    const tid2 = gid()
    const { round, ms } = mkRound(selectedPlayers, tid2, 1, numTables)
    setTournaments(p => [...p, {
      id: tid2,
      name: tourneyName.trim(),
      pids: [...selectedPlayers],
      tables: numTables,
      date: new Date().toLocaleDateString('ro-RO'),
      closed: false
    }])
    setRounds(p => [...p, round])
    setMatches(p => [...p, ...ms])
    go('t', { tid: tid2, tab: 'r' })
  }

  function addRound() {
    if (!t || t.closed) return
    const { round, ms } = mkRound(t.pids, tid, tRounds.length + 1, t.tables)
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
    setTid(null)
    setView('home')
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

  function tryCancelTourney() {
    const hasPlayed = tMatches.some(m => m.st === 'a')
    if (hasPlayed) {
      setCancelTourneyConf(true)
    } else {
      deleteTourney(tid)
    }
  }

  function deleteTourney(id) {
    setTournaments(p => p.filter(t => t.id !== id))
    setMatches(p => p.filter(m => m.tid !== id))
    setRounds(p => p.filter(r => r.tid !== id))
    setTid(null)
    setCancelTourneyConf(false)
    setView('home')
  }

  // ---- Backup / Restore ----
  function exportBackup() {
    const data = { players, tournaments, rounds, matches, exportedAt: new Date().toISOString() }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pingpong-backup-${new Date().toLocaleDateString('ro-RO').replace(/\./g, '-')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleRestoreFile(e) {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result)
        if (!Array.isArray(data.players) || !Array.isArray(data.tournaments) ||
            !Array.isArray(data.rounds) || !Array.isArray(data.matches)) {
          alert('Fișier invalid: lipsesc date.')
          return
        }
        setRestoreConf(data)
      } catch {
        alert('Eroare la citirea fișierului JSON.')
      }
    }
    reader.readAsText(file)
  }

  function confirmRestore() {
    if (!restoreConf) return
    setPlayers(restoreConf.players)
    setTournaments(restoreConf.tournaments)
    setRounds(restoreConf.rounds)
    setMatches(restoreConf.matches)
    setRestoreConf(null)
    setView('home')
  }

  // ---- Sync indicator ----
  const syncDot = (
    <div style={{
      position: 'fixed', bottom: 16, right: 16, zIndex: 200,
      display: 'flex', alignItems: 'center', gap: 6,
      background: 'var(--card, #fff)', border: '1px solid var(--border)',
      borderRadius: 999, padding: '5px 10px', fontSize: 13,
      boxShadow: '0 1px 6px rgba(0,0,0,0.08)',
      color: syncStatus === 'error' ? 'var(--danger)' : syncStatus === 'saving' ? '#f59e0b' : 'var(--text2)',
      pointerEvents: 'none',
    }}>
      <span style={{
        width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
        background: syncStatus === 'error' ? 'var(--danger)' : syncStatus === 'saving' ? '#f59e0b' : 'var(--green)',
      }} />
      {syncStatus === 'saving' ? 'Se salvează...' : syncStatus === 'error' ? 'Eroare sync' : 'Sincronizat'}
    </div>
  )

  // ---- Computed stats ----
  const globalStats = useMemo(() => {
    const s = {}
    const h2h = {}
    players.forEach(p => s[p.id] = { ...p, w: 0, l: 0, pf: 0, pa: 0, n: 0, tr: 0 })
    matches.filter(m => m.st === 'a').forEach(m => {
      const [a, b] = m.score
      if (!s[m.p1] || !s[m.p2]) return
      s[m.p1].n++; s[m.p2].n++
      s[m.p1].pf += a; s[m.p1].pa += b
      s[m.p2].pf += b; s[m.p2].pa += a
      if (!h2h[m.p1]) h2h[m.p1] = {}
      if (!h2h[m.p2]) h2h[m.p2] = {}
      if (a > b) { h2h[m.p1][m.p2] = (h2h[m.p1][m.p2] || 0) + 1; s[m.p1].w++; s[m.p2].l++ }
      else { h2h[m.p2][m.p1] = (h2h[m.p2][m.p1] || 0) + 1; s[m.p2].w++; s[m.p1].l++ }
    })
    tournaments.forEach(t => t.pids.forEach(id => { if (s[id]) s[id].tr++ }))
    return sortStandingsGlobal(Object.values(s), h2h)
  }, [matches, players, tournaments])

  const tourneyStandings = useMemo(
    () => t ? calcStandings(tMatches, t.pids, players) : [],
    [tMatches, t, players]
  )

  const lastRound = tRounds[tRounds.length - 1]
  const lastRoundMs = lastRound ? matches.filter(m => m.rid === lastRound.id) : []
  const lastRoundDone = lastRoundMs.length > 0 && lastRoundMs.every(m => m.st === 'a' || m.st === 'x')

  // ---- Modals ----
  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 16 }}>
      <div style={{ fontSize: 48 }}>🏓</div>
      <div style={{ fontSize: 17, color: 'var(--text2)', fontWeight: 500 }}>Se încarcă...</div>
    </div>
  )

  if (switchTourneyConf) return (
    <div className="pg" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 60 }}>
      <div className="card" style={{ width: '100%', maxWidth: 340 }}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>⚠️</div>
          <div style={{ fontWeight: 500, marginBottom: 10 }}>
            Un turneu este deja deschis.
          </div>
          <div className="mu" style={{ marginBottom: 10 }}>Trebuie să te întorci la ecranul principal pentru a deschide alt turneu.</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setSwitchTourneyConf(null)}>Anulează</button>
          <button className="btn ac" style={{ flex: 1, justifyContent: 'center' }} onClick={() => {
            setSwitchTourneyConf(null)
            setView('home')
            setTid(null)
            setTimeout(() => {
              setView('t')
              setTid(switchTourneyConf.newTid)
              if (switchTourneyConf.newTab) setTab(switchTourneyConf.newTab)
            }, 0)
          }}>OK</button>
        </div>
      </div>
    </div>
  )

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
                  <div key={id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 22 }}>
                    <span>{p?.name}</span>
                    <span style={{ fontWeight: 500, color: isLow ? 'var(--danger)' : 'var(--color-text-primary)' }}>{n} meciuri</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="mu" style={{ marginBottom: 10 }}>Toți jucătorii au același număr de meciuri.</div>
          )}
          <div className="mu" style={{ fontSize: 22 }}>Meciurile rămase vor fi anulate.</div>
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
        ? <div style={{ background: 'var(--dangerl)', color: 'var(--danger)', borderRadius: 8, padding: 10, fontSize: 22, textAlign: 'left', marginBottom: 8 }}>Participă în turnee existente. Se vor șterge și meciurile lui.</div>
        : <div className="mu" style={{ marginBottom: 8 }}>Această acțiune nu poate fi anulată.</div>}
    </ConfirmModal>
  )

  if (cancelTourneyConf) return (
    <ConfirmModal
      danger
      confirmLabel="Șterge turneul"
      onConfirm={() => deleteTourney(tid)}
      onCancel={() => setCancelTourneyConf(false)}
    >
      <div style={{ fontSize: 36, marginBottom: 10 }}>⚠️</div>
      <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 10 }}>
        Turneul este în curs!
      </div>
      <div className="mu" style={{ marginBottom: 8 }}>
        Există meciuri deja jucate. Dacă ștergi turneul, se pierd toate scorurile înregistrate.
      </div>
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

  if (restoreConf) return (
    <ConfirmModal
      danger
      confirmLabel="Restaurează"
      onConfirm={confirmRestore}
      onCancel={() => setRestoreConf(null)}
    >
      <div style={{ fontSize: 28, marginBottom: 8 }}>📂</div>
      <div style={{ fontWeight: 600, marginBottom: 10 }}>Restaurezi backup-ul?</div>
      <div style={{ background: 'var(--dangerl)', color: 'var(--danger)', borderRadius: 8, padding: '8px 12px', fontSize: 14, textAlign: 'left', marginBottom: 8 }}>
        Datele curente vor fi înlocuite complet.
      </div>
      <div className="mu" style={{ fontSize: 14, textAlign: 'left' }}>
        Backup conține: {restoreConf.players.length} jucători · {restoreConf.tournaments.length} turnee · {restoreConf.matches.length} meciuri
        {restoreConf.exportedAt && <><br />Exportat la: {new Date(restoreConf.exportedAt).toLocaleString('ro-RO')}</>}
      </div>
    </ConfirmModal>
  )

  // ---- Admin login ----
  if (view === 'al') return (
    <div className="pg" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 80 }}>
      <div className="card" style={{ width: '100%', maxWidth: 320 }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 48, marginBottom: 10 }}>🔐</div>
          <div style={{ fontWeight: 700, fontSize: 22 }}>Admin</div>
          <div className="mu" style={{ marginTop: 6, fontSize: 16 }}>Introdu PIN-ul de admin</div>
        </div>
        <input
          className="inp"
          type="password"
          value={pin}
          onInput={e => { setPin(e.target.value); setPinErr(false) }}
          onKeyDown={e => { if (e.key === 'Enter') { if (pin === PIN) { setPin(''); go('a') } else setPinErr(true) } }}
          style={{ textAlign: 'center', letterSpacing: 10, fontSize: 28, marginBottom: 10 }}
          placeholder="••••"
          onFocus={e => e.target.placeholder = ''}
          onBlur={e => e.target.placeholder = '••••'}
        />
        {pinErr && <div className="er" style={{ textAlign: 'center', marginBottom: 10, fontSize: 16 }}>PIN incorect</div>}
        <button className="btn ac" style={{ width: '100%', justifyContent: 'center', fontSize: 18 }}
          onClick={() => { if (pin === PIN) { setPin(''); go('a') } else setPinErr(true) }}>
          Intră
        </button>
        <button className="btn" style={{ width: '100%', justifyContent: 'center', marginTop: 10, border: 'none', boxShadow: 'none' }}
          onClick={() => setView('home')}>
          Anulează
        </button>
      </div>
    </div>
  )

  // ---- Admin panel ----
  if (view === 'a') return (
    <div className="pg">{syncDot}
      <div className="row" style={{ marginBottom: 20, paddingTop: 4 }}>
        <BackBtn onClick={() => setView('home')} />
        <span style={{ fontWeight: 700, fontSize: 24, flex: 1 }}>Admin</span>
      </div>

      <div className="sec-hd">
        <span className="sec-hd-title">Jucători ({players.length})</span>
      </div>
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <input className="inp" placeholder="Nume jucător nou..." value={newPlayer}
            onInput={e => setNewPlayer(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addPlayer()} />
          <button className="btn ac sm" onClick={addPlayer} style={{ flexShrink: 0 }}>Adaugă</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {players.length === 0 && <div className="mu" style={{ textAlign: 'center', padding: 16 }}>Niciun jucător adăugat</div>}
          {players.map(p => {
            const inT = tournaments.some(t => t.pids.includes(p.id))
            return (
              <div key={p.id} className="row" style={{ padding: '10px 12px', borderRadius: 14, background: 'var(--muted)' }}>
                <div className="av">{p.name[0]}</div>
                <span style={{ fontSize: 18, fontWeight: 500, flex: 1 }}>{p.name}</span>
                {inT && <Badge bg="var(--greenl)" c="var(--greend)">{tournaments.filter(t => t.pids.includes(p.id)).length} turnee</Badge>}
                <button className="del" onClick={() => setDelPlayerConf({ id: p.id, warn: inT })}>✕</button>
              </div>
            )
          })}
        </div>
      </div>

      <div className="sec-hd">
        <span className="sec-hd-title">Turnee ({tournaments.length})</span>
      </div>
      <div className="card" style={{ marginBottom: 20 }}>
        {tournaments.length === 0 && <div className="mu" style={{ textAlign: 'center', padding: 16 }}>Niciun turneu creat</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[...tournaments].sort((a, b) => { const p = d => { const [dd,mm,yy] = d.split('.'); return new Date(yy, mm-1, dd) }; return p(b.date) - p(a.date) }).map(tr => (
            <div key={tr.id} className="row" style={{ padding: '10px 12px', borderRadius: 14, background: 'var(--muted)' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 2 }}>{tr.name}</div>
                <div className="mu">{tr.pids.length} jucători · {rounds.filter(r => r.tid === tr.id).length} runde</div>
              </div>
              {tr.closed
                ? <Badge bg="var(--bg)" c="var(--text2)">încheiat</Badge>
                : <Badge bg="var(--greenl)" c="var(--greend)">activ</Badge>}
              <button className="del" onClick={() => setDelTourneyConf(tr.id)}>✕</button>
            </div>
          ))}
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleRestoreFile} />

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 12 }}>💾 Backup date</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" style={{ flex: 1, justifyContent: 'center' }} onClick={exportBackup}>
            ⬇️ Exportă backup
          </button>
          <button className="btn" style={{ flex: 1, justifyContent: 'center' }} onClick={() => fileInputRef.current?.click()}>
            ⬆️ Restaurează
          </button>
        </div>
      </div>

      <div className="card" style={{ background: 'var(--redl)', border: '1.5px solid var(--red)' }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--red)', marginBottom: 12 }}>⚠️ Zonă periculoasă</div>

        {clearAllConf === 0 && (
          <button className="btn" style={{ width: '100%', justifyContent: 'center', color: 'var(--red)', borderColor: 'var(--red)', background: '#fff' }}
            onClick={() => setClearAllConf(1)}>
            🗑️ Șterge TOTUL
          </button>
        )}

        {clearAllConf === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 14, color: 'var(--red)', fontWeight: 600, textAlign: 'center' }}>
              Ești sigur? Se vor șterge <strong>toate turneele, rundele, meciurile și scorurile</strong>. Acțiunea este ireversibilă.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setClearAllConf(0)}>Anulează</button>
              <button className="btn" style={{ flex: 1, justifyContent: 'center', color: 'var(--red)', borderColor: 'var(--red)', background: '#fff', fontWeight: 700 }}
                onClick={() => { setClearAllConf(2); setClearAllInput('') }}>
                Da, continuă
              </button>
            </div>
          </div>
        )}

        {clearAllConf === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 14, color: 'var(--red)', fontWeight: 600, textAlign: 'center' }}>
              Scrie <strong>STERGE</strong> pentru a confirma:
            </div>
            <input
              className="inp"
              placeholder="STERGE"
              value={clearAllInput}
              onInput={e => setClearAllInput(e.target.value)}
              style={{ borderColor: 'var(--red)', textAlign: 'center', fontWeight: 700 }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn" style={{ flex: 1, justifyContent: 'center' }} onClick={() => { setClearAllConf(0); setClearAllInput('') }}>Anulează</button>
              <button
                className="btn"
                disabled={clearAllInput !== 'STERGE'}
                style={{ flex: 1, justifyContent: 'center', color: '#fff', borderColor: 'var(--red)', background: clearAllInput === 'STERGE' ? 'var(--red)' : 'var(--muted)', fontWeight: 700, cursor: clearAllInput === 'STERGE' ? 'pointer' : 'not-allowed' }}
                onClick={async () => {
                  await clearAllData()
                  setPlayers(INIT_PLAYERS)
                  setTournaments([])
                  setRounds([])
                  setMatches([])
                  setClearAllConf(0)
                  setClearAllInput('')
                  setView('home')
                }}>
                Șterge definitiv
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  // ---- Create tournament ----
  if (view === 'c') {
    const nM = selectedPlayers.length * (selectedPlayers.length - 1) / 2
    return (
      <div className="pg">
        <div className="row" style={{ marginBottom: 20, paddingTop: 4 }}>
          <BackBtn onClick={() => setView('home')} />
          <span style={{ fontWeight: 700, fontSize: 24 }}>Turneu nou</span>
        </div>
        <div className="card">
          <div className="mu" style={{ marginBottom: 5 }}>Numele turneului</div>
          <input className="inp" value={tourneyName} onInput={e => setTourneyName(e.target.value)} style={{ marginBottom: 16 }} />
          
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <div className="mu" style={{ marginBottom: 5 }}>Numărul de mese</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button type="button" className="btn sm" style={{ minWidth: 48, fontSize: 22, padding: '0 16px' }}
                  onClick={() => setNumTables(n => Math.max(1, n - 1))}>−</button>
                <span style={{ fontSize: 26, fontWeight: 700, minWidth: 32, textAlign: 'center' }}>{numTables}</span>
                <button type="button" className="btn sm" style={{ minWidth: 48, fontSize: 22, padding: '0 16px' }}
                  onClick={() => setNumTables(n => n + 1)}>+</button>
              </div>
            </div>
          </div>
          
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

  // ---- Player profile ----
  if (view === 'p' && pid) {
    const player = players.find(p => p.id === pid)
    const gs = globalStats.find(s => s.id === pid) || { w: 0, l: 0, pf: 0, pa: 0, n: 0 }
    const pct = gs.n > 0 ? Math.round(gs.w / gs.n * 100) : 0

    // Față în față vs fiecare adversar
    const h2hStats = {}
    matches.filter(m => m.st === 'a' && (m.p1 === pid || m.p2 === pid)).forEach(m => {
      const [a, b] = m.score
      const oppId = m.p1 === pid ? m.p2 : m.p1
      const myScore = m.p1 === pid ? a : b
      const oppScore = m.p1 === pid ? b : a
      if (!h2hStats[oppId]) h2hStats[oppId] = { w: 0, l: 0, pf: 0, pa: 0 }
      h2hStats[oppId].pf += myScore
      h2hStats[oppId].pa += oppScore
      if (myScore > oppScore) h2hStats[oppId].w++
      else h2hStats[oppId].l++
    })

    // Istoric turnee
    const myTournaments = tournaments
      .filter(t => t.pids.includes(pid))
      .map(t => {
        const tms = matches.filter(m => m.tid === t.id && m.st === 'a')
        const standings = calcStandings(tms, t.pids, players)
        const rank = standings.findIndex(s => s.id === pid) + 1
        const myRow = standings.find(s => s.id === pid) || { w: 0, l: 0 }
        return { ...t, rank, w: myRow.w, l: myRow.l }
      })
      .sort((a, b) => {
        const p = d => { const [dd, mm, yy] = d.split('.'); return new Date(yy, mm - 1, dd) }
        return p(b.date) - p(a.date)
      })

    const bestTourney = myTournaments.filter(t => t.rank === 1)

    return (
      <div className="pg">{syncDot}
        <div className="row" style={{ marginBottom: 20, paddingTop: 4 }}>
          <BackBtn onClick={() => setView('home')} />
          <span style={{ fontWeight: 700, fontSize: 22, flex: 1 }}>{player?.name}</span>
        </div>

        {/* Sumar general */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 14 }}>Sumar general</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
            <div style={{ textAlign: 'center', background: 'var(--muted)', borderRadius: 12, padding: '12px 8px' }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--ac)' }}>{gs.w}</div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>Victorii</div>
            </div>
            <div style={{ textAlign: 'center', background: 'var(--muted)', borderRadius: 12, padding: '12px 8px' }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--danger)' }}>{gs.l}</div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>Înfrângeri</div>
            </div>
            <div style={{ textAlign: 'center', background: 'var(--muted)', borderRadius: 12, padding: '12px 8px' }}>
              <div style={{ fontSize: 26, fontWeight: 800 }}>{pct}%</div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>% victorii</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{gs.n}</div>
              <div style={{ fontSize: 12, color: 'var(--text2)' }}>Meciuri</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{myTournaments.length}</div>
              <div style={{ fontSize: 12, color: 'var(--text2)' }}>Turnee</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ac)' }}>{gs.pf}</div>
              <div style={{ fontSize: 12, color: 'var(--text2)' }}>+Pct</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--danger)' }}>{gs.pa}</div>
              <div style={{ fontSize: 12, color: 'var(--text2)' }}>−Pct</div>
            </div>
          </div>
        </div>

        {/* Față în față */}
        {Object.keys(h2hStats).length > 0 && (
          <div className="card" style={{ marginBottom: 16, padding: '20px 16px' }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>Față în față</div>
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: '40%', textAlign: 'left' }}>Adversar</th>
                  <th>V</th>
                  <th>Î</th>
                  <th style={{ color: 'var(--text2)', fontWeight: 500 }}>+Pct</th>
                  <th style={{ color: 'var(--text2)', fontWeight: 500 }}>−Pct</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(h2hStats)
                  .sort((a, b) => b[1].w - a[1].w)
                  .map(([oppId, s]) => {
                    const opp = players.find(p => p.id === oppId)
                    return (
                      <tr key={oppId}>
                        <td style={{ textAlign: 'left' }}>{opp?.name ?? '(șters)'}</td>
                        <td style={{ fontWeight: 700, color: 'var(--ac)' }}>{s.w}</td>
                        <td style={{ fontWeight: 700, color: 'var(--danger)' }}>{s.l}</td>
                        <td style={{ color: 'var(--text2)' }}>{s.pf}</td>
                        <td style={{ color: 'var(--text2)' }}>{s.pa}</td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        )}

        {/* Recorduri */}
        {bestTourney.length > 0 && (
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>Recorduri</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--muted)', borderRadius: 12, padding: '12px 14px' }}>
              <span style={{ fontSize: 28 }}>🥇</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>Locul 1</div>
                <div style={{ fontSize: 13, color: 'var(--text2)' }}>
                  {bestTourney.map(t => t.name).join(', ')}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Istoric turnee */}
        {myTournaments.length > 0 && (
          <div className="card">
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>Istoric turnee</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {myTournaments.map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <Medal rank={t.rank} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{t.name}</div>
                    <div style={{ fontSize: 13, color: 'var(--text2)' }}>{t.w}V / {t.l}Î</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ---- Global stats ----
  if (view === 'g') {
    const allPlayed = matches.filter(m => m.st === 'a')
    const gH2h = {}
    allPlayed.forEach(m => {
      const [a, b] = m.score
      if (!gH2h[m.p1]) gH2h[m.p1] = {}
      if (!gH2h[m.p2]) gH2h[m.p2] = {}
      if (!gH2h[m.p1][m.p2]) gH2h[m.p1][m.p2] = { v: 0, pf: 0 }
      if (!gH2h[m.p2][m.p1]) gH2h[m.p2][m.p1] = { v: 0, pf: 0 }
      gH2h[m.p1][m.p2].pf += a
      gH2h[m.p2][m.p1].pf += b
      if (a > b) gH2h[m.p1][m.p2].v++
      else gH2h[m.p2][m.p1].v++
    })
    const ps = globalStats.filter(s => s.n > 0)
    return (
      <div className="pg">{syncDot}
        <div className="row" style={{ marginBottom: 20, paddingTop: 4 }}>
          <BackBtn onClick={() => setView('home')} />
          <span style={{ fontWeight: 700, fontSize: 24 }}>Statistici globale</span>
        </div>
        {globalStats.every(s => s.n === 0)
          ? <div className="card mu" style={{ textAlign: 'center', padding: 24 }}>Niciun meci jucat încă</div>
          : <>
            <StandingsTable rows={globalStats} onPlayerClick={id => { setPid(id); setView('p') }} />
            {ps.length > 1 && (
              <div className="card" style={{ marginTop: 16, padding: '20px 16px' }}>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>Față în față</div>
                <table className="tbl" style={{ tableLayout: 'fixed', width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '30%' }}>Jucător</th>
                      <th style={{ width: '30%' }}>Adversar</th>
                      <th style={{ width: '10%' }}>V</th>
                      <th style={{ width: '10%' }}>Î</th>
                      <th style={{ width: '10%', color: 'var(--text2)', fontWeight: 500, padding: '0 0 14px', textAlign: 'center' }}>+Pct</th>
                      <th style={{ width: '10%', color: 'var(--text2)', fontWeight: 500, padding: '0 0 14px', textAlign: 'center' }}>−Pct</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ps.flatMap((row, i) =>
                      ps.filter(col => col.id !== row.id).map((col, j) => {
                        const colRank = ps.findIndex(p => p.id === col.id)
                        const v = gH2h[row.id]?.[col.id]?.v ?? 0
                        const l = gH2h[col.id]?.[row.id]?.v ?? 0
                        const pf = gH2h[row.id]?.[col.id]?.pf ?? 0
                        const pa = gH2h[col.id]?.[row.id]?.pf ?? 0
                        return (
                          <tr key={`${row.id}-${col.id}`}>
                            <td style={j > 0 ? { borderTop: 'none', paddingTop: 0, paddingBottom: 0 } : (i > 0 ? { borderTop: '2px solid var(--border)' } : {})}>
                              {j === 0 && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <Medal rank={i + 1} />
                                  <span style={{ fontWeight: i === 0 ? 700 : 500, fontSize: 17 }}>{row.name}</span>
                                </div>
                              )}
                            </td>
                            <td style={i > 0 && j === 0 ? { borderTop: '2px solid var(--border)' } : {}}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Medal rank={colRank + 1} />
                                <span style={{ fontSize: 15 }}>{col.name}</span>
                              </div>
                            </td>
                            <td style={{ fontWeight: 700, color: 'var(--ac)', fontSize: 19, ...(i > 0 && j === 0 ? { borderTop: '2px solid var(--border)' } : {}) }}>{v}</td>
                            <td style={{ fontWeight: 700, color: 'var(--danger)', fontSize: 19, ...(i > 0 && j === 0 ? { borderTop: '2px solid var(--border)' } : {}) }}>{l}</td>
                            <td style={{ fontSize: 15, color: 'var(--text2)', ...(i > 0 && j === 0 ? { borderTop: '2px solid var(--border)' } : {}) }}>{pf}</td>
                            <td style={{ fontSize: 15, color: 'var(--text2)', ...(i > 0 && j === 0 ? { borderTop: '2px solid var(--border)' } : {}) }}>{pa}</td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        }
      </div>
    )
  }

  // ---- Tournament view ----
  if (view === 't' && t) {
    const isClosed = t.closed
    const totalPlayed = tMatches.filter(m => m.st === 'a').length
    const totalMs = tMatches.filter(m => m.st !== 'x').length
    
    // Info runda curentă = prima rundă cu meciuri neterminate, sau ultima rundă
    const currentRound = tRounds.find(r =>
      matches.some(m => m.rid === r.id && m.st === 's')
    ) || tRounds[tRounds.length - 1]
    const currentRoundMatches = currentRound ? matches.filter(m => m.rid === currentRound.id && m.st !== 'x') : []
    const currentRoundPlayed = currentRoundMatches.filter(m => m.st === 'a').length

    return (
      <div className="pg" style={{ paddingTop: 210 }}>{syncDot}
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, background: 'var(--greend)', zIndex: 10, boxShadow: '0 2px 12px rgba(0,0,0,0.18)' }}>
          <div style={{ maxWidth: 480, margin: '0 auto', padding: '12px 16px 0' }}>
            <div className="row" style={{ marginBottom: 10, justifyContent: 'space-between' }}>
              <BackBtn onClick={() => setView('home')} color="#fff" />
              <span style={{ fontWeight: 700, fontSize: 18, textAlign: 'center', flex: 1, color: '#fff' }}>{t.name}</span>
              <div style={{ minWidth: 48 }} />
            </div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              {(isClosed ? [['s', 'Clasament'], ['r', 'Meciuri']] : [['r', 'Meciuri'], ['s', 'Clasament']]).map(([k, lb]) => (
                <button key={k}
                  onClick={() => !isClosed && k === 's' ? null : setTab(k)}
                  disabled={k === 's' && !isClosed}
                  style={{
                    flex: 1, minHeight: 40, padding: '8px 12px',
                    borderRadius: 999, border: 'none',
                    background: tab === k ? '#fff' : 'rgba(255,255,255,0.18)',
                    color: tab === k ? 'var(--greend)' : (k === 's' && !isClosed ? 'rgba(255,255,255,0.4)' : '#fff'),
                    fontSize: 15, fontWeight: 600, cursor: k === 's' && !isClosed ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit',
                  }}
                >{lb}</button>
              ))}
            </div>
            <div style={{ background: 'rgba(0,0,0,0.15)', borderRadius: 10, padding: '10px 14px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
              {isClosed ? (<>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', marginBottom: 4 }}>Runde jucate</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{tRounds.length}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', marginBottom: 4 }}>Meciuri totale</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{totalPlayed}/{totalMs}</div>
                </div>
                <div style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>🏁</span>
                </div>
              </>) : (<>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', marginBottom: 4 }}>Runda curentă</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>Runda {currentRound?.num}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', marginBottom: 4 }}>Meciuri</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{currentRoundPlayed}/{currentRoundMatches.length}</div>
                </div>
                <div style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{currentRoundMatches.length ? Math.round(currentRoundPlayed / currentRoundMatches.length * 100) : 0}%</span>
                </div>
              </>)}
            </div>
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
                  {(r.id !== currentRound?.id || done) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <span style={{ fontWeight: 700, fontSize: 18 }}>Runda {r.num}</span>
                      {done
                        ? <Badge bg="var(--acl)" c="var(--act)">✓ completă</Badge>
                        : <span className="mu">{rp}/{rms.length} meciuri</span>}
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {Object.keys(slotGroups).map((slot, idx) => (
                      <div key={slot}>
                        {idx > 0 && t.tables > 1 && <div style={{ height: '1px', background: 'var(--color-border-tertiary)', margin: '8px 0', opacity: 0.6 }} />}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {slotGroups[slot].map(m => (
                            <MatchCard key={m.id} m={m} getPlayer={getPlayer} isClosed={isClosed} onSave={saveScore} openMatchId={openMatchId} setOpenMatchId={setOpenMatchId} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
            {!isClosed && (
              <div style={{ paddingTop: 4, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {lastRoundDone
                  ? <button className="btn ac" style={{ width: '100%', justifyContent: 'center' }} onClick={addRound}>+ Rundă nouă</button>
                  : <button className="btn" style={{ width: '100%', justifyContent: 'center', opacity: 0.4, cursor: 'default' }} disabled>
                      + Rundă nouă (completează runda curentă mai întâi)
                    </button>}
                <button className="btn" style={{ width: '100%', justifyContent: 'center', borderColor: 'var(--green)', color: 'var(--green)', fontWeight: 700 }} onClick={tryClose}>
                  🏁 Final de turneu
                </button>
                <div style={{ borderTop: '1px solid var(--border)', marginTop: 12, paddingTop: 16, textAlign: 'center' }}>
                  <button
                    className="btn sm"
                    style={{ color: 'var(--red)', borderColor: 'rgba(217,48,37,0.3)', fontSize: 13, minHeight: 36, padding: '6px 16px' }}
                    onClick={tryCancelTourney}
                  >
                    🗑️ Renunță la turneu
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (() => {
          if (tourneyStandings.every(s => s.n === 0))
            return <div className="card mu" style={{ textAlign: 'center', padding: 20 }}>Niciun meci jucat încă</div>
          const h2h = {}
          tMatches.filter(m => m.st === 'a').forEach(m => {
            const [a, b] = m.score
            if (!h2h[m.p1]) h2h[m.p1] = {}
            if (!h2h[m.p2]) h2h[m.p2] = {}
            if (!h2h[m.p1][m.p2]) h2h[m.p1][m.p2] = { v: 0, pf: 0 }
            if (!h2h[m.p2][m.p1]) h2h[m.p2][m.p1] = { v: 0, pf: 0 }
            h2h[m.p1][m.p2].pf += a
            h2h[m.p2][m.p1].pf += b
            if (a > b) h2h[m.p1][m.p2].v++
            else h2h[m.p2][m.p1].v++
          })
          const ps = tourneyStandings
          return (<>
            <StandingsTable rows={tourneyStandings} />
            {isClosed && ps.length > 1 && (
              <div className="card" style={{ marginTop: 16, padding: '20px 16px' }}>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>Față în față</div>
                <table className="tbl" style={{ tableLayout: 'fixed', width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '30%' }}>Jucător</th>
                      <th style={{ width: '30%' }}>Adversar</th>
                      <th style={{ width: '10%' }}>V</th>
                      <th style={{ width: '10%' }}>Î</th>
                      <th style={{ width: '10%', color: 'var(--text2)', fontWeight: 500, padding: '0 0 14px', textAlign: 'center' }}>+Pct</th>
                      <th style={{ width: '10%', color: 'var(--text2)', fontWeight: 500, padding: '0 0 14px', textAlign: 'center' }}>−Pct</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ps.flatMap((row, i) =>
                      ps.filter(col => col.id !== row.id).map((col, j) => {
                        const colRank = ps.findIndex(p => p.id === col.id)
                        const v = h2h[row.id]?.[col.id]?.v ?? 0
                        const l = h2h[col.id]?.[row.id]?.v ?? 0
                        const pf = h2h[row.id]?.[col.id]?.pf ?? 0
                        const pa = h2h[col.id]?.[row.id]?.pf ?? 0
                        return (
                          <tr key={`${row.id}-${col.id}`}>
                            <td style={j > 0 ? { borderTop: 'none', paddingTop: 0, paddingBottom: 0 } : (i > 0 ? { borderTop: '2px solid var(--border)' } : {})}>
                              {j === 0 && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <Medal rank={i + 1} />
                                  <span style={{ fontWeight: i === 0 ? 700 : 500, fontSize: 17 }}>{row.name}</span>
                                </div>
                              )}
                            </td>
                            <td style={i > 0 && j === 0 ? { borderTop: '2px solid var(--border)' } : {}}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Medal rank={colRank + 1} />
                                <span style={{ fontSize: 15 }}>{col.name}</span>
                              </div>
                            </td>
                            <td style={{ fontWeight: 700, color: 'var(--ac)', fontSize: 19, ...(i > 0 && j === 0 ? { borderTop: '2px solid var(--border)' } : {}) }}>{v}</td>
                            <td style={{ fontWeight: 700, color: 'var(--danger)', fontSize: 19, ...(i > 0 && j === 0 ? { borderTop: '2px solid var(--border)' } : {}) }}>{l}</td>
                            <td style={{ fontSize: 15, color: 'var(--text2)', ...(i > 0 && j === 0 ? { borderTop: '2px solid var(--border)' } : {}) }}>{pf}</td>
                            <td style={{ fontSize: 15, color: 'var(--text2)', ...(i > 0 && j === 0 ? { borderTop: '2px solid var(--border)' } : {}) }}>{pa}</td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          {(() => {
              const pw = tMatches.filter(m => m.st === 'a' && m.score && ((m.score[0] === 6 && m.score[1] === 0) || (m.score[0] === 0 && m.score[1] === 6)))
              if (!pw.length) return null
              return (
                <div className="card" style={{ marginTop: 16, padding: '20px 16px' }}>
                  <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>Praf și pulbere</div>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Câștigător</span>
                    <span style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', fontSize: 12, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>Scor</span>
                    <span style={{ marginLeft: 'auto', width: '20%', fontSize: 12, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Adversar</span>
                  </div>
                  {pw.map((m, i) => {
                    const winner = getPlayer(m.score[0] === 6 ? m.p1 : m.p2)
                    const loser = getPlayer(m.score[0] === 6 ? m.p2 : m.p1)
                    return (
                      <div key={m.id} style={{ position: 'relative', display: 'flex', alignItems: 'center', padding: '10px 0', borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                        <span style={{ fontWeight: 700, color: 'var(--ac)', fontSize: 16 }}>{winner?.name ?? '?'}</span>
                        <span style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', fontWeight: 700, fontSize: 16, color: 'var(--text2)', whiteSpace: 'nowrap' }}>6 – 0</span>
                        <span style={{ marginLeft: 'auto', width: '20%', fontSize: 15 }}>{loser?.name ?? '?'}</span>
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </>)
        })()}
      </div>
    )
  }

  // ---- Home ----
  return (
    <div className="pg">{syncDot}
      {/* Hero */}
      <div className="home-hero">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div className="home-hero-title" onClick={() => { setView('home'); setTid(null) }}>🏓 Ping Pong</div>
            <div className="home-hero-sub">Clasamentul grupului</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button className="btn sm" style={{ background: 'rgba(255,255,255,0.18)', border: '1.5px solid rgba(255,255,255,0.4)', color: '#fff' }} onClick={() => setView('g')}>📈</button>
            <button className="btn sm" style={{ background: 'rgba(255,255,255,0.18)', border: '1.5px solid rgba(255,255,255,0.4)', color: '#fff' }} onClick={() => { setView('al'); setPin(''); setPinErr(false) }}>🔐</button>
          </div>
        </div>
      </div>

      {globalStats.filter(s => s.n > 0).length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div className="sec-hd" style={{ marginBottom: 8 }}>
            <span className="sec-hd-title">Clasament general</span>
            <button className="btn sm" style={{ fontSize: 13, color: 'var(--text2)' }} onClick={() => setView('g')}>Vezi detalii →</button>
          </div>
          <StandingsTable rows={globalStats.filter(s => s.n > 0)} onPlayerClick={id => { setPid(id); setView('p') }} />
        </div>
      )}

      <div className="sec-hd">
        <span className="sec-hd-title">Turnee</span>
        <button className="btn ac sm" disabled={hasActiveTournament} style={hasActiveTournament ? { opacity: 0.4, cursor: 'not-allowed' } : {}} onClick={openCreate}>+ Turneu nou</button>
      </div>
      {hasActiveTournament && (
        <div style={{ fontSize: 13, color: 'var(--greend)', background: 'var(--greenl)', borderRadius: 10, padding: '8px 12px', marginBottom: 10 }}>
          ● Există un turneu activ. Închide-l înainte de a crea unul nou.
        </div>
      )}

      {tournaments.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '52px 20px' }}>
          <div style={{ fontSize: 48, marginBottom: 14 }}>🏆</div>
          <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 6 }}>Niciun turneu creat</div>
          <div className="mu" style={{ marginBottom: 20 }}>Apasă butonul de mai jos pentru a începe</div>
          <button className="btn ac lg" disabled={hasActiveTournament} style={hasActiveTournament ? { opacity: 0.4, cursor: 'not-allowed', width: '100%' } : { width: '100%' }} onClick={openCreate}>Creează primul turneu</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[...tournaments].sort((a, b) => { const p = d => { const [dd,mm,yy] = d.split('.'); return new Date(yy, mm-1, dd) }; return p(b.date) - p(a.date) }).map(tr => {
            const tms = matches.filter(m => m.tid === tr.id)
            const ap = tms.filter(m => m.st === 'a').length
            const tot = tms.filter(m => m.st !== 'x').length
            const nr = rounds.filter(r => r.tid === tr.id).length
            const pct = tot ? Math.round(ap / tot * 100) : 0
            return (
              <div key={tr.id} className={`t-card ${tr.closed ? 'closed' : 'active'}`} onClick={() => go('t', { tid: tr.id, tab: tr.closed ? 's' : 'r' })}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div className="t-card-name">{tr.name}</div>
                  {tr.closed
                    ? <Badge bg="var(--muted)" c="var(--text2)">🏁 încheiat</Badge>
                    : <Badge bg="var(--greenl)" c="var(--greend)">● activ</Badge>}
                </div>
                <div className="t-card-meta">{tr.pids.length} jucători · {nr} runde · {ap}/{tot} meciuri</div>
                {!tr.closed && tot > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <div className="prog">
                      <div className="pf" style={{ width: `${pct}%` }} />
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4, textAlign: 'right' }}>{pct}%</div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div style={{ marginTop: 32, textAlign: 'center' }}>
        <button
          className="btn sm"
          style={{ color: 'var(--text2)', borderColor: 'var(--border)' }}
          onClick={async () => {
            const url = window.location.href
            if (navigator.share) {
              await navigator.share({ title: 'Ping Pong', url })
            } else {
              await navigator.clipboard.writeText(url)
              alert('Link copiat!')
            }
          }}
        >
          🔗 Distribuie linkul
        </button>
      </div>
    </div>
  )
}
