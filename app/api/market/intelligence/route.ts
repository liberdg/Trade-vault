import { NextRequest, NextResponse } from 'next/server'
import { fetchBinanceCandles, fetchYahooCandles, type MarketKind } from '@/lib/market'
import { analyzeMarketIntelligence } from '@/lib/market-intelligence/engine'

export const dynamic = 'force-dynamic'

const DEFAULT_TIMEFRAMES = ['1d', '4h', '1h', '15m']
const ALLOWED_TIMEFRAMES = new Set(['1m', '5m', '15m', '30m', '1h', '2h', '4h', '1d', '1w'])

async function loadCandles(symbol: string, kind: MarketKind, timeframe: string) {
  if (kind === 'crypto') {
    try {
      return { provider: 'binance' as const, candles: await fetchBinanceCandles(symbol, timeframe) }
    } catch (binanceError) {
      try {
        return { provider: 'yahoo' as const, candles: await fetchYahooCandles(symbol, timeframe, 'crypto') }
      } catch {
        throw binanceError
      }
    }
  }
  const yahooKind = kind === 'forex' || kind === 'metal' ? 'forex' : 'stock'
  return { provider: 'yahoo' as const, candles: await fetchYahooCandles(symbol, timeframe, yahooKind) }
}

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get('symbol')?.trim().toUpperCase()
  const kindParam = request.nextUrl.searchParams.get('kind')?.trim().toLowerCase() || 'crypto'
  const allowedKinds: MarketKind[] = ['crypto', 'forex', 'stock', 'index', 'metal']
  if (!symbol) return NextResponse.json({ error: 'Symbol is required' }, { status: 400 })
  if (!allowedKinds.includes(kindParam as MarketKind)) return NextResponse.json({ error: 'Unsupported market kind' }, { status: 400 })

  const requested = request.nextUrl.searchParams.get('timeframes')
  const timeframes = requested ? requested.split(',').map(value => value.trim()).filter(Boolean) : DEFAULT_TIMEFRAMES
  const uniqueTimeframes = [...new Set(timeframes)]
  if (!uniqueTimeframes.length || uniqueTimeframes.length > 6 || uniqueTimeframes.some(tf => !ALLOWED_TIMEFRAMES.has(tf))) {
    return NextResponse.json({ error: 'Timeframes must be 1–6 supported intervals.' }, { status: 400 })
  }

  const results = await Promise.all(uniqueTimeframes.map(async timeframe => {
    try {
      const market = await loadCandles(symbol, kindParam as MarketKind, timeframe)
      return {
        timeframe,
        provider: market.provider,
        retrievedAt: new Date().toISOString(),
        candleCount: market.candles.length,
        analysis: analyzeMarketIntelligence(market.candles),
      }
    } catch (error) {
      return { timeframe, status: 'DATA_UNAVAILABLE' as const, error: error instanceof Error ? error.message : 'Provider error' }
    }
  }))

  const available = results.filter(result => 'analysis' in result)
  const biases = available.map(result => result.analysis.structure)
  const aligned = biases.length > 0 && biases.every(bias => bias === biases[0] && bias !== 'UNCONFIRMED' && bias !== 'RANGE')
  const conflicting = biases.includes('BULLISH') && biases.includes('BEARISH')
  return NextResponse.json({
    symbol,
    kind: kindParam,
    timeframes: results,
    alignment: aligned ? biases[0] : conflicting ? 'CONFLICTING' : 'MIXED_OR_UNCONFIRMED',
    analyzedAt: new Date().toISOString(),
    dataAvailableTimeframes: available.length,
    requestedTimeframes: uniqueTimeframes.length,
  })
}
