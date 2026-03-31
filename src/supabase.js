import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

console.log('[supabase] URL defined:', !!supabaseUrl, 'KEY defined:', !!supabaseKey)

export const supabase = createClient(supabaseUrl, supabaseKey)

// Salvează jucători
export async function savePlayers(players) {
  try {
    console.log('Saving players:', players.length, 'rows')
    const { data, error } = await supabase.from('players').upsert(
      players.map(p => ({ id: p.id, name: p.name })),
      { onConflict: 'id' }
    )
    if (error) {
      console.error('Supabase players error:', error)
      return
    }
    console.log('Players saved:', data?.length || 0)
  } catch (err) {
    console.error('Save players error:', err)
  }
}

// Încarcă jucători
export async function loadPlayers() {
  try {
    const { data } = await supabase.from('players').select('*')
    return data || []
  } catch (err) {
    console.error('Load players error:', err)
    return []
  }
}

// Salvează tournaments + rounds + matches respectând ordinea FK
// Insert: tournaments → rounds → matches (parents first)
// Delete: matches → rounds → tournaments (children first)
export async function saveAll(tournaments, rounds, matches) {
  try {
    // 1. Upsert în ordine FK
    if (tournaments.length > 0) {
      const { error } = await supabase.from('tournaments').upsert(tournaments, { onConflict: 'id' })
      if (error) { console.error('[saveAll] tournaments upsert error:', error); return }
    }
    if (rounds.length > 0) {
      const { error } = await supabase.from('rounds').upsert(
        rounds.map(r => ({ id: r.id, tid: r.tid, num: r.num })),
        { onConflict: 'id' }
      )
      if (error) { console.error('[saveAll] rounds upsert error:', error); return }
    }
    if (matches.length > 0) {
      const { error } = await supabase.from('matches').upsert(matches, { onConflict: 'id' })
      if (error) { console.error('[saveAll] matches upsert error:', error); return }
    }

    // 2. Șterge înregistrările eliminate, în ordine inversă FK (children first)
    const mIds = matches.map(m => m.id)
    if (mIds.length > 0) await supabase.from('matches').delete().not('id', 'in', `(${mIds.join(',')})`)
    else await supabase.from('matches').delete().neq('id', '')

    const rIds = rounds.map(r => r.id)
    if (rIds.length > 0) await supabase.from('rounds').delete().not('id', 'in', `(${rIds.join(',')})`)
    else await supabase.from('rounds').delete().neq('id', '')

    const tIds = tournaments.map(t => t.id)
    if (tIds.length > 0) await supabase.from('tournaments').delete().not('id', 'in', `(${tIds.join(',')})`)
    else await supabase.from('tournaments').delete().neq('id', '')

    console.log('[saveAll] done')
  } catch (err) {
    console.error('[saveAll] exception:', err)
  }
}

// Încarcă turnee
export async function loadTournaments() {
  try {
    const { data, error } = await supabase.from('tournaments').select('*')
    if (error) { console.error('[loadTournaments] error:', error); return [] }
    return data || []
  } catch (err) {
    console.error('[loadTournaments] exception:', err)
    return []
  }
}

// Încarcă runde
export async function loadRounds() {
  try {
    const { data, error } = await supabase.from('rounds').select('*')
    if (error) { console.error('[loadRounds] error:', error); return [] }
    return data || []
  } catch (err) {
    console.error('[loadRounds] error:', err)
    return []
  }
}

// Încarcă meciuri
export async function loadMatches() {
  try {
    const { data, error } = await supabase.from('matches').select('*')
    if (error) { console.error('[loadMatches] error:', error); return [] }
    return data || []
  } catch (err) {
    console.error('[loadMatches] exception:', err)
    return []
  }
}

// Șterge tot
export async function clearAllData() {
  try {
    await supabase.from('matches').delete().neq('id', '')
    await supabase.from('rounds').delete().neq('id', '')
    await supabase.from('tournaments').delete().neq('id', '')
    await supabase.from('players').delete().neq('id', '')
  } catch (err) {
    console.error('Clear all error:', err)
  }
}
