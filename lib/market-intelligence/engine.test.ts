import { describe, expect, it } from 'vitest'
import { analyzeMarketIntelligence, validateCandles } from './engine'
import type { Candle } from '@/lib/market'

const candles = (count: number): Candle[] => Array.from({ length: count }, (_, i) => ({
  time: 1_700_000_000_000 + i * 60_000,
  open: 100 + i * 0.1,
  high: 101 + i * 0.1,
  low: 99 + i * 0.1,
  close: 100.5 + i * 0.1,
}))

describe('market intelligence data validation', () => {
  it('rejects malformed OHLC candles', () => {
    const input = candles(3)
    input[1] = { ...input[1], high: 1, low: 100 }
    const result = validateCandles(input)
    expect(result.rejectedCount).toBe(1)
    expect(result.candles).toHaveLength(2)
  })

  it('rejects duplicate or out-of-order timestamps', () => {
    const input = candles(3)
    input[2] = { ...input[2], time: input[1].time }
    expect(validateCandles(input).rejectedCount).toBe(1)
  })

  it('returns insufficient data rather than forcing analysis', () => {
    expect(analyzeMarketIntelligence(candles(15)).status).toBe('INSUFFICIENT_DATA')
  })

  it('analyzes clean candles and computes ATR from actual OHLC', () => {
    const input = candles(50)
    const result = analyzeMarketIntelligence(input)
    expect(result.status).toBe('READY')
    expect(result.quality.rejectedCount).toBe(0)
    expect(result.currentPrice).toBe(input.at(-1)?.close)
    expect(result.atr).toBeGreaterThan(0)
  })
})