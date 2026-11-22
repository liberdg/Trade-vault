export type RiskBasis = 'balance' | 'equity'
export type PositionSizingMode = 'risk_percent' | 'fixed_risk' | 'fixed_lots'

export interface BrokerInstrumentSpecs {
  tickSize: number
  tickValuePerLot: number
  contractSize: number
  volumeMin: number
  volumeMax: number
  volumeStep: number
  marginRate?: number
  quoteToAccountRate: number
}

export interface BrokerRiskInputs {
  balance: number
  equity: number
  riskBasis: RiskBasis
  sizingMode: PositionSizingMode
  riskPercent?: number
  fixedRiskAmount?: number
  fixedLots?: number
  entryPrice: number
  stopLoss: number
  takeProfit?: number
  direction: 'BUY' | 'SELL'
  specs: BrokerInstrumentSpecs
}

export interface BrokerRiskResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  riskBase: number
  riskAmount: number
  stopDistance: number
  lossPerLot: number | null
  rawLots: number | null
  lots: number | null
  units: number | null
  estimatedLoss: number | null
  estimatedReward: number | null
  rewardRisk: number | null
  estimatedMargin: number | null
}

function isPositiveFinite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

function volumePrecision(step: number): number {
  const text = String(step)
  if (text.includes('e-')) return Number(text.split('e-')[1])
  return text.includes('.') ? text.length - text.indexOf('.') - 1 : 0
}

function normalizeLotsDown(lots: number, step: number): number {
  const normalized = Math.floor((lots + Number.EPSILON) / step) * step
  return Number(normalized.toFixed(volumePrecision(step)))
}

/**
 * Broker-aware risk calculation. All tick/contract/volume values must come from
 * the selected broker instrument and account; this function never invents them.
 */
