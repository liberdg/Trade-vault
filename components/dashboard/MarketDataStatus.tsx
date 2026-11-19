import { Cable, LockKeyhole } from 'lucide-react'

export function MarketDataStatus() {
  return (
    <div className="rounded-2xl border border-border bg-panel p-5">
      <div className="flex items-start gap-3">
        <div className="rounded-lg border border-border bg-surface p-2 text-muted">
          <Cable className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-xl tracking-wide text-white">DONNÉES DE MARCHÉ</h2>
            <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-mono uppercase text-muted">Non connecté</span>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            Les cours temps réel, chandeliers et signaux seront disponibles après configuration d’un fournisseur autorisé.
            Cette version n’affiche aucun prix de marché fabriqué.
          </p>
          <div className="mt-4 flex items-center gap-2 text-xs font-mono text-muted">
            <LockKeyhole className="h-3.5 w-3.5" />
            <span>Connexion broker et API marché à configurer</span>
          </div>
        </div>
      </div>
    </div>
  )
}
