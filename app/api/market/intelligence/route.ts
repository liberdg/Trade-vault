import { NextRequest, NextResponse } from 'next/server'
import { fetchBinanceCandles, fetchDerivCandles, fetchYahooCandles, type MarketKind } from '@/lib/market'
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
  if (kind === 'forex' || kind === 'metal') {
    try {
      const deriv = await fetchDerivCandles(symbol, timeframe, kind)
      return { provider: 'deriv' as const, candles: deriv.candles }
    } catch (derivError) {
      if (kind === 'metal' || timeframe === '2h') throw derivError
      return { provider: 'yahoo' as const, candles: await fetchYahooCandles(symbol, timeframe, 'forex') }
    }
  }
  return { provider: 'yahoo' as const, candles: await fetchYahooCandles(symbol, timeframe, 'stock') }
}

