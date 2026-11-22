import Link from 'next/link'
import { RefreshCw, ShieldCheck } from 'lucide-react'
import { RealMarketChart } from '@/components/market/RealMarketChart'
import { MarketIntelligencePanel } from '@/components/market/MarketIntelligencePanel'
import {
  fetchBinanceCandles,
  fetchFrankfurterCandles,
  fetchYahooCandles,
  fetchDerivCandles,
  MarketCandlesResult,
  MarketKind,
} from '@/lib/market'
import { analyzeCandles, MarketAnalysis } from '@/lib/smrt-analysis'
import { MARKET_INSTRUMENTS } from '@/lib/market-instruments'

export const dynamic = 'force-dynamic'

const SYMBOLS = MARKET_INSTRUMENTS

interface Props {
  searchParams: { symbol?: string; interval?: string }
}

async function loadMarket(symbol: string, kind: MarketKind, interval: string): Promise<MarketCandlesResult> {
  if (kind === 'crypto') {
    try {
      const candles = await fetchBinanceCandles(symbol, interval)
      return {
        symbol,
        provider: 'binance',
        status: 'realtime',
        retrievedAt: new Date().toISOString(),
        interval,
        candles,
      }
    } catch (binanceError) {
      const candles = await fetchYahooCandles(symbol, interval, kind)
      return {
        symbol,
        provider: 'yahoo',
        status: 'delayed',
        retrievedAt: new Date().toISOString(),
        interval,
        candles,
      }
    }
  }

  if (kind === 'forex') {
    const match = symbol.match(/^([A-Z]{3})([A-Z]{3})$/)
    if (!match) throw new Error('Invalid forex symbol')
    try {
      const deriv = await fetchDerivCandles(symbol, interval, kind)
      return {
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
      }
    } catch {
      if (interval === '2h' || interval === '1mo') {
        throw new Error(`No verified provider returned ${interval} candles`)
      }
      try {
      const candles = await fetchYahooCandles(symbol, interval, kind)
      return {
        symbol,
        provider: 'yahoo',
        status: 'delayed',
        retrievedAt: new Date().toISOString(),
        interval,
        candles,
      }
      } catch (yahooError) {
      const [, base, quote] = match
      const candles = await fetchFrankfurterCandles(base, quote)
      return {
        symbol,
        provider: 'frankfurter',
        status: 'eod',
        retrievedAt: new Date().toISOString(),
        interval: '1d',
        candles,
      }
      }
    }
  }

  if (kind === 'metal') {
    try {
      const deriv = await fetchDerivCandles(symbol, interval, kind)
      return {
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
      }
    } catch (error) {
      if (interval === '2h' || interval === '1mo') {
        throw new Error(`No verified provider returned ${interval} candles`)
      }
      throw new Error(error instanceof Error ? error.message : 'No verified XAUUSD/XAGUSD spot or broker feed is available')
    }
  }

  const candles = await fetchYahooCandles(symbol, interval, kind)
  return {
    symbol,
    provider: 'yahoo',
    status: 'delayed',
    retrievedAt: new Date().toISOString(),
    interval,
    candles,
  }
}

