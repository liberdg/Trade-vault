import Dexie, { Table } from 'dexie'
import type { Trade, UserSettings, BrokerConnection } from '@/types'

export class TradingJournalDB extends Dexie {
  trades!: Table<Trade>
  settings!: Table<UserSettings>
  brokerConnections!: Table<BrokerConnection>

  constructor() {
    super('TradingJournalDB')
    this.version(1).stores({
      trades: 'id, createdAt, entryDate, exitDate, symbol, assetClass, direction, status, strategy, pnl',
      settings: '++id',
    })
    this.version(2).stores({
      trades: 'id, createdAt, entryDate, exitDate, symbol, assetClass, direction, status, strategy, pnl',
      settings: '++id',
      brokerConnections: 'id, brokerId, status, environment, accountId, updatedAt',
    })
  }
}

export const db = new TradingJournalDB()

export const defaultSettings: UserSettings = {
  displayName: 'Trader',
  currency: 'USD',
  accountBalance: 0,
  riskPerTrade: 1,
  theme: 'void',
  defaultAsset: 'Forex',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  strategies: [
    { id: '1', name: 'Breakout', color: '#00d4ff', description: 'Price breakout above key levels' },
    { id: '2', name: 'Trend Following', color: '#00ff88', description: 'Follow the dominant trend' },
    { id: '3', name: 'Mean Reversion', color: '#ffd700', description: 'Trade back to the mean' },
    { id: '4', name: 'News Trading', color: '#ff3355', description: 'Trade fundamental catalysts' },
  ],
  customTags: ['HTF aligned', 'Smart Money', 'ICT', 'Supply/Demand', 'Divergence', 'Pattern'],
  goals: [],
  dashboardLayout: ['equity', 'stats', 'recent', 'calendar', 'analytics', 'emotions'],
}

export async function getSettings(): Promise<UserSettings> {
  const settings = await db.settings.toArray()
  if (settings.length === 0) {
    await db.settings.add(defaultSettings)
    return defaultSettings
  }
  return settings[0]
}

export async function updateSettings(data: Partial<UserSettings>) {
  const settings = await db.settings.toArray()
  if (settings.length === 0) {
    await db.settings.add({ ...defaultSettings, ...data })
  } else {
    await db.settings.update(settings[0].id!, data)
  }
}
