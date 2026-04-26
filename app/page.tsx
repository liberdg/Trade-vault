'use client'
import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, Activity, Target, Zap, BarChart2, Brain, Award, DollarSign } from 'lucide-react'
import { useTradingStore } from '@/store/tradingStore'
import { computeAnalytics, generateInsights } from '@/lib/analytics'
import { StatCard } from '@/components/ui/StatCard'
import { EquityCurve } from '@/components/dashboard/EquityCurve'
import { RecentTrades } from '@/components/dashboard/RecentTrades'

export default function DashboardPage() {
  const { trades, settings } = useTradingStore()
  const analytics = useMemo(() => computeAnalytics(trades), [trades])
  const insights = useMemo(() => generateInsights(trades), [trades])

  const currentEquity = settings.accountBalance + analytics.totalPnl
  const equityChange = analytics.totalPnl !== 0 ? (analytics.totalPnl / settings.accountBalance) * 100 : 0

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-4xl text-white tracking-wide">
          TABLEAU DE <span className="text-accent">BORD</span>
        </h1>
        <p className="text-muted font-mono text-sm mt-1">Vue d'ensemble de tes performances</p>
      </motion.div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Equity Totale"
          value={`$${currentEquity.toLocaleString('en', { maximumFractionDigits: 0 })}`}
          subtitle={`${equityChange >= 0 ? '+' : ''}${equityChange.toFixed(2)}% depuis départ`}
          icon={DollarSign}
          color={analytics.totalPnl >= 0 ? 'bull' : 'bear'}
          trend={equityChange}
          delay={0}
        />
        <StatCard
          title="Win Rate"
          value={`${analytics.winRate.toFixed(1)}%`}
          subtitle={`${trades.filter(t => t.status === 'CLOSED' && (t.pnl ?? 0) > 0).length}W / ${trades.filter(t => t.status === 'CLOSED' && (t.pnl ?? 0) < 0).length}L`}
          icon={Target}
          color={analytics.winRate >= 55 ? 'bull' : analytics.winRate >= 45 ? 'accent' : 'bear'}
          delay={0.1}
        />
        <StatCard
          title="Profit Factor"
          value={analytics.profitFactor === 999 ? '∞' : analytics.profitFactor.toFixed(2)}
          subtitle="Gains bruts / Pertes brutes"
          icon={TrendingUp}
          color={analytics.profitFactor >= 1.5 ? 'bull' : analytics.profitFactor >= 1 ? 'accent' : 'bear'}
          delay={0.2}
        />
        <StatCard
          title="Expectancy"
          value={`${analytics.expectancy >= 0 ? '+' : ''}$${analytics.expectancy.toFixed(2)}`}
          subtitle="Par trade moyen"
          icon={Activity}
          color={analytics.expectancy >= 0 ? 'bull' : 'bear'}
          delay={0.3}
        />
      </div>

      {/* Equity Curve */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="bg-panel rounded-2xl border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display text-xl text-white tracking-wide">COURBE D'ÉQUITÉ</h2>
            <p className="text-xs text-muted font-mono">Évolution du capital dans le temps</p>
          </div>
          <div className={`px-3 py-1.5 rounded-lg border font-mono text-sm font-bold ${
            analytics.totalPnl >= 0 ? 'bg-bull-dim border-bull/20 text-bull' : 'bg-bear-dim border-bear/20 text-bear'
          }`}>
            {analytics.totalPnl >= 0 ? '+' : ''}{analytics.totalPnl.toFixed(2)}$
          </div>
        </div>
        <EquityCurve />
      </motion.div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Trades */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="lg:col-span-2 bg-panel rounded-2xl border border-border p-5">
          <h2 className="font-display text-xl text-white tracking-wide mb-4">TRADES RÉCENTS</h2>
          <RecentTrades limit={6} />
        </motion.div>

        {/* Side column */}
        <div className="space-y-4">
          {/* Extended stats */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
            className="bg-panel rounded-2xl border border-border p-5">
            <h2 className="font-display text-xl text-white tracking-wide mb-4">STATISTIQUES</h2>
            <div className="space-y-3">
              {[
                { label: 'Avg Win', value: `+$${analytics.avgWin.toFixed(2)}`, color: 'text-bull' },
                { label: 'Avg Loss', value: `-$${analytics.avgLoss.toFixed(2)}`, color: 'text-bear' },
                { label: 'Max Drawdown', value: `-$${analytics.maxDrawdown.toFixed(2)}`, color: 'text-bear' },
                { label: 'Avg R:R', value: `1:${analytics.avgRR.toFixed(2)}`, color: 'text-accent' },
                { label: 'Best Trade', value: `+$${analytics.bestTrade.toFixed(2)}`, color: 'text-bull' },
                { label: 'Worst Trade', value: `$${analytics.worstTrade.toFixed(2)}`, color: 'text-bear' },
                { label: 'Série Wins', value: `${analytics.consecutiveWins} max`, color: 'text-gold' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <span className="text-xs text-muted font-mono uppercase">{label}</span>
                  <span className={`text-sm font-mono font-bold ${color}`}>{value}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Insights */}
          {insights.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
              className="bg-panel rounded-2xl border border-accent/20 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Brain className="w-4 h-4 text-accent" />
                <h2 className="font-display text-xl text-accent tracking-wide">INSIGHTS IA</h2>
              </div>
              <div className="space-y-3">
                {insights.slice(0, 4).map((insight, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.05 }}
                    className="text-xs text-white/80 leading-relaxed bg-accent/5 rounded-lg p-3 border border-accent/10">
                    {insight}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
