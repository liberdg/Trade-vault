export type AssetClass = 'Forex' | 'Crypto' | 'Indices' | 'Stocks' | 'Commodities' | 'Options'
export type TradeDirection = 'BUY' | 'SELL'
export type TradeStatus = 'OPEN' | 'CLOSED' | 'CANCELLED'
export type EmotionTag = 'confident' | 'fearful' | 'greedy' | 'revenge' | 'calm' | 'anxious' | 'fomo' | 'disciplined' | 'impulsive' | 'patient'
export type SessionType = 'London' | 'New York' | 'Asia' | 'Pre-Market' | 'After-Hours'
export type TradeSource = 'demo' | 'manual' | 'imported' | 'broker'

export interface TradeImage {
  id: string
  data: string // base64
  caption?: string
  type: 'entry' | 'exit' | 'analysis' | 'other'
  createdAt: string
}

export interface Trade {
  id: string
  createdAt: string
  updatedAt: string
  
  // Core fields
  symbol: string
  assetClass: AssetClass
  direction: TradeDirection
  status: TradeStatus
  source?: TradeSource
  
  // Timing
  entryDate: string
  exitDate?: string
  session?: SessionType
  
  // Execution
  entryPrice: number
  exitPrice?: number
  positionSize: number
  
  // Risk Management
  stopLoss?: number
  takeProfit?: number
  riskAmount?: number
  
  // Results
  pnl?: number
  pnlPercent?: number
  riskReward?: number
  mfe?: number // Max Favorable Excursion
  mae?: number // Max Adverse Excursion
  
  // Context
  strategy?: string
  setup?: string
  timeframe?: string
  emotions: EmotionTag[]
  notes?: string
  lessons?: string
  tags: string[]
  
  // Media
  images: TradeImage[]
  
  // Scoring
  executionScore?: number // 1-10
  disciplineScore?: number // 1-10
}

export interface DailyStats {
  date: string
  pnl: number
  trades: number
  winRate: number
}

export interface Strategy {
  id: string
  name: string
  description?: string
  rules?: string[]
  winRate?: number
  avgRR?: number
  color: string
}

export interface Goal {
  id: string
  title: string
  type: 'profit' | 'winrate' | 'discipline' | 'trades' | 'custom'
  target: number
  current: number
  unit: string
  deadline?: string
  createdAt: string
  completed: boolean
}

export interface UserSettings {
  id?: number
  displayName: string
  currency: string
  accountBalance: number
  riskPerTrade: number
  theme: 'void' | 'midnight' | 'matrix'
  defaultAsset: AssetClass
  timezone: string
  strategies: Strategy[]
  customTags: string[]
  goals: Goal[]
  dashboardLayout: string[]
}

export interface AnalyticsData {
  totalTrades: number
  winRate: number
  totalPnl: number
  avgWin: number
  avgLoss: number
  profitFactor: number
  avgRR: number
  maxDrawdown: number
  bestTrade: number
  worstTrade: number
  avgDuration: number
  consecutiveWins: number
  consecutiveLosses: number
  expectancy: number
}
