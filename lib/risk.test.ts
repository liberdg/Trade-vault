import { describe, expect, it } from 'vitest'
import { calculateRisk } from './risk'

describe('calculateRisk', () => {
  it('calculates risk amount and 2R/3R without instrument specs', () => {
    const result = calculateRisk({
      accountBalance: 10000,
      riskPercent: 1,
      entryPrice: 1.1000,
      stopLoss: 1.0950,
    })

    expect(result.stopDistance).toBeCloseTo(0.005)
    expect(result.riskAmount).toBe(100)
    expect(result.rewardAt2R).toBe(200)
    expect(result.rewardAt3R).toBe(300)
    expect(result.warning).toContain('contract size')
  })

  it('returns a broker-sized position when specifications are complete', () => {
    const result = calculateRisk({
      accountBalance: 10000,
      riskPercent: 1,
      entryPrice: 100,
      stopLoss: 99,
      contractSize: 100,
      tickValue: 1,
      accountToQuoteRate: 1,
    })

    expect(result.positionUnits).toBeCloseTo(100)
    expect(result.lotSize).toBeCloseTo(1)
    expect(result.warning).toBeNull()
  })
})
