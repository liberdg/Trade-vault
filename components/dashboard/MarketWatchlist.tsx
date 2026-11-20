'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowDownRight, ArrowUpRight, Plus, Trash2, WifiOff } from 'lucide-react'
import { MARKET_INSTRUMENTS, MarketInstrument } from '@/lib/market-instruments'

const DEFAULT_WATCHLIST = ['EURUSD','GBPUSD','USDJPY','USDCHF','USDCAD','AUDUSD','NZDUSD','EURJPY','GBPJPY','XAUUSD','XAGUSD']

interface WatchRow {
  label: string
  symbol: string
  kind: string
  price: number | null
  change: number | null
  provider: string
  status: string
  bid: number | null
  ask: number | null
  spread: number | null
}

export function MarketWatchlist() {
  const [rows, setRows] = useState<WatchRow[]>([])
  const [loading, setLoading] = useState(true)
  const [watchlist, setWatchlist] = useState<string[]>(DEFAULT_WATCHLIST)
  const [query, setQuery] = useState('')

  useEffect(() => {
    const stored = window.localStorage.getItem('smrt-watchlist')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) setWatchlist(parsed)
      } catch {}
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const items = watchlist.map(symbol => MARKET_INSTRUMENTS.find(item => item.symbol === symbol)).filter((item): item is MarketInstrument => Boolean(item))
    Promise.all(items.map(async item => {
      try {
        const response = await fetch(`/api/market/candles?symbol=${encodeURIComponent(item.symbol)}&kind=${item.kind}&interval=1d`, { cache: 'no-store' })
        if (!response.ok) throw new Error('unavailable')
        const data = await response.json()
        const candles = data.candles as Array<{ close: number }>
        const latest = candles.at(-1)?.close ?? null
        const previous = candles.at(-2)?.close ?? null
        const change = latest !== null && previous !== null ? ((latest - previous) / previous) * 100 : null
        return {
          label: item.label, symbol: item.symbol, kind: item.kind, price: latest, change,
          provider: data.provider, status: data.status,
          bid: typeof data.bid === 'number' ? data.bid : null,
          ask: typeof data.ask === 'number' ? data.ask : null,
          spread: typeof data.spread === 'number' ? data.spread : null,
        }
      } catch {
        return { label: item.label, symbol: item.symbol, kind: item.kind, price: null, change: null, provider: '—', status: 'unavailable', bid: null, ask: null, spread: null }
      }
    })).then(results => {
      if (!cancelled) {
        setRows(results)
        setLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [watchlist])

  const saveWatchlist = (next: string[]) => {
    setWatchlist(next)
    window.localStorage.setItem('smrt-watchlist', JSON.stringify(next))
  }

  const searchResults = MARKET_INSTRUMENTS.filter(item =>
    `${item.symbol} ${item.label} ${item.category}`.toLowerCase().includes(query.toLowerCase()) &&
    !watchlist.includes(item.symbol)
  ).slice(0, 6)

  return (
    <div className="workstation-panel overflow-hidden">
      <div className="flex h-11 items-center justify-between border-b border-border px-4">
        <div>
          <div className="text-xs font-semibold text-white">Market watchlist</div>
          <div className="text-[9px] font-mono text-muted">PROVIDER-BACKED PRICES</div>
        </div>
        <Link href="/market" className="text-[10px] font-mono text-accent hover:text-white">Open market</Link>
      </div>
      <div className="border-b border-border p-2">
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Add instrument"
          className="w-full rounded-md border border-border bg-[#090c10] px-3 py-2 text-xs text-white placeholder:text-muted focus:border-accent/40 focus:outline-none" />
        {query && searchResults.length > 0 && (
          <div className="mt-1 space-y-1">
            {searchResults.map(item => (
              <button key={item.symbol} onClick={() => { saveWatchlist([...watchlist, item.symbol]); setQuery('') }}
                className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-[11px] text-white hover:bg-white/[0.03]">
                <span>{item.label}</span><span className="flex items-center gap-1 text-[9px] font-mono text-accent"><Plus className="h-3 w-3" /> Add</span>
              </button>
            ))}
          </div>
        )}
      </div>
      {loading ? (
        <div className="px-4 py-6 text-xs text-muted">Loading real market data…</div>
      ) : (
        <div className="divide-y divide-border">
          {rows.map(row => (
            <div key={row.symbol} className="grid grid-cols-[1fr_auto_auto] items-center px-4 py-3 transition-colors hover:bg-white/[0.025]">
              <Link href={`/market?symbol=${encodeURIComponent(row.symbol)}&interval=1d`} className="min-w-0">
              <div>
                <div className="text-xs font-semibold text-white">{row.label}</div>
                <div className="mt-1 text-[9px] font-mono uppercase text-muted">{row.provider} · {row.status}</div>
              </div>
              </Link>
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
                  {row.bid !== null && row.ask !== null && (
                    <div className="mt-1 font-mono text-[8px] text-muted">
                      BID {row.bid.toFixed(5)} · ASK {row.ask.toFixed(5)}
                      {row.spread !== null ? ` · SPREAD ${row.spread.toFixed(5)}` : ''}
                    </div>
                  )}
                </div>
              )}
              <button onClick={() => saveWatchlist(watchlist.filter(symbol => symbol !== row.symbol))}
                className="ml-2 text-muted hover:text-[#f06a6a]" aria-label={`Remove ${row.symbol}`}>
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
