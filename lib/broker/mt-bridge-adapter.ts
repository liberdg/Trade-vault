import type {
  BrokerAccountIdentity,
  BrokerAdapter,
  BrokerBalanceSnapshot,
  BrokerPosition,
  BrokerSyncResult,
} from './adapter'
import { BrokerConnectionError, buildFailedSync, catalogCapabilities } from './adapter'
import type { BrokerCapability } from './core'

type BridgeKind = 'mt5' | 'mt4' | 'exness'

function numeric(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return undefined
}

function bridgeConfig(kind: BridgeKind) {
  if (kind === 'mt4') {
    return {
      url: process.env.MT4_BRIDGE_URL?.trim(),
      token: process.env.MT4_BRIDGE_TOKEN?.trim(),
      label: 'MT4',
    }
  }
  return {
    url: process.env.MT5_BRIDGE_URL?.trim(),
    token: process.env.MT5_BRIDGE_TOKEN?.trim(),
    label: kind === 'exness' ? 'Exness MT5 bridge' : 'MT5',
  }
}

async function bridgeFetch(baseUrl: string, token: string, path: string) {
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}${path}`, {
    cache: 'no-store',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(12000),
  })
  const body = await response.json().catch(() => null)
  return { response, body }
}

export class MtBridgeAdapter implements BrokerAdapter {
  readonly brokerId: BridgeKind
  readonly capabilities: readonly BrokerCapability[]

  constructor(brokerId: BridgeKind) {
    this.brokerId = brokerId
    this.capabilities = catalogCapabilities(brokerId === 'exness' ? 'exness' : brokerId)
  }

  getCapabilities() {
    return [...this.capabilities]
  }

  private requireConfig() {
    const config = bridgeConfig(this.brokerId)
    if (!config.url || !config.token) {
      throw new BrokerConnectionError(`${config.label} bridge URL and pairing token are not configured.`, 'disconnected')
    }
    return config as { url: string; token: string; label: string }
  }

  async validateConnection() {
    try {
      const { url, token, label } = this.requireConfig()
      const { response, body } = await bridgeFetch(url, token, '/health')
      if (!response.ok) return { ok: false, message: `${label} bridge returned HTTP ${response.status}.` }
      if (!body?.connected || !body?.accountId) {
        return { ok: false, message: body?.message || `${label} terminal is not connected to an account.` }
      }
      return {
        ok: true,
        message: `${label} bridge authenticated and returned a terminal account.`,
        accountId: String(body.accountId),
      }
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'Bridge validation failed.',
      }
    }
  }

  async getAccounts(): Promise<BrokerAccountIdentity[]> {
    const validation = await this.validateConnection()
    if (!validation.ok || !validation.accountId) return []
    const balance = await this.getBalance(validation.accountId).catch(() => undefined)
    return [{
      brokerId: this.brokerId,
      accountId: validation.accountId,
      environment: 'demo',
      currency: balance?.currency,
      platform: this.brokerId === 'mt4' ? 'mt4' : 'mt5',
    }]
  }

  async getAccountDetails(accountId: string): Promise<BrokerAccountIdentity> {
    const balance = await this.getBalance(accountId)
    return {
      brokerId: this.brokerId,
      accountId,
      environment: 'demo',
      currency: balance.currency,
      platform: this.brokerId === 'mt4' ? 'mt4' : 'mt5',
    }
  }

  async getBalance(accountId: string): Promise<BrokerBalanceSnapshot> {
    const { url, token, label } = this.requireConfig()
    const { response, body } = await bridgeFetch(url, token, '/account')
    if (!response.ok) throw new BrokerConnectionError(`${label} account endpoint returned HTTP ${response.status}.`)
    if (body?.accountId && String(body.accountId) !== accountId) {
      throw new BrokerConnectionError('Bridge returned a different account ID. Account switch blocked.', 'account_mismatch')
    }
    const balance = numeric(body?.balance)
    const equity = numeric(body?.equity)
    const currency = typeof body?.currency === 'string' ? body.currency : undefined
    if (balance === undefined || !currency) {
      throw new BrokerConnectionError(`${label} returned incomplete account data.`, 'synchronization_error')
    }
    return {
      balance,
      equity,
      floatingPnl: numeric(body?.profit),
      usedMargin: numeric(body?.margin),
      freeMargin: numeric(body?.freeMargin),
      marginLevel: numeric(body?.marginLevel),
      leverage: numeric(body?.leverage),
      currency,
      retrievedAt: new Date().toISOString(),
      source: `${this.brokerId}.bridge.account`,
    }
  }

  async synchronizeAccount(accountId: string): Promise<BrokerSyncResult> {
    const account: BrokerAccountIdentity = {
      brokerId: this.brokerId,
      accountId,
      environment: 'demo',
      platform: this.brokerId === 'mt4' ? 'mt4' : 'mt5',
    }
    const errors: string[] = []
    try {
      const { url, token, label } = this.requireConfig()
      const balance = await this.getBalance(accountId)
      account.currency = balance.currency
      account.server = undefined

      let positions: BrokerPosition[] | undefined
      if (this.capabilities.includes('positions')) {
        const { response, body } = await bridgeFetch(url, token, '/positions')
        if (!response.ok) {
          errors.push(`${label} positions endpoint returned HTTP ${response.status}.`)
        } else {
          const rows = Array.isArray(body?.positions) ? body.positions : Array.isArray(body) ? body : []
          positions = rows.map((row: Record<string, unknown>, index: number) => ({
            id: String(row.ticket ?? row.id ?? index),
            symbol: String(row.symbol ?? 'UNKNOWN'),
            direction: String(row.type ?? row.direction ?? '').toUpperCase().includes('SELL') ? 'SELL' as const : 'BUY' as const,
            volume: numeric(row.volume ?? row.lots) ?? 0,
            entryPrice: numeric(row.priceOpen ?? row.entryPrice) ?? 0,
            currentPrice: numeric(row.priceCurrent ?? row.currentPrice),
            stopLoss: numeric(row.sl ?? row.stopLoss),
            takeProfit: numeric(row.tp ?? row.takeProfit),
            unrealizedPnl: numeric(row.profit ?? row.unrealizedPnl),
            raw: row,
          }))
        }
      }

      const incomplete = errors.length > 0 || (this.capabilities.includes('positions') && positions === undefined)
      return {
        status: incomplete ? (balance ? 'partial' : 'failed') : 'synchronized',
        account,
        balance,
        positions,
        capabilities: this.getCapabilities(),
        errors,
        synchronizedAt: new Date().toISOString(),
        incomplete,
      }
    } catch (error) {
      return buildFailedSync(account, this.getCapabilities(), [
        error instanceof Error ? error.message : 'Bridge synchronization failed.',
      ])
    }
  }
}

export function createMtBridgeAdapter(brokerId: BridgeKind) {
  return new MtBridgeAdapter(brokerId)
}
