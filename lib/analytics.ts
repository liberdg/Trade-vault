import type { Trade, AnalyticsData, DailyStats } from '@/types'
import { format, parseISO, differenceInMinutes } from 'date-fns'

export function computeAnalytics(trades: Trade[]): AnalyticsData {
  const closed = trades.filter(t => t.status === 'CLOSED' && t.pnl !== undefined)
  if (closed.length === 0) {
    return {
      totalTrades: 0, winRate: 0, totalPnl: 0, avgWin: 0, avgLoss: 0,
      profitFactor: 0, avgRR: 0, maxDrawdown: 0, bestTrade: 0, worstTrade: 0,
      avgDuration: 0, consecutiveWins: 0, consecutiveLosses: 0, expectancy: 0,
    }
  }

  const wins = closed.filter(t => (t.pnl ?? 0) > 0)
  const losses = closed.filter(t => (t.pnl ?? 0) < 0)
  const totalPnl = closed.reduce((s, t) => s + (t.pnl ?? 0), 0)
  const winRate = (wins.length / closed.length) * 100
  const avgWin = wins.length ? wins.reduce((s, t) => s + (t.pnl ?? 0), 0) / wins.length : 0
  const avgLoss = losses.length ? Math.abs(losses.reduce((s, t) => s + (t.pnl ?? 0), 0) / losses.length) : 0
  const grossProfit = wins.reduce((s, t) => s + (t.pnl ?? 0), 0)
  const grossLoss = Math.abs(losses.reduce((s, t) => s + (t.pnl ?? 0), 0))
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0
  const avgRR = closed.filter(t => t.riskReward).reduce((s, t) => s + (t.riskReward ?? 0), 0) / (closed.filter(t => t.riskReward).length || 1)

  // Max Drawdown
  let peak = 0, drawdown = 0, running = 0, maxDrawdown = 0
  for (const t of closed.sort((a, b) => a.entryDate.localeCompare(b.entryDate))) {
    running += t.pnl ?? 0
    if (running > peak) peak = running
    drawdown = peak - running
    if (drawdown > maxDrawdown) maxDrawdown = drawdown
  }

  // Consecutive
  let maxWins = 0, maxLosses = 0, curWins = 0, curLosses = 0
  for (const t of closed.sort((a, b) => a.entryDate.localeCompare(b.entryDate))) {
    if ((t.pnl ?? 0) > 0) { curWins++; curLosses = 0; maxWins = Math.max(maxWins, curWins) }
    else { curLosses++; curWins = 0; maxLosses = Math.max(maxLosses, curLosses) }
  }

  // Avg duration
  const withDuration = closed.filter(t => t.exitDate)
  const avgDuration = withDuration.length
    ? withDuration.reduce((s, t) => s + differenceInMinutes(parseISO(t.exitDate!), parseISO(t.entryDate)), 0) / withDuration.length
    : 0

  const expectancy = (winRate / 100) * avgWin - (1 - winRate / 100) * avgLoss

  return {
    totalTrades: closed.length,
    winRate,
    totalPnl,
    avgWin,
    avgLoss,
    profitFactor,
    avgRR,
    maxDrawdown,
    bestTrade: Math.max(...closed.map(t => t.pnl ?? 0), 0),
    worstTrade: Math.min(...closed.map(t => t.pnl ?? 0), 0),
    avgDuration,
    consecutiveWins: maxWins,
    consecutiveLosses: maxLosses,
    expectancy,
  }
}

export function getDailyStats(trades: Trade[]): DailyStats[] {
  const closed = trades.filter(t => t.status === 'CLOSED' && t.pnl !== undefined)
  const byDay = new Map<string, Trade[]>()

  for (const t of closed) {
    const day = format(parseISO(t.entryDate), 'yyyy-MM-dd')
    if (!byDay.has(day)) byDay.set(day, [])
    byDay.get(day)!.push(t)
  }

  return Array.from(byDay.entries()).map(([date, dayTrades]) => ({
    date,
    pnl: dayTrades.reduce((s, t) => s + (t.pnl ?? 0), 0),
    trades: dayTrades.length,
    winRate: (dayTrades.filter(t => (t.pnl ?? 0) > 0).length / dayTrades.length) * 100,
  })).sort((a, b) => a.date.localeCompare(b.date))
}

export function getEquityCurve(trades: Trade[], initialBalance: number) {
  const daily = getDailyStats(trades)
  let balance = initialBalance
  return [
    { date: 'Start', equity: balance, pnl: 0 },
    ...daily.map(d => {
      balance += d.pnl
      return { date: d.date, equity: balance, pnl: d.pnl }
    })
  ]
}

