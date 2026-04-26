'use client'
import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ScatterChart, Scatter } from 'recharts'
import { useTradingStore } from '@/store/tradingStore'
import { computeAnalytics, getAssetPerformance, getEmotionAnalysis, getDailyStats, generateInsights } from '@/lib/analytics'
import { Brain, TrendingUp, Target, Zap } from 'lucide-react'

const RCOLORS = ['#00d4ff', '#00ff88', '#ffd700', '#ff3355', '#ff8800', '#aa44ff']

export default function AnalyticsPage() {
  const { trades, settings } = useTradingStore()
  const analytics = useMemo(() => computeAnalytics(trades), [trades])
  const assetPerf = useMemo(() => getAssetPerformance(trades), [trades])
  const emotions = useMemo(() => getEmotionAnalysis(trades), [trades])
  const daily = useMemo(() => getDailyStats(trades), [trades])
  const insights = useMemo(() => generateInsights(trades), [trades])

  // Heatmap: day of week x hour
  const heatmapData = useMemo(() => {
    const map: Record<string, number> = {}
    trades.filter(t => t.status === 'CLOSED' && t.pnl !== undefined).forEach(t => {
      const d = new Date(t.entryDate)
      const key = `${d.getDay()}-${d.getHours()}`
      map[key] = (map[key] ?? 0) + (t.pnl ?? 0)
    })
    return map
  }, [trades])

  const weekdays = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
  const hours = Array.from({ length: 24 }, (_, i) => i)

  // Monthly PnL bars
  const monthlyPnl = useMemo(() => {
    const map = new Map<string, number>()
    trades.filter(t => t.status === 'CLOSED' && t.pnl !== undefined).forEach(t => {
      const key = t.entryDate.slice(0, 7)
      map.set(key, (map.get(key) ?? 0) + (t.pnl ?? 0))
    })
    return Array.from(map.entries()).map(([month, pnl]) => ({ month, pnl })).sort((a,b) => a.month.localeCompare(b.month))
  }, [trades])

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-panel border border-border rounded-lg px-3 py-2 text-xs font-mono">
        <div className="text-muted">{payload[0].name}</div>
        <div className={payload[0].value >= 0 ? 'text-bull font-bold' : 'text-bear font-bold'}>
          {payload[0].value >= 0 ? '+' : ''}{typeof payload[0].value === 'number' ? payload[0].value.toFixed(2) : payload[0].value}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl text-white tracking-wide">ANALYTICS <span className="text-accent">AVANCÉS</span></h1>
        <p className="text-muted font-mono text-sm mt-1">Analyse approfondie de tes performances</p>
      </div>

      {/* Core metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Trades', value: analytics.totalTrades, color: 'text-accent' },
          { label: 'Win Rate', value: `${analytics.winRate.toFixed(1)}%`, color: analytics.winRate >= 50 ? 'text-bull' : 'text-bear' },
          { label: 'Profit Factor', value: analytics.profitFactor.toFixed(2), color: analytics.profitFactor >= 1.5 ? 'text-bull' : 'text-bear' },
          { label: 'Expectancy', value: `$${analytics.expectancy.toFixed(2)}`, color: analytics.expectancy >= 0 ? 'text-bull' : 'text-bear' },
        ].map(({ label, value, color }, i) => (
          <motion.div key={label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="bg-panel rounded-xl border border-border p-4">
            <div className="text-xs text-muted font-mono uppercase mb-2">{label}</div>
            <div className={`font-display text-3xl tracking-wide ${color}`}>{value}</div>
          </motion.div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly PnL */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-panel rounded-2xl border border-border p-5">
          <h3 className="font-display text-lg text-white tracking-wide mb-4">P&L PAR MOIS</h3>
          {monthlyPnl.length > 0 ? (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyPnl}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,45,61,0.6)" />
                  <XAxis dataKey="month" tick={{ fill: '#6b8fa8', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#6b8fa8', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="pnl" name="P&L" radius={[4, 4, 0, 0]}>
                    {monthlyPnl.map((entry, i) => (
                      <Cell key={i} fill={entry.pnl >= 0 ? '#00ff88' : '#ff3355'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <div className="h-52 flex items-center justify-center text-muted font-mono text-sm">Pas de données</div>}
        </motion.div>

        {/* Asset Performance */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="bg-panel rounded-2xl border border-border p-5">
          <h3 className="font-display text-lg text-white tracking-wide mb-4">PERFORMANCE PAR ACTIF</h3>
          {assetPerf.length > 0 ? (
            <div className="space-y-3">
              {assetPerf.slice(0, 7).map((a, i) => (
                <div key={a.symbol} className="flex items-center gap-3">
                  <span className="font-mono text-sm text-white w-20 shrink-0">{a.symbol}</span>
                  <div className="flex-1 h-6 bg-surface rounded-full overflow-hidden relative">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(Math.abs(a.pnl) / (assetPerf[0]?.pnl || 1) * 100, 100)}%` }}
                      transition={{ delay: 0.3 + i * 0.05, duration: 0.6 }}
                      className={`h-full rounded-full ${a.pnl >= 0 ? 'bg-gradient-to-r from-bull/40 to-bull' : 'bg-gradient-to-r from-bear/40 to-bear'}`} />
                  </div>
                  <span className={`font-mono text-sm font-bold w-20 text-right shrink-0 ${a.pnl >= 0 ? 'text-bull' : 'text-bear'}`}>
                    {a.pnl >= 0 ? '+' : ''}{a.pnl.toFixed(0)}$
                  </span>
                  <span className="font-mono text-xs text-muted w-12 text-right">{a.winRate.toFixed(0)}%</span>
                </div>
              ))}
            </div>
          ) : <div className="h-40 flex items-center justify-center text-muted font-mono text-sm">Pas de données</div>}
        </motion.div>
      </div>

      {/* Emotion Analysis */}
      {emotions.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="bg-panel rounded-2xl border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="w-5 h-5 text-accent" />
            <h3 className="font-display text-lg text-white tracking-wide">ÉMOTIONS VS RÉSULTATS</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {emotions.map(e => (
              <div key={e.emotion} className="bg-surface rounded-xl p-4 border border-border">
                <div className="text-sm font-mono text-white capitalize mb-2">{e.emotion}</div>
                <div className={`font-display text-2xl tracking-wide ${e.winRate >= 50 ? 'text-bull' : 'text-bear'}`}>{e.winRate.toFixed(0)}%</div>
                <div className="text-xs text-muted font-mono mt-1">{e.wins}W / {e.losses}L</div>
                <div className="mt-2 h-1.5 bg-muted/20 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${e.winRate >= 50 ? 'bg-bull' : 'bg-bear'}`} style={{ width: `${e.winRate}%` }} />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Heatmap */}
      {Object.keys(heatmapData).length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="bg-panel rounded-2xl border border-border p-5">
          <h3 className="font-display text-lg text-white tracking-wide mb-4">HEATMAP — HEURE × JOUR</h3>
          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              <div className="grid grid-cols-[40px_repeat(24,_1fr)] gap-1 mb-1">
                <div />
                {hours.map(h => <div key={h} className="text-[9px] text-muted font-mono text-center">{h}h</div>)}
              </div>
              {weekdays.map((day, di) => (
                <div key={day} className="grid grid-cols-[40px_repeat(24,_1fr)] gap-1 mb-1">
                  <div className="text-[10px] text-muted font-mono flex items-center">{day}</div>
                  {hours.map(h => {
                    const val = heatmapData[`${di}-${h}`] ?? 0
                    const intensity = val === 0 ? 0 : Math.min(Math.abs(val) / 100, 1)
                    return (
                      <div key={h} className="h-5 rounded-sm transition-all"
                        title={val !== 0 ? `${val.toFixed(2)}$` : ''}
                        style={{
                          background: val > 0 ? `rgba(0,255,136,${0.1 + intensity * 0.8})` : val < 0 ? `rgba(255,51,85,${0.1 + intensity * 0.8})` : 'rgba(26,45,61,0.4)'
                        }} />
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs font-mono text-muted">
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-bull/60" /><span>Profitable</span></div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-bear/60" /><span>En perte</span></div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-border" /><span>Inactif</span></div>
          </div>
        </motion.div>
      )}

      {/* Insights */}
      {insights.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="bg-panel rounded-2xl border border-accent/20 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-accent" />
            <h3 className="font-display text-lg text-accent tracking-wide">INSIGHTS & RECOMMANDATIONS</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {insights.map((insight, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.05 }}
                className="bg-accent/5 border border-accent/10 rounded-xl p-4 text-sm text-white/80 leading-relaxed">
                {insight}
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}
