'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { LayoutDashboard, BookOpen, BarChart2, Calendar, Settings, CandlestickChart, Link2, ScanLine, Radio, Calculator, Landmark, UserRound } from 'lucide-react'
import { useTradingStore } from '@/store/tradingStore'

const nav = [
  { section: 'Workspace', items: [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/market', label: 'Marchés', icon: CandlestickChart },
  { href: '/scanner', label: 'Scanner', icon: ScanLine },
  { href: '/signals', label: 'Signaux', icon: Radio },
  ]},
  { section: 'Trading', items: [
  { href: '/planner', label: 'Trade Plan', icon: Calculator },
  { href: '/broker', label: 'Broker', icon: Link2 },
  ]},
  { section: 'Performance', items: [
  { href: '/journal', label: 'Journal', icon: BookOpen },
  { href: '/analytics', label: 'Analytics', icon: BarChart2 },
  { href: '/calendar', label: 'Calendrier', icon: Calendar },
  ]},
  { section: 'System', items: [
  { href: '/settings', label: 'Paramètres', icon: Settings },
  ]},
] as const

export function Sidebar() {
  const pathname = usePathname()
  const { trades, settings } = useTradingStore()
  const openTrades = trades.filter(trade => trade.status === 'OPEN').length

  return (
    <aside className="hidden w-[220px] shrink-0 flex-col border-r border-border bg-[#0b0e12] md:flex">
      {/* Logo */}
      <div className="h-16 px-4 flex items-center border-b border-border">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-md bg-brand-soft border border-accent/20 flex items-center justify-center">
            <Landmark className="h-4 w-4 text-accent" />
          </div>
          <div>
            <div className="font-display text-sm font-bold tracking-[0.16em] text-white">SMRT</div>
            <div className="text-[9px] text-muted font-mono tracking-[0.12em]">TRADING INTELLIGENCE</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {nav.map(group => (
          <div key={group.section}>
            <div className="px-2 pb-1.5 text-[9px] font-mono font-semibold uppercase tracking-[0.16em] text-muted">{group.section}</div>
            <div className="space-y-0.5">
              {group.items.map(({ href, label, icon: Icon }) => {
                const active = pathname === href
                return (
                  <Link key={href} href={href}
                    className={`flex h-9 items-center gap-2.5 rounded-md px-2.5 text-xs transition-colors ${
                      active ? 'bg-brand-soft text-accent' : 'text-[#9aa3af] hover:bg-white/[0.035] hover:text-white'
                    }`}>
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span>{label}</span>
                    {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent" />}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="border-t border-border p-2">
        <div className="flex h-10 items-center gap-2 rounded-md px-2 text-xs text-[#9aa3af]">
          <div className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-panel">
            <UserRound className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs text-white">{settings.displayName}</div>
            <div className="text-[9px] font-mono text-muted">{openTrades} position{openTrades === 1 ? '' : 's'} ouverte{openTrades === 1 ? '' : 's'}</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
