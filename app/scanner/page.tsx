import Link from 'next/link'
import { fetchBinanceCandles } from '@/lib/market'
import { analyzeCandles } from '@/lib/smrt-analysis'

export const dynamic = 'force-dynamic'

const ASSETS = [
  { symbol: 'BTCUSDT', label: 'BTC / USDT' },
  { symbol: 'ETHUSDT', label: 'ETH / USDT' },
  { symbol: 'SOLUSDT', label: 'SOL / USDT' },
  { symbol: 'BNBUSDT', label: 'BNB / USDT' },
]

export default async function ScannerPage() {
  const results = await Promise.all(ASSETS.map(async asset => {
    try {
      const candles = await fetchBinanceCandles(asset.symbol, '1h', 180)
      const analysis = analyzeCandles(candles)
      return {
        ...asset,
        available: true,
        provider: 'Binance',
        score: analysis.score,
        bias: analysis.bias,
        structure: analysis.structure,
        direction: analysis.direction,
        confluences: analysis.confluences,
        missing: analysis.missing,
        timestamp: candles.at(-1)?.time ?? null,
      }
    } catch (error) {
      return {
        ...asset,
        available: false,
        provider: 'Binance',
        score: 0,
        bias: 'RANGE',
        structure: 'RANGE',
        direction: null,
        confluences: [],
        missing: [error instanceof Error ? error.message : 'Provider unavailable'],
        timestamp: null,
      }
    }
  }))

  return (
    <div className="mx-auto max-w-[1500px] space-y-4">
      <div>
        <div className="workstation-label">Market intelligence</div>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-white sm:text-2xl">Market scanner</h1>
        <p className="mt-1 text-xs text-muted">Deterministic H1 analysis from Binance OHLC</p>
      </div>
      <div className="workstation-panel overflow-hidden">
        {results.map(result => (
          <Link key={result.symbol} href={`/market?symbol=${result.symbol}&interval=1h`}
            className="grid gap-3 border-b border-border px-5 py-4 last:border-0 hover:bg-white/[0.02] md:grid-cols-[1fr_120px_120px_100px_1fr]">
            <div>
              <div className="font-mono text-sm font-bold text-white">{result.label}</div>
              <div className="mt-1 text-xs text-muted">{result.provider} · real OHLC</div>
            </div>
            <div><div className="text-[10px] font-mono uppercase text-muted">Bias</div><div className={`mt-1 font-mono text-sm ${result.bias === 'BULLISH' ? 'text-bull' : result.bias === 'BEARISH' ? 'text-bear' : 'text-gold'}`}>{result.bias}</div></div>
            <div><div className="text-[10px] font-mono uppercase text-muted">Structure</div><div className="mt-1 font-mono text-sm text-white">{result.structure}</div></div>
            <div><div className="text-[10px] font-mono uppercase text-muted">Score</div><div className="mt-1 font-mono text-sm text-accent">{result.available ? `${result.score}/100` : 'N/A'}</div></div>
            <div className="text-xs text-muted">{result.available ? result.confluences.slice(0, 3).join(' · ') : result.missing.join(' · ')}</div>
          </Link>
        ))}
      </div>
      <p className="text-xs leading-relaxed text-muted">Ce scanner ne crée aucune exécution ni alerte artificielle. Une ligne indisponible signifie que le fournisseur n’a retourné aucune donnée utilisable.</p>
    </div>
  )
}
