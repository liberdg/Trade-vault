import { describe, expect, it } from 'vitest'
import { BROKER_CATALOG } from './core'
import { catalogCapabilities, buildFailedSync } from './adapter'
import { listRegisteredAdapters, hasBrokerAdapter } from './registry'

describe('broker adapter contract', () => {
  it('registers only verified server-side adapters', () => {
    expect(listRegisteredAdapters().sort()).toEqual(['exness', 'mt4', 'mt5', 'oanda'])
    expect(hasBrokerAdapter('deriv')).toBe(false)
    expect(hasBrokerAdapter('binance')).toBe(false)
  })

  it('exposes OANDA execution and sync capabilities honestly', () => {
    const oanda = BROKER_CATALOG.find(entry => entry.id === 'oanda')
    expect(oanda?.capabilities).toEqual(expect.arrayContaining([
      'accounts', 'balance', 'equity', 'positions', 'pending_orders', 'place_order',
    ]))
    expect(catalogCapabilities('oanda')).toEqual(oanda?.capabilities)
  })

  it('buildFailedSync never reports synchronized', () => {
    const result = buildFailedSync(
      { brokerId: 'oanda', accountId: 'x', environment: 'demo' },
      ['accounts'],
      ['test failure'],
    )
    expect(result.status).toBe('failed')
    expect(result.incomplete).toBe(true)
    expect(result.balance).toBeUndefined()
  })
})
