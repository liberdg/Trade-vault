'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Bell, Plus, ChevronDown } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useTradingStore } from '@/store/tradingStore'
import { TradeFormModal } from '@/components/journal/TradeFormModal'

export function TopBar() {
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const trades = useTradingStore(s => s.trades)

  const openTrades = trades.filter(t => t.status === 'OPEN')
  const todayPnl = trades
    .filter(t => t.status === 'CLOSED' && t.pnl !== undefined && t.entryDate.startsWith(format(new Date(), 'yyyy-MM-dd')))
    .reduce((s, t) => s + (t.pnl ?? 0), 0)

  return (
    <>
      <header className="h-16 border-b border-border bg-surface/60 backdrop-blur-xl flex items-center px-6 gap-4 shrink-0">
        {/* Date */}
        <div className="font-mono text-xs text-muted capitalize">
          {format(new Date(), 'EEEE d MMMM yyyy', { locale: fr })}
        </div>

        {/* Search */}
        <div className="flex-1 max-w-xs relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un trade..."
            className="w-full bg-panel border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder:text-muted focus:outline-none focus:border-accent/50 font-mono"
          />
        </div>

        <div className="flex-1" />

        {/* Today PnL */}
        {todayPnl !== 0 && (
          <div className={`font-mono text-sm font-bold px-3 py-1.5 rounded-lg border ${
            todayPnl > 0 ? 'bg-bull-dim border-bull/20 text-bull' : 'bg-bear-dim border-bear/20 text-bear'
          }`}>
            Aujourd'hui: {todayPnl > 0 ? '+' : ''}{todayPnl.toFixed(2)}$
          </div>
        )}

        {/* Open trades badge */}
        {openTrades.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent/10 border border-accent/20">
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span className="text-xs font-mono text-accent">{openTrades.length} ouvert{openTrades.length > 1 ? 's' : ''}</span>
          </div>
        )}

        {/* New Trade */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-void rounded-lg text-sm font-bold hover:bg-accent-dim transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nouveau Trade
        </motion.button>
      </header>

      <AnimatePresence>
        {showForm && <TradeFormModal onClose={() => setShowForm(false)} />}
      </AnimatePresence>
    </>
  )
}
