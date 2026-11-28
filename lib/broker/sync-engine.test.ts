import { describe, expect, it, vi, beforeEach } from 'vitest'
import { synchronizeBrokerAccount } from './sync-engine'

vi.mock('./registry', () => ({
  hasBrokerAdapter: (brokerId: string) => ['oanda', 'mt5', 'mt4', 'exness'].includes(brokerId),
  getBrokerAdapter: (brokerId: string) => {
    if (brokerId !== 'oanda') throw new Error('unexpected')
    return {
      brokerId: 'oanda',
      capabilities: ['accounts', 'balance', 'equity', 'positions', 'pending_orders', 'place_order'],
      getCapabilities: () => ['accounts', 'balance', 'equity', 'positions', 'pending_orders', 'place_order'],
      synchronizeAccount: async (accountId: string) => ({
        status: 'synchronized' as const,
        account: { brokerId: 'oanda', accountId, environment: 'demo' as const, currency: 'USD', platform: 'oanda' as const },
        balance: {
          balance: 10000,
          equity: 10050,
          currency: 'USD',
          retrievedAt: new Date().toISOString(),
          source: 'oanda.v20.accounts.summary',
        },
        positions: [],
        orders: [],
        capabilities: ['accounts', 'balance', 'equity', 'positions', 'pending_orders', 'place_order'],
        errors: [],
        synchronizedAt: new Date().toISOString(),
        incomplete: false,
      }),
    }
  },
}))

describe('synchronizeBrokerAccount', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects missing broker or account identifiers', async () => {
    const missingBroker = await synchronizeBrokerAccount({ brokerId: '', accountId: 'abc' })
    expect(missingBroker.status).toBe('failed')
    expect(missingBroker.incomplete).toBe(true)

    const missingAccount = await synchronizeBrokerAccount({ brokerId: 'oanda', accountId: '' })
    expect(missingAccount.status).toBe('failed')
  })

  it('does not invent sync for brokers without a registered adapter', async () => {
    const result = await synchronizeBrokerAccount({ brokerId: 'binance', accountId: 'spot-1' })
    expect(result.status).toBe('failed')
    expect(result.errors[0]).toMatch(/no verified server-side sync adapter/i)
  })

  it('returns synchronized result from a registered adapter with balance', async () => {
    const result = await synchronizeBrokerAccount({ brokerId: 'oanda', accountId: '101-001', environment: 'demo' })
    expect(result.status).toBe('synchronized')
    expect(result.balance?.balance).toBe(10000)
    expect(result.incomplete).toBe(false)
  })

  it('fails when environment mismatches adapter response', async () => {
    const result = await synchronizeBrokerAccount({ brokerId: 'oanda', accountId: '101-001', environment: 'real' })
    expect(result.status).toBe('failed')
    expect(result.errors.some(message => /Environment mismatch/i.test(message))).toBe(true)
  })
})
