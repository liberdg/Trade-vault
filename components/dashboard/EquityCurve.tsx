'use client'
import { useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useTradingStore } from '@/store/tradingStore'
import { getEquityCurve } from '@/lib/analytics'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'

export function EquityCurve() {
  const { trades, settings } = useTradingStore()
  const data = useMemo(() => getEquityCurve(trades, settings.accountBalance), [trades, settings.accountBalance])
  
  const isProfit = data.length > 1 && data[data.length - 1].equity >= data[0].equity

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-panel border border-border rounded-lg px-4 py-3 text-xs font-mono shadow-xl">
        <div className="text-muted mb-1">{label !== 'Start' ? format(parseISO(label), 'd MMM yyyy', { locale: fr }) : 'Départ'}</div>
        <div className={`text-lg font-bold ${payload[0].value >= settings.accountBalance ? 'text-bull' : 'text-bear'}`}>
          ${payload[0].value.toLocaleString()}
        </div>
        {payload[0].payload.pnl !== 0 && (
          <div className={payload[0].payload.pnl > 0 ? 'text-bull' : 'text-bear'}>
            {payload[0].payload.pnl > 0 ? '+' : ''}{payload[0].payload.pnl.toFixed(2)}$
          </div>
        )}
      </div>
    )
  }

  if (data.length <= 1) {
    return (
      <div className="flex items-center justify-center h-48 text-muted font-mono text-sm">
        Aucune donnée — commence à logger tes trades
      </div>
    )
  }

  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 10 }}>
          <defs>
            <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={isProfit ? '#00ff88' : '#ff3355'} stopOpacity={0.3} />
              <stop offset="95%" stopColor={isProfit ? '#00ff88' : '#ff3355'} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,45,61,0.6)" />
          <XAxis dataKey="date" tick={false} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#6b8fa8', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false}
            tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey="equity" stroke={isProfit ? '#00ff88' : '#ff3355'}
            strokeWidth={2} fill="url(#equityGrad)" dot={false} activeDot={{ r: 4, fill: isProfit ? '#00ff88' : '#ff3355' }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
