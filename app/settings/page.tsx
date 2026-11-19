'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Save, Plus, Trash2, Download, Upload, RotateCcw } from 'lucide-react'
import { useTradingStore } from '@/store/tradingStore'
import { db } from '@/lib/db'
import toast from 'react-hot-toast'
import type { Strategy, Goal, Trade } from '@/types'
import { v4 as uuidv4 } from 'uuid'

const STRATEGY_COLORS = ['#00d4ff', '#00ff88', '#ffd700', '#ff3355', '#ff8800', '#aa44ff', '#ff66aa', '#44ffbb']

export default function SettingsPage() {
  const { settings, updateSettings, trades } = useTradingStore()
  const [form, setForm] = useState({ ...settings })
  const [newStrategy, setNewStrategy] = useState('')
  const [newTag, setNewTag] = useState('')
  const [newGoal, setNewGoal] = useState({ title: '', type: 'profit' as Goal['type'], target: '', unit: '$', deadline: '' })

  const handleSave = async () => {
    await updateSettings(form)
    toast.success('Paramètres sauvegardés ✓')
  }

  const addStrategy = () => {
    if (!newStrategy.trim()) return
    const strat: Strategy = {
      id: uuidv4(), name: newStrategy.trim(),
      color: STRATEGY_COLORS[form.strategies.length % STRATEGY_COLORS.length],
    }
    setForm(f => ({ ...f, strategies: [...f.strategies, strat] }))
    setNewStrategy('')
  }

  const removeStrategy = (id: string) => setForm(f => ({ ...f, strategies: f.strategies.filter(s => s.id !== id) }))

  const addTag = () => {
    if (!newTag.trim() || form.customTags.includes(newTag.trim())) return
    setForm(f => ({ ...f, customTags: [...f.customTags, newTag.trim()] }))
    setNewTag('')
  }

  const addGoal = () => {
    if (!newGoal.title || !newGoal.target) return
    const goal: Goal = {
      id: uuidv4(), title: newGoal.title, type: newGoal.type,
      target: parseFloat(newGoal.target), current: 0,
      unit: newGoal.unit, deadline: newGoal.deadline || undefined,
      createdAt: new Date().toISOString(), completed: false,
    }
    setForm(f => ({ ...f, goals: [...f.goals, goal] }))
    setNewGoal({ title: '', type: 'profit', target: '', unit: '$', deadline: '' })
  }

  const exportData = async () => {
    const allTrades = await db.trades.toArray()
    const data = { trades: allTrades, settings: form, exportedAt: new Date().toISOString() }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `tradevault-export-${new Date().toISOString().slice(0,10)}.json`
    a.click(); URL.revokeObjectURL(url)
    toast.success('Export réussi ✓')
  }

  const importData = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    try {
      const data = JSON.parse(text)
      if (data.trades) {
        const importedTrades = data.trades.map((trade: Trade) => ({
          ...trade,
          source: trade.source ?? 'imported',
        }))
        await db.trades.bulkPut(importedTrades)
        toast.success(`${importedTrades.length} trades importés ✓`)
        window.location.reload()
      }
    } catch { toast.error('Fichier invalide') }
  }

  const resetData = async () => {
    if (!confirm('⚠️ Supprimer TOUS les trades ? Cette action est irréversible.')) return
    await db.trades.clear()
    toast.success('Données effacées')
    window.location.reload()
  }

  // Goal progress calculation
  const getGoalProgress = (goal: Goal) => {
    if (goal.type === 'profit') return Math.max(0, trades.reduce((s, t) => s + (t.pnl ?? 0), 0))
    if (goal.type === 'winrate') {
      const closed = trades.filter(t => t.status === 'CLOSED')
      return closed.length > 0 ? (closed.filter(t => (t.pnl ?? 0) > 0).length / closed.length) * 100 : 0
    }
    if (goal.type === 'trades') return trades.filter(t => t.status === 'CLOSED').length
    return goal.current
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-display text-4xl text-white tracking-wide">PARAMÈTRES</h1>
        <p className="text-muted font-mono text-sm mt-1">Personnalise ton expérience TradeVault</p>
      </div>

      {/* Profile */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-panel rounded-2xl border border-border p-5">
        <h2 className="font-display text-xl text-white tracking-wide mb-4">PROFIL & COMPTE</h2>
        <div className="grid grid-cols-2 gap-4">
          {[
            { key: 'displayName', label: 'Nom affiché', type: 'text', placeholder: 'Ton nom' },
            { key: 'currency', label: 'Devise', type: 'text', placeholder: 'USD' },
            { key: 'accountBalance', label: 'Capital Initial ($)', type: 'number', placeholder: '10000' },
            { key: 'riskPerTrade', label: 'Risque par Trade (%)', type: 'number', placeholder: '1' },
          ].map(({ key, label, type, placeholder }) => (
            <div key={key}>
              <label className="block text-xs text-muted font-mono mb-2 uppercase">{label}</label>
              <input type={type} value={(form as any)[key]} placeholder={placeholder}
                onChange={e => setForm(f => ({ ...f, [key]: type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value }))}
                className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-white font-mono focus:outline-none focus:border-accent/50" />
            </div>
          ))}
        </div>
      </motion.div>

      {/* Strategies */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-panel rounded-2xl border border-border p-5">
        <h2 className="font-display text-xl text-white tracking-wide mb-4">STRATÉGIES</h2>
        <div className="space-y-2 mb-4">
          {form.strategies.map(s => (
            <div key={s.id} className="flex items-center gap-3 p-3 bg-surface rounded-xl border border-border">
              <div className="w-3 h-3 rounded-full shrink-0" style={{ background: s.color }} />
              <span className="font-mono text-white flex-1">{s.name}</span>
              <button onClick={() => removeStrategy(s.id)} className="text-muted hover:text-bear transition-colors p-1">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <input value={newStrategy} onChange={e => setNewStrategy(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addStrategy()}
            placeholder="Nom de la stratégie..."
            className="flex-1 bg-surface border border-border rounded-lg px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-accent/50" />
          <button onClick={addStrategy} className="px-4 py-2.5 bg-accent/10 border border-accent/30 text-accent rounded-lg hover:bg-accent/20 transition-all">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </motion.div>

      {/* Custom Tags */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-panel rounded-2xl border border-border p-5">
        <h2 className="font-display text-xl text-white tracking-wide mb-4">TAGS PERSONNALISÉS</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          {form.customTags.map(tag => (
            <span key={tag} onClick={() => setForm(f => ({ ...f, customTags: f.customTags.filter(t => t !== tag) }))}
              className="px-3 py-1.5 bg-surface border border-border rounded-full text-xs font-mono text-white cursor-pointer hover:border-bear/50 hover:text-bear transition-all">
              {tag} ×
            </span>
          ))}
        </div>
        <div className="flex gap-3">
          <input value={newTag} onChange={e => setNewTag(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTag()}
            placeholder="Nouveau tag..."
            className="flex-1 bg-surface border border-border rounded-lg px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-accent/50" />
          <button onClick={addTag} className="px-4 py-2.5 bg-accent/10 border border-accent/30 text-accent rounded-lg hover:bg-accent/20 transition-all">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </motion.div>

      {/* Goals */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-panel rounded-2xl border border-border p-5">
        <h2 className="font-display text-xl text-white tracking-wide mb-4">OBJECTIFS PERSONNELS</h2>
        <div className="space-y-3 mb-4">
          {form.goals.map(goal => {
            const progress = getGoalProgress(goal)
            const pct = Math.min((progress / goal.target) * 100, 100)
            return (
              <div key={goal.id} className="bg-surface rounded-xl p-4 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-sm text-white">{goal.title}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-mono font-bold ${pct >= 100 ? 'text-bull' : 'text-accent'}`}>
                      {progress.toFixed(0)}{goal.unit} / {goal.target}{goal.unit}
                    </span>
                    <button onClick={() => setForm(f => ({ ...f, goals: f.goals.filter(g => g.id !== goal.id) }))}
                      className="text-muted hover:text-bear p-1"><Trash2 className="w-3 h-3" /></button>
                  </div>
                </div>
                <div className="h-2 bg-muted/20 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }}
                    className={`h-full rounded-full ${pct >= 100 ? 'bg-bull' : 'bg-accent'}`} />
                </div>
                <div className="text-xs text-muted font-mono mt-1">{pct.toFixed(0)}% complété{goal.deadline && ` • Deadline: ${goal.deadline}`}</div>
              </div>
            )
          })}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input value={newGoal.title} onChange={e => setNewGoal(g => ({ ...g, title: e.target.value }))}
            placeholder="Titre de l'objectif" className="bg-surface border border-border rounded-lg px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-accent/50" />
          <select value={newGoal.type} onChange={e => setNewGoal(g => ({ ...g, type: e.target.value as Goal['type'] }))}
            className="bg-surface border border-border rounded-lg px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-accent/50">
            <option value="profit">Profit ($)</option>
            <option value="winrate">Win Rate (%)</option>
            <option value="trades">Nombre de Trades</option>
            <option value="discipline">Discipline</option>
          </select>
          <input type="number" value={newGoal.target} onChange={e => setNewGoal(g => ({ ...g, target: e.target.value }))}
            placeholder="Valeur cible" className="bg-surface border border-border rounded-lg px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-accent/50" />
          <div className="flex gap-2">
            <input type="date" value={newGoal.deadline} onChange={e => setNewGoal(g => ({ ...g, deadline: e.target.value }))}
              className="flex-1 bg-surface border border-border rounded-lg px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-accent/50" />
            <button onClick={addGoal} className="px-4 bg-accent/10 border border-accent/30 text-accent rounded-lg hover:bg-accent/20 transition-all">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Data Management */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="bg-panel rounded-2xl border border-border p-5">
        <h2 className="font-display text-xl text-white tracking-wide mb-4">GESTION DES DONNÉES</h2>
        <div className="grid grid-cols-3 gap-3">
          <button onClick={exportData}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-accent/10 border border-accent/30 text-accent rounded-xl hover:bg-accent/20 transition-all font-mono text-sm">
            <Download className="w-4 h-4" /> Exporter JSON
          </button>
          <label className="flex items-center justify-center gap-2 px-4 py-3 bg-bull/10 border border-bull/30 text-bull rounded-xl hover:bg-bull/20 transition-all font-mono text-sm cursor-pointer">
            <Upload className="w-4 h-4" /> Importer JSON
            <input type="file" accept=".json" onChange={importData} className="hidden" />
          </label>
          <button onClick={resetData}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-bear/10 border border-bear/30 text-bear rounded-xl hover:bg-bear/20 transition-all font-mono text-sm">
            <RotateCcw className="w-4 h-4" /> Reset Données
          </button>
        </div>
        <p className="text-xs text-muted font-mono mt-3">Toutes les données sont stockées localement dans ton navigateur via IndexedDB.</p>
      </motion.div>

      {/* Save */}
      <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
        onClick={handleSave}
        className="w-full py-4 bg-accent text-void font-display text-2xl tracking-widest rounded-2xl hover:bg-accent-dim transition-all flex items-center justify-center gap-3">
        <Save className="w-5 h-5" /> SAUVEGARDER
      </motion.button>
    </div>
  )
}