export function calculateBrokerRisk(input: BrokerRiskInputs): BrokerRiskResult {
  const errors: string[] = []
  const warnings: string[] = []
  const specs = input.specs

  if (!isPositiveFinite(input.balance)) errors.push('Account balance is unavailable or invalid.')
  if (!isPositiveFinite(input.equity)) errors.push('Account equity is unavailable or invalid.')
  if (!isPositiveFinite(input.entryPrice)) errors.push('Entry price must be positive.')
  if (!isPositiveFinite(input.stopLoss)) errors.push('Stop Loss must be positive.')
  if (!isPositiveFinite(specs.tickSize)) errors.push('Broker tick size is unavailable.')
  if (!isPositiveFinite(specs.tickValuePerLot)) errors.push('Broker tick value is unavailable.')
  if (!isPositiveFinite(specs.contractSize)) errors.push('Broker contract size is unavailable.')
  if (!isPositiveFinite(specs.volumeMin)) errors.push('Broker minimum volume is unavailable.')
  if (!isPositiveFinite(specs.volumeMax)) errors.push('Broker maximum volume is unavailable.')
  if (!isPositiveFinite(specs.volumeStep)) errors.push('Broker volume step is unavailable.')
  if (!isPositiveFinite(specs.quoteToAccountRate)) errors.push('Account-currency conversion rate is unavailable.')
  if (specs.volumeMin > specs.volumeMax) errors.push('Broker volume limits are inconsistent.')
  if (specs.marginRate !== undefined && (!Number.isFinite(specs.marginRate) || specs.marginRate < 0)) errors.push('Margin rate is invalid.')

  const stopDistance = Math.abs(input.entryPrice - input.stopLoss)
  if (stopDistance <= 0) errors.push('Entry and Stop Loss must be different prices.')
  if (input.direction === 'BUY' && input.stopLoss >= input.entryPrice) errors.push('For BUY, Stop Loss must be below entry.')
  if (input.direction === 'SELL' && input.stopLoss <= input.entryPrice) errors.push('For SELL, Stop Loss must be above entry.')
  if (input.takeProfit !== undefined) {
    if (!isPositiveFinite(input.takeProfit)) errors.push('Take Profit must be a positive price.')
    if (input.direction === 'BUY' && input.takeProfit <= input.entryPrice) errors.push('For BUY, Take Profit must be above entry.')
    if (input.direction === 'SELL' && input.takeProfit >= input.entryPrice) errors.push('For SELL, Take Profit must be below entry.')
  }

  const riskBase = input.riskBasis === 'equity' ? input.equity : input.balance
  let riskAmount = 0
  if (input.sizingMode === 'risk_percent') {
    if (!isPositiveFinite(input.riskPercent)) errors.push('Risk percentage must be greater than zero.')
    else riskAmount = riskBase * input.riskPercent / 100
  } else if (input.sizingMode === 'fixed_risk') {
    if (!isPositiveFinite(input.fixedRiskAmount)) errors.push('Fixed monetary risk must be greater than zero.')
    else riskAmount = input.fixedRiskAmount
  } else {
    if (!isPositiveFinite(input.fixedLots)) errors.push('Fixed lot size must be greater than zero.')
    else riskAmount = 0
  }

  const completeSpecs = isPositiveFinite(specs.tickSize) && isPositiveFinite(specs.tickValuePerLot) &&
    isPositiveFinite(specs.contractSize) && isPositiveFinite(specs.volumeMin) &&
    isPositiveFinite(specs.volumeMax) && isPositiveFinite(specs.volumeStep) &&
    isPositiveFinite(specs.quoteToAccountRate)
  const lossPerLot = completeSpecs
    ? (stopDistance / specs.tickSize) * specs.tickValuePerLot * specs.quoteToAccountRate
    : null

  let rawLots: number | null = null
  let lots: number | null = null
  let units: number | null = null
  let estimatedLoss: number | null = null
  let estimatedReward: number | null = null
  let rewardRisk: number | null = null
  let estimatedMargin: number | null = null

  if (completeSpecs && lossPerLot !== null && lossPerLot > 0 && errors.length === 0) {
    rawLots = input.sizingMode === 'fixed_lots' ? input.fixedLots! : riskAmount / lossPerLot
    lots = normalizeLotsDown(rawLots, specs.volumeStep)
    if (lots < specs.volumeMin) {
      errors.push('Calculated volume is below the broker minimum. Risk cannot be increased automatically.')
      lots = null
    } else if (lots > specs.volumeMax) {
      lots = normalizeLotsDown(specs.volumeMax, specs.volumeStep)
      warnings.push('Volume was capped at the broker maximum; estimated risk is lower than requested.')
    }
    if (lots !== null) {
      units = lots * specs.contractSize
      estimatedLoss = lots * lossPerLot
      if (input.sizingMode === 'fixed_lots') riskAmount = estimatedLoss
      if (estimatedLoss > riskAmount && input.sizingMode !== 'fixed_lots') {
        errors.push('Normalized volume would exceed the requested risk. Order blocked.')
        lots = units = estimatedLoss = null
      }
      if (input.takeProfit !== undefined && isPositiveFinite(input.takeProfit)) {
        const rewardDistance = Math.abs(input.takeProfit - input.entryPrice)
        estimatedReward = lots * (rewardDistance / specs.tickSize) * specs.tickValuePerLot * specs.quoteToAccountRate
        rewardRisk = estimatedLoss && estimatedLoss > 0 ? estimatedReward / estimatedLoss : null
      }
      if (specs.marginRate !== undefined && isPositiveFinite(input.entryPrice)) {
        estimatedMargin = units !== null ? units * input.entryPrice * specs.marginRate * specs.quoteToAccountRate : null
      } else {
        warnings.push('Margin estimate unavailable: broker margin rate was not provided.')
      }
    }
  } else if (!completeSpecs) {
    warnings.push('Risk calculation is incomplete because broker instrument specifications are missing.')
  }

  return {
    valid: errors.length === 0 && lots !== null && estimatedLoss !== null,
    errors,
    warnings,
    riskBase,
    riskAmount,
    stopDistance,
    lossPerLot,
    rawLots,
    lots,
    units,
    estimatedLoss,
    estimatedReward,
    rewardRisk,
    estimatedMargin,
  }
}
