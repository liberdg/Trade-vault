'use client'
import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, TrendingUp, TrendingDown, Eye, Edit2, Trash2, Plus } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useTradingStore } from '@/store/tradingStore'
import { TradeFormModal } from '@/components/journal/TradeFormModal'
import { TradeDetailModal } from '@/components/journal/TradeDetailModal'
import type { Trade, AssetClass } from '@/types'
import toast from 'react-hot-toast'

const ASSETS: AssetClass[] = ['Forex', 'Crypto', 'Indices', 'Stocks', 'Commodities', 'Options']

export default function JournalPage() {
  const { trades, deleteTrade } = useTradingStore()
  const [search, setSearch] = useState('')
  const [filterAsset, setFilterAsset] = useState<string>('all')
  const [filterDirection, setFilterDirection] = useState('all')
  const [filterResult, setFilterResult] = useState('all')
  const [editTrade, setEditTrade] = useState<Trade | null>(null)
  const [viewTrade, setViewTrade] = useState<Trade | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)

  const filtered = useMemo(() => trades.filter(t => {
    if (search && !t.symbol.toLowerCase().includes(search.toLowerCase())) return false
    if (filterAsset !== 'all' && t.assetClass !== filterAsset) return false
    if (filterDirection !== 'all' && t.direction !== filterDirection) return false
    if (filterResult === 'win' && (t.pnl ?? 0) <= 0) return false
    if (filterResult === 'loss' && (t.pnl ?? 0) >= 0) return false
    return true
  }), [trades, search, filterAsset, filterDirection, filterResult])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-4xl text-white tracking-wide">JOURNAL <span className="text-accent">DE TRADING</span></h1>
          <p className="text-muted font-mono text-sm mt-1">{filtered.length} trades sur {trades.length}</p>
        </div>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-void rounded-lg font-bold hover:bg-accent-dim transition-colors">
          <Plus className="w-4 h-4" /> Nouveau Trade
        </motion.button>
      </div>

      {/* Filters */}
      <div className="bg-panel rounded-2xl border border-border p-4 flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..."
            className="bg-surface border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-white font-mono focus:outline-none focus:border-accent/50 w-48" />
        </div>
        {(['all', ...ASSETS]).map(a => (
          <button key={a} onClick={() => setFilterAsset(a)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-all ${filterAsset === a ? 'bg-accent/10 border-accent/30 text-accent' : 'border-border text-muted hover:text-white'}`}>
            {a === 'all' ? 'Tous' : a}
          </button>
        ))}
        <div className="ml-auto flex gap-2">
          {[['all','Tout'],['BUY','Buy'],['SELL','Sell']].map(([v,l]) => (
            <button key={v} onClick={() => setFilterDirection(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-all ${filterDirection === v ? (v==='BUY'?'bg-bull-dim border-bull/30 text-bull':v==='SELL'?'bg-bear-dim border-bear/30 text-bear':'bg-accent/10 border-accent/30 text-accent') : 'border-border text-muted hover:text-white'}`}>
              {l}
            </button>
          ))}
          {[['all','Tous'],['win','Gagnants'],['loss','Perdants']].map(([v,l]) => (
            <button key={v} onClick={() => setFilterResult(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-all ${filterResult === v ? (v==='win'?'bg-bull-dim border-bull/30 text-bull':v==='loss'?'bg-bear-dim border-bear/30 text-bear':'bg-accent/10 border-accent/30 text-accent') : 'border-border text-muted hover:text-white'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-panel rounded-2xl border border-border overflow-hidden">
        <div className="hidden lg:grid lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr_auto] text-xs font-mono text-muted uppercase px-5 py-3 border-b border-border">
          <span>Symbole</span><span>Direction</span><span>Entrée</span><span>Sortie</span><span>Taille</span><span>R:R</span><span>P&L</span><span></span>
        </div>
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-muted font-mono"><div className="text-5xl mb-3">📋</div><p>Aucun trade trouvé</p></div>
        ) : filtered.map((trade, i) => (
          <motion.div key={trade.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
            className="grid lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr_auto] grid-cols-[2fr_1fr_1fr_auto] items-center px-5 py-4 border-b border-border last:border-0 hover:bg-white/[0.02] transition-colors group">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-white">{trade.symbol}</span>
                <span className="text-xs text-muted px-1.5 py-0.5 bg-muted/20 rounded hidden sm:inline">{trade.assetClass}</span>
                {trade.status === 'OPEN' && <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />}
              </div>
              <div className="text-xs text-muted mt-0.5 font-mono">{format(parseISO(trade.entryDate), 'd MMM HH:mm', { locale: fr })}</div>
            </div>
            <div className={`flex items-center gap-1.5 font-mono text-sm font-bold ${trade.direction === 'BUY' ? 'text-bull' : 'text-bear'}`}>
              {trade.direction === 'BUY' ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{trade.direction}</span>
            </div>
            <div className="font-mono text-sm text-white hidden lg:block">{trade.entryPrice.toFixed(4)}</div>
            <div className="font-mono text-sm text-muted hidden lg:block">{trade.exitPrice?.toFixed(4) ?? '—'}</div>
            <div className="font-mono text-sm text-muted hidden lg:block">{trade.positionSize}</div>
            <div className="font-mono text-sm text-accent hidden lg:block">{trade.riskReward ? `1:${trade.riskReward.toFixed(2)}` : '—'}</div>
            <div className={`font-mono font-bold text-sm ${trade.pnl === undefined ? 'text-muted' : trade.pnl >= 0 ? 'text-bull' : 'text-bear'}`}>
              {trade.pnl !== undefined ? `${trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}$` : '—'}
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => setViewTrade(trade)} className="p-1.5 text-muted hover:text-accent hover:bg-accent/10 rounded transition-all"><Eye className="w-3.5 h-3.5" /></button>
              <button onClick={() => setEditTrade(trade)} className="p-1.5 text-muted hover:text-white hover:bg-white/5 rounded transition-all"><Edit2 className="w-3.5 h-3.5" /></button>
              <button onClick={async () => { if(confirm('Supprimer ?')){await deleteTrade(trade.id);toast.success('Supprimé')} }} className="p-1.5 text-muted hover:text-bear hover:bg-bear-dim rounded transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {showAddForm && <TradeFormModal onClose={() => setShowAddForm(false)} />}
        {editTrade && <TradeFormModal editTrade={editTrade} onClose={() => setEditTrade(null)} />}
        {viewTrade && <TradeDetailModal trade={viewTrade} onClose={() => setViewTrade(null)} />}
      </AnimatePresence>
    </div>
  )
}
