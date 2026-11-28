import type { Candle } from '@/lib/market'

export type Swing = { index: number; time: number; price: number; type: 'HIGH' | 'LOW' }
export type StructureState = 'BULLISH' | 'BEARISH' | 'RANGE' | 'UNCONFIRMED'
export type MarketIntelligence = {
  status: 'READY' | 'INSUFFICIENT_DATA' | 'INVALID_DATA'
  quality: { validCount: number; rejectedCount: number; issues: string[] }
  structure: StructureState
  latestSwings: Swing[]
  bos: { direction: 'BULLISH' | 'BEARISH' | null; level: number | null; candleTime: number | null; confirmedByClose: boolean }
  choch: { direction: 'BULLISH' | 'BEARISH' | null; level: number | null; candleTime: number | null; confirmedByClose: boolean }
  atr: number | null
  currentPrice: number | null
  range: { high: number | null; low: number | null; equilibrium: number | null }
  explanation: string
}

export function validateCandles(input: Candle[]): { candles: Candle[]; issues: string[]; rejectedCount: number } {
  const issues: string[] = []
  const valid: Candle[] = []
  let rejectedCount = 0
  let lastTime = -Infinity
  for (let i = 0; i < input.length; i++) {
    const c = input[i]
    if (![c?.time, c?.open, c?.high, c?.low, c?.close].every(Number.isFinite) ||
      c.time <= 0 || c.open <= 0 || c.high <= 0 || c.low <= 0 || c.close <= 0 ||
      c.high < Math.max(c.open, c.close, c.low) || c.low > Math.min(c.open, c.close, c.high)) {
      rejectedCount++
      issues.push(`Candle ${i} rejected: invalid OHLC or timestamp.`)
      continue
    }
    if (c.time <= lastTime) {
      rejectedCount++
      issues.push(`Candle ${i} rejected: timestamps are not strictly increasing.`)
      continue
    }
    lastTime = c.time
    valid.push(c)
  }
  if (rejectedCount) issues.push(`${rejectedCount} candle(s) rejected by integrity checks.`)
  return { candles: valid, issues, rejectedCount }
}

function trueRange(c: Candle, previous?: Candle) {
  if (!previous) return c.high - c.low
  return Math.max(c.high - c.low, Math.abs(c.high - previous.close), Math.abs(c.low - previous.close))
}

function calculateAtr(candles: Candle[], period = 14): number | null {
  if (candles.length < period) return null
  const trs = candles.slice(-period).map((c, i, arr) => trueRange(c, i === 0 ? candles[candles.length - period - 1] : arr[i - 1]))
  return trs.reduce((sum, value) => sum + value, 0) / trs.length
}

export function analyzeMarketIntelligence(input: Candle[], options: { swingStrength?: number; minimumCandles?: number } = {}): MarketIntelligence {
  const validation = validateCandles(input)
  const candles = validation.candles
  const swingStrength = Math.max(2, Math.min(10, Math.floor(options.swingStrength ?? 3)))
  const minimumCandles = options.minimumCandles ?? 30
  const base = {
    quality: { validCount: candles.length, rejectedCount: validation.rejectedCount, issues: validation.issues },
    latestSwings: [] as Swing[],
    structure: 'UNCONFIRMED' as StructureState,
    bos: { direction: null, level: null, candleTime: null, confirmedByClose: false },
    choch: { direction: null, level: null, candleTime: null, confirmedByClose: false },
    atr: calculateAtr(candles),
    currentPrice: candles.at(-1)?.close ?? null,
    range: { high: null, low: null, equilibrium: null },
  }
  if (validation.rejectedCount > Math.max(2, input.length * 0.15)) {
    return { ...base, status: 'INVALID_DATA', explanation: 'Data integrity failed: too many candles were rejected. Analysis is stopped.' }
  }
  if (candles.length < minimumCandles) {
    return { ...base, status: 'INSUFFICIENT_DATA', explanation: `Need at least ${minimumCandles} valid candles; received ${candles.length}.` }
  }

  const swings: Swing[] = []
  for (let i = swingStrength; i < candles.length - swingStrength; i++) {
    const window = candles.slice(i - swingStrength, i + swingStrength + 1)
    const high = candles[i].high
    const low = candles[i].low
    if (window.every((c, j) => j === swingStrength || c.high <= high)) {
      if (window.some((c, j) => j !== swingStrength && c.high === high)) continue
      swings.push({ index: i, time: candles[i].time, price: high, type: 'HIGH' })
    }
    if (window.every((c, j) => j === swingStrength || c.low >= low)) {
      if (window.some((c, j) => j !== swingStrength && c.low === low)) continue
      swings.push({ index: i, time: candles[i].time, price: low, type: 'LOW' })
    }
  }
  swings.sort((a, b) => a.index - b.index)
  const highs = swings.filter(s => s.type === 'HIGH')
  const lows = swings.filter(s => s.type === 'LOW')
  const lastHigh = highs.at(-1), priorHigh = highs.at(-2)
  const lastLow = lows.at(-1), priorLow = lows.at(-2)
  let structure: StructureState = 'RANGE'
  if (lastHigh && priorHigh && lastLow && priorLow) {
    if (lastHigh.price > priorHigh.price && lastLow.price > priorLow.price) structure = 'BULLISH'
    else if (lastHigh.price < priorHigh.price && lastLow.price < priorLow.price) structure = 'BEARISH'
  } else structure = 'UNCONFIRMED'

  const last = candles.at(-1)!
  const bosUp = Boolean(lastHigh && last.close > lastHigh.price)
  const bosDown = Boolean(lastLow && last.close < lastLow.price)
  const priorStructure = priorHigh && priorLow && lastHigh && lastLow
    ? (lastHigh.price > priorHigh.price && lastLow.price > priorLow.price ? 'BULLISH' : lastHigh.price < priorHigh.price && lastLow.price < priorLow.price ? 'BEARISH' : 'RANGE')
    : 'UNCONFIRMED'
  const bos = bosUp ? { direction: 'BULLISH' as const, level: lastHigh!.price, candleTime: last.time, confirmedByClose: true }
    : bosDown ? { direction: 'BEARISH' as const, level: lastLow!.price, candleTime: last.time, confirmedByClose: true }
    : { direction: null, level: null, candleTime: null, confirmedByClose: false }
  const choch = bosUp && priorStructure === 'BEARISH' ? bos
    : bosDown && priorStructure === 'BULLISH' ? bos
    : { direction: null, level: null, candleTime: null, confirmedByClose: false }
  const recent = candles.slice(-50)
  const high = Math.max(...recent.map(c => c.high))
  const low = Math.min(...recent.map(c => c.low))
  const equilibrium = (high + low) / 2
  return {
    status: 'READY',
    ...base,
    structure,
    latestSwings: swings.slice(-12),
    bos,
    choch,
    range: { high, low, equilibrium },
    explanation: `Structure: ${structure}. Latest close ${last.close}; range high/low from last ${recent.length} candles. BOS is only reported when a candle close breaks the latest confirmed swing.`,
  }
}
