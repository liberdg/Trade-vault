'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { TrendingUp, TrendingDown, Eye, Edit2, Trash2 } from 'lucide-react'
import { useTradingStore } from '@/store/tradingStore'
import { TradeFormModal } from '@/components/journal/TradeFormModal'
import { TradeDetailModal } from '@/components/journal/TradeDetailModal'
import type { Trade } from '@/types'
import toast from 'react-hot-toast'

export function RecentTrades({ limit = 8 }: { limit?: number }) {
  const { trades, deleteTrade } = useTradingStore()
  const [editTrade, setEditTrade] = useState<Trade | null>(null)
  const [viewTrade, setViewTrade] = useState<Trade | null>(null)

  const recent = trades.slice(0, limit)

  const handleDelete = async (id: string) => {
    if (confirm('Supprimer ce trade ?')) {
      await deleteTrade(id)
      toast.success('Trade supprimé')
    }
  }

  if (recent.length === 0) {
    return (
      <div className="text-center py-12 text-muted font-mono text-sm">
        <div className="text-4xl mb-3">📊</div>
        <p>Aucun trade enregistré</p>
        <p className="text-xs mt-1 opacity-60">Clique sur "Nouveau Trade" pour commencer</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-2">
        {recent.map((trade, i) => (
          <motion.div key={trade.id}
            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center gap-3 p-3 rounded-xl bg-panel border border-border hover:border-accent/20 transition-all group"
          >
            {/* Direction */}
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              trade.direction === 'BUY' ? 'bg-bull-dim text-bull' : 'bg-bear-dim text-bear'
            }`}>
              {trade.direction === 'BUY' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            </div>

            {/* Symbol */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-white text-sm">{trade.symbol}</span>
                <span className="text-xs text-muted px-1.5 py-0.5 bg-muted/20 rounded font-mono">{trade.assetClass}</span>
                {trade.strategy && <span className="text-xs text-accent/60 font-mono">{trade.strategy}</span>}
              </div>
              <div className="text-xs text-muted font-mono mt-0.5">
                {format(parseISO(trade.entryDate), 'd MMM HH:mm', { locale: fr })}
                {trade.timeframe && ` • ${trade.timeframe}`}
              </div>
            </div>

            {/* RR */}
            {trade.riskReward && (
              <div className="text-xs font-mono text-muted">
                1:{trade.riskReward.toFixed(2)}
              </div>
            )}

            {/* Status badge */}
            {trade.status === 'OPEN' && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-accent/10 border border-accent/20">
                <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                <span className="text-xs font-mono text-accent">LIVE</span>
              </div>
            )}

            {/* PnL */}
            {trade.pnl !== undefined && (
              <div className={`font-mono font-bold text-sm min-w-[80px] text-right ${trade.pnl >= 0 ? 'text-bull' : 'text-bear'}`}>
                {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)}$
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => setViewTrade(trade)} className="p-1.5 text-muted hover:text-accent hover:bg-accent/10 rounded-lg transition-all">
                <Eye className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setEditTrade(trade)} className="p-1.5 text-muted hover:text-white hover:bg-white/5 rounded-lg transition-all">
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => handleDelete(trade.id)} className="p-1.5 text-muted hover:text-bear hover:bg-bear-dim rounded-lg transition-all">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {editTrade && <TradeFormModal editTrade={editTrade} onClose={() => setEditTrade(null)} />}
        {viewTrade && <TradeDetailModal trade={viewTrade} onClose={() => setViewTrade(null)} />}
      </AnimatePresence>
    </>
  )
}
