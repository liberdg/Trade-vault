import type { Candle } from './market'

export interface PriceLevel {
  time: number
  price: number
  kind: 'HIGH' | 'LOW' | 'EQUAL_HIGH' | 'EQUAL_LOW'
  label: string
}

export interface Zone {
  top: number
  bottom: number
  startTime: number
  endTime: number
  kind: 'BULLISH_OB' | 'BEARISH_OB' | 'BULLISH_FVG' | 'BEARISH_FVG'
  lifecycle: 'NEW' | 'ACTIVE' | 'TESTED' | 'MITIGATED'
}

export interface MarketAnalysis {
  bias: 'BULLISH' | 'BEARISH' | 'RANGE'
  structure: 'HH' | 'HL' | 'LH' | 'LL' | 'RANGE'
  bos: boolean
  choch: boolean
  displacement: boolean
  liquidity: PriceLevel[]
  zones: Zone[]
  premium: number
  discount: number
  equilibrium: number
  confluences: string[]
  missing: string[]
  score: number
  direction: 'BUY' | 'SELL' | null
  entryZone: { top: number; bottom: number } | null
  stopLoss: number | null
  takeProfits: number[]
  invalidation: number | null
  explanation: string
}

export function analyzeCandles(candles: Candle[]): MarketAnalysis {
  const recent = candles.slice(-120)
  if (recent.length < 20) {
    return emptyAnalysis('Insufficient real candles for a defensible structure analysis.')
  }

  const swingLookback = 3
  const highs: PriceLevel[] = []
  const lows: PriceLevel[] = []

  for (let i = swingLookback; i < recent.length - swingLookback; i++) {
    const beforeHigh = recent.slice(i - swingLookback, i).every(candle => candle.high <= recent[i].high)
    const afterHigh = recent.slice(i + 1, i + swingLookback + 1).every(candle => candle.high < recent[i].high)
    if (beforeHigh && afterHigh) highs.push({ time: recent[i].time, price: recent[i].high, kind: 'HIGH', label: 'Swing High' })

    const beforeLow = recent.slice(i - swingLookback, i).every(candle => candle.low >= recent[i].low)
    const afterLow = recent.slice(i + 1, i + swingLookback + 1).every(candle => candle.low > recent[i].low)
    if (beforeLow && afterLow) lows.push({ time: recent[i].time, price: recent[i].low, kind: 'LOW', label: 'Swing Low' })
  }

  const lastHigh = highs.at(-1)
  const previousHigh = highs.at(-2)
  const lastLow = lows.at(-1)
  const previousLow = lows.at(-2)

  let structure: MarketAnalysis['structure'] = 'RANGE'
  if (lastHigh && previousHigh && lastLow && previousLow) {
    if (lastHigh.price > previousHigh.price && lastLow.price > previousLow.price) structure = 'HH'
    else if (lastHigh.price < previousHigh.price && lastLow.price < previousLow.price) structure = 'LL'
    else if (lastHigh.price < previousHigh.price) structure = 'LH'
    else if (lastLow.price > previousLow.price) structure = 'HL'
  }

  const first = recent[0]
  const last = recent.at(-1)!
  const range = Math.max(...recent.map(candle => candle.high)) - Math.min(...recent.map(candle => candle.low))
  const equilibrium = (Math.max(...recent.map(candle => candle.high)) + Math.min(...recent.map(candle => candle.low))) / 2
  const premium = equilibrium + range * 0.25
  const discount = equilibrium - range * 0.25

  const liquidity: PriceLevel[] = []
  for (let i = 1; i < highs.length; i++) {
    if (Math.abs(highs[i].price - highs[i - 1].price) / highs[i].price < 0.0015) {
      liquidity.push({ ...highs[i], kind: 'EQUAL_HIGH', label: 'Equal Highs / Buy-Side Liquidity' })
    }
  }
  for (let i = 1; i < lows.length; i++) {
    if (Math.abs(lows[i].price - lows[i - 1].price) / lows[i].price < 0.0015) {
      liquidity.push({ ...lows[i], kind: 'EQUAL_LOW', label: 'Equal Lows / Sell-Side Liquidity' })
    }
  }
  if (lastHigh) liquidity.push({ ...lastHigh, kind: 'HIGH', label: 'Recent Buy-Side Liquidity' })
  if (lastLow) liquidity.push({ ...lastLow, kind: 'LOW', label: 'Recent Sell-Side Liquidity' })

  const zones: Zone[] = []
  for (let i = 2; i < recent.length; i++) {
    const a = recent[i - 2]
    const b = recent[i - 1]
    const c = recent[i]

    if (c.low > b.high && b.high < a.low) {
      zones.push({
        kind: 'BULLISH_FVG',
        top: c.low,
        bottom: b.high,
        startTime: b.time,
        endTime: c.time,
        lifecycle: c.close <= b.high ? 'TESTED' : 'ACTIVE',
      })
    }
    if (c.high < b.low && b.low > a.high) {
      zones.push({
        kind: 'BEARISH_FVG',
        top: b.low,
        bottom: c.high,
        startTime: b.time,
        endTime: c.time,
        lifecycle: c.close >= b.low ? 'TESTED' : 'ACTIVE',
      })
    }

    if (c.close > c.open && i >= 2) {
      const previousBearish = recent[i - 1]
      if (previousBearish.close < previousBearish.open) {
        zones.push({
          kind: 'BULLISH_OB',
          top: previousBearish.open,
          bottom: previousBearish.low,
          startTime: previousBearish.time,
          endTime: c.time,
          lifecycle: c.low <= previousBearish.open ? 'TESTED' : 'ACTIVE',
        })
      }
    }
    if (c.close < c.open) {
      const previousBullish = recent[i - 1]
      if (previousBullish.close > previousBullish.open) {
        zones.push({
          kind: 'BEARISH_OB',
          top: previousBullish.high,
          bottom: previousBullish.close,
          startTime: previousBullish.time,
          endTime: c.time,
          lifecycle: c.high >= previousBullish.close ? 'TESTED' : 'ACTIVE',
        })
      }
    }
  }

  const bullishStructure = structure === 'HH' || structure === 'HL'
  const bearishStructure = structure === 'LL' || structure === 'LH'
  const body = Math.abs(last.close - last.open)
  const wickRange = last.high - last.low
  const displacement = wickRange > 0 && body / wickRange >= 0.65
  const bias: MarketAnalysis['bias'] = bullishStructure
    ? 'BULLISH'
    : bearishStructure
      ? 'BEARISH'
      : last.close > equilibrium && displacement
        ? 'BULLISH'
        : last.close < equilibrium && displacement
          ? 'BEARISH'
          : 'RANGE'

  const bos = bullishStructure || bearishStructure
  const choch = Boolean(
    (previousHigh && lastHigh && lastHigh.price < previousHigh.price) ||
    (previousLow && lastLow && lastLow.price > previousLow.price)
  )

  const confluences: string[] = []
  if (structure !== 'RANGE') confluences.push(`Structure ${structure}`)
  if (liquidity.length > 0) confluences.push('Liquidity level identified')
  if (displacement) confluences.push('Displacement candle')
  if (bos) confluences.push('Break of structure')
  if (choch) confluences.push('Change of character')
  if (zones.some(zone => zone.lifecycle === 'ACTIVE')) confluences.push('Active institutional zone')
  if (last.close < equilibrium) confluences.push('Price in discount')
  if (last.close > equilibrium) confluences.push('Price in premium')

  const missing: string[] = []
  if (!displacement) missing.push('Displacement not confirmed')
  if (liquidity.length === 0) missing.push('No qualifying liquidity event')
  if (!zones.some(zone => zone.lifecycle === 'ACTIVE')) missing.push('No active order block or FVG')
  if (structure === 'RANGE') missing.push('Market structure is not directional')

  const score = Math.min(100, confluences.length * 12)
  const direction: 'BUY' | 'SELL' | null = bias === 'BULLISH' ? 'BUY' : bias === 'BEARISH' ? 'SELL' : null
  const activeZone = [...zones].reverse().find(zone => zone.lifecycle === 'ACTIVE')
  const entryZone = activeZone ? { top: activeZone.top, bottom: activeZone.bottom } : null

  let stopLoss: number | null = null
  let takeProfits: number[] = []
  let invalidation: number | null = null
  if (direction === 'BUY' && entryZone) {
    stopLoss = entryZone.bottom - range * 0.08
    const distance = Math.max(entryZone.top - stopLoss, range * 0.1)
    takeProfits = [entryZone.top + distance, entryZone.top + distance * 2, entryZone.top + distance * 3]
    invalidation = stopLoss
  } else if (direction === 'SELL' && entryZone) {
    stopLoss = entryZone.top + range * 0.08
    const distance = Math.max(stopLoss - entryZone.bottom, range * 0.1)
    takeProfits = [entryZone.bottom - distance, entryZone.bottom - distance * 2, entryZone.bottom - distance * 3]
    invalidation = stopLoss
  }

  return {
    bias,
    structure,
    bos,
    choch,
    displacement,
    liquidity: liquidity.slice(-8),
    zones: zones.slice(-12),
    premium,
    discount,
    equilibrium,
    confluences,
    missing,
    score,
    direction,
    entryZone,
    stopLoss,
    takeProfits,
    invalidation,
    explanation: `${direction ? `Directional bias is ${bias}` : 'No directional bias'}; structure=${structure}; ${displacement ? 'a displacement candle is confirmed' : 'displacement is not confirmed'}; ${zones.length} relevant zones detected.`,
  }
}

function emptyAnalysis(explanation: string): MarketAnalysis {
  return {
    bias: 'RANGE', structure: 'RANGE', bos: false, choch: false, displacement: false,
    liquidity: [], zones: [], premium: 0, discount: 0, equilibrium: 0,
    confluences: [], missing: ['At least 20 real candles are required'], score: 0,
    direction: null, entryZone: null, stopLoss: null, takeProfits: [], invalidation: null,
    explanation,
  }
}
