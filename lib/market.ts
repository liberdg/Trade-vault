export type MarketKind = 'crypto' | 'forex' | 'stock' | 'index' | 'metal'

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
  provider: 'binance' | 'yahoo' | 'frankfurter' | 'deriv'
  status: 'realtime' | 'delayed' | 'eod'
  retrievedAt: string
  interval: string
  candles: Candle[]
  bid?: number
  ask?: number
  last?: number
  spread?: number
  warning?: string
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
  // Yahoo does not provide a true 4h interval. Refuse rather than silently returning 1h bars labeled as 4h.
  if (interval === '4h') {
    throw new Error('Yahoo Finance does not provide verified 4h candles. Use a provider that supports H4 (for example Deriv) or select 1h.')
  }
  const ticker = kind === 'forex'
    ? `${symbol.toUpperCase().replace(/[^A-Z]/g, '')}=X`
    : kind === 'crypto'
      ? `${symbol.toUpperCase().replace(/USDT$/, '')}-USD`
      : symbol.toUpperCase()
  const yahooInterval = YAHOO_INTERVALS[interval]
  if (!yahooInterval) throw new Error(`Yahoo Finance does not support interval ${interval}`)
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

const DERIV_INTERVALS: Record<string, number | null> = {
  '1m': 60,
  '5m': 300,
  '15m': 900,
  '30m': 1800,
  '1h': 3600,
  '2h': 7200,
  '4h': 14400,
  '1d': 86400,
  '1w': 604800,
  '1mo': null,
}

export function toDerivSymbol(symbol: string, kind: MarketKind): string {
  const clean = symbol.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (kind === 'metal') {
    if (clean.includes('XAU') || clean === 'GOLD') return 'frxXAUUSD'
    if (clean.includes('XAG') || clean === 'SILVER') return 'frxXAGUSD'
  }
  if (kind === 'forex') return `frx${clean}`
  return clean
}

export async function fetchDerivCandles(symbol: string, interval: string, kind: MarketKind): Promise<{
  candles: Candle[]
  bid?: number
  ask?: number
  last?: number
  spread?: number
  retrievedAt: string
}> {
  const granularity = DERIV_INTERVALS[interval]
  if (granularity == null) throw new Error(`Deriv does not provide a direct ${interval} candle feed`)

  const derivSymbol = toDerivSymbol(symbol, kind)
  const appId = process.env.DERIV_APP_ID?.trim()
  if (!appId) throw new Error('DERIV_APP_ID is not configured. Public app id fallbacks are disabled to avoid masking misconfiguration.')

  return await new Promise((resolve, reject) => {
    let socket: WebSocket
    try {
      socket = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${encodeURIComponent(appId)}`)
    } catch (error) {
      reject(error)
      return
    }

    let candlesReceived = false
    let latestQuote: { bid?: number; ask?: number; last?: number; spread?: number } = {}
    const timeout = setTimeout(() => {
      socket.close()
      reject(new Error('Deriv market WebSocket timed out'))
    }, 12000)

    socket.onopen = () => {
      socket.send(JSON.stringify({
        ticks_history: derivSymbol,
        end: 'latest',
        count: 200,
        style: 'candles',
        granularity,
        subscribe: 0,
        req_id: 1,
      }))
      socket.send(JSON.stringify({ ticks: derivSymbol, subscribe: 1, req_id: 2 }))
    }
    socket.onmessage = event => {
      try {
        const data = JSON.parse(String(event.data))
        if (data.error) {
          clearTimeout(timeout)
          socket.close()
          reject(new Error(data.error.message || 'Deriv market data authorization failed'))
          return
        }
        if (data.candles && !candlesReceived) {
          candlesReceived = true
          const candles = data.candles.map((candle: { epoch: number; open: number; high: number; low: number; close: number }) => ({
            time: Number(candle.epoch) * 1000,
            open: Number(candle.open),
            high: Number(candle.high),
            low: Number(candle.low),
            close: Number(candle.close),
          })).filter((candle: Candle) => [candle.open,candle.high,candle.low,candle.close].every(Number.isFinite))
          if (candles.length > 0) {
            setTimeout(() => {
              clearTimeout(timeout)
              socket.close()
              resolve({
                candles,
                ...latestQuote,
                retrievedAt: new Date().toISOString(),
              })
            }, 150)
          }
        }
        if (data.tick) {
          const bid = typeof data.tick.bid === 'number' ? data.tick.bid : undefined
          const ask = typeof data.tick.ask === 'number' ? data.tick.ask : undefined
          const last = typeof data.tick.quote === 'number' ? data.tick.quote : undefined
          latestQuote = {
            bid,
            ask,
            last,
            spread: bid !== undefined && ask !== undefined ? ask - bid : undefined,
          }
        }
      } catch (error) {
        clearTimeout(timeout)
        socket.close()
        reject(error instanceof Error ? error : new Error('Invalid Deriv market response'))
      }
    }
    socket.onerror = () => {
      clearTimeout(timeout)
      reject(new Error('Deriv market WebSocket connection failed'))
    }
  })
}
