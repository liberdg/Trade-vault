import { describe, expect, it } from 'vitest'
import { MARKET_INSTRUMENTS } from './market-instruments'
import { toDerivSymbol } from './market'

describe('market instruments', () => {
  it('includes the default major forex and precious metal instruments', () => {
    expect(MARKET_INSTRUMENTS.some(item => item.symbol === 'EURUSD')).toBe(true)
    expect(MARKET_INSTRUMENTS.some(item => item.symbol === 'XAUUSD')).toBe(true)
    expect(MARKET_INSTRUMENTS.some(item => item.symbol === 'XAGUSD')).toBe(true)
  })

  it('maps broker-neutral forex and gold symbols to Deriv symbols', () => {
    expect(toDerivSymbol('EURUSD', 'forex')).toBe('frxEURUSD')
    expect(toDerivSymbol('XAUUSD', 'metal')).toBe('frxXAUUSD')
  })

  it('contains a unique instrument symbol registry', () => {
    const symbols = MARKET_INSTRUMENTS.map(item => item.symbol)
    expect(new Set(symbols).size).toBe(symbols.length)
  })
})
