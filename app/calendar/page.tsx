'use client'
import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useTradingStore } from '@/store/tradingStore'
import { TradeDetailModal } from '@/components/journal/TradeDetailModal'
import type { Trade } from '@/types'

export default function CalendarPage() {
  const { trades } = useTradingStore()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [viewTrade, setViewTrade] = useState<Trade | null>(null)

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 })
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end })
  }, [currentMonth])

  const tradesByDay = useMemo(() => {
    const map = new Map<string, Trade[]>()
    trades.forEach(t => {
      const day = t.entryDate.slice(0, 10)
      if (!map.has(day)) map.set(day, [])
      map.get(day)!.push(t)
    })
    return map
  }, [trades])

  const selectedTrades = selectedDay
    ? (tradesByDay.get(format(selectedDay, 'yyyy-MM-dd')) ?? [])
    : []

  const weekdays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl text-white tracking-wide">CALENDRIER <span className="text-accent">DE TRADING</span></h1>
        <p className="text-muted font-mono text-sm mt-1">Vue mensuelle de ton activité</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Calendar */}
        <div className="bg-panel rounded-2xl border border-border p-5">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-5">
            <button onClick={() => setCurrentMonth(m => subMonths(m, 1))}
              className="p-2 text-muted hover:text-white hover:bg-white/5 rounded-lg transition-all">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="font-display text-2xl text-white tracking-wide capitalize">
              {format(currentMonth, 'MMMM yyyy', { locale: fr })}
            </h2>
            <button onClick={() => setCurrentMonth(m => addMonths(m, 1))}
              className="p-2 text-muted hover:text-white hover:bg-white/5 rounded-lg transition-all">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-2">
            {weekdays.map(d => (
              <div key={d} className="text-center text-xs font-mono text-muted uppercase py-2">{d}</div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map(day => {
              const key = format(day, 'yyyy-MM-dd')
              const dayTrades = tradesByDay.get(key) ?? []
              const pnl = dayTrades.reduce((s, t) => s + (t.pnl ?? 0), 0)
              const isCurrentMonth = isSameMonth(day, currentMonth)
              const isSelected = selectedDay && isSameDay(day, selectedDay)
              const isToday = isSameDay(day, new Date())
              const hasActivity = dayTrades.length > 0

              return (
                <motion.div key={key}
                  whileHover={hasActivity ? { scale: 1.03 } : {}}
                  onClick={() => hasActivity && setSelectedDay(isSameDay(day, selectedDay ?? new Date(-1)) ? null : day)}
                  className={`relative aspect-square rounded-xl p-1.5 transition-all ${
                    isSelected ? 'ring-2 ring-accent bg-accent/10' :
                    hasActivity ? 'cursor-pointer hover:bg-white/5' : ''
                  } ${!isCurrentMonth ? 'opacity-25' : ''}`}
                >
                  {/* Day number */}
                  <div className={`text-xs font-mono text-center mb-1 ${
                    isToday ? 'text-accent font-bold' : isCurrentMonth ? 'text-white' : 'text-muted'
                  }`}>
                    {format(day, 'd')}
                  </div>

                  {/* PnL indicator */}
                  {hasActivity && (
                    <div className={`rounded-lg p-1 text-center ${pnl >= 0 ? 'bg-bull-dim' : 'bg-bear-dim'}`}>
                      <div className={`text-[10px] font-mono font-bold ${pnl >= 0 ? 'text-bull' : 'text-bear'}`}>
                        {pnl >= 0 ? '+' : ''}{pnl.toFixed(0)}
                      </div>
                      <div className="text-[9px] text-muted">{dayTrades.length}t</div>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* Day detail panel */}
        <div className="space-y-4">
          {/* Monthly summary */}
          <div className="bg-panel rounded-2xl border border-border p-4">
            <h3 className="font-display text-lg text-white tracking-wide mb-3 capitalize">
              {format(currentMonth, 'MMMM', { locale: fr })}
            </h3>
            {(() => {
              const monthTrades = trades.filter(t => t.entryDate.startsWith(format(currentMonth, 'yyyy-MM')))
              const monthPnl = monthTrades.reduce((s, t) => s + (t.pnl ?? 0), 0)
              const wins = monthTrades.filter(t => (t.pnl ?? 0) > 0).length
              return (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-muted font-mono">P&L Total</span>
                    <span className={`text-sm font-mono font-bold ${monthPnl >= 0 ? 'text-bull' : 'text-bear'}`}>
                      {monthPnl >= 0 ? '+' : ''}{monthPnl.toFixed(2)}$
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-muted font-mono">Trades</span>
                    <span className="text-sm font-mono text-white">{monthTrades.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-muted font-mono">Win Rate</span>
                    <span className={`text-sm font-mono font-bold ${monthTrades.length > 0 && wins/monthTrades.length >= 0.5 ? 'text-bull' : 'text-bear'}`}>
                      {monthTrades.length > 0 ? ((wins / monthTrades.length) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                </div>
              )
            })()}
          </div>

          {/* Selected day trades */}
          <AnimatePresence>
            {selectedDay && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                className="bg-panel rounded-2xl border border-border p-4">
                <h3 className="font-display text-lg text-white tracking-wide mb-3">
                  {format(selectedDay, 'd MMMM', { locale: fr })}
                </h3>
                <div className="space-y-2">
                  {selectedTrades.map(trade => (
                    <div key={trade.id} onClick={() => setViewTrade(trade)}
                      className="flex items-center gap-3 p-3 rounded-xl bg-surface border border-border hover:border-accent/20 cursor-pointer transition-all">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${trade.direction === 'BUY' ? 'bg-bull-dim text-bull' : 'bg-bear-dim text-bear'}`}>
                        {trade.direction === 'BUY' ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                      </div>
                      <div className="flex-1">
                        <div className="font-mono text-sm font-bold text-white">{trade.symbol}</div>
                        <div className="text-xs text-muted font-mono">{format(parseISO(trade.entryDate), 'HH:mm')}</div>
                      </div>
                      {trade.pnl !== undefined && (
                        <span className={`font-mono text-sm font-bold ${trade.pnl >= 0 ? 'text-bull' : 'text-bear'}`}>
                          {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)}$
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {viewTrade && <TradeDetailModal trade={viewTrade} onClose={() => setViewTrade(null)} />}
      </AnimatePresence>
    </div>
  )
}
