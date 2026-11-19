'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { LayoutDashboard, BookOpen, BarChart2, Calendar, Settings, TrendingUp, Zap, CandlestickChart, Link2 } from 'lucide-react'
import { useTradingStore } from '@/store/tradingStore'
import { computeAnalytics } from '@/lib/analytics'

const nav = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/market', label: 'Marchés', icon: CandlestickChart },
  { href: '/broker', label: 'Broker', icon: Link2 },
  { href: '/journal', label: 'Journal', icon: BookOpen },
  { href: '/analytics', label: 'Analytics', icon: BarChart2 },
  { href: '/calendar', label: 'Calendrier', icon: Calendar },
  { href: '/settings', label: 'Paramètres', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const { trades, settings } = useTradingStore()
  const analytics = computeAnalytics(trades)

  return (
    <aside className="w-64 flex flex-col border-r border-border bg-surface/80 backdrop-blur-xl shrink-0">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-accent/10 border border-accent/30 flex items-center justify-center">
            <Zap className="w-5 h-5 text-accent" />
          </div>
          <div>
            <div className="font-display text-2xl text-accent tracking-wider">SMRT</div>
            <div className="text-xs text-muted font-mono">{settings.displayName}</div>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="px-4 py-4 border-b border-border">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-panel rounded-lg p-3 border border-border">
            <div className="text-xs text-muted mb-1 font-mono">EQUITY</div>
            <div className={`text-sm font-bold font-mono ${analytics.totalPnl >= 0 ? 'text-bull' : 'text-bear'}`}>
              ${(settings.accountBalance + analytics.totalPnl).toLocaleString('en', { maximumFractionDigits: 0 })}
            </div>
          </div>
          <div className="bg-panel rounded-lg p-3 border border-border">
            <div className="text-xs text-muted mb-1 font-mono">WIN RATE</div>
            <div className={`text-sm font-bold font-mono ${analytics.winRate >= 50 ? 'text-bull' : 'text-bear'}`}>
              {analytics.winRate.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link key={href} href={href}>
              <motion.div
                whileHover={{ x: 3 }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all relative ${
                  active
                    ? 'bg-accent/10 text-accent border border-accent/20'
                    : 'text-muted hover:text-white hover:bg-white/5'
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-accent rounded-full"
                  />
                )}
                <Icon className="w-4 h-4 shrink-0" />
                <span className="text-sm font-medium">{label}</span>
                {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-accent" />}
              </motion.div>
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="px-4 py-4 border-t border-border">
        <div className="flex items-center gap-2 text-xs text-muted font-mono">
          <TrendingUp className="w-3 h-3 text-accent" />
          <span>{analytics.totalTrades} trades • {analytics.profitFactor.toFixed(2)} PF</span>
        </div>
      </div>
    </aside>
  )
}
