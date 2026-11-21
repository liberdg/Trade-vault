'use client'

import { useState } from 'react'
import { RefreshCw, Wallet, Activity, History, AlertTriangle } from 'lucide-react'
import { DerivMarketTicket } from './DerivMarketTicket'

type DerivSnapshot = {
  balance?: number
  currency?: string
  accountName?: string
  portfolio: Array<Record<string, unknown>>
  transactions: Array<Record<string, unknown>>
  positionsCount: number
  retrievedAt: string
}

type Props = {
  appId: string
  token: string
  accountId: string
  environment: 'demo' | 'real'
}

function display(value: unknown, fallback = '—'): string {
  if (value === null || value === undefined || value === '') return fallback
  return typeof value === 'string' || typeof value === 'number' ? String(value) : fallback
}

export function DerivAccountPanel({ appId, token, accountId, environment }: Props) {
  const [snapshot, setSnapshot] = useState<DerivSnapshot | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function refresh() {
    if (!appId.trim() || !token.trim()) {
      setError('Saisis ton App ID et ton token dans le formulaire Deriv, puis actualise les données.')
      return
    }
    if (!accountId) {
      setError('Aucun compte Deriv actif sélectionné.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/broker/deriv/account-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ appId: appId.trim(), token: token.trim(), accountId, environment }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : 'Impossible de récupérer les données Deriv.')
      setSnapshot(result as DerivSnapshot)
    } catch (err) {
      setSnapshot(null)
      setError(err instanceof Error ? err.message : 'Échec de la récupération des données.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="mt-4 rounded-lg border border-accent/25 bg-[#090c10] p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="workstation-label">Deriv account data</div>
          <div className="mt-1 text-xs font-semibold text-white">{accountId} · {environment.toUpperCase()}</div>
        </div>
        <button type="button" onClick={refresh} disabled={loading} className="flex items-center gap-1.5 rounded border border-accent/30 px-2.5 py-1.5 text-[10px] font-mono text-accent disabled:opacity-50">
          <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} /> {loading ? 'Loading…' : 'Refresh live'}
        </button>
      </div>

      {error && <div className="mt-3 flex items-start gap-2 rounded border border-[#f2bd66]/25 bg-[#f2bd66]/5 p-2 text-[11px] text-[#f2bd66]"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>{error}</span></div>}

      {!snapshot && !error && <p className="mt-3 text-[10px] leading-relaxed text-muted">Refresh to request verified account balance, open positions and recent statement from Deriv. Credentials are sent to the backend for this request and are not persisted by this panel.</p>}

      {snapshot && (
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded border border-border p-2">
              <div className="flex items-center gap-1 text-[9px] text-muted"><Wallet className="h-3 w-3" /> BALANCE</div>
              <div className="mt-1 text-base font-semibold text-white">{typeof snapshot.balance === 'number' ? snapshot.balance.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'} {snapshot.currency || ''}</div>
            </div>
            <div className="rounded border border-border p-2">
              <div className="flex items-center gap-1 text-[9px] text-muted"><Activity className="h-3 w-3" /> OPEN POSITIONS</div>
              <div className="mt-1 text-base font-semibold text-white">{snapshot.positionsCount}</div>
            </div>
          </div>

          <div>
            <div className="workstation-label">Portfolio</div>
            {snapshot.portfolio.length === 0 ? <p className="mt-1 text-[10px] text-muted">No open positions returned by Deriv.</p> : <div className="mt-1 space-y-1">{snapshot.portfolio.slice(0, 10).map((item, index) => <div key={display(item.contract_id, String(index))} className="rounded border border-border px-2 py-2 text-[10px]"><div className="flex justify-between gap-2 text-white"><span>{display(item.contract_type)} · {display(item.symbol)}</span><span className="font-mono">{display(item.contract_id)}</span></div><div className="mt-1 text-muted">Buy price: {display(item.buy_price)} · Profit: {display(item.profit)} {snapshot.currency || ''}</div></div>)}</div>}
          </div>

          <div>
            <div className="flex items-center gap-1 workstation-label"><History className="h-3 w-3" /> RECENT STATEMENT</div>
            {snapshot.transactions.length === 0 ? <p className="mt-1 text-[10px] text-muted">No statement transactions returned.</p> : <div className="mt-1 space-y-1">{snapshot.transactions.slice(0, 8).map((tx, index) => <div key={display(tx.transaction_id ?? tx.id, String(index))} className="rounded border border-border px-2 py-2 text-[10px]"><div className="flex justify-between gap-2 text-white"><span>{display(tx.action_type ?? tx.transaction_type ?? tx.type, 'Transaction')}</span><span className="font-mono">{display(tx.transaction_id ?? tx.id)}</span></div><div className="mt-1 text-muted">{display(tx.symbol ?? tx.description)} · {display(tx.amount ?? tx.balance)} {snapshot.currency || ''}</div></div>)}</div>}
          </div>
          <div className="text-[9px] text-muted">Data received {new Date(snapshot.retrievedAt).toLocaleTimeString()}</div>
          <DerivMarketTicket currency={snapshot.currency || ''} />
        </div>
      )}
    </section>
  )
}
