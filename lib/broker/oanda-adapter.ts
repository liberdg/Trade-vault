import type {
  BrokerAccountIdentity,
  BrokerAdapter,
  BrokerBalanceSnapshot,
  BrokerOrder,
  BrokerPosition,
  BrokerSyncResult,
} from './adapter'
import { BrokerConnectionError, buildFailedSync, catalogCapabilities } from './adapter'
import type { BrokerCapability } from './core'

function numeric(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return undefined
}

function oandaEnvironment(): 'demo' | 'real' {
  return process.env.OANDA_ENVIRONMENT === 'live' ? 'real' : 'demo'
}

function oandaBaseUrl(): string {
  return oandaEnvironment() === 'real'
    ? 'https://api-fxtrade.oanda.com'
    : 'https://api-fxpractice.oanda.com'
}

async function oandaFetch(path: string, token: string) {
  const response = await fetch(`${oandaBaseUrl()}${path}`, {
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${token}`,
      'Accept-Datetime-Format': 'RFC3339',
    },
    signal: AbortSignal.timeout(12000),
  })
  const body = await response.json().catch(() => null)
  return { response, body }
}

function mapPosition(raw: Record<string, unknown>): BrokerPosition[] {
  const instrument = typeof raw.instrument === 'string' ? raw.instrument : 'UNKNOWN'
  const long = raw.long && typeof raw.long === 'object' ? raw.long as Record<string, unknown> : null
  const short = raw.short && typeof raw.short === 'object' ? raw.short as Record<string, unknown> : null
  const positions: BrokerPosition[] = []

  const longUnits = numeric(long?.units)
  if (long && longUnits !== undefined && longUnits !== 0) {
    positions.push({
      id: `${instrument}:LONG`,
      symbol: instrument,
      direction: 'BUY',
      volume: Math.abs(longUnits),
      entryPrice: numeric(long.averagePrice) ?? 0,
      unrealizedPnl: numeric(long.unrealizedPL),
      raw: long,
    })
  }
  const shortUnits = numeric(short?.units)
  if (short && shortUnits !== undefined && shortUnits !== 0) {
    positions.push({
      id: `${instrument}:SHORT`,
      symbol: instrument,
      direction: 'SELL',
      volume: Math.abs(shortUnits),
      entryPrice: numeric(short.averagePrice) ?? 0,
      unrealizedPnl: numeric(short.unrealizedPL),
      raw: short,
    })
  }
  return positions
}

function mapOrder(raw: Record<string, unknown>): BrokerOrder | null {
  const id = raw.id != null ? String(raw.id) : undefined
  const instrument = typeof raw.instrument === 'string' ? raw.instrument : undefined
  const units = numeric(raw.units)
  if (!id || !instrument || units === undefined || units === 0) return null
  return {
    id,
    symbol: instrument,
    direction: units > 0 ? 'BUY' : 'SELL',
    type: typeof raw.type === 'string' ? raw.type : 'UNKNOWN',
    volume: Math.abs(units),
    price: numeric(raw.price),
    status: typeof raw.state === 'string' ? raw.state : 'UNKNOWN',
    createdAt: typeof raw.createTime === 'string' ? raw.createTime : undefined,
    raw,
  }
}

export class OandaAdapter implements BrokerAdapter {
  readonly brokerId = 'oanda'
  readonly capabilities: readonly BrokerCapability[] = catalogCapabilities('oanda')

  getCapabilities() {
    return [...this.capabilities]
  }

  private credentials() {
    const token = process.env.OANDA_API_TOKEN?.trim()
    const accountId = process.env.OANDA_ACCOUNT_ID?.trim()
    if (!token || !accountId) {
      throw new BrokerConnectionError('OANDA server credentials are not configured.', 'disconnected')
    }
    return { token, accountId }
  }

  async validateConnection() {
    try {
      const { token, accountId } = this.credentials()
      const { response, body } = await oandaFetch(`/v3/accounts/${encodeURIComponent(accountId)}/summary`, token)
      if (!response.ok) {
        return {
          ok: false,
          message: `OANDA returned HTTP ${response.status}.`,
          accountId,
        }
      }
      const account = body?.account
      if (!account?.id) return { ok: false, message: 'OANDA summary did not include an account ID.', accountId }
      return { ok: true, message: 'OANDA account summary verified.', accountId: String(account.id) }
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'OANDA validation failed.',
      }
    }
  }

  async getAccounts(): Promise<BrokerAccountIdentity[]> {
    const { token } = this.credentials()
    const { response, body } = await oandaFetch('/v3/accounts', token)
    if (!response.ok) throw new BrokerConnectionError(`OANDA account list returned HTTP ${response.status}.`)
    const accounts = Array.isArray(body?.accounts) ? body.accounts : []
    return accounts
      .filter((account: Record<string, unknown>) => typeof account.id === 'string')
      .map((account: Record<string, unknown>) => ({
        brokerId: 'oanda',
        accountId: String(account.id),
        environment: oandaEnvironment(),
        currency: typeof account.currency === 'string' ? account.currency : undefined,
        platform: 'oanda' as const,
      }))
  }

  async getAccountDetails(accountId: string): Promise<BrokerAccountIdentity> {
    const balance = await this.getBalance(accountId)
    return {
      brokerId: 'oanda',
      accountId,
      environment: oandaEnvironment(),
      currency: balance.currency,
      platform: 'oanda',
    }
  }

  async getBalance(accountId: string): Promise<BrokerBalanceSnapshot> {
    const { token } = this.credentials()
    const { response, body } = await oandaFetch(`/v3/accounts/${encodeURIComponent(accountId)}/summary`, token)
    if (!response.ok) throw new BrokerConnectionError(`OANDA balance lookup returned HTTP ${response.status}.`)
    const account = body?.account as Record<string, unknown> | undefined
    const balance = numeric(account?.balance)
    const equity = numeric(account?.NAV)
    const currency = typeof account?.currency === 'string' ? account.currency : undefined
    if (balance === undefined || equity === undefined || !currency) {
      throw new BrokerConnectionError('OANDA returned incomplete account summary. No fabricated balance was used.', 'synchronization_error')
    }
    return {
      balance,
      equity,
      floatingPnl: numeric(account?.unrealizedPL),
      usedMargin: numeric(account?.marginUsed),
      freeMargin: numeric(account?.marginAvailable),
      currency,
      retrievedAt: new Date().toISOString(),
      source: 'oanda.v20.accounts.summary',
    }
  }

  async synchronizeAccount(accountId: string): Promise<BrokerSyncResult> {
    const configured = process.env.OANDA_ACCOUNT_ID?.trim()
    const account: BrokerAccountIdentity = {
      brokerId: 'oanda',
      accountId,
      environment: oandaEnvironment(),
      platform: 'oanda',
    }
    if (configured && configured !== accountId) {
      return buildFailedSync(account, this.getCapabilities(), [
        'Requested OANDA account does not match the server-configured account. Silent account switching is blocked.',
      ])
    }

    const errors: string[] = []
    try {
      const { token } = this.credentials()
      const [summaryResult, openPositionsResult, pendingOrdersResult] = await Promise.all([
        oandaFetch(`/v3/accounts/${encodeURIComponent(accountId)}/summary`, token),
        oandaFetch(`/v3/accounts/${encodeURIComponent(accountId)}/openPositions`, token),
        oandaFetch(`/v3/accounts/${encodeURIComponent(accountId)}/pendingOrders`, token),
      ])

      if (!summaryResult.response.ok) {
        return buildFailedSync(account, this.getCapabilities(), [
          `Account summary failed with HTTP ${summaryResult.response.status}.`,
        ])
      }

      const summaryAccount = summaryResult.body?.account as Record<string, unknown> | undefined
      const balance = numeric(summaryAccount?.balance)
      const equity = numeric(summaryAccount?.NAV)
      const currency = typeof summaryAccount?.currency === 'string' ? summaryAccount.currency : undefined
      if (balance === undefined || equity === undefined || !currency) {
        return buildFailedSync(account, this.getCapabilities(), [
          'OANDA summary was incomplete. Synchronization aborted without fabricated values.',
        ])
      }

      account.currency = currency
      const balanceSnapshot: BrokerBalanceSnapshot = {
        balance,
        equity,
        floatingPnl: numeric(summaryAccount?.unrealizedPL),
        usedMargin: numeric(summaryAccount?.marginUsed),
        freeMargin: numeric(summaryAccount?.marginAvailable),
        currency,
        retrievedAt: new Date().toISOString(),
        source: 'oanda.v20.accounts.summary',
      }

      let positions: BrokerPosition[] | undefined
      if (openPositionsResult.response.ok) {
        const rawPositions = Array.isArray(openPositionsResult.body?.positions) ? openPositionsResult.body.positions : []
        positions = rawPositions.flatMap((item: Record<string, unknown>) => mapPosition(item))
      } else {
        errors.push(`Open positions request failed with HTTP ${openPositionsResult.response.status}.`)
      }

      let orders: BrokerOrder[] | undefined
      if (pendingOrdersResult.response.ok) {
        const rawOrders = Array.isArray(pendingOrdersResult.body?.orders) ? pendingOrdersResult.body.orders : []
        orders = rawOrders
          .map((item: Record<string, unknown>) => mapOrder(item))
          .filter((item: BrokerOrder | null): item is BrokerOrder => item !== null)
      } else {
        errors.push(`Pending orders request failed with HTTP ${pendingOrdersResult.response.status}.`)
      }

      const incomplete = errors.length > 0
      return {
        status: incomplete ? 'partial' : 'synchronized',
        account,
        balance: balanceSnapshot,
        positions,
        orders,
        capabilities: this.getCapabilities(),
        errors,
        synchronizedAt: new Date().toISOString(),
        incomplete,
      }
    } catch (error) {
      return buildFailedSync(account, this.getCapabilities(), [
        error instanceof Error ? error.message : 'OANDA synchronization failed.',
      ])
    }
  }
}

export function createOandaAdapter() {
  return new OandaAdapter()
}
