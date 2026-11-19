'use client'

import { useState } from 'react'
import { AlertTriangle, ShieldCheck } from 'lucide-react'
import { calculateRisk } from '@/lib/risk'

export default function PlannerPage() {
  const [accountBalance, setAccountBalance] = useState('10000')
  const [riskPercent, setRiskPercent] = useState('1')
  const [entry, setEntry] = useState('')
  const [stop, setStop] = useState('')
  const [contractSize, setContractSize] = useState('')
  const [tickValue, setTickValue] = useState('')
  const [conversion, setConversion] = useState('')

  const result = calculateRisk({
    accountBalance: Number(accountBalance),
    riskPercent: Number(riskPercent),
    entryPrice: Number(entry),
    stopLoss: Number(stop),
    contractSize: contractSize ? Number(contractSize) : undefined,
    tickValue: tickValue ? Number(tickValue) : undefined,
    accountToQuoteRate: conversion ? Number(conversion) : undefined,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl tracking-wide text-white">PLANIFICATEUR <span className="text-accent">DE RISQUE</span></h1>
        <p className="mt-1 font-mono text-sm text-muted">Calcul explicite avant toute soumission à un broker</p>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="rounded-2xl border border-border bg-panel p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Solde compte"><input type="number" value={accountBalance} onChange={e => setAccountBalance(e.target.value)} className="market-input" /></Field>
            <Field label="Risque (%)"><input type="number" step="0.1" value={riskPercent} onChange={e => setRiskPercent(e.target.value)} className="market-input" /></Field>
            <Field label="Prix d'entrée"><input type="number" step="any" value={entry} onChange={e => setEntry(e.target.value)} className="market-input" /></Field>
            <Field label="Stop Loss"><input type="number" step="any" value={stop} onChange={e => setStop(e.target.value)} className="market-input" /></Field>
            <Field label="Contract size (optionnel)">
              <input type="number" step="any" value={contractSize} onChange={e => setContractSize(e.target.value)} className="market-input" />
            </Field>
            <Field label="Tick value (optionnel)">
              <input type="number" step="any" value={tickValue} onChange={e => setTickValue(e.target.value)} className="market-input" />
            </Field>
            <Field label="Conversion compte → devise (optionnel)">
              <input type="number" step="any" value={conversion} onChange={e => setConversion(e.target.value)} className="market-input" />
            </Field>
          </div>
        </div>
        <aside className="space-y-3">
          <Metric label="Distance stop" value={Number.isFinite(result.stopDistance) ? result.stopDistance.toLocaleString('en-US', { maximumFractionDigits: 8 }) : '—'} />
          <Metric label="Montant risqué" value={`${result.riskAmount.toLocaleString('en-US', { maximumFractionDigits: 2 })}`} />
          <Metric label="Reward à 2R" value={`${result.rewardAt2R.toLocaleString('en-US', { maximumFractionDigits: 2 })}`} />
          <Metric label="Reward à 3R" value={`${result.rewardAt3R.toLocaleString('en-US', { maximumFractionDigits: 2 })}`} />
          <Metric label="Position approximative" value={result.positionUnits === null ? '—' : result.positionUnits.toLocaleString('en-US', { maximumFractionDigits: 4 })} />
          {result.warning && (
            <div className="flex items-start gap-2 rounded-xl border border-gold/20 bg-gold/5 p-4 text-xs text-gold">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {result.warning}
            </div>
          )}
          <div className="flex items-start gap-2 rounded-xl border border-bull/20 bg-bull-dim p-4 text-xs text-bull">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /> Aucune taille d’ordre broker n’est envoyée tant que les spécifications instrument ne sont pas confirmées par le broker.
          </div>
        </aside>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-xs font-mono uppercase text-muted">{label}</span>{children}</label>
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-border bg-panel p-4"><div className="text-[10px] font-mono uppercase text-muted">{label}</div><div className="mt-2 font-mono text-lg font-bold text-white">{value}</div></div>
}
