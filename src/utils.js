export const gid = () => Math.random().toString(36).slice(2, 8)

const MONTHS = ['Ian','Feb','Mar','Apr','Mai','Iun','Iul','Aug','Sep','Oct','Nov','Dec']

export function dateLabel() {
  const d = new Date()
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

export function autoName(tournaments) {
  const base = dateLabel()
  const same = tournaments.filter(t => t.name === base || t.name.startsWith(base + ' #'))
  return same.length === 0 ? base : `${base} #${same.length + 1}`
}

export function mkRound(pids, tid, rnum, tables = 1) {
  // Generez toate meciurile
  const ms = []
  for (let i = 0; i < pids.length; i++)
    for (let j = i + 1; j < pids.length; j++)
      ms.push({ id: gid(), tid, rid: null, p1: pids[i], p2: pids[j], score: null, st: 's' })
  
  // Reordonez meciurile și grupez în "slots" simultane (max `tables` mese)
  const ordered = optimizeMatchOrder(ms, tables)
  
  const rid = gid()
  return { round: { id: rid, tid, num: rnum }, ms: ordered.map(m => ({ ...m, rid })) }
}

function optimizeMatchOrder(matches, tables = 1) {
  const ordered = []
  const available = [...matches]
  let slot = 0
  let previousSlotPlayers = new Set() // Jucatori care au jucat in slotul anterior
  
  while (available.length > 0) {
    // Incerc sa iau max `tables` meciuri in slot (concurrent matches = number of tables)
    const slotMatches = []
    const usedPlayers = new Set()
    
    let nextIdx = -1
    let attempts = 0
    
    while (available.length > 0 && attempts < 20 && slotMatches.length < tables) {
      attempts++
      
      if (slotMatches.length === 0) {
        // Primul meci din slot: trebuie din jucatori care NU au jucat in slot anterior
        const candidatIndices = available
          .map((m, i) => ({ i, m }))
          .filter(({ m }) => !previousSlotPlayers.has(m.p1) && !previousSlotPlayers.has(m.p2))
          .map(({ i }) => i)
        
        if (candidatIndices.length === 0) {
          // Nu gasesc meciuri cu jucatori care sa se odihneasca - trec la urmatorul slot
          break
        }
        
        nextIdx = candidatIndices[Math.floor(Math.random() * candidatIndices.length)]
      } else {
        // Gasesc un meci care:
        // 1. Nu are jucatori comuni cu ce am deja in slot
        // 2. Nu are jucatori din slotul anterior
        const candidatIndices = available
          .map((m, i) => ({ i, m }))
          .filter(({ m }) => 
            !usedPlayers.has(m.p1) && !usedPlayers.has(m.p2) &&
            !previousSlotPlayers.has(m.p1) && !previousSlotPlayers.has(m.p2)
          )
          .map(({ i }) => i)
        
        if (candidatIndices.length === 0) {
          // Nu mai pot adauga meciuri in acest slot - trec la urmatorul
          break
        }
        
        nextIdx = candidatIndices[Math.floor(Math.random() * candidatIndices.length)]
      }
      
      const match = available[nextIdx]
      slotMatches.push({ ...match, slot })
      usedPlayers.add(match.p1)
      usedPlayers.add(match.p2)
      available.splice(nextIdx, 1)
    }
    
    ordered.push(...slotMatches)
    previousSlotPlayers = new Set(usedPlayers) // Jucatorii din acest slot devin "anterior"
    slot++
  }
  
  return ordered
}

export function valScore(a, b) {
  if (isNaN(a) || isNaN(b) || a < 0 || b < 0) return 'Scoruri invalide'
  
  // Scoruri speciale (victorii timpurii sau deuce)
  const specialScores = [[6, 0], [0, 6], [9, 1], [1, 9], [12, 10], [10, 12]]
  if (specialScores.some(([x, y]) => a === x && b === y)) return null
  
  // Normal game: unul are 11, celălalt 2-9 (nu 0, 1, 10)
  if (a === 11 && b >= 2 && b <= 9) return null
  if (b === 11 && a >= 2 && a <= 9) return null
  
  return 'Scoruri valide: 11 (cu 2-9), 6-0, 9-1, 12-10'
}

// Clasament turneu: victorii → meciuri directe → diferență puncte → puncte marcate
export function sortStandings(arr, h2h = {}) {
  return [...arr].sort((a, b) => {
    if (b.w !== a.w) return b.w - a.w
    const aVsB = h2h[a.id]?.[b.id] ?? 0
    const bVsA = h2h[b.id]?.[a.id] ?? 0
    if (aVsB !== bVsA) return bVsA - aVsB
    const diffA = a.pf - a.pa
    const diffB = b.pf - b.pa
    if (diffB !== diffA) return diffB - diffA
    return b.pf - a.pf
  })
}

// Clasament global: victorii → meciuri directe → procent victorii → puncte marcate
export function sortStandingsGlobal(arr, h2h = {}) {
  return [...arr].sort((a, b) => {
    if (b.w !== a.w) return b.w - a.w
    const aVsB = h2h[a.id]?.[b.id] ?? 0
    const bVsA = h2h[b.id]?.[a.id] ?? 0
    if (aVsB !== bVsA) return bVsA - aVsB
    const pa = a.n > 0 ? a.w / a.n : 0
    const pb = b.n > 0 ? b.w / b.n : 0
    if (Math.abs(pb - pa) > 0.0001) return pb - pa
    return b.pf - a.pf
  })
}

export function calcStandings(matches, pids, players) {
  const s = {}
  const h2h = {}
  pids.forEach(id => s[id] = { w: 0, l: 0, pf: 0, pa: 0, n: 0 })
  matches.filter(m => m.st === 'a').forEach(m => {
    const [a, b] = m.score
    if (!s[m.p1] || !s[m.p2]) return
    s[m.p1].n++; s[m.p2].n++
    s[m.p1].pf += a; s[m.p1].pa += b
    s[m.p2].pf += b; s[m.p2].pa += a
    if (!h2h[m.p1]) h2h[m.p1] = {}
    if (!h2h[m.p2]) h2h[m.p2] = {}
    if (a > b) {
      h2h[m.p1][m.p2] = (h2h[m.p1][m.p2] || 0) + 1
      s[m.p1].w++; s[m.p2].l++
    } else {
      h2h[m.p2][m.p1] = (h2h[m.p2][m.p1] || 0) + 1
      s[m.p2].w++; s[m.p1].l++
    }
  })
  return sortStandings(pids.map(id => {
    const player = players.find(p => p.id === id)
    return { id, name: player?.name ?? '(șters)', ...s[id] }
  }), h2h)
}

export function unequalWarn(matches, pids) {
  const counts = {}
  pids.forEach(id => counts[id] = 0)
  matches.filter(m => m.st === 'a').forEach(m => {
    counts[m.p1] = (counts[m.p1] || 0) + 1
    counts[m.p2] = (counts[m.p2] || 0) + 1
  })
  const vals = pids.map(id => counts[id])
  if (vals.length === 0) return null
  const mn = Math.min(...vals), mx = Math.max(...vals)
  return mn === mx ? null : { min: mn, max: mx, counts }
}
