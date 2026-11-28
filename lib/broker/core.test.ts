import { describe, expect, it } from 'vitest'
import { BROKER_CATALOG } from './core'

describe('broker registry', () => {
  it('includes independent broker adapters and capability declarations', () => {
    const ids = new Set(BROKER_CATALOG.map(broker => broker.id))
    expect(ids).toEqual(new Set(['mt5','deriv','exness','binance','bybit','mt4','ctrader','oanda']))
  })

  it('requires a bridge for MT5 and standard MT accounts', () => {
    expect(BROKER_CATALOG.find(broker => broker.id === 'mt5')?.integrationStatus).toBe('bridge_required')
    expect(BROKER_CATALOG.find(broker => broker.id === 'exness')?.connectionTypes).toContain('mt5_bridge')
  })

  it('declares OANDA as a real adapter with sync and place_order capabilities', () => {
    const oanda = BROKER_CATALOG.find(broker => broker.id === 'oanda')
    expect(oanda?.integrationStatus).toBe('real_adapter')
    expect(oanda?.capabilities).toEqual(expect.arrayContaining(['balance', 'positions', 'pending_orders', 'place_order']))
  })

  it('marks Deriv as a real adapter without claiming unsupported MT control', () => {
    const deriv = BROKER_CATALOG.find(broker => broker.id === 'deriv')
    expect(deriv?.integrationStatus).toBe('real_adapter')
    expect(deriv?.platform).toBe('deriv_api')
  })
})
