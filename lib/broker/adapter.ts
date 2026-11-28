/**
 * Common broker adapter contract.
 * Adapters must only expose methods that are genuinely supported.
 * Unsupported operations must throw BrokerCapabilityError — never invent data.
 */

import type { BrokerCapability, BrokerCatalogEntry } from './core'
import { BROKER_CATALOG } from './core'

export type BrokerEnvironment = 'demo' | 'real'
export type AccountEnvironment = BrokerEnvironment

export interface BrokerAccountIdentity {
  brokerId: string
  accountId: string
  environment: AccountEnvironment
  currency?: string
  nickname?: string
  server?: string
  platform?: BrokerCatalogEntry['platform']
}

export interface BrokerBalanceSnapshot {
  balance: number
  equity?: number
  credit?: number
  floatingPnl?: number
  usedMargin?: number
  freeMargin?: number
  marginLevel?: number
  leverage?: number
  currency: string
  retrievedAt: string
  source: string
}

export interface BrokerPosition {
  id: string
  symbol: string
  direction: 'BUY' | 'SELL'
  volume: number
  entryPrice: number
  currentPrice?: number
  stopLoss?: number
  takeProfit?: number
  unrealizedPnl?: number
  openedAt?: string
  raw?: Record<string, unknown>
}

export interface BrokerOrder {
  id: string
  symbol: string
  direction: 'BUY' | 'SELL'
  type: string
  volume: number
  price?: number
  stopLoss?: number
  takeProfit?: number
  status: string
  createdAt?: string
  raw?: Record<string, unknown>
}

export interface BrokerTradeHistoryItem {
  id: string
  symbol: string
  direction: 'BUY' | 'SELL'
  volume: number
  entryPrice?: number
  exitPrice?: number
  pnl?: number
  fees?: number
  openedAt?: string
  closedAt?: string
  raw?: Record<string, unknown>
}

export interface BrokerTransaction {
  id: string
  type: string
  amount?: number
  balanceAfter?: number
  currency?: string
  timestamp?: string
  raw?: Record<string, unknown>
}

export interface BrokerInstrumentSpec {
  symbol: string
  displayName?: string
  tickSize?: number
  tickValue?: number
  contractSize?: number
  volumeMin?: number
  volumeMax?: number
  volumeStep?: number
  marginRate?: number
  quoteCurrency?: string
  raw?: Record<string, unknown>
}

export interface BrokerSyncResult {
  status: 'synchronized' | 'partial' | 'failed'
  account: BrokerAccountIdentity
  balance?: BrokerBalanceSnapshot
  positions?: BrokerPosition[]
  orders?: BrokerOrder[]
  history?: BrokerTradeHistoryItem[]
  transactions?: BrokerTransaction[]
  capabilities: BrokerCapability[]
  errors: string[]
  synchronizedAt: string
  incomplete: boolean
}

export class BrokerCapabilityError extends Error {
  constructor(public readonly capability: string, message?: string) {
    super(message ?? `Broker capability "${capability}" is not supported by this adapter.`)
    this.name = 'BrokerCapabilityError'
  }
}

export class BrokerConnectionError extends Error {
  constructor(message: string, public readonly code: string = 'connection_error') {
    super(message)
    this.name = 'BrokerConnectionError'
  }
}

export interface BrokerAdapter {
  readonly brokerId: string
  readonly capabilities: readonly BrokerCapability[]
  getCapabilities(): BrokerCapability[]
  validateConnection(): Promise<{ ok: boolean; message: string; accountId?: string }>
  getAccounts(): Promise<BrokerAccountIdentity[]>
  getAccountDetails(accountId: string): Promise<BrokerAccountIdentity>
  getBalance(accountId: string): Promise<BrokerBalanceSnapshot>
  synchronizeAccount(accountId: string): Promise<BrokerSyncResult>
}

export function catalogCapabilities(brokerId: string): BrokerCapability[] {
  return BROKER_CATALOG.find(entry => entry.id === brokerId)?.capabilities.slice() ?? []
}

export function assertCapability(adapter: BrokerAdapter, capability: BrokerCapability) {
  if (!adapter.capabilities.includes(capability)) {
    throw new BrokerCapabilityError(capability)
  }
}

export function buildFailedSync(
  account: BrokerAccountIdentity,
  capabilities: BrokerCapability[],
  errors: string[],
): BrokerSyncResult {
  return {
    status: 'failed',
    account,
    capabilities,
    errors,
    synchronizedAt: new Date().toISOString(),
    incomplete: true,
  }
}
