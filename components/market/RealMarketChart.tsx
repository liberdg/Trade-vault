'use client'

import { format } from 'date-fns'
import type { Candle } from '@/lib/market'

interface Props {
  candles: Candle[]
  provider: string
  status: string
  retrievedAt: string
}

export function RealMarketChart({ candles, provider, status, retrievedAt }: Props) {
  if (candles.length === 0) {
    return <div className="flex h-96 items-center justify-center text-sm font-mono text-muted">Aucune bougie retournée par le fournisseur.</div>
  }

  const width = 1000
  const height = 420
  const plotTop = 16
  const plotBottom = 330
  const visible = candles.slice(-100)
  const highs = visible.map(candle => candle.high)
  const lows = visible.map(candle => candle.low)
  const max = Math.max(...highs)
  const min = Math.min(...lows)
  const padding = Math.max((max - min) * 0.08, max * 0.0001)
  const chartMax = max + padding
  const chartMin = Math.max(0, min - padding)
  const chartRange = chartMax - chartMin || 1
  const step = width / visible.length
  const candleWidth = Math.max(2, Math.min(9, step * 0.62))

  const y = (value: number) => plotBottom - ((value - chartMin) / chartRange) * (plotBottom - plotTop)
  const allOpenEqualsClose = visible.every(candle =>
    candle.open === candle.close && candle.high === candle.low
  )

  const ticks = Array.from({ length: 5 }, (_, index) => chartMin + (chartRange * index) / 4)

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-muted">
        <span>{provider.toUpperCase()} · {status.toUpperCase()}</span>
        <span>Mis à jour {format(new Date(retrievedAt), 'dd/MM/yyyy HH:mm:ss')}</span>
      </div>
      {allOpenEqualsClose && (
        <div className="mb-3 rounded-lg border border-gold/20 bg-gold/5 px-3 py-2 text-xs text-gold">
          Le fournisseur retourné ne fournit que des cours de clôture quotidiens. Le graphique est une courbe de clôture réelle, pas des chandeliers synthétiques.
        </div>
      )}
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[760px] w-full" role="img" aria-label="Graphique OHLC réel">
          {ticks.map((tick, index) => {
            const tickY = y(tick)
            return (
              <g key={index}>
                <line x1="0" x2="920" y1={tickY} y2={tickY} stroke="#1a2d3d" strokeWidth="1" strokeDasharray="4 4" />
                <text x="932" y={tickY + 4} fill="#6b8fa8" fontSize="11" fontFamily="JetBrains Mono">
                  {tick.toLocaleString('en-US', { maximumFractionDigits: tick < 10 ? 5 : 2 })}
                </text>
              </g>
            )
          })}

          {allOpenEqualsClose ? (
            <polyline
              points={visible.map((candle, index) => `${index * step + step / 2},${y(candle.close)}`).join(' ')}
              fill="none"
              stroke="#00d4ff"
              strokeWidth="2"
            />
          ) : visible.map((candle, index) => {
            const x = index * step + step / 2
            const bullish = candle.close >= candle.open
            const color = bullish ? '#00ff88' : '#ff3355'
            const bodyTop = y(Math.max(candle.open, candle.close))
            const bodyBottom = y(Math.min(candle.open, candle.close))
            const bodyHeight = Math.max(1, bodyBottom - bodyTop)
            return (
              <g key={candle.time}>
                <line x1={x} x2={x} y1={y(candle.high)} y2={y(candle.low)} stroke={color} strokeWidth="1" />
                <rect x={x - candleWidth / 2} y={bodyTop} width={candleWidth} height={bodyHeight} fill={bullish ? '#00ff88' : '#ff3355'} opacity="0.9" />
              </g>
            )
          })}

          {visible.filter((_, index) => index === 0 || index === visible.length - 1 || index % Math.ceil(visible.length / 6) === 0).map(candle => {
            const index = visible.findIndex(item => item.time === candle.time)
            return (
              <text key={candle.time} x={index * step + step / 2} y="350" fill="#6b8fa8" fontSize="10" textAnchor="middle" fontFamily="JetBrains Mono">
                {format(candle.time, 'dd/MM')}
              </text>
            )
          })}
        </svg>
      </div>
    </div>
  )
}
