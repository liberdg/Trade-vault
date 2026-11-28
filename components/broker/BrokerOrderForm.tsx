'use client'

import { useState } from 'react'
import { AlertTriangle, CheckCircle2, Send } from 'lucide-react'
import { getExecutionSecretHeaders } from '@/lib/broker/client-execution-headers'

interface Props {
  connected: boolean
  environment: 'practice' | 'live'
  liveExecutionEnabled: boolean
}

export function BrokerOrderForm({ connected, environment, liveExecutionEnabled }: Props) {
  const [instrument, setInstrument] = useState('EUR_USD')
  const [units, setUnits] = useState('')
  const [stopLoss, setStopLoss] = useState('')
  const [takeProfit, setTakeProfit] = useState('')
  const [maxRiskPercent, setMaxRiskPercent] = useState('1')
  const [confirmLive, setConfirmLive] = useState(false)
  const [orderResult, setOrderResult] = useState('')
  const [orderError, setOrderError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submitOrder = async (event: React.FormEvent) => {
    event.preventDefault()
    setOrderError('')
    setOrderResult('')
    if (!connected) { setOrderError('Le compte broker n’est pas connecté.'); return }
    if (!Number.isFinite(Number(units)) || Number(units) === 0) { setOrderError('Saisis un volume valide, non nul.'); return }
    if (!stopLoss || !Number.isFinite(Number(stopLoss)) || Number(stopLoss) <= 0) { setOrderError('Un Stop Loss positif est obligatoire pour la validation du risque.'); return }
    if (!Number.isFinite(Number(maxRiskPercent)) || Number(maxRiskPercent) <= 0 || Number(maxRiskPercent) > 5) { setOrderError('La limite de risque doit être comprise entre 0 et 5 %.'); return }
    if (environment === 'live' && (!liveExecutionEnabled || !confirmLive)) { setOrderError('Une confirmation explicite est requise pour tout ordre live.'); return }

    setSubmitting(true)
    try {
      const response = await fetch('/api/broker/oanda/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getExecutionSecretHeaders() },
        body: JSON.stringify({
          instrument,
          units: Number(units),
          stopLossDistance: Number(stopLoss),
          takeProfitDistance: takeProfit ? Number(takeProfit) : undefined,
          maxRiskPercent: Number(maxRiskPercent),
          confirmLive,
        }),
      })
      const json = await response.json()
      if (!response.ok) throw new Error(json.error || 'OANDA rejected the order')
      if (!json.verified) throw new Error(json.error || 'Broker did not confirm order acceptance or fill.')
      const risk = json.risk
      const riskMessage = risk?.estimatedLoss !== undefined
        ? ` · Risque estimé: ${Number(risk.estimatedLoss).toFixed(2)} ${json.accountCurrency} (limite ${maxRiskPercent}% equity)`
        : ''
      const fillInfo = json.fillPrice ? ` · Fill ${json.fillPrice}` : ''
      setOrderResult(`Broker confirmé: ${String(json.orderStatus).toUpperCase()} (${json.environment})${fillInfo}.${riskMessage}`)
    } catch (error) {
      setOrderError(error instanceof Error ? error.message : 'Order submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={submitOrder} className="rounded-2xl border border-border bg-panel p-5">
      <div className="mb-5 flex items-center gap-2">
        <Send className="h-4 w-4 text-accent" />
        <h2 className="font-display text-xl tracking-wide text-white">PLANIFIER UN ORDRE</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Field label="Instrument">
          <input value={instrument} onChange={event => setInstrument(event.target.value.toUpperCase())} placeholder="EUR_USD" className="market-input" />
        </Field>
        <Field label="Unités (+ achat / - vente)">
          <input type="number" step="any" value={units} onChange={event => setUnits(event.target.value)} placeholder="1000" className="market-input" />
        </Field>
        <Field label="Stop Loss (distance prix · obligatoire)">
          <input type="number" step="any" min="0" value={stopLoss} onChange={event => setStopLoss(event.target.value)} placeholder="0.0020" className="market-input" />
        </Field>
        <Field label="Take Profit (distance prix)">
          <input type="number" step="any" min="0" value={takeProfit} onChange={event => setTakeProfit(event.target.value)} placeholder="0.0040" className="market-input" />
        </Field>
        <Field label="Risque max. (% equity · 0–5)">
          <input type="number" step="0.1" min="0.1" max="5" value={maxRiskPercent} onChange={event => setMaxRiskPercent(event.target.value)} className="market-input" />
        </Field>
      </div>

      {environment === 'live' && (
        <label className="mt-4 flex items-center gap-3 rounded-lg border border-bear/30 bg-bear-dim px-4 py-3 text-sm text-white">
          <input type="checkbox" checked={confirmLive} onChange={event => setConfirmLive(event.target.checked)} className="accent-bear" />
          Je confirme l’envoi d’un ordre réel sur le compte live.
        </label>
      )}
      {orderError && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-bear/20 bg-bear-dim px-4 py-3 text-sm text-bear">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {orderError}
        </div>
      )}
      {orderResult && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-bull/20 bg-bull-dim px-4 py-3 text-sm text-bull">
          <CheckCircle2 className="h-4 w-4" /> {orderResult}
        </div>
      )}
      <button type="submit" disabled={!connected || submitting} className="mt-5 rounded-lg bg-accent px-5 py-3 font-mono text-sm font-bold text-void disabled:cursor-not-allowed disabled:opacity-40">
        {submitting ? 'Validation du risque / envoi…' : environment === 'live' ? 'Soumettre l’ordre live' : 'Soumettre l’ordre practice'}
      </button>
      <p className="mt-3 text-xs text-muted">Le backend récupère le solde, les spécifications instrument et le prix OANDA avant d'autoriser l'ordre. Le risque maximum est contrôlé côté serveur.</p>
    </form>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-mono uppercase text-muted">{label}</span>
      {children}
    </label>
  )
}
