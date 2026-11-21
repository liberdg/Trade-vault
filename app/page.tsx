'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, ChartNoAxesCombined, CircleAlert, ShieldCheck, RefreshCw, Wallet, Activity, AlertTriangle } from 'lucide-react'
import { useTradingStore } from '@/store/tradingStore'
import { computeAnalytics } from '@/lib/analytics'
import { MarketWatchlist } from '@/components/dashboard/MarketWatchlist'
import { EquityCurve } from '@/components/dashboard/EquityCurve'
import { RecentTrades } from '@/components/dashboard/RecentTrades'
import { db, getSettings } from '@/lib/db'
import type { BrokerConnection, UserSettings } from '@/types'

export default function DashboardPage() {
  const { trades, settings } = useTradingStore()
  const [brokerConnections, setBrokerConnections] = useState<BrokerConnection[]>([])
  const [activeBrokerAccount, setActiveBrokerAccount] = useState<UserSettings['activeBrokerAccount']>()
  const [brokerLoaded, setBrokerLoaded] = useState(false)
  const [savedDerivCredentials, setSavedDerivCredentials] = useState<{ appId?: string; token?: string }>({})
  useEffect(() => {
    let cancelled = false
    Promise.all([db.brokerConnections.toArray(), getSettings()]).then(([connections, userSettings]) => {
      if (cancelled) return
      setBrokerConnections(connections)
      setActiveBrokerAccount(userSettings.activeBrokerAccount)
      setSavedDerivCredentials({ appId: userSettings.derivAppId, token: userSettings.derivToken })
      setBrokerLoaded(true)
    }).catch(() => { if (!cancelled) setBrokerLoaded(true) })
    return () => { cancelled = true }
  }, [])
  const activeConnection = activeBrokerAccount ? brokerConnections.find(connection => connection.status === 'connected' && connection.brokerId === activeBrokerAccount.brokerId && connection.accountId === activeBrokerAccount.accountId && connection.environment === activeBrokerAccount.environment) : undefined
  const analytics = useMemo(() => computeAnalytics(trades), [trades])
  const equity = settings.accountBalance + analytics.totalPnl

  return (
    <div className="mx-auto max-w-[1500px] space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="workstation-label">Trading overview</div>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-white sm:text-2xl">Good to see you, {settings.displayName}</h1>
        </div>
        <div className="hidden items-center gap-2 font-mono text-[10px] text-muted sm:flex">
          <ShieldCheck className={`h-3.5 w-3.5 ${activeConnection ? 'text-[#2ad39b]' : 'text-muted'}`} />
          {activeConnection ? `BROKER LINK · ${activeConnection.brokerName.toUpperCase()} · ${activeConnection.environment.toUpperCase()}` : 'LOCAL JOURNAL · BROKER NOT LINKED'}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border lg:grid-cols-4">
        <Metric label="Journal equity (local)" value={`${equity.toLocaleString('en-US', { maximumFractionDigits: 2 })}`} detail={`${analytics.totalPnl >= 0 ? '+' : ''}${analytics.totalPnl.toFixed(2)} USD · journal only`} />
        <Metric label="Closed trades" value={String(analytics.totalTrades)} detail={analytics.totalTrades === 0 ? 'No executed history' : `${analytics.winRate.toFixed(1)}% win rate`} />
        <Metric label="Profit factor" value={analytics.profitFactor === 999 ? '∞' : analytics.profitFactor.toFixed(2)} detail="Gross profit / gross loss" />
        <Metric label="Open exposure" value={String(trades.filter(trade => trade.status === 'OPEN').length)} detail="Journal positions only" />
      </div>

      {activeConnection?.brokerId === 'deriv' && activeConnection.accountId && <DerivDashboardLive accountId={activeConnection.accountId} environment={activeConnection.environment} nickname={activeConnection.nickname || activeConnection.brokerName} savedAppId={savedDerivCredentials.appId} savedToken={savedDerivCredentials.token} />}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,.45fr)]">
        <div className="workstation-panel min-w-0 p-4">
          <div className="flex h-8 items-start justify-between">
            <div>
              <div className="text-xs font-semibold text-white">Equity curve</div>
              <div className="mt-1 font-mono text-[9px] text-muted">FROM JOURNAL RECORDS</div>
            </div>
          </div>
          <EquityCurve />
        </div>
        <MarketWatchlist />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,.65fr)]">
        <div className="workstation-panel p-4">
          <div className="mb-3 flex h-8 items-start justify-between">
            <div>
              <div className="text-xs font-semibold text-white">Recent trades</div>
              <div className="mt-1 font-mono text-[9px] text-muted">EXECUTION JOURNAL</div>
            </div>
            <Link href="/journal" className="flex items-center gap-1 text-[10px] font-mono text-accent">
              Journal <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <RecentTrades limit={5} />
        </div>

        <div className="space-y-4">
          <BrokerStatusCard connection={activeConnection} loaded={brokerLoaded} count={brokerConnections.length} />
          <div className="workstation-panel p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-accent/20 bg-accent/10">
                <ChartNoAxesCombined className="h-4 w-4 text-accent" />
              </div>
              <div>
                <div className="text-xs font-semibold text-white">Market analysis</div>
                <p className="mt-1 text-[11px] leading-relaxed text-muted">Open the market workspace for real OHLC data and explainable SMC analysis.</p>
                <Link href="/market" className="mt-3 inline-flex items-center gap-1 text-[10px] font-mono text-accent">
                  Open chart <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function BrokerStatusCard({ connection, loaded, count }: { connection?: BrokerConnection; loaded: boolean; count: number }) {
  return (
    <div className="workstation-panel p-4">
      <div className="flex items-start gap-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border ${connection ? 'border-[#2ad39b]/20 bg-[#2ad39b]/10' : 'border-[#f2bd66]/20 bg-[#f2bd66]/10'}`}>
          {connection ? <ShieldCheck className="h-4 w-4 text-[#2ad39b]" /> : <CircleAlert className="h-4 w-4 text-[#f2bd66]" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold text-white">{connection ? 'Broker account linked' : loaded ? 'Trading account not selected' : 'Checking broker links…'}</div>
          {connection ? (
            <>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-white">{connection.brokerName}</span>
                <span className="rounded border border-[#2ad39b]/20 bg-[#2ad39b]/5 px-1.5 py-0.5 font-mono text-[9px] text-[#2ad39b]">{connection.environment.toUpperCase()}</span>
              </div>
              <div className="mt-1 font-mono text-[10px] text-muted">{connection.nickname || connection.accountId || 'Account'}{connection.accountId ? ` · ${connection.accountId}` : ''}</div>
              <p className="mt-2 text-[10px] leading-relaxed text-muted">Saved account link was last verified {connection.lastSync ? new Date(connection.lastSync).toLocaleString() : 'at an unknown time'}. This is not a live session indicator; refresh account data in Broker.</p>
            </>
          ) : (
            <p className="mt-2 text-[11px] leading-relaxed text-muted">{loaded ? `No verified broker account is selected. ${count} saved connection(s) found.` : 'Loading saved broker accounts from this device.'}</p>
          )}
          <Link href="/broker" className="mt-3 inline-flex items-center gap-1 text-[10px] font-mono text-accent">
            {connection ? 'Manage account & sync live data' : 'Connect / select account'} <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  )
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="min-h-[92px] bg-[#0d1117] px-4 py-3">
      <div className="workstation-label">{label}</div>
      <div className="mt-3 font-mono text-lg font-semibold text-white">{value}</div>
      <div className="mt-1 text-[10px] text-muted">{detail}</div>
    </div>
  )
}


