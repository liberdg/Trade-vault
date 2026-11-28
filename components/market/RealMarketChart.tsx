'use client'

import { format } from 'date-fns'
import { useEffect, useState } from 'react'
import type { Candle } from '@/lib/market'
import type { MarketAnalysis } from '@/lib/smrt-analysis'

interface Props {
  candles: Candle[]
  provider: string
  status: string
  retrievedAt: string
  analysis?: MarketAnalysis
  symbol?: string
  kind?: string
  interval?: string
}

export function RealMarketChart({ candles, provider, status, retrievedAt, analysis, symbol, kind, interval }: Props) {
  const [liveCandles, setLiveCandles] = useState(candles)
  const [liveStatus, setLiveStatus] = useState(status)
  const [liveRetrievedAt, setLiveRetrievedAt] = useState(retrievedAt)

  useEffect(() => {
    setLiveCandles(candles)
  }, [candles])

  useEffect(() => {
    if (status !== 'realtime' || !symbol || !kind || !interval) return
    let cancelled = false
    const refresh = async () => {
      try {
        const response = await fetch(`/api/market/candles?symbol=${encodeURIComponent(symbol)}&kind=${kind}&interval=${interval}`, { cache: 'no-store' })
        if (!response.ok) return
        const data = await response.json()
        if (cancelled || !Array.isArray(data.candles)) return
        setLiveCandles(previous => {
          const merged = new Map<number, Candle>()
          for (const candle of previous) merged.set(candle.time, candle)
          for (const candle of data.candles as Candle[]) merged.set(candle.time, candle)
          return Array.from(merged.values()).sort((a, b) => a.time - b.time).slice(-200)
        })
        setLiveStatus(data.status)
        setLiveRetrievedAt(data.retrievedAt)
      } catch {
        setLiveStatus('delayed')
      }
    }
    void refresh()
    const timer = window.setInterval(refresh, 30000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [status, symbol, kind, interval])

  candles = liveCandles
  status = liveStatus
  retrievedAt = liveRetrievedAt
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

          {analysis?.zones.map((zone, index) => {
            const startIndex = visible.findIndex(candle => candle.time >= zone.startTime)
            const endIndex = visible.findIndex(candle => candle.time >= zone.endTime)
            if (startIndex < 0) return null
            const x = Math.max(0, startIndex * step)
            const width = Math.max(step * 2, ((endIndex < 0 ? visible.length - 1 : endIndex) - startIndex) * step)
            const zoneTop = y(Math.max(zone.top, zone.bottom))
            const zoneBottom = y(Math.min(zone.top, zone.bottom))
            const bullish = zone.kind === 'BULLISH_OB' || zone.kind === 'BULLISH_FVG'
            return (
              <g key={`${zone.kind}-${zone.startTime}-${index}`}>
                <rect x={x} y={zoneTop} width={width} height={Math.max(2, zoneBottom - zoneTop)}
                  fill={bullish ? '#00ff88' : '#ff3355'} opacity="0.12" stroke={bullish ? '#00ff88' : '#ff3355'} strokeOpacity="0.5" />
                <text x={x + 4} y={zoneTop + 11} fill={bullish ? '#00ff88' : '#ff3355'} fontSize="9" fontFamily="JetBrains Mono">
                  {zone.kind.replace('_', ' ')}
                </text>
              </g>
            )
          })}

          {analysis?.entryZone && (
            <g>
              <rect x="0" y={y(analysis.entryZone.top)} width="920" height={Math.max(2, y(analysis.entryZone.bottom) - y(analysis.entryZone.top))}
                fill="#00d4ff" opacity="0.08" stroke="#00d4ff" strokeOpacity="0.7" strokeDasharray="6 4" />
              <text x="8" y={y(analysis.entryZone.top) - 6} fill="#00d4ff" fontSize="10" fontFamily="JetBrains Mono">ENTRY ZONE</text>
            </g>
          )}
          {analysis?.stopLoss !== null && analysis?.stopLoss !== undefined && (
            <g>
              <line x1="0" x2="920" y1={y(analysis.stopLoss)} y2={y(analysis.stopLoss)} stroke="#ff3355" strokeWidth="1" strokeDasharray="8 5" />
              <text x="824" y={y(analysis.stopLoss) - 5} fill="#ff3355" fontSize="9" fontFamily="JetBrains Mono">SL</text>
            </g>
          )}
          {analysis?.takeProfits.map((price, index) => (
            <g key={price}>
              <line x1="0" x2="920" y1={y(price)} y2={y(price)} stroke="#00ff88" strokeWidth="1" strokeDasharray="5 5" />
              <text x="824" y={y(price) - 5} fill="#00ff88" fontSize="9" fontFamily="JetBrains Mono">TP{index + 1}</text>
            </g>
          ))}

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
