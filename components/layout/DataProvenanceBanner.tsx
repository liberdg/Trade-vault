'use client'

import { Info, WifiOff } from 'lucide-react'
import { useTradingStore } from '@/store/tradingStore'

export function DataProvenanceBanner() {
  const trades = useTradingStore(s => s.trades)
  const demoTrades = trades.filter(trade => trade.source === 'demo').length
  const connectedTrades = trades.filter(trade => trade.source === 'broker').length
  const localTrades = trades.filter(trade => trade.source !== 'broker').length

  if (connectedTrades > 0) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-bull/20 bg-bull-dim px-4 py-3 text-xs">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-bull" />
        <div>
          <p className="font-mono font-bold text-bull">Données de journal et broker séparées</p>
          <p className="mt-1 text-white/70">Les trades broker sont identifiés séparément. Aucun flux de marché temps réel n'est connecté dans cette version.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-3 rounded-xl border border-gold/20 bg-gold/5 px-4 py-3 text-xs">
      <WifiOff className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
      <div>
        <p className="font-mono font-bold text-gold">
          {demoTrades > 0 && localTrades === demoTrades ? 'Mode démonstration local' : 'Journal local uniquement'}
        </p>
        <p className="mt-1 text-white/70">
          {demoTrades > 0 && localTrades === demoTrades
            ? 'Les trades affichés sont des exemples locaux pour explorer l’interface. Ils ne représentent ni des cours ni des performances réelles.'
            : 'Les données viennent de ce navigateur. Aucun fournisseur de marché, broker ou statut de connexion n’est simulé.'}
        </p>
      </div>
    </div>
  )
}
