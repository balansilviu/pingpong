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

export function mkRound(pids, tid, rnum) {
  // Generez toate meciurile
  const ms = []
  for (let i = 0; i < pids.length; i++)
    for (let j = i + 1; j < pids.length; j++)
      ms.push({ id: gid(), tid, rid: null, p1: pids[i], p2: pids[j], score: null, st: 's' })
  
  // Reordonez meciurile și grupez în "slots" simultane
  const ordered = optimizeMatchOrder(ms)
  
  const rid = gid()
  return { round: { id: rid, tid, num: rnum }, ms: ordered.map(m => ({ ...m, rid })) }
}

function optimizeMatchOrder(matches) {
  const ordered = []
  const available = [...matches]
  let slot = 0
  
  while (available.length > 0) {
    // Incerc sa iau max 3 meciuri simultane (6 jucatori occupied)
    const slotMatches = []
    const usedPlayers = new Set()
    
    let nextIdx = -1
    let attempts = 0
    
    while (available.length > 0 && attempts < 20) {
      attempts++
      
      if (slotMatches.length === 0) {
        // Primul meci din slot: pick random
        nextIdx = Math.floor(Math.random() * available.length)
      } else {
        // Gasesc un meci care nu are jucatori comuni cu ce am deja in slot
        const candidatIndices = available
          .map((m, i) => ({ i, m }))
          .filter(({ m }) => !usedPlayers.has(m.p1) && !usedPlayers.has(m.p2))
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
    slot++
  }
  
  return ordered
}

export function valScore(a, b) {
  if (isNaN(a) || isNaN(b) || a < 0 || b < 0) return 'Scoruri invalide'
  if (a === b) return 'Nu poate fi egalitate'
  if (a > 30 || b > 30) return 'Scor prea mare'
  return null
}

export function sortStandings(arr) {
  return [...arr].sort((a, b) => {
    const pa = a.n > 0 ? a.w / a.n : 0
    const pb = b.n > 0 ? b.w / b.n : 0
    if (Math.abs(pb - pa) > 0.0001) return pb - pa
    return b.pf - a.pf
  })
}

export function calcStandings(matches, pids, players) {
  const s = {}
  pids.forEach(id => s[id] = { w: 0, l: 0, pf: 0, pa: 0, n: 0 })
  matches.filter(m => m.st === 'a').forEach(m => {
    const [a, b] = m.score
    if (!s[m.p1] || !s[m.p2]) return
    s[m.p1].n++; s[m.p2].n++
    s[m.p1].pf += a; s[m.p1].pa += b
    s[m.p2].pf += b; s[m.p2].pa += a
    if (a > b) { s[m.p1].w++; s[m.p2].l++ }
    else { s[m.p2].w++; s[m.p1].l++ }
  })
  return sortStandings(pids.map(id => ({ ...players.find(p => p.id === id), ...s[id] })))
}

export function unequalWarn(matches, pids) {
  const counts = {}
  pids.forEach(id => counts[id] = 0)
  matches.filter(m => m.st === 'a').forEach(m => {
    counts[m.p1] = (counts[m.p1] || 0) + 1
    counts[m.p2] = (counts[m.p2] || 0) + 1
  })
  const vals = pids.map(id => counts[id])
  const mn = Math.min(...vals), mx = Math.max(...vals)
  return mn === mx ? null : { min: mn, max: mx, counts }
}