function DerivDashboardLive({ accountId, environment, nickname, savedAppId, savedToken }: { accountId: string; environment: 'demo' | 'real'; nickname: string; savedAppId?: string; savedToken?: string }) {
  const [appId, setAppId] = useState(savedAppId ?? '')
  const [token, setToken] = useState(savedToken ?? '')
  const [snapshot, setSnapshot] = useState<{ balance: number; currency: string; portfolio: Array<Record<string, unknown>>; transactions: Array<Record<string, unknown>>; retrievedAt: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const autoSyncStarted = useState(false)
  const floating = snapshot?.portfolio.reduce((sum, contract) => {
    const value = Number(contract.profit)
    return sum + (Number.isFinite(value) ? value : 0)
  }, 0) ?? 0
  const equityEstimate = snapshot ? snapshot.balance + floating : undefined
  const fmt = (value: number, currency: string) => `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${currency}`

  async function syncLive() {
    if (!appId.trim() || !token.trim()) { setError('Enter the Deriv App ID and Personal Access Token to request live account data.'); return }
    setLoading(true); setError('')
    try {
      const response = await fetch('/api/broker/deriv/account-data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store', body: JSON.stringify({ appId: appId.trim(), token: token.trim(), accountId, environment }) })
      const result = await response.json()
      if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : 'Live account data request failed.')
      setSnapshot(result)
    } catch (err) { setSnapshot(null); setError(err instanceof Error ? err.message : 'Live sync failed.') }
    finally { setLoading(false) }
  }

  useEffect(() => {
    if (savedAppId?.trim() && savedToken?.trim() && !snapshot && !loading) {
      syncLive()
    }
  // Auto-fetch once credentials/account are loaded; changing the account triggers a fresh snapshot.
  }, [accountId, environment, savedAppId, savedToken])

  return (
    <section className="workstation-panel p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><div className="workstation-label">Selected broker account · live data</div><div className="mt-1 text-sm font-semibold text-white">{nickname} · {accountId}</div><div className="mt-1 font-mono text-[9px] text-muted">{environment.toUpperCase()} · ACTIVE ACCOUNT</div></div>
        <button onClick={syncLive} disabled={loading} className="inline-flex items-center gap-1.5 rounded border border-accent/30 px-3 py-2 text-[10px] font-mono text-accent disabled:opacity-50"><RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} /> {loading ? 'Syncing…' : snapshot ? 'Refresh live data' : 'Connect live data'}</button>
      </div>
      {!snapshot && savedAppId && savedToken ? <div className="rounded border border-border bg-[#0b1118] px-3 py-2 text-[10px] text-muted">Deriv credentials saved on this device. Live account data syncs automatically. <Link href="/broker" className="ml-1 text-accent">Manage broker connection</Link></div> : !snapshot && <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-[10px] text-muted">Deriv App ID<input value={appId} onChange={e => setAppId(e.target.value)} className="mt-1 w-full rounded border border-border bg-[#0b1118] px-3 py-2 text-xs text-white outline-none focus:border-accent" placeholder="Application ID" /></label>
        <label className="text-[10px] text-muted">Personal Access Token<input type="password" value={token} onChange={e => setToken(e.target.value)} className="mt-1 w-full rounded border border-border bg-[#0b1118] px-3 py-2 text-xs text-white outline-none focus:border-accent" placeholder="Token" /></label>
      </div>}
      {error && <div className="flex items-start gap-2 rounded border border-[#f2bd66]/20 bg-[#f2bd66]/5 p-2 text-[10px] text-[#f2bd66]"><AlertTriangle className="mt-0.5 h-3 w-3 shrink-0"/>{error}</div>}
      {snapshot && <div className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded border border-border bg-[#0b1118] p-3"><div className="workstation-label flex items-center gap-1"><Wallet className="h-3 w-3"/> BALANCE</div><div className="mt-2 font-mono text-lg text-white">{fmt(snapshot.balance, snapshot.currency)}</div></div>
          <div className="rounded border border-border bg-[#0b1118] p-3"><div className="workstation-label flex items-center gap-1"><Activity className="h-3 w-3"/> OPEN P/L</div><div className={`mt-2 font-mono text-lg ${floating >= 0 ? 'text-[#2ad39b]' : 'text-[#ff647c]'}`}>{fmt(floating, snapshot.currency)}</div><div className="text-[9px] text-muted">Sum of reported contract profits</div></div>
          <div className="rounded border border-border bg-[#0b1118] p-3"><div className="workstation-label">EST. EQUITY</div><div className="mt-2 font-mono text-lg text-white">{fmt(equityEstimate ?? snapshot.balance, snapshot.currency)}</div><div className="text-[9px] text-muted">Balance + open P/L estimate</div></div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted"><span>{snapshot.portfolio.length} open contract(s) · Live account data</span><span>Synced {new Date(snapshot.retrievedAt).toLocaleTimeString()}</span></div>
        {snapshot.portfolio.length > 0 && <div className="space-y-1"><div className="workstation-label">Open positions</div>{snapshot.portfolio.slice(0,5).map((p,i)=><div key={String(p.contract_id ?? i)} className="flex flex-wrap justify-between gap-2 rounded border border-border px-3 py-2 text-[10px]"><span className="text-white">{String(p.contract_type ?? 'Contract')} · {String(p.symbol ?? '—')}</span><span className="font-mono text-muted">ID {String(p.contract_id ?? '—')}</span><span className="font-mono text-white">P/L {String(p.profit ?? '—')} {snapshot.currency}</span></div>)}</div>}
        <div className="text-[9px] text-muted">Deriv credentials are saved in this browser's local IndexedDB settings. They are not sent to Trade-Vault servers for storage, but local browser storage is not encrypted.</div>
        <button onClick={()=>{setSnapshot(null);setToken('')}} className="text-[10px] font-mono text-accent">Edit credentials / reset live snapshot</button>
      </div>}
    </section>
  )
}
