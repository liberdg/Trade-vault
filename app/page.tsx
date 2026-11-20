'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { ArrowRight, ChartNoAxesCombined, CircleAlert, ShieldCheck } from 'lucide-react'
import { useTradingStore } from '@/store/tradingStore'
import { computeAnalytics } from '@/lib/analytics'
import { MarketWatchlist } from '@/components/dashboard/MarketWatchlist'
import { EquityCurve } from '@/components/dashboard/EquityCurve'
import { RecentTrades } from '@/components/dashboard/RecentTrades'

export default function DashboardPage() {
  const { trades, settings } = useTradingStore()
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
          <ShieldCheck className="h-3.5 w-3.5 text-[#2ad39b]" />
          LOCAL JOURNAL · NO BROKER CONNECTED
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border lg:grid-cols-4">
        <Metric label="Journal equity" value={`$${equity.toLocaleString('en-US', { maximumFractionDigits: 2 })}`} detail={`${analytics.totalPnl >= 0 ? '+' : ''}${analytics.totalPnl.toFixed(2)} USD`} />
        <Metric label="Closed trades" value={String(analytics.totalTrades)} detail={analytics.totalTrades === 0 ? 'No executed history' : `${analytics.winRate.toFixed(1)}% win rate`} />
        <Metric label="Profit factor" value={analytics.profitFactor === 999 ? '∞' : analytics.profitFactor.toFixed(2)} detail="Gross profit / gross loss" />
        <Metric label="Open exposure" value={String(trades.filter(trade => trade.status === 'OPEN').length)} detail="Journal positions only" />
      </div>

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
          <div className="workstation-panel p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[#f2bd66]/20 bg-[#f2bd66]/10">
                <CircleAlert className="h-4 w-4 text-[#f2bd66]" />
              </div>
              <div>
                <div className="text-xs font-semibold text-white">Broker account unavailable</div>
                <p className="mt-1 text-[11px] leading-relaxed text-muted">No credentials or broker session is configured. Balances, positions and execution are not available.</p>
                <Link href="/broker" className="mt-3 inline-flex items-center gap-1 text-[10px] font-mono text-accent">
                  Connection settings <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>
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

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="min-h-[92px] bg-[#0d1117] px-4 py-3">
      <div className="workstation-label">{label}</div>
      <div className="mt-3 font-mono text-lg font-semibold text-white">{value}</div>
      <div className="mt-1 text-[10px] text-muted">{detail}</div>
    </div>
  )
}
