# 🏓 Ping Pong — Aplicație scor grup

## Pornire rapidă

```bash
npm install
npm run dev
```

Apoi deschide http://localhost:5173

## Comenzi

| Comandă | Descriere |
|---|---|
| `npm run dev` | Server local cu hot-reload |
| `npm run build` | Build pentru producție |
| `npm run preview` | Preview build local |

## Structură

```
src/
  App.jsx          # Componenta principală + toată logica de state
  MatchCard.jsx    # Card meci cu introducere scor inline
  components.jsx   # Componente UI reutilizabile (Badge, StandingsTable etc.)
  utils.js         # Funcții utilitare (generare runde, calcul clasament etc.)
  index.css        # Stiluri globale + variabile CSS
  main.jsx         # Entry point React
```

## Funcționalități

- **Turnee** cu runde multiple (round-robin, toți cu toți per rundă)
- **Introducere scor inline** — fără navigare separată
- **Clasament live** cu % victorii și departajare prin puncte marcate
- **Statistici globale** pe toate turneele
- **Admin panel** (PIN: `1234`) — adaugă/șterge jucători și turnee
- **Închidere turneu** cu avertisment la meciuri inegale
- **Denumire automată** a turneelor după data curentă

## Note pentru dezvoltare

- State-ul este în memorie (fără persistență). Pentru persistență adaugă **Supabase** sau **localStorage**.
- PIN-ul de admin este hardcodat în `src/components.jsx` (`PIN = '1234'`). Schimbă-l înainte de deploy.
- Pentru deploy gratuit: **Vercel** (`npm i -g vercel && vercel`)
