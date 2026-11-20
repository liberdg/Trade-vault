import type { MarketKind } from './market'

export interface MarketInstrument {
  symbol: string
  kind: MarketKind
  label: string
  category: 'Forex Major' | 'Forex Minor' | 'Forex Exotic' | 'Gold' | 'Silver' | 'Index' | 'Crypto'
}

export const MARKET_INSTRUMENTS: MarketInstrument[] = [
  { symbol: 'EURUSD', kind: 'forex', label: 'EUR / USD', category: 'Forex Major' },
  { symbol: 'GBPUSD', kind: 'forex', label: 'GBP / USD', category: 'Forex Major' },
  { symbol: 'USDJPY', kind: 'forex', label: 'USD / JPY', category: 'Forex Major' },
  { symbol: 'USDCHF', kind: 'forex', label: 'USD / CHF', category: 'Forex Major' },
  { symbol: 'USDCAD', kind: 'forex', label: 'USD / CAD', category: 'Forex Major' },
  { symbol: 'AUDUSD', kind: 'forex', label: 'AUD / USD', category: 'Forex Major' },
  { symbol: 'NZDUSD', kind: 'forex', label: 'NZD / USD', category: 'Forex Major' },
  { symbol: 'EURJPY', kind: 'forex', label: 'EUR / JPY', category: 'Forex Minor' },
  { symbol: 'GBPJPY', kind: 'forex', label: 'GBP / JPY', category: 'Forex Minor' },
  { symbol: 'EURGBP', kind: 'forex', label: 'EUR / GBP', category: 'Forex Minor' },
  { symbol: 'EURCHF', kind: 'forex', label: 'EUR / CHF', category: 'Forex Minor' },
  { symbol: 'EURAUD', kind: 'forex', label: 'EUR / AUD', category: 'Forex Minor' },
  { symbol: 'EURNZD', kind: 'forex', label: 'EUR / NZD', category: 'Forex Minor' },
  { symbol: 'EURCAD', kind: 'forex', label: 'EUR / CAD', category: 'Forex Minor' },
  { symbol: 'GBPCAD', kind: 'forex', label: 'GBP / CAD', category: 'Forex Minor' },
  { symbol: 'GBPCHF', kind: 'forex', label: 'GBP / CHF', category: 'Forex Minor' },
  { symbol: 'GBPAUD', kind: 'forex', label: 'GBP / AUD', category: 'Forex Minor' },
  { symbol: 'GBPNZD', kind: 'forex', label: 'GBP / NZD', category: 'Forex Minor' },
  { symbol: 'AUDJPY', kind: 'forex', label: 'AUD / JPY', category: 'Forex Minor' },
  { symbol: 'AUDCAD', kind: 'forex', label: 'AUD / CAD', category: 'Forex Minor' },
  { symbol: 'AUDCHF', kind: 'forex', label: 'AUD / CHF', category: 'Forex Minor' },
  { symbol: 'AUDNZD', kind: 'forex', label: 'AUD / NZD', category: 'Forex Minor' },
  { symbol: 'CADJPY', kind: 'forex', label: 'CAD / JPY', category: 'Forex Minor' },
  { symbol: 'CADCHF', kind: 'forex', label: 'CAD / CHF', category: 'Forex Minor' },
  { symbol: 'CHFJPY', kind: 'forex', label: 'CHF / JPY', category: 'Forex Minor' },
  { symbol: 'NZDJPY', kind: 'forex', label: 'NZD / JPY', category: 'Forex Minor' },
  { symbol: 'NZDCAD', kind: 'forex', label: 'NZD / CAD', category: 'Forex Minor' },
  { symbol: 'NZDCHF', kind: 'forex', label: 'NZD / CHF', category: 'Forex Minor' },
  { symbol: 'USDSEK', kind: 'forex', label: 'USD / SEK', category: 'Forex Exotic' },
  { symbol: 'USDNOK', kind: 'forex', label: 'USD / NOK', category: 'Forex Exotic' },
  { symbol: 'USDDKK', kind: 'forex', label: 'USD / DKK', category: 'Forex Exotic' },
  { symbol: 'USDZAR', kind: 'forex', label: 'USD / ZAR', category: 'Forex Exotic' },
  { symbol: 'USDMXN', kind: 'forex', label: 'USD / MXN', category: 'Forex Exotic' },
  { symbol: 'USDTRY', kind: 'forex', label: 'USD / TRY', category: 'Forex Exotic' },
  { symbol: 'XAUUSD', kind: 'metal', label: 'Gold / USD', category: 'Gold' },
  { symbol: 'XAGUSD', kind: 'metal', label: 'Silver / USD', category: 'Silver' },
  { symbol: 'BTCUSDT', kind: 'crypto', label: 'BTC / USDT', category: 'Crypto' },
  { symbol: 'ETHUSDT', kind: 'crypto', label: 'ETH / USDT', category: 'Crypto' },
  { symbol: 'SOLUSDT', kind: 'crypto', label: 'SOL / USDT', category: 'Crypto' },
  { symbol: '^GSPC', kind: 'index', label: 'S&P 500', category: 'Index' },
]
