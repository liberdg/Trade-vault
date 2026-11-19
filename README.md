# 🚀 TradeVault — Journal de Trading Ultra Avancé

> Une machine d'analyse de trading personnelle — fintech premium, dark mode, local-first.

## ⚡ Installation & Démarrage

```bash
# 1. Installer les dépendances
npm install

# 2. Lancer en développement
npm run dev

# 3. Ouvrir dans le navigateur
# → http://localhost:3000
```

## 🏗️ Architecture du Projet

```
trading-journal/
├── app/                        # Routes Next.js (App Router)
│   ├── page.tsx                # Dashboard principal
│   ├── journal/page.tsx        # Journal de trades
│   ├── analytics/page.tsx      # Analytics avancés
│   ├── calendar/page.tsx       # Calendrier de trading
│   ├── settings/page.tsx       # Paramètres
│   └── layout.tsx              # Layout racine
│
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx        # Shell principal (sidebar + topbar)
│   │   ├── Sidebar.tsx         # Navigation latérale
│   │   └── TopBar.tsx          # Barre supérieure
│   ├── dashboard/
│   │   ├── EquityCurve.tsx     # Graphique courbe d'équité
│   │   └── RecentTrades.tsx    # Liste trades récents
│   ├── journal/
│   │   ├── TradeFormModal.tsx  # Formulaire création/édition trade
│   │   └── TradeDetailModal.tsx # Vue détaillée d'un trade
│   └── ui/
│       └── StatCard.tsx        # Carte statistique réutilisable
│
├── lib/
│   ├── db.ts                   # Base de données IndexedDB (Dexie.js)
│   ├── analytics.ts            # Calculs analytiques & insights IA
│   └── seedData.ts             # Données de démonstration
│
├── store/
│   └── tradingStore.ts         # State global Zustand
│
└── types/
    └── index.ts                # TypeScript types
```

## 🗄️ Schéma IndexedDB

### Table `trades`
| Champ | Type | Description |
|-------|------|-------------|
| id | string (UUID) | Identifiant unique |
| symbol | string | Ex: EURUSD, BTCUSD |
| assetClass | enum | Forex/Crypto/Indices/Stocks/Commodities/Options |
| direction | BUY/SELL | Sens du trade |
| entryDate | ISO string | Date/heure d'entrée |
| exitDate | ISO string? | Date/heure de sortie |
| entryPrice | number | Prix d'entrée |
| exitPrice | number? | Prix de sortie |
| positionSize | number | Taille de position |
| stopLoss | number? | Niveau stop loss |
| takeProfit | number? | Niveau take profit |
| riskReward | number? | Ratio R:R auto-calculé |
| pnl | number? | Profit/Perte auto-calculé |
| pnlPercent | number? | % du capital |
| strategy | string? | Stratégie utilisée |
| emotions | EmotionTag[] | État émotionnel |
| notes | string? | Notes libres |
| lessons | string? | Leçons apprises |
| images | TradeImage[] | Screenshots (base64) |
| executionScore | number | Score exécution 1-10 |
| disciplineScore | number | Score discipline 1-10 |
| tags | string[] | Tags personnalisés |

### Table `settings`
Paramètres utilisateur : capital, devise, stratégies, objectifs, tags.

## 📊 Fonctionnalités

### Dashboard
- Courbe d'équité interactive
- Statistiques clés (Win Rate, Profit Factor, Expectancy, Equity)
- Trades récents avec actions rapides
- Insights IA générés automatiquement

### Journal
- Tableau complet avec filtres (actif, direction, résultat)
- Recherche rapide
- CRUD complet (créer, voir, éditer, supprimer)
- Formulaire avancé avec SL/TP, R:R auto-calculé, P&L estimé

### Analytics
- P&L par mois (bar chart)
- Performance par actif (animated bars)
- Analyse émotions vs résultats
- Heatmap Heure × Jour de la semaine
- Insights automatiques (6 types d'analyse)

### Calendrier
- Vue mensuelle avec code couleur P&L
- Navigation mois par mois
- Résumé mensuel (total P&L, win rate)
- Détail des trades par jour

### Paramètres
- Profil trader (nom, capital, devise, risque %)
- Gestion des stratégies
- Tags personnalisés
- Objectifs avec suivi de progression
- Export/Import JSON
- Reset des données

## 🧠 Insights locaux

L'application analyse tes trades locaux avec des heuristiques déterministes et génère automatiquement :
- Détection des heures non-rentables
- Analyse émotions → win rate
- Détection de trading revanche
- Meilleurs actifs et jours de la semaine
- Alertes patterns négatifs

> Les données de démonstration sont explicitement marquées comme exemples locaux. Aucun cours de marché, signal IA, statut de connexion ou performance broker n'est fabriqué.

## Marchés réels et broker

- **Crypto**: Binance public market-data endpoints (`/api/v3/klines`) with no API key. The server falls back to Yahoo Finance chart data if Binance is unavailable.
- **Forex**: Yahoo Finance chart endpoint first, then Frankfurter ECB reference rates as a daily close-only fallback.
- **Indices/stocks**: Yahoo Finance chart endpoint.
- **Broker**: OANDA v20 practice/live accounts. Configure server-only variables from `.env.example`. Live order execution requires `OANDA_ALLOW_LIVE=true`, `OANDA_ENVIRONMENT=live`, and explicit confirmation in the UI.

All provider failures are returned as unavailable states. The app never converts missing provider data into fabricated candles or connection status.

## 🔮 Évolutivité (SaaS-ready)

Pour ajouter l'authentification future :
1. Remplacer `lib/db.ts` par des appels API
2. Ajouter middleware Next.js auth (NextAuth.js)
3. Le store Zustand est déjà découplé de la persistence
4. Les types sont agnostiques au backend

## 🎨 Stack Technique

- **Framework**: Next.js 14 (App Router)
- **UI**: TailwindCSS + Framer Motion
- **State**: Zustand
- **DB**: IndexedDB via Dexie.js
- **Charts**: Recharts
- **Icons**: Lucide React
- **Dates**: date-fns