export function getEmotionAnalysis(trades: Trade[]) {
  const closed = trades.filter(t => t.status === 'CLOSED' && t.pnl !== undefined)
  const emotionMap = new Map<string, { wins: number; losses: number; pnl: number }>()

  for (const t of closed) {
    for (const emotion of t.emotions) {
      if (!emotionMap.has(emotion)) emotionMap.set(emotion, { wins: 0, losses: 0, pnl: 0 })
      const e = emotionMap.get(emotion)!
      if ((t.pnl ?? 0) > 0) e.wins++
      else e.losses++
      e.pnl += t.pnl ?? 0
    }
  }

  return Array.from(emotionMap.entries()).map(([emotion, data]) => ({
    emotion,
    ...data,
    total: data.wins + data.losses,
    winRate: data.wins + data.losses > 0 ? (data.wins / (data.wins + data.losses)) * 100 : 0,
  }))
}

export function getAssetPerformance(trades: Trade[]) {
  const closed = trades.filter(t => t.status === 'CLOSED' && t.pnl !== undefined)
  const map = new Map<string, { trades: number; pnl: number; wins: number }>()

  for (const t of closed) {
    if (!map.has(t.symbol)) map.set(t.symbol, { trades: 0, pnl: 0, wins: 0 })
    const s = map.get(t.symbol)!
    s.trades++
    s.pnl += t.pnl ?? 0
    if ((t.pnl ?? 0) > 0) s.wins++
  }

  return Array.from(map.entries()).map(([symbol, data]) => ({
    symbol,
    ...data,
    winRate: (data.wins / data.trades) * 100,
  })).sort((a, b) => b.pnl - a.pnl)
}

export function generateInsights(trades: Trade[]): string[] {
  const insights: string[] = []
  const closed = trades.filter(t => t.status === 'CLOSED' && t.pnl !== undefined)
  if (closed.length < 5) return ['Ajoute plus de trades pour obtenir des insights personnalisés.']

  // Hour analysis
  const byHour = new Map<number, { pnl: number; count: number }>()
  for (const t of closed) {
    const h = parseISO(t.entryDate).getHours()
    if (!byHour.has(h)) byHour.set(h, { pnl: 0, count: 0 })
    byHour.get(h)!.pnl += t.pnl ?? 0
    byHour.get(h)!.count++
  }
  const badHours = Array.from(byHour.entries()).filter(([, v]) => v.pnl < 0 && v.count >= 2)
  if (badHours.length > 0) {
    const [h] = badHours.sort((a, b) => a[1].pnl - b[1].pnl)[0]
    insights.push(`⚠️ Tu perds en moyenne ${Math.abs(byHour.get(h)!.pnl / byHour.get(h)!.count).toFixed(0)}$ quand tu trades à ${h}h. Évite ce créneau.`)
  }

  // Emotion analysis
  const badEmotions = getEmotionAnalysis(trades).filter(e => e.winRate < 40 && e.total >= 2)
  if (badEmotions.length > 0) {
    insights.push(`🧠 Quand tu te sens "${badEmotions[0].emotion}", ton win rate chute à ${badEmotions[0].winRate.toFixed(0)}%. Marque une pause.`)
  }

  // Revenge trading
  const sorted = closed.sort((a, b) => a.entryDate.localeCompare(b.entryDate))
  let revengeCount = 0
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1], curr = sorted[i]
    const diff = differenceInMinutes(parseISO(curr.entryDate), parseISO(prev.exitDate ?? prev.entryDate))
    if ((prev.pnl ?? 0) < 0 && diff < 15) revengeCount++
  }
  if (revengeCount > 2) insights.push(`🔴 ${revengeCount} trades potentiellement revanche détectés (< 15min après une perte). Discipline requise.`)

  // Best asset
  const assets = getAssetPerformance(trades)
  if (assets.length > 0 && assets[0].pnl > 0) {
    insights.push(`🏆 ${assets[0].symbol} est ton meilleur actif avec ${assets[0].pnl.toFixed(0)}$ de profit (${assets[0].winRate.toFixed(0)}% WR).`)
  }

  // Win rate by day of week
  const byDay = new Map<number, { wins: number; total: number }>()
  for (const t of closed) {
    const d = parseISO(t.entryDate).getDay()
    if (!byDay.has(d)) byDay.set(d, { wins: 0, total: 0 })
    byDay.get(d)!.total++
    if ((t.pnl ?? 0) > 0) byDay.get(d)!.wins++
  }
  const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
  const bestDay = Array.from(byDay.entries()).filter(([, v]) => v.total >= 2).sort((a, b) => (b[1].wins / b[1].total) - (a[1].wins / a[1].total))[0]
  if (bestDay) insights.push(`📅 ${days[bestDay[0]]} est ton meilleur jour avec ${((bestDay[1].wins / bestDay[1].total) * 100).toFixed(0)}% de win rate.`)

  return insights.slice(0, 6)
}
