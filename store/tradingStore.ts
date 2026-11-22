import { create } from 'zustand'
import { db, getSettings, defaultSettings } from '@/lib/db'
import type { Trade, UserSettings } from '@/types'
import { v4 as uuidv4 } from 'uuid'

interface TradingStore {
  trades: Trade[]
  settings: UserSettings
  loading: boolean
  selectedTrade: Trade | null
  loadAll: () => Promise<void>
  addTrade: (trade: Omit<Trade, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Trade>
  updateTrade: (id: string, data: Partial<Trade>) => Promise<void>
  deleteTrade: (id: string) => Promise<void>
  setSelectedTrade: (trade: Trade | null) => void
  updateSettings: (data: Partial<UserSettings>) => Promise<void>
}

export const useTradingStore = create<TradingStore>((set, get) => ({
  trades: [],
  settings: defaultSettings,
  loading: true,
  selectedTrade: null,

  loadAll: async () => {
    const [trades, settings] = await Promise.all([
      db.trades.orderBy('entryDate').reverse().toArray(),
      getSettings(),
    ])
    set({ trades, settings, loading: false })
  },

  addTrade: async (tradeData) => {
    const trade: Trade = {
      ...tradeData,
      source: tradeData.source ?? 'manual',
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    if (trade.entryPrice && trade.stopLoss && trade.takeProfit) {
      const risk = Math.abs(trade.entryPrice - trade.stopLoss)
      const reward = Math.abs((trade.takeProfit ?? trade.entryPrice) - trade.entryPrice)
      if (risk > 0) trade.riskReward = reward / risk
    }
    if (trade.exitPrice && trade.entryPrice && trade.positionSize) {
      const diff = trade.direction === 'BUY'
        ? trade.exitPrice - trade.entryPrice
        : trade.entryPrice - trade.exitPrice
      trade.pnl = diff * trade.positionSize
      const settings = get().settings
      trade.pnlPercent = settings.accountBalance > 0 ? (trade.pnl / settings.accountBalance) * 100 : undefined
    }
    await db.trades.add(trade)
    set(s => ({ trades: [trade, ...s.trades] }))
    return trade
  },

  updateTrade: async (id, data) => {
    const updated = { ...data, updatedAt: new Date().toISOString() }
    await db.trades.update(id, updated)
    set(s => ({ trades: s.trades.map(t => t.id === id ? { ...t, ...updated } : t) }))
  },

  deleteTrade: async (id) => {
    await db.trades.delete(id)
    set(s => ({ trades: s.trades.filter(t => t.id !== id) }))
  },

  setSelectedTrade: (trade) => set({ selectedTrade: trade }),

  updateSettings: async (data) => {
    const { updateSettings: dbUpdate } = await import('@/lib/db')
    await dbUpdate(data)
    set(s => ({ settings: { ...s.settings, ...data } }))
  },
}))
