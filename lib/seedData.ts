import { db } from './db'
import type { Trade } from '@/types'
import { v4 as uuidv4 } from 'uuid'
import { subDays, subHours, format } from 'date-fns'

export const DEMO_TRADES: Omit<Trade, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    symbol: 'EURUSD', assetClass: 'Forex', direction: 'BUY', status: 'CLOSED', source: 'demo',
    entryDate: subDays(new Date(), 1).toISOString(), exitDate: subHours(new Date(), 20).toISOString(),
    entryPrice: 1.08450, exitPrice: 1.08780, positionSize: 10000,
    stopLoss: 1.08200, takeProfit: 1.08900, riskAmount: 250,
    pnl: 330, pnlPercent: 3.3, riskReward: 1.32,
    strategy: 'Trend Following', timeframe: 'H4',
    emotions: ['confident', 'disciplined'],
    notes: 'Beau breakout sur zone de support testé 3 fois. Entrée au retest parfait.', lessons: 'Patience payante.',
    tags: ['HTF aligned', 'Smart Money'], images: [], executionScore: 9, disciplineScore: 9,
  },
  {
    symbol: 'BTCUSD', assetClass: 'Crypto', direction: 'BUY', status: 'CLOSED', source: 'demo',
    entryDate: subDays(new Date(), 3).toISOString(), exitDate: subDays(new Date(), 2).toISOString(),
    entryPrice: 67200, exitPrice: 68500, positionSize: 0.5,
    stopLoss: 66800, takeProfit: 69000, riskAmount: 200,
    pnl: 650, pnlPercent: 6.5, riskReward: 2.25,
    strategy: 'Breakout', timeframe: 'D1',
    emotions: ['confident', 'patient'],
    notes: 'Breakout bullish flag sur daily. Volume confirme.', lessons: 'Ne pas sortir trop tôt.',
    tags: ['Divergence'], images: [], executionScore: 8, disciplineScore: 8,
  },
  {
    symbol: 'SP500', assetClass: 'Indices', direction: 'SELL', status: 'CLOSED', source: 'demo',
    entryDate: subDays(new Date(), 5).toISOString(), exitDate: subDays(new Date(), 4).toISOString(),
    entryPrice: 5240, exitPrice: 5180, positionSize: 2,
    stopLoss: 5260, takeProfit: 5150, riskAmount: 400,
    pnl: -240, pnlPercent: -2.4, riskReward: 0.75,
    strategy: 'Mean Reversion', timeframe: 'H1',
    emotions: ['revenge', 'impulsive'],
    notes: 'Entré trop tôt, pas de confirmation. SL trop serré.', lessons: 'Attendre la confirmation. Ne pas trader en colère.',
    tags: [], images: [], executionScore: 3, disciplineScore: 2,
  },
  {
    symbol: 'GBPJPY', assetClass: 'Forex', direction: 'BUY', status: 'CLOSED', source: 'demo',
    entryDate: subDays(new Date(), 7).toISOString(), exitDate: subDays(new Date(), 6).toISOString(),
    entryPrice: 197.45, exitPrice: 198.20, positionSize: 5000,
    stopLoss: 197.00, takeProfit: 198.50, riskAmount: 225,
    pnl: 375, pnlPercent: 3.75, riskReward: 1.67,
    strategy: 'Trend Following', timeframe: 'H4',
    emotions: ['calm', 'disciplined'],
    notes: 'Tendance haussière claire, pullback sur EMA20. Risque bien défini.', lessons: '',
    tags: ['HTF aligned'], images: [], executionScore: 8, disciplineScore: 9,
  },
  {
    symbol: 'EURUSD', assetClass: 'Forex', direction: 'SELL', status: 'CLOSED', source: 'demo',
    entryDate: subDays(new Date(), 10).toISOString(), exitDate: subDays(new Date(), 9).toISOString(),
    entryPrice: 1.09120, exitPrice: 1.08680, positionSize: 10000,
    stopLoss: 1.09350, takeProfit: 1.08500,
    pnl: 440, pnlPercent: 4.4, riskReward: 2.7,
    strategy: 'Breakout', timeframe: 'H1',
    emotions: ['confident'],
    notes: 'Breakdown sous support clé avec forte mèche baissière.', lessons: '',
    tags: ['Supply/Demand'], images: [], executionScore: 9, disciplineScore: 10,
  },
  {
    symbol: 'ETHUSDT', assetClass: 'Crypto', direction: 'BUY', status: 'CLOSED', source: 'demo',
    entryDate: subDays(new Date(), 12).toISOString(), exitDate: subDays(new Date(), 11).toISOString(),
    entryPrice: 3180, exitPrice: 3050, positionSize: 2,
    stopLoss: 3100, takeProfit: 3400,
    pnl: -260, pnlPercent: -2.6, riskReward: 1.1,
    strategy: 'Mean Reversion', timeframe: 'H4',
    emotions: ['fomo', 'anxious'],
    notes: 'Entré sur FOMO après un pump. Mauvais timing.', lessons: 'Ne jamais chaser une bougie. Attendre le pullback.',
    tags: [], images: [], executionScore: 3, disciplineScore: 3,
  },
  {
    symbol: 'USDJPY', assetClass: 'Forex', direction: 'SELL', status: 'CLOSED', source: 'demo',
    entryDate: subDays(new Date(), 14).toISOString(), exitDate: subDays(new Date(), 13).toISOString(),
    entryPrice: 154.80, exitPrice: 153.90, positionSize: 8000,
    stopLoss: 155.20, takeProfit: 153.50,
    pnl: 720, pnlPercent: 7.2, riskReward: 3.25,
    strategy: 'Trend Following', timeframe: 'D1',
    emotions: ['patient', 'confident'],
    notes: 'Divergence baissière sur RSI daily. Laisser courir les profits.', lessons: '',
    tags: ['Divergence', 'HTF aligned'], images: [], executionScore: 10, disciplineScore: 10,
  },
  {
    symbol: 'GOLD', assetClass: 'Commodities', direction: 'BUY', status: 'OPEN', source: 'demo',
    entryDate: new Date().toISOString(),
    entryPrice: 2325.50, positionSize: 1,
    stopLoss: 2310, takeProfit: 2360,
    riskAmount: 155, riskReward: 2.23,
    strategy: 'Trend Following', timeframe: 'H4',
    emotions: ['confident'],
    notes: 'Zone support + confluence avec macro (USD faible).', lessons: '',
    tags: ['HTF aligned'], images: [], executionScore: 8, disciplineScore: 9,
  },
]

export async function seedDemoData() {
  const count = await db.trades.count()
  if (count > 0) return

  const trades: Trade[] = DEMO_TRADES.map(t => ({
    ...t,
    id: uuidv4(),
    createdAt: t.entryDate,
    updatedAt: new Date().toISOString(),
  }))

  await db.trades.bulkAdd(trades)
}
