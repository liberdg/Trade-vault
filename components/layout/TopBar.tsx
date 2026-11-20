'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus, Search, WifiOff } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { TradeFormModal } from '@/components/journal/TradeFormModal'

export function TopBar() {
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [marketAvailable, setMarketAvailable] = useState<boolean | null>(null)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    fetch('/api/market/candles?symbol=BTCUSDT&kind=crypto&interval=1h', { cache: 'no-store' })
      .then(response => setMarketAvailable(response.ok))
      .catch(() => setMarketAvailable(false))
  }, [])

  const title = ({
    '/': 'Overview',
    '/market': 'Markets',
    '/scanner': 'Scanner',
    '/signals': 'Signals',
    '/planner': 'Trade Plan',
    '/broker': 'Execution',
    '/journal': 'Journal',
    '/analytics': 'Analytics',
    '/calendar': 'Calendar',
    '/settings': 'Settings',
  } as Record<string, string>)[pathname] ?? 'Workspace'

  return (
    <>
      <header className="h-16 shrink-0 border-b border-border bg-[#0b0e12] flex items-center px-4 gap-3 lg:px-5">
        <div className="hidden min-w-[150px] sm:block">
          <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted">Workspace</div>
          <div className="mt-0.5 text-sm font-semibold text-white">{title}</div>
        </div>
        <div className="mx-auto hidden max-w-[420px] flex-1 relative lg:block">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter' && search.trim()) {
                const symbol = search.trim().toUpperCase().replace(/[-/]/g, '')
                router.push(`/market?symbol=${encodeURIComponent(symbol)}&interval=1d`)
              }
            }}
            placeholder="Search symbol"
            className="w-full rounded-md border border-border bg-[#090c10] py-2 pl-9 pr-4 text-xs text-white placeholder:text-muted focus:border-accent/40 focus:outline-none"
          />
        </div>
        <div className={`hidden items-center gap-2 rounded-md border px-2.5 py-1.5 font-mono text-[10px] sm:flex ${
          marketAvailable === true ? 'border-[#2ad39b]/20 text-[#2ad39b]' : 'border-border text-muted'
        }`}>
          {marketAvailable === true
            ? <span className="h-1.5 w-1.5 rounded-full bg-[#2ad39b]" />
            : <WifiOff className="h-3 w-3" />}
          {marketAvailable === true ? 'MARKET DATA LIVE' : marketAvailable === false ? 'MARKET DATA OFFLINE' : 'CHECKING DATA'}
        </div>
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowForm(true)}
          className="flex h-8 items-center gap-1.5 rounded-md bg-accent px-3 text-xs font-bold text-[#090c10]"
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">New trade</span>
        </motion.button>
      </header>

      <AnimatePresence>
        {showForm && <TradeFormModal onClose={() => setShowForm(false)} />}
      </AnimatePresence>
    </>
  )
}
