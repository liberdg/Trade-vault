import { describe, expect, it } from 'vitest'
import { analyzeCandles } from './smrt-analysis'
import type { Candle } from './market'

function candle(time: number, open: number, close: number, high: number, low: number): Candle {
  return { time, open, close, high, low, volume: 100 }
}

describe('analyzeCandles', () => {
  it('requires a defensible amount of real candle data', () => {
    const result = analyzeCandles([candle(1, 100, 101, 102, 99)])
    expect(result.bias).toBe('RANGE')
    expect(result.score).toBe(0)
    expect(result.missing).toContain('At least 20 real candles are required')
  })

  it('detects a bullish displacement and active SMC data', () => {
    const candles = Array.from({ length: 40 }, (_, index) => {
      const base = 100 + index * 0.25
      return candle(index * 3600000, base - 0.1, base + 0.8, base + 1.0, base - 0.2)
    })
    const result = analyzeCandles(candles)

    expect(result.displacement).toBe(true)
    expect(result.bias).toBe('BULLISH')
    expect(result.confluences.length).toBeGreaterThan(0)
  })
})
