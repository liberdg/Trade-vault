import { NextRequest, NextResponse } from 'next/server'
import { fetchBinanceCandles, fetchDerivCandles, fetchFrankfurterCandles, fetchYahooCandles, MarketKind } from '@/lib/market'

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
      if (interval === '1mo') return NextResponse.json({ error: 'Monthly candles are not available from the current forex provider.', retrievedAt: new Date().toISOString() }, { status: 502 })

      try {
        const deriv = await fetchDerivCandles(symbol, interval, kind)
        return NextResponse.json({
          symbol,
          provider: 'deriv',
          status: 'realtime',
          retrievedAt: deriv.retrievedAt,
          interval,
          candles: deriv.candles,
          bid: deriv.bid,
          ask: deriv.ask,
          last: deriv.last,
          spread: deriv.spread,
        })
      } catch (derivError) {
        if (interval === '2h' || interval === '4h' || interval === '1mo') {
          return NextResponse.json({
            error: `No verified provider returned ${interval} candles`,
            detail: derivError instanceof Error ? derivError.message : 'Deriv unavailable',
            retrievedAt: new Date().toISOString(),
          }, { status: 502 })
        }
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
          // Frankfurter is daily close-only — only use it for 1d requests.
          if (interval !== '1d') {
            return NextResponse.json({
              error: 'No verified provider returned usable forex candles',
              detail: yahooError instanceof Error ? yahooError.message : 'Yahoo Finance unavailable',
              retrievedAt: new Date().toISOString(),
            }, { status: 502 })
          }
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
    }

    if (kind === 'metal') {
      try {
        const deriv = await fetchDerivCandles(symbol, interval, kind)
        return NextResponse.json({
          symbol,
          provider: 'deriv',
          status: 'realtime',
          retrievedAt: deriv.retrievedAt,
          interval,
          candles: deriv.candles,
          bid: deriv.bid,
          ask: deriv.ask,
          last: deriv.last,
          spread: deriv.spread,
        })
      } catch (derivError) {
        if (interval === '2h' || interval === '1mo') {
          return NextResponse.json({
            error: `No verified provider returned ${interval} candles`,
            detail: derivError instanceof Error ? derivError.message : 'Deriv unavailable',
            retrievedAt: new Date().toISOString(),
          }, { status: 502 })
        }
        return NextResponse.json({
          error: 'No verified XAUUSD/XAGUSD spot or broker feed is available',
          detail: derivError instanceof Error ? derivError.message : 'Deriv unavailable',
          retrievedAt: new Date().toISOString(),
        }, { status: 502 })
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
