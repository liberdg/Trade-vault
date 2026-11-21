'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react'

type SymbolItem = { symbol: string; displayName: string; market?: string; marketDisplayName?: string; submarket?: string; submarketDisplayName?: string; isOpen?: boolean }
type Proposal = Record<string, unknown>

export function DerivMarketTicket({ currency }: { currency: string }) {
  const [symbols, setSymbols] = useState<SymbolItem[]>([])
  const [symbol, setSymbol] = useState('')
  const [contractType, setContractType] = useState<'CALL' | 'PUT'>('CALL')
  const [stake, setStake] = useState('1')
  const [duration, setDuration] = useState('5')
  const [unit, setUnit] = useState<'t' | 's' | 'm'>('t')
  const [loadingSymbols, setLoadingSymbols] = useState(false)
  const [loadingQuote, setLoadingQuote] = useState(false)
  const [quote, setQuote] = useState<Proposal | null>(null)
  const [error, setError] = useState('')

  async function loadSymbols() {
    setLoadingSymbols(true)
    setError('')
    try {
      const response = await fetch('/api/broker/deriv/market', { method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store', body: JSON.stringify({ action: 'symbols' }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Unable to load market symbols.')
      const list = Array.isArray(result.symbols) ? result.symbols as SymbolItem[] : []
      setSymbols(list)
      if (!symbol && list.length) setSymbol(list[0].symbol)
    } catch (e) { setError(e instanceof Error ? e.message : 'Market symbols request failed.') }
    finally { setLoadingSymbols(false) }
  }

  useEffect(() => { void loadSymbols() }, [])

  async function requestQuote() {
    setQuote(null)
    setError('')
    const parsedStake = Number(stake)
    const parsedDuration = Number(duration)
    if (!symbol || !currency || !Number.isFinite(parsedStake) || parsedStake <= 0 || !Number.isInteger(parsedDuration) || parsedDuration <= 0) {
      setError('Choisis un actif, une mise et une durée valides.')
      return
    }
    setLoadingQuote(true)
    try {
      const response = await fetch('/api/broker/deriv/market', { method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store', body: JSON.stringify({ action: 'proposal', symbol, contractType, amount: parsedStake, duration: parsedDuration, durationUnit: unit, currency }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Price proposal failed.')
      setQuote(result.proposal as Proposal)
    } catch (e) { setError(e instanceof Error ? e.message : 'Proposal request failed.') }
    finally { setLoadingQuote(false) }
  }

  const quotePrice = quote?.ask_price ?? quote?.spot ?? quote?.price
  const payout = quote?.payout
  const profit = typeof payout === 'number' && typeof quotePrice === 'number' ? payout - quotePrice : null

  return (
    <div className="mt-4 rounded-lg border border-border bg-[#090c10] p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="workstation-label">Market · contract preview</div>
        <button type="button" onClick={loadSymbols} disabled={loadingSymbols} className="text-[10px] font-mono text-accent disabled:opacity-50"><RefreshCw className={`inline h-3 w-3 ${loadingSymbols ? 'animate-spin' : ''}`} /> Refresh symbols</button>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <label className="text-[10px] text-muted">Asset
          <select value={symbol} onChange={e => { setSymbol(e.target.value); setQuote(null) }} className="mt-1 w-full rounded border border-border bg-[#10161d] px-2 py-2 text-xs text-white">
            {symbols.map(item => <option key={item.symbol} value={item.symbol}>{item.displayName} · {item.symbol}</option>)}
          </select>
        </label>
        <label className="text-[10px] text-muted">Contract
          <select value={contractType} onChange={e => { setContractType(e.target.value as 'CALL' | 'PUT'); setQuote(null) }} className="mt-1 w-full rounded border border-border bg-[#10161d] px-2 py-2 text-xs text-white">
            <option value="CALL">Rise (CALL)</option><option value="PUT">Fall (PUT)</option>
          </select>
        </label>
        <label className="text-[10px] text-muted">Stake ({currency})
          <input type="number" min="0.35" step="0.01" value={stake} onChange={e => { setStake(e.target.value); setQuote(null) }} className="mt-1 w-full rounded border border-border bg-[#10161d] px-2 py-2 text-xs text-white"/>
        </label>
        <div className="grid grid-cols-[1fr_1fr] gap-2">
          <label className="text-[10px] text-muted">Duration
            <input type="number" min="1" value={duration} onChange={e => { setDuration(e.target.value); setQuote(null) }} className="mt-1 w-full rounded border border-border bg-[#10161d] px-2 py-2 text-xs text-white"/>
          </label>
          <label className="text-[10px] text-muted">Unit
            <select value={unit} onChange={e => { setUnit(e.target.value as 't'|'s'|'m'); setQuote(null) }} className="mt-1 w-full rounded border border-border bg-[#10161d] px-2 py-2 text-xs text-white"><option value="t">Ticks</option><option value="s">Seconds</option><option value="m">Minutes</option></select>
          </label>
        </div>
      </div>
      <button type="button" onClick={requestQuote} disabled={loadingQuote || loadingSymbols || !symbols.length} className="mt-3 w-full rounded bg-accent px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">{loadingQuote ? 'Requesting price…' : 'Get live contract proposal'}</button>
      {error && <div className="mt-2 rounded border border-[#f2bd66]/20 p-2 text-[10px] text-[#f2bd66]"><AlertCircle className="mr-1 inline h-3 w-3"/>{error}</div>}
      {quote && <div className="mt-3 rounded border border-accent/20 bg-accent/5 p-3">
        <div className="workstation-label">Live proposal received</div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs"><div className="text-muted">Price <div className="mt-1 font-mono text-white">{String(quotePrice ?? '—')} {currency}</div></div><div className="text-muted">Payout <div className="mt-1 font-mono text-white">{String(payout ?? '—')} {currency}</div></div><div className="text-muted">Potential net <div className="mt-1 font-mono text-white">{profit === null ? '—' : `${profit.toFixed(2)} ${currency}`}</div></div><div className="text-muted">Proposal ID<div className="mt-1 break-all font-mono text-white">{String(quote.id ?? '—')}</div></div></div>
        <div className="mt-2 flex items-center gap-1 text-[10px] text-amber-400">{contractType === 'CALL' ? <TrendingUp className="h-3 w-3"/> : <TrendingDown className="h-3 w-3"/>} Price preview only. No order was placed.</div>
      </div>}
      <p className="mt-2 text-[9px] leading-relaxed text-muted">This module currently fetches live market symbols and contract proposals. Buying is deliberately disabled until account-authorized order execution and risk checks are implemented and verified.</p>
    </div>
  )
}
