import { NextRequest, NextResponse } from 'next/server'
import { fetchBinanceCandles, fetchFrankfurterCandles, fetchYahooCandles, MarketKind } from '@/lib/market'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get('symbol')?.trim().toUpperCase()
  const interval = request.nextUrl.searchParams.get('interval')?.trim() || '1d'
  const kind = (request.nextUrl.searchParams.get('kind')?.trim() || 'crypto') as MarketKind

  if (!symbol) return NextResponse.json({ error: 'Symbol is required' }, { status: 400 })

  try {
    if (kind === 'crypto') {
      try {
        const candles = await fetchBinanceCandles(symbol, interval)
        return NextResponse.json({
          symbol,
          provider: 'binance',
          status: 'realtime',
          retrievedAt: new Date().toISOString(),
          interval,
          candles,
        })
      } catch (binanceError) {
        const candles = await fetchYahooCandles(symbol, interval, kind)
        return NextResponse.json({
          symbol,
          provider: 'yahoo',
          status: 'delayed',
          retrievedAt: new Date().toISOString(),
          interval,
          candles,
          warning: binanceError instanceof Error ? binanceError.message : 'Binance unavailable',
        })
      }
    }

    if (kind === 'forex') {
      const match = symbol.match(/^([A-Z]{3})([A-Z]{3})$/)
      if (!match) return NextResponse.json({ error: 'Forex symbols must use ISO pair format, for example EURUSD' }, { status: 400 })

      try {
        const candles = await fetchYahooCandles(symbol, interval, kind)
        return NextResponse.json({
          symbol,
          provider: 'yahoo',
          status: 'delayed',
          retrievedAt: new Date().toISOString(),
          interval,
          candles,
        })
      } catch (yahooError) {
        const [, base, quote] = match
        const candles = await fetchFrankfurterCandles(base, quote)
        return NextResponse.json({
          symbol,
          provider: 'frankfurter',
          status: 'eod',
          retrievedAt: new Date().toISOString(),
          interval: '1d',
          candles,
          warning: yahooError instanceof Error ? yahooError.message : 'Yahoo Finance unavailable',
        })
      }
    }

    const candles = await fetchYahooCandles(symbol, interval, kind)
    return NextResponse.json({
      symbol,
      provider: 'yahoo',
      status: 'delayed',
      retrievedAt: new Date().toISOString(),
      interval,
      candles,
    })
  } catch (error) {
    return NextResponse.json({
      error: 'No provider returned usable market data',
      detail: error instanceof Error ? error.message : 'Unknown provider error',
      retrievedAt: new Date().toISOString(),
    }, { status: 502 })
  }
}