export default async function MarketPage({ searchParams }: Props) {
  const selected = SYMBOLS.find(item => item.symbol === searchParams.symbol?.toUpperCase()) ?? SYMBOLS[0]
  const interval = ['1m', '5m', '15m', '30m', '1h', '2h', '4h', '1d', '1w', '1mo'].includes(searchParams.interval ?? '')
    ? searchParams.interval!
    : '1d'

  let data: MarketCandlesResult | null = null
  let analysis: MarketAnalysis | null = null
  let error = ''
  try {
    data = await loadMarket(selected.symbol, selected.kind as MarketKind, interval)
    if (data) analysis = analyzeCandles(data.candles)
  } catch (err) {
    error = err instanceof Error ? err.message : 'Market provider unavailable'
  }

  const latest = data?.candles.at(-1)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="workstation-label">Market workspace</div>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-white sm:text-2xl">Real market analysis</h1>
          <p className="mt-1 text-xs text-muted">OHLC provider data with explicit provenance</p>
        </div>
        <Link href={`/market?symbol=${selected.symbol}&interval=${interval}`} className="flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/10 px-4 py-2 font-mono text-sm text-accent">
          <RefreshCw className="h-4 w-4" />
          Actualiser
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[260px_1fr]">
        <aside className="workstation-panel p-2">
          <div className="mb-2 px-2 py-2 workstation-label">Watchlist</div>
          <div className="space-y-1">
            {SYMBOLS.map(item => (
              <Link key={item.symbol} href={`/market?symbol=${item.symbol}&interval=${interval}`}
                className={`block w-full rounded-xl border px-3 py-3 transition-all ${selected.symbol === item.symbol ? 'border-accent/30 bg-accent/10' : 'border-transparent hover:border-border hover:bg-white/[0.02]'}`}>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-white">{item.label}</span>
                  <span className="text-[10px] font-mono text-muted">{item.category}</span>
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-4 border-t border-border px-2 pt-4 text-xs leading-relaxed text-muted">
            <ShieldCheck className="mb-2 h-4 w-4 text-bull" />
            Les cours sont obtenus depuis des fournisseurs publics côté serveur. Aucun cours synthétique n’est affiché.
          </div>
        </aside>

        <div className="workstation-panel min-w-0 p-4">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl tracking-wide text-white">{selected.label}</h2>
              {latest && (
                <div className="mt-1 font-mono text-xl font-bold text-bull">
                  {latest.close.toLocaleString('en-US', { maximumFractionDigits: latest.close < 10 ? 5 : 2 })}
                </div>
              )}
              {data?.bid !== undefined && data?.ask !== undefined && (
                <div className="mt-2 flex gap-3 font-mono text-[10px] text-muted">
                  <span>BID {data.bid.toLocaleString('en-US', { maximumFractionDigits: latest && latest.close < 10 ? 5 : 2 })}</span>
                  <span>ASK {data.ask.toLocaleString('en-US', { maximumFractionDigits: latest && latest.close < 10 ? 5 : 2 })}</span>
                  {data.spread !== undefined && <span>SPREAD {data.spread.toLocaleString('en-US', { maximumFractionDigits: 5 })}</span>}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-1">
              {['1m', '5m', '15m', '30m', '1h', '2h', '4h', '1d', '1w', '1mo'].map(item => (
                <Link key={item} href={`/market?symbol=${selected.symbol}&interval=${item}`}
                  className={`rounded-lg border px-2.5 py-1.5 text-xs font-mono ${interval === item ? 'border-accent/30 bg-accent/10 text-accent' : 'border-border text-muted hover:text-white'}`}>
                  {item}
                </Link>
              ))}
            </div>
          </div>

          {error && (
            <div className="flex h-96 items-center justify-center rounded-xl border border-bear/20 bg-bear-dim p-5 text-center">
              <div className="max-w-md">
                <p className="font-mono text-sm text-white">Données indisponibles</p>
                <p className="mt-2 text-xs leading-relaxed text-muted">{error}</p>
              </div>
            </div>
          )}
          {data && (
            <RealMarketChart candles={data.candles} provider={data.provider} status={data.status} retrievedAt={data.retrievedAt} analysis={analysis ?? undefined} symbol={selected.symbol} kind={selected.kind} interval={interval} />
          )}
          {analysis && (
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-border bg-surface p-4">
                <div className="text-[10px] font-mono uppercase text-muted">Bias / Structure</div>
                <div className="mt-2 font-mono text-sm font-bold text-white">{analysis.bias} · {analysis.structure}</div>
                <div className="mt-2 text-xs text-muted">{analysis.explanation}</div>
              </div>
              <div className="rounded-xl border border-border bg-surface p-4">
                <div className="text-[10px] font-mono uppercase text-muted">Confluences</div>
                <div className="mt-2 space-y-1">
                  {analysis.confluences.map(item => <div key={item} className="text-xs text-bull">• {item}</div>)}
                </div>
              </div>
              <div className="rounded-xl border border-border bg-surface p-4">
                <div className="text-[10px] font-mono uppercase text-muted">Missing / Invalidation</div>
                <div className="mt-2 space-y-1">
                  {analysis.missing.map(item => <div key={item} className="text-xs text-gold">• {item}</div>)}
                </div>
              </div>
            </div>
          )}
          <MarketIntelligencePanel symbol={selected.symbol} kind={selected.kind} interval={interval} />
        </div>
      </div>
    </div>
  )
}
