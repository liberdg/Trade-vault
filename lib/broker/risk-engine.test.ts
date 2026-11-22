import { describe, expect, it } from 'vitest'
import { calculateBrokerRisk } from './risk-engine'

const specs = {
  tickSize: 0.0001,
  tickValuePerLot: 10,
  contractSize: 100000,
  volumeMin: 0.01,
  volumeMax: 100,
  volumeStep: 0.01,
  quoteToAccountRate: 1,
  marginRate: 0.02,
}

describe('calculateBrokerRisk', () => {
  it('calculates risk-percent lots and rounds volume down to broker step', () => {
    const result = calculateBrokerRisk({
      balance: 10000,
      equity: 9800,
      riskBasis: 'equity',
      sizingMode: 'risk_percent',
      riskPercent: 1,
      entryPrice: 1.1000,
      stopLoss: 1.0950,
      takeProfit: 1.1100,
      direction: 'BUY',
      specs,
    })
    expect(result.valid).toBe(true)
    expect(result.riskAmount).toBe(98)
    expect(result.lots).toBeCloseTo(0.19)
    expect(result.estimatedLoss).toBeCloseTo(95)
    expect(result.rewardRisk).toBeCloseTo(2)
    expect(result.estimatedMargin).toBeCloseTo(418)
  })

  it('rejects a stop loss on the wrong side of entry', () => {
    const result = calculateBrokerRisk({
      balance: 1000, equity: 1000, riskBasis: 'balance',
      sizingMode: 'risk_percent', riskPercent: 1,
      entryPrice: 1.1, stopLoss: 1.11, direction: 'BUY', specs,
    })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('For BUY, Stop Loss must be below entry.')
  })

  it('does not increase risk when volume rounds below broker minimum', () => {
    const result = calculateBrokerRisk({
      balance: 100, equity: 100, riskBasis: 'balance',
      sizingMode: 'risk_percent', riskPercent: 0.1,
      entryPrice: 1.1, stopLoss: 1.09, direction: 'BUY',
      specs: { ...specs, volumeMin: 0.1, volumeStep: 0.1 },
    })
    expect(result.valid).toBe(false)
    expect(result.lots).toBeNull()
    expect(result.errors[0]).toContain('below the broker minimum')
  })

  it('requires real broker instrument specifications', () => {
    const result = calculateBrokerRisk({
      balance: 1000, equity: 1000, riskBasis: 'balance',
      sizingMode: 'fixed_risk', fixedRiskAmount: 10,
      entryPrice: 1.1, stopLoss: 1.09, direction: 'BUY',
      specs: { ...specs, tickValuePerLot: 0, quoteToAccountRate: 0 },
    })
    expect(result.valid).toBe(false)
    expect(result.lots).toBeNull()
    expect(result.warnings.some(w => w.includes('specifications are missing'))).toBe(true)
  })

  it('uses fixed lots and reports the actual estimated risk', () => {
    const result = calculateBrokerRisk({
      balance: 5000, equity: 5000, riskBasis: 'balance',
      sizingMode: 'fixed_lots', fixedLots: 0.5,
      entryPrice: 1.1, stopLoss: 1.095, direction: 'BUY', specs,
    })
    expect(result.valid).toBe(true)
    expect(result.lots).toBe(0.5)
    expect(result.estimatedLoss).toBeCloseTo(25)
    expect(result.riskAmount).toBeCloseTo(25)
  })
})
