import Dexie, { Table } from 'dexie'
import type { Trade, UserSettings, BrokerConnection, BrokerAccountSnapshot } from '@/types'

export class TradingJournalDB extends Dexie {
  trades!: Table<Trade>
  settings!: Table<UserSettings>
  brokerConnections!: Table<BrokerConnection>
  accountSnapshots!: Table<BrokerAccountSnapshot>

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
    this.version(3).stores({
      trades: 'id, createdAt, entryDate, exitDate, symbol, assetClass, direction, status, strategy, pnl, source',
      settings: '++id',
      brokerConnections: 'id, brokerId, status, environment, accountId, updatedAt',
      accountSnapshots: 'id, brokerId, accountId, environment, retrievedAt',
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

function stripSecrets(settings: UserSettings): UserSettings {
  // Never keep broker API tokens in durable IndexedDB storage.
  const { derivToken: _removed, ...rest } = settings
  return rest
}

export async function getSettings(): Promise<UserSettings> {
  const settings = await db.settings.toArray()
  if (settings.length === 0) {
    await db.settings.add(defaultSettings)
    return defaultSettings
  }
  const current = settings[0]
  if (current.derivToken) {
    // Dexie ignores undefined updates — rewrite the row without the secret.
    await db.settings.put(stripSecrets(current))
    return stripSecrets(current)
  }
  return current
}

export async function updateSettings(data: Partial<UserSettings>) {
  const { derivToken: _ignored, ...safeData } = data
  const settings = await db.settings.toArray()
  if (settings.length === 0) {
    await db.settings.add(stripSecrets({ ...defaultSettings, ...safeData }))
  } else {
    const next = stripSecrets({ ...settings[0], ...safeData })
    await db.settings.put(next)
  }
}

export async function upsertAccountSnapshot(snapshot: BrokerAccountSnapshot) {
  await db.accountSnapshots.put(snapshot)
}

export async function getLatestAccountSnapshot(brokerId: string, accountId: string, environment: 'demo' | 'real') {
  const rows = await db.accountSnapshots
    .where('accountId')
    .equals(accountId)
    .filter(row => row.brokerId === brokerId && row.environment === environment)
    .toArray()
  return rows.sort((a, b) => a.retrievedAt.localeCompare(b.retrievedAt)).at(-1)
}
