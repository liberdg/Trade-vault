export type MarketKind = 'crypto' | 'forex' | 'stock' | 'index'

export interface Candle {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

export interface MarketCandlesResult {
  symbol: string
  provider: 'binance' | 'yahoo' | 'frankfurter'
  status: 'realtime' | 'delayed' | 'eod'
  retrievedAt: string
  interval: string
  candles: Candle[]
}

const BINANCE_INTERVALS: Record<string, string> = {
  '1m': '1m',
  '5m': '5m',
  '15m': '15m',
  '30m': '30m',
  '1h': '1h',
  '4h': '4h',
  '1d': '1d',
  '1w': '1w',
}

const YAHOO_INTERVALS: Record<string, string> = {
  '1m': '1m',
  '5m': '5m',
  '15m': '15m',
  '30m': '30m',
  '1h': '1h',
  '4h': '1h',
  '1d': '1d',
  '1w': '1wk',
}

export function getBinanceSymbol(symbol: string) {
  const normalized = symbol.toUpperCase().replace(/[-/]/g, '')
  return normalized.endsWith('USDT') ? normalized : `${normalized}USDT`
}

export async function fetchBinanceCandles(symbol: string, interval: string, limit = 200): Promise<Candle[]> {
  const binanceInterval = BINANCE_INTERVALS[interval] ?? '1h'
  const url = `https://api.binance.com/api/v3/klines?symbol=${encodeURIComponent(getBinanceSymbol(symbol))}&interval=${binanceInterval}&limit=${limit}`
  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok) throw new Error(`Binance returned HTTP ${response.status}`)
  const rows = await response.json()
  if (!Array.isArray(rows)) throw new Error('Binance returned an invalid kline response')

  return rows.map((row: unknown[]) => ({
    time: Number(row[0]),
    open: Number(row[1]),
    high: Number(row[2]),
    low: Number(row[3]),
    close: Number(row[4]),
    volume: Number(row[5]),
  }))
}

export async function fetchYahooCandles(symbol: string, interval: string, kind: MarketKind): Promise<Candle[]> {
  const ticker = kind === 'forex'
    ? `${symbol.toUpperCase().replace(/[^A-Z]/g, '')}=X`
    : kind === 'crypto'
      ? `${symbol.toUpperCase().replace(/USDT$/, '')}-USD`
      : symbol.toUpperCase()
  const yahooInterval = YAHOO_INTERVALS[interval] ?? '1h'
  const range = interval === '1m' ? '7d' : interval === '1w' ? '10y' : '1y'
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=${range}&interval=${yahooInterval}`
  const response = await fetch(url, { cache: 'no-store', headers: { 'User-Agent': 'SMRT-Trading-Analytics/1.0' } })
  if (!response.ok) throw new Error(`Yahoo Finance returned HTTP ${response.status}`)
  const json = await response.json()
  const result = json?.chart?.result?.[0]
  if (!result?.timestamp || !result?.indicators?.quote?.[0]) throw new Error('Yahoo Finance returned no chart data')

  const quote = result.indicators.quote[0]
  return result.timestamp.flatMap((timestamp: number, index: number) => {
    const open = quote.open?.[index]
    const high = quote.high?.[index]
    const low = quote.low?.[index]
    const close = quote.close?.[index]
    if (![open, high, low, close].every(value => typeof value === 'number' && Number.isFinite(value))) return []
    return [{
      time: timestamp * 1000,
      open,
      high,
      low,
      close,
      volume: typeof quote.volume?.[index] === 'number' ? quote.volume[index] : undefined,
    }]
  })
}

export async function fetchFrankfurterCandles(base: string, quote: string, rangeDays = 180): Promise<Candle[]> {
  const end = new Date()
  const start = new Date(end)
  start.setUTCDate(start.getUTCDate() - rangeDays)
  const dateRange = `${start.toISOString().slice(0, 10)}..${end.toISOString().slice(0, 10)}`
  const url = `https://api.frankfurter.app/${dateRange}?from=${encodeURIComponent(base.toUpperCase())}&to=${encodeURIComponent(quote.toUpperCase())}`
  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok) throw new Error(`Frankfurter returned HTTP ${response.status}`)
  const json = await response.json()
  if (!json.rates || typeof json.rates !== 'object') throw new Error('Frankfurter returned no FX rates')

  return Object.entries(json.rates).flatMap(([date, rates]: [string, unknown]) => {
    const close = (rates as Record<string, number>)?.[quote.toUpperCase()]
    if (typeof close !== 'number') return []
    return [{
      time: Date.parse(`${date}T12:00:00Z`),
      open: close,
      high: close,
      low: close,
      close,
    }]
  }).sort((a, b) => a.time - b.time)
}
