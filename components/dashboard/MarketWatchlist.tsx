'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowDownRight, ArrowUpRight, WifiOff } from 'lucide-react'

const WATCHLIST = [
  { symbol: 'BTCUSDT', kind: 'crypto', label: 'BTC / USDT' },
  { symbol: 'ETHUSDT', kind: 'crypto', label: 'ETH / USDT' },
  { symbol: 'EURUSD', kind: 'forex', label: 'EUR / USD' },
  { symbol: '^GSPC', kind: 'index', label: 'S&P 500' },
]

interface WatchRow {
  label: string
  symbol: string
  kind: string
  price: number | null
  change: number | null
  provider: string
  status: string
}

export function MarketWatchlist() {
  const [rows, setRows] = useState<WatchRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    Promise.all(WATCHLIST.map(async item => {
      try {
        const response = await fetch(`/api/market/candles?symbol=${encodeURIComponent(item.symbol)}&kind=${item.kind}&interval=1d`, { cache: 'no-store' })
        if (!response.ok) throw new Error('unavailable')
        const data = await response.json()
        const candles = data.candles as Array<{ close: number }>
        const latest = candles.at(-1)?.close ?? null
        const previous = candles.at(-2)?.close ?? null
        const change = latest !== null && previous !== null ? ((latest - previous) / previous) * 100 : null
        return { label: item.label, symbol: item.symbol, kind: item.kind, price: latest, change, provider: data.provider, status: data.status }
      } catch {
        return { label: item.label, symbol: item.symbol, kind: item.kind, price: null, change: null, provider: '—', status: 'unavailable' }
      }
    })).then(results => {
      if (!cancelled) {
        setRows(results)
        setLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [])

  return (
    <div className="workstation-panel overflow-hidden">
      <div className="flex h-11 items-center justify-between border-b border-border px-4">
        <div>
          <div className="text-xs font-semibold text-white">Market watchlist</div>
          <div className="text-[9px] font-mono text-muted">PROVIDER-BACKED PRICES</div>
        </div>
        <Link href="/market" className="text-[10px] font-mono text-accent hover:text-white">Open market</Link>
      </div>
      {loading ? (
        <div className="px-4 py-6 text-xs text-muted">Loading real market data…</div>
      ) : (
        <div className="divide-y divide-border">
          {rows.map(row => (
            <Link key={row.symbol} href={`/market?symbol=${encodeURIComponent(row.symbol)}&interval=1d`}
              className="grid grid-cols-[1fr_auto] items-center px-4 py-3 transition-colors hover:bg-white/[0.025]">
              <div>
                <div className="text-xs font-semibold text-white">{row.label}</div>
                <div className="mt-1 text-[9px] font-mono uppercase text-muted">{row.provider} · {row.status}</div>
              </div>
              {row.price === null ? (
                <div className="flex items-center gap-1 text-[10px] font-mono text-muted"><WifiOff className="h-3 w-3" />Unavailable</div>
              ) : (
                <div className="text-right">
                  <div className="font-mono text-xs font-semibold text-white">{row.price.toLocaleString('en-US', { maximumFractionDigits: row.price < 10 ? 5 : 2 })}</div>
                  {row.change !== null && (
                    <div className={`mt-1 flex items-center justify-end gap-0.5 font-mono text-[9px] ${row.change >= 0 ? 'text-[#2ad39b]' : 'text-[#f06a6a]'}`}>
                      {row.change >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {row.change >= 0 ? '+' : ''}{row.change.toFixed(2)}%
                    </div>
                  )}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
