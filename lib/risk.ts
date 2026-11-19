export interface RiskInputs {
  accountBalance: number
  riskPercent: number
  entryPrice: number
  stopLoss: number
  pipSize?: number
  contractSize?: number
  tickValue?: number
  accountToQuoteRate?: number
}

export interface RiskResult {
  stopDistance: number
  riskAmount: number
  positionUnits: number | null
  lotSize: number | null
  rewardAt2R: number
  rewardAt3R: number
  warning: string | null
}

export function calculateRisk(inputs: RiskInputs): RiskResult {
  const stopDistance = Math.abs(inputs.entryPrice - inputs.stopLoss)
  const riskAmount = inputs.accountBalance * (inputs.riskPercent / 100)
  let positionUnits: number | null = null
  let lotSize: number | null = null

  if (stopDistance > 0) {
    if (inputs.contractSize && inputs.tickValue && inputs.accountToQuoteRate) {
      const lossPerUnit = stopDistance * inputs.accountToQuoteRate * (inputs.tickValue ?? 1)
      positionUnits = lossPerUnit > 0 ? riskAmount / lossPerUnit : null
      lotSize = positionUnits !== null ? positionUnits / inputs.contractSize : null
    } else {
      positionUnits = riskAmount / stopDistance
      lotSize = null
    }
  }

  const warning = inputs.contractSize && inputs.tickValue && inputs.accountToQuoteRate
    ? null
    : 'Instrument contract size and account conversion rate are required for a broker-safe lot size.'

  return {
    stopDistance,
    riskAmount,
    positionUnits,
    lotSize,
    rewardAt2R: riskAmount * 2,
    rewardAt3R: riskAmount * 3,
    warning,
  }
}
