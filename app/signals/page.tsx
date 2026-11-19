import Link from 'next/link'
import { fetchBinanceCandles } from '@/lib/market'
import { analyzeCandles } from '@/lib/smrt-analysis'

export const dynamic = 'force-dynamic'

export default async function SignalsPage() {
  const candidates = await Promise.all(['BTCUSDT', 'ETHUSDT', 'SOLUSDT'].map(async symbol => {
    try {
      const candles = await fetchBinanceCandles(symbol, '1h', 180)
      const analysis = analyzeCandles(candles)
      return { symbol, candles, analysis, available: true }
    } catch {
      return { symbol, candles: [], analysis: null, available: false }
    }
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl tracking-wide text-white">SIGNAL <span className="text-accent">CENTER</span></h1>
        <p className="mt-1 font-mono text-sm text-muted">Analyses calculées depuis les bougies H1 réellement récupérées</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {candidates.map(item => (
          <div key={item.symbol} className="rounded-2xl border border-border bg-panel p-5">
            {item.available && item.analysis ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-bold text-white">{item.symbol}</span>
                  <span className="rounded-full border border-accent/20 px-2 py-1 text-[10px] font-mono text-accent">WATCHING</span>
                </div>
                <div className="mt-4 text-2xl font-display text-white">{item.analysis.direction ?? 'AUCUN BIAIS'}</div>
                <div className="mt-2 text-xs text-muted">Score {item.analysis.score}/100 · {item.analysis.structure}</div>
                <div className="mt-4 space-y-1">
                  {item.analysis.confluences.slice(0, 4).map(confluence => <div key={confluence} className="text-xs text-bull">• {confluence}</div>)}
                </div>
                <Link href={`/market?symbol=${item.symbol}&interval=1h`} className="mt-5 block rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-center text-xs font-mono text-accent">
                  Ouvrir le graphique
                </Link>
              </>
            ) : (
              <div className="text-sm text-muted">Données indisponibles pour {item.symbol}</div>
            )}
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-border bg-surface p-4 text-xs leading-relaxed text-muted">
        Les signaux sont calculés mais ne sont ni exécutés ni archivés comme snapshots. Ils restent des analyses explicables, pas des trades réalisés.
      </div>
    </div>
  )
}
