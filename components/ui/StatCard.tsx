'use client'
import { motion } from 'framer-motion'
import { LucideIcon } from 'lucide-react'

interface Props {
  title: string
  value: string | number
  subtitle?: string
  icon?: LucideIcon
  trend?: number
  color?: 'accent' | 'bull' | 'bear' | 'gold'
  delay?: number
}

const colorMap = {
  accent: { text: 'text-accent', bg: 'bg-accent/10', border: 'border-accent/20', glow: 'glow-accent' },
  bull: { text: 'text-bull', bg: 'bg-bull/10', border: 'border-bull/20', glow: 'glow-bull' },
  bear: { text: 'text-bear', bg: 'bg-bear/10', border: 'border-bear/20', glow: 'glow-bear' },
  gold: { text: 'text-gold', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', glow: '' },
}

export function StatCard({ title, value, subtitle, icon: Icon, trend, color = 'accent', delay = 0 }: Props) {
  const c = colorMap[color]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: 'easeOut' }}
      className={`relative bg-panel rounded-xl p-5 border ${c.border} overflow-hidden group hover:${c.glow} transition-all`}
    >
      {/* Background glow */}
      <div className={`absolute inset-0 ${c.bg} opacity-0 group-hover:opacity-100 transition-opacity`} />
      
      <div className="relative">
        <div className="flex items-start justify-between mb-3">
          <div className="text-xs text-muted font-mono uppercase tracking-wider">{title}</div>
          {Icon && (
            <div className={`w-8 h-8 rounded-lg ${c.bg} flex items-center justify-center border ${c.border}`}>
              <Icon className={`w-4 h-4 ${c.text}`} />
            </div>
          )}
        </div>
        
        <div className={`text-3xl font-display tracking-wide ${c.text}`}>{value}</div>
        
        {(subtitle || trend !== undefined) && (
          <div className="flex items-center gap-2 mt-2">
            {subtitle && <span className="text-xs text-muted font-mono">{subtitle}</span>}
            {trend !== undefined && (
              <span className={`text-xs font-mono ${trend >= 0 ? 'text-bull' : 'text-bear'}`}>
                {trend >= 0 ? '▲' : '▼'} {Math.abs(trend).toFixed(1)}%
              </span>
            )}
          </div>
        )}
      </div>

      {/* Bottom accent line */}
      <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${c.bg.replace('bg-', 'bg-').replace('/10', '/40')} scale-x-0 group-hover:scale-x-100 transition-transform origin-left`} />
    </motion.div>
  )
}
