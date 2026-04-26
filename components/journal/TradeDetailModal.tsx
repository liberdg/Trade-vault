'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, TrendingUp, TrendingDown, Calendar, Target, Brain, Image as ImageIcon, BookOpen } from 'lucide-react'
import { format, parseISO, differenceInMinutes } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { Trade } from '@/types'

interface Props { trade: Trade; onClose: () => void }

const EMOTION_COLORS: Record<string, string> = {
  confident: '#00ff88', fearful: '#ff8800', greedy: '#ff3355', revenge: '#ff0033',
  calm: '#00d4ff', anxious: '#ffaa00', fomo: '#ff6633', disciplined: '#00ff88',
  impulsive: '#ff3355', patient: '#00d4ff',
}

export function TradeDetailModal({ trade, onClose }: Props) {
  const [activeImg, setActiveImg] = useState<string | null>(null)
  const duration = trade.exitDate
    ? differenceInMinutes(parseISO(trade.exitDate), parseISO(trade.entryDate))
    : null

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 backdrop-blur-sm p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-surface border border-border rounded-2xl"
      >
        {/* Header */}
        <div className="sticky top-0 bg-surface/95 backdrop-blur-xl border-b border-border px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${trade.direction === 'BUY' ? 'bg-bull-dim text-bull' : 'bg-bear-dim text-bear'}`}>
              {trade.direction === 'BUY' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="font-display text-2xl text-white tracking-wide">{trade.symbol}</h2>
              <p className="text-xs text-muted font-mono">{trade.assetClass} • {trade.direction} • {trade.timeframe}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted hover:text-white p-2 hover:bg-white/5 rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-6">
          {/* PnL Banner */}
          {trade.pnl !== undefined && (
            <div className={`rounded-xl p-5 border text-center ${trade.pnl >= 0 ? 'bg-bull-dim border-bull/20' : 'bg-bear-dim border-bear/20'}`}>
              <div className={`font-display text-5xl tracking-wide ${trade.pnl >= 0 ? 'text-bull' : 'text-bear'}`}>
                {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)}$
              </div>
              <div className="text-xs text-muted font-mono mt-1">
                {trade.pnlPercent !== undefined && `${trade.pnlPercent >= 0 ? '+' : ''}${trade.pnlPercent.toFixed(2)}% du capital`}
                {trade.riskReward && ` • RR: 1:${trade.riskReward.toFixed(2)}`}
              </div>
            </div>
          )}

          {/* Trade details grid */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Entrée', value: trade.entryPrice.toFixed(5) },
              { label: 'Sortie', value: trade.exitPrice?.toFixed(5) ?? '—' },
              { label: 'Taille', value: trade.positionSize.toString() },
              { label: 'Stop Loss', value: trade.stopLoss?.toFixed(5) ?? '—' },
              { label: 'Take Profit', value: trade.takeProfit?.toFixed(5) ?? '—' },
              { label: 'Durée', value: duration ? `${duration < 60 ? duration + 'm' : (duration/60).toFixed(1) + 'h'}` : '—' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-panel rounded-lg p-3 border border-border">
                <div className="text-xs text-muted font-mono mb-1">{label.toUpperCase()}</div>
                <div className="font-mono text-white font-medium">{value}</div>
              </div>
            ))}
          </div>

          {/* Dates */}
          <div className="flex items-center gap-3 text-xs font-mono text-muted">
            <Calendar className="w-3.5 h-3.5" />
            <span>Entrée: {format(parseISO(trade.entryDate), 'EEEE d MMMM yyyy à HH:mm', { locale: fr })}</span>
            {trade.exitDate && <span>• Sortie: {format(parseISO(trade.exitDate), 'HH:mm')}</span>}
          </div>

          {/* Strategy & Setup */}
          {(trade.strategy || trade.setup) && (
            <div className="bg-panel rounded-xl p-4 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-accent" />
                <span className="text-xs font-mono text-muted uppercase">Stratégie & Setup</span>
              </div>
              {trade.strategy && <div className="text-white font-mono">{trade.strategy}</div>}
              {trade.setup && <div className="text-muted text-sm mt-1">{trade.setup}</div>}
            </div>
          )}

          {/* Emotions */}
          {trade.emotions.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Brain className="w-4 h-4 text-accent" />
                <span className="text-xs font-mono text-muted uppercase">État Émotionnel</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {trade.emotions.map(e => (
                  <span key={e} className="px-3 py-1.5 rounded-full text-xs font-mono border"
                    style={{ color: EMOTION_COLORS[e] ?? '#fff', borderColor: EMOTION_COLORS[e] ?? '#fff', background: (EMOTION_COLORS[e] ?? '#fff') + '15' }}>
                    {e}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Scores */}
          {(trade.executionScore || trade.disciplineScore) && (
            <div className="grid grid-cols-2 gap-3">
              {trade.executionScore && (
                <div className="bg-panel rounded-lg p-3 border border-border">
                  <div className="text-xs text-muted font-mono mb-2">EXÉCUTION</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-border rounded-full overflow-hidden">
                      <div className="h-full bg-accent rounded-full" style={{ width: `${trade.executionScore * 10}%` }} />
                    </div>
                    <span className="font-mono text-accent font-bold">{trade.executionScore}/10</span>
                  </div>
                </div>
              )}
              {trade.disciplineScore && (
                <div className="bg-panel rounded-lg p-3 border border-border">
                  <div className="text-xs text-muted font-mono mb-2">DISCIPLINE</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-border rounded-full overflow-hidden">
                      <div className="h-full bg-gold rounded-full" style={{ width: `${trade.disciplineScore * 10}%` }} />
                    </div>
                    <span className="font-mono text-gold font-bold">{trade.disciplineScore}/10</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          {trade.notes && (
            <div className="bg-panel rounded-xl p-4 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="w-4 h-4 text-accent" />
                <span className="text-xs font-mono text-muted uppercase">Notes</span>
              </div>
              <p className="text-sm text-white/80 leading-relaxed">{trade.notes}</p>
            </div>
          )}

          {trade.lessons && (
            <div className="bg-panel rounded-xl p-4 border border-bull/20">
              <div className="text-xs font-mono text-muted uppercase mb-2">💡 Leçons</div>
              <p className="text-sm text-white/80 leading-relaxed">{trade.lessons}</p>
            </div>
          )}

          {/* Images */}
          {trade.images.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <ImageIcon className="w-4 h-4 text-accent" />
                <span className="text-xs font-mono text-muted uppercase">Screenshots ({trade.images.length})</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {trade.images.map(img => (
                  <div key={img.id} onClick={() => setActiveImg(img.data)}
                    className="rounded-xl overflow-hidden border border-border cursor-zoom-in hover:border-accent/30 transition-all">
                    <img src={img.data} alt="" className="w-full h-40 object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Image lightbox */}
      {activeImg && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setActiveImg(null)}>
          <img src={activeImg} alt="" className="max-w-full max-h-full rounded-xl" />
        </motion.div>
      )}
    </motion.div>
  )
}
