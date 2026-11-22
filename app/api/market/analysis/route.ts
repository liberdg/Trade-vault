import { NextRequest, NextResponse } from 'next/server'
import { fetchBinanceCandles, fetchYahooCandles } from '@/lib/market'
import { analyzeCandles } from '@/lib/smrt-analysis'
import { analyzeMarketIntelligence } from '@/lib/market-intelligence/engine'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get('symbol')?.trim().toUpperCase()
  const kind = request.nextUrl.searchParams.get('kind')?.trim() || 'crypto'
  const interval = request.nextUrl.searchParams.get('interval')?.trim() || '1h'
  if (!symbol) return NextResponse.json({ error: 'Symbol is required' }, { status: 400 })

  try {
    let candles
    let provider: 'binance' | 'yahoo'
    if (kind === 'crypto') {
      try {
        candles = await fetchBinanceCandles(symbol, interval)
        provider = 'binance'
      } catch {
        candles = await fetchYahooCandles(symbol, interval, 'crypto')
        provider = 'yahoo'
      }
    } else {
      candles = await fetchYahooCandles(symbol, interval, kind === 'forex' ? 'forex' : 'stock')
      provider = 'yahoo'
    }

    return NextResponse.json({
      symbol,
      interval,
      provider,
      retrievedAt: new Date().toISOString(),
      analysis: analyzeCandles(candles),
      intelligence: analyzeMarketIntelligence(candles),
    })
  } catch (error) {
    return NextResponse.json({
      error: 'No usable real candles for analysis',
      detail: error instanceof Error ? error.message : 'Unknown provider error',
      retrievedAt: new Date().toISOString(),
    }, { status: 502 })
  }
}
