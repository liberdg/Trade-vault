'use client'
import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Upload, TrendingUp, TrendingDown, ChevronDown, Image as ImageIcon, Trash2, Calculator } from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import { format } from 'date-fns'
import { useTradingStore } from '@/store/tradingStore'
import toast from 'react-hot-toast'
import type { Trade, AssetClass, EmotionTag, TradeImage } from '@/types'
import { v4 as uuidv4 } from 'uuid'

const ASSETS: AssetClass[] = ['Forex', 'Crypto', 'Indices', 'Stocks', 'Commodities', 'Options']
const EMOTIONS: EmotionTag[] = ['confident', 'fearful', 'greedy', 'revenge', 'calm', 'anxious', 'fomo', 'disciplined', 'impulsive', 'patient']
const EMOTION_COLORS: Record<EmotionTag, string> = {
  confident: '#00ff88', fearful: '#ff8800', greedy: '#ff3355', revenge: '#ff0033',
  calm: '#00d4ff', anxious: '#ffaa00', fomo: '#ff6633', disciplined: '#00ff88',
  impulsive: '#ff3355', patient: '#00d4ff',
}
const TIMEFRAMES = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1', 'W1']

interface Props { onClose: () => void; editTrade?: Trade }

export function TradeFormModal({ onClose, editTrade }: Props) {
  const { addTrade, updateTrade, settings } = useTradingStore()

  const [form, setForm] = useState({
    symbol: editTrade?.symbol ?? '',
    assetClass: editTrade?.assetClass ?? settings.defaultAsset,
    direction: editTrade?.direction ?? 'BUY' as 'BUY' | 'SELL',
    status: editTrade?.status ?? 'CLOSED' as 'OPEN' | 'CLOSED',
    entryDate: editTrade?.entryDate ?? format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    exitDate: editTrade?.exitDate ?? '',
    entryPrice: editTrade?.entryPrice?.toString() ?? '',
    exitPrice: editTrade?.exitPrice?.toString() ?? '',
    positionSize: editTrade?.positionSize?.toString() ?? '',
    stopLoss: editTrade?.stopLoss?.toString() ?? '',
    takeProfit: editTrade?.takeProfit?.toString() ?? '',
    riskAmount: editTrade?.riskAmount?.toString() ?? '',
    strategy: editTrade?.strategy ?? '',
    setup: editTrade?.setup ?? '',
    timeframe: editTrade?.timeframe ?? 'H1',
    notes: editTrade?.notes ?? '',
    lessons: editTrade?.lessons ?? '',
    emotions: editTrade?.emotions ?? [] as EmotionTag[],
    tags: editTrade?.tags ?? [] as string[],
    executionScore: editTrade?.executionScore?.toString() ?? '7',
    disciplineScore: editTrade?.disciplineScore?.toString() ?? '7',
    images: editTrade?.images ?? [] as TradeImage[],
  })

  const rr = (() => {
    const e = parseFloat(form.entryPrice), sl = parseFloat(form.stopLoss), tp = parseFloat(form.takeProfit)
    if (e && sl && tp) {
      const risk = Math.abs(e - sl), reward = Math.abs(tp - e)
      if (risk > 0) return (reward / risk).toFixed(2)
    }
    return null
  })()

  const estimatedPnl = (() => {
    const e = parseFloat(form.entryPrice), ex = parseFloat(form.exitPrice), size = parseFloat(form.positionSize)
    if (e && ex && size) {
      const diff = form.direction === 'BUY' ? ex - e : e - ex
      return (diff * size).toFixed(2)
    }
    return null
  })()

  const onDrop = useCallback((files: File[]) => {
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img: TradeImage = {
          id: uuidv4(), data: e.target?.result as string,
          caption: '', type: 'entry', createdAt: new Date().toISOString(),
        }
        setForm(f => ({ ...f, images: [...f.images, img] }))
      }
      reader.readAsDataURL(file)
    })
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'image/*': [] } })

  const toggleEmotion = (e: EmotionTag) => {
    setForm(f => ({
      ...f,
      emotions: f.emotions.includes(e) ? f.emotions.filter(x => x !== e) : [...f.emotions, e],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.symbol || !form.entryPrice || !form.positionSize) {
      toast.error('Remplis les champs obligatoires')
      return
    }

    try {
      const data = {
        symbol: form.symbol.toUpperCase(),
        assetClass: form.assetClass,
        direction: form.direction,
        status: form.status,
        source: editTrade?.source ?? 'manual' as const,
        entryDate: form.entryDate,
        exitDate: form.exitDate || undefined,
        entryPrice: parseFloat(form.entryPrice),
        exitPrice: form.exitPrice ? parseFloat(form.exitPrice) : undefined,
        positionSize: parseFloat(form.positionSize),
        stopLoss: form.stopLoss ? parseFloat(form.stopLoss) : undefined,
        takeProfit: form.takeProfit ? parseFloat(form.takeProfit) : undefined,
        riskAmount: form.riskAmount ? parseFloat(form.riskAmount) : undefined,
        strategy: form.strategy || undefined,
        setup: form.setup || undefined,
        timeframe: form.timeframe,
        notes: form.notes || undefined,
        lessons: form.lessons || undefined,
        emotions: form.emotions,
        tags: form.tags,
        executionScore: parseInt(form.executionScore),
        disciplineScore: parseInt(form.disciplineScore),
        images: form.images,
      }

      if (editTrade) {
        await updateTrade(editTrade.id, data)
        toast.success('Trade mis à jour ✓')
      } else {
        await addTrade(data as any)
        toast.success('Trade enregistré ✓')
      }
      onClose()
    } catch (err) {
      toast.error('Erreur lors de la sauvegarde')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-surface border border-border rounded-2xl shadow-2xl"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-border bg-surface/95 backdrop-blur-xl">
          <div>
            <h2 className="font-display text-2xl text-accent tracking-wide">{editTrade ? 'MODIFIER TRADE' : 'NOUVEAU TRADE'}</h2>
            <p className="text-xs text-muted font-mono mt-0.5">Enregistre chaque détail pour une analyse optimale</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Direction selector */}
          <div className="grid grid-cols-2 gap-3">
            {(['BUY', 'SELL'] as const).map(dir => (
              <button key={dir} type="button" onClick={() => setForm(f => ({ ...f, direction: dir }))}
                className={`py-3 rounded-xl font-display text-xl tracking-wider border-2 transition-all ${
                  form.direction === dir
                    ? dir === 'BUY' ? 'bg-bull-dim border-bull text-bull glow-bull' : 'bg-bear-dim border-bear text-bear glow-bear'
                    : 'bg-panel border-border text-muted hover:border-muted'
                }`}>
                {dir === 'BUY' ? <TrendingUp className="inline w-5 h-5 mr-2" /> : <TrendingDown className="inline w-5 h-5 mr-2" />}
                {dir}
              </button>
            ))}
          </div>

          {/* Symbol & Asset */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-muted font-mono mb-2 uppercase">Symbole *</label>
              <input value={form.symbol} onChange={e => setForm(f => ({ ...f, symbol: e.target.value }))}
                placeholder="EURUSD, BTC, SP500..."
                className="w-full bg-panel border border-border rounded-lg px-4 py-3 text-white font-mono focus:outline-none focus:border-accent/50 uppercase" />
            </div>
            <div>
              <label className="block text-xs text-muted font-mono mb-2 uppercase">Classe d'actif</label>
              <select value={form.assetClass} onChange={e => setForm(f => ({ ...f, assetClass: e.target.value as AssetClass }))}
                className="w-full bg-panel border border-border rounded-lg px-4 py-3 text-white font-mono focus:outline-none focus:border-accent/50">
                {ASSETS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>

          {/* Prices */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { key: 'entryPrice', label: 'Prix Entrée *' },
              { key: 'exitPrice', label: 'Prix Sortie' },
              { key: 'positionSize', label: 'Taille Position *' },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="block text-xs text-muted font-mono mb-2 uppercase">{label}</label>
                <input type="number" step="any" value={(form as any)[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full bg-panel border border-border rounded-lg px-4 py-3 text-white font-mono focus:outline-none focus:border-accent/50" />
              </div>
            ))}
          </div>

          {/* SL / TP */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { key: 'stopLoss', label: 'Stop Loss' },
              { key: 'takeProfit', label: 'Take Profit' },
              { key: 'riskAmount', label: 'Risque ($)' },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="block text-xs text-muted font-mono mb-2 uppercase">{label}</label>
                <input type="number" step="any" value={(form as any)[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full bg-panel border border-border rounded-lg px-4 py-3 text-white font-mono focus:outline-none focus:border-accent/50" />
              </div>
            ))}
          </div>

          {/* Calculated values */}
          {(rr || estimatedPnl) && (
            <div className="grid grid-cols-2 gap-3">
              {rr && (
                <div className="bg-panel rounded-lg px-4 py-3 border border-accent/20 flex items-center gap-3">
                  <Calculator className="w-4 h-4 text-accent" />
                  <div>
                    <div className="text-xs text-muted font-mono">RISK:REWARD</div>
                    <div className="text-accent font-mono font-bold">1:{rr}</div>
                  </div>
                </div>
              )}
              {estimatedPnl && (
                <div className={`bg-panel rounded-lg px-4 py-3 border flex items-center gap-3 ${
                  parseFloat(estimatedPnl) >= 0 ? 'border-bull/20' : 'border-bear/20'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${parseFloat(estimatedPnl) >= 0 ? 'bg-bull' : 'bg-bear'}`} />
                  <div>
                    <div className="text-xs text-muted font-mono">P&L ESTIMÉ</div>
                    <div className={`font-mono font-bold ${parseFloat(estimatedPnl) >= 0 ? 'text-bull' : 'text-bear'}`}>
                      {parseFloat(estimatedPnl) >= 0 ? '+' : ''}{estimatedPnl}$
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-muted font-mono mb-2 uppercase">Date Entrée *</label>
              <input type="datetime-local" value={form.entryDate} onChange={e => setForm(f => ({ ...f, entryDate: e.target.value }))}
                className="w-full bg-panel border border-border rounded-lg px-4 py-3 text-white font-mono focus:outline-none focus:border-accent/50 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-muted font-mono mb-2 uppercase">Date Sortie</label>
              <input type="datetime-local" value={form.exitDate} onChange={e => setForm(f => ({ ...f, exitDate: e.target.value }))}
                className="w-full bg-panel border border-border rounded-lg px-4 py-3 text-white font-mono focus:outline-none focus:border-accent/50 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-muted font-mono mb-2 uppercase">Timeframe</label>
              <select value={form.timeframe} onChange={e => setForm(f => ({ ...f, timeframe: e.target.value }))}
                className="w-full bg-panel border border-border rounded-lg px-4 py-3 text-white font-mono focus:outline-none focus:border-accent/50">
                {TIMEFRAMES.map(tf => <option key={tf} value={tf}>{tf}</option>)}
              </select>
            </div>
          </div>

          {/* Strategy */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-muted font-mono mb-2 uppercase">Stratégie</label>
              <input value={form.strategy} onChange={e => setForm(f => ({ ...f, strategy: e.target.value }))}
                list="strategies" placeholder="Breakout, Trend, Reversal..."
                className="w-full bg-panel border border-border rounded-lg px-4 py-3 text-white font-mono focus:outline-none focus:border-accent/50" />
              <datalist id="strategies">
                {settings.strategies.map(s => <option key={s.id} value={s.name} />)}
              </datalist>
            </div>
            <div>
              <label className="block text-xs text-muted font-mono mb-2 uppercase">Setup</label>
              <input value={form.setup} onChange={e => setForm(f => ({ ...f, setup: e.target.value }))}
                placeholder="Décrire le setup..."
                className="w-full bg-panel border border-border rounded-lg px-4 py-3 text-white font-mono focus:outline-none focus:border-accent/50" />
            </div>
          </div>

          {/* Status */}
          <div className="flex gap-3">
            {(['OPEN', 'CLOSED', 'CANCELLED'] as const).map(s => (
              <button key={s} type="button" onClick={() => setForm(f => ({ ...f, status: s }))}
                className={`px-4 py-2 rounded-lg text-xs font-mono border transition-all ${
                  form.status === s ? 'bg-accent/10 border-accent/30 text-accent' : 'bg-panel border-border text-muted hover:text-white'
                }`}>{s}</button>
            ))}
          </div>

          {/* Emotions */}
          <div>
            <label className="block text-xs text-muted font-mono mb-3 uppercase">État Émotionnel</label>
            <div className="flex flex-wrap gap-2">
              {EMOTIONS.map(e => (
                <button key={e} type="button" onClick={() => toggleEmotion(e)}
                  className={`px-3 py-1.5 rounded-full text-xs font-mono border transition-all ${
                    form.emotions.includes(e) ? 'border-current opacity-100' : 'border-border text-muted opacity-60 hover:opacity-80'
                  }`}
                  style={form.emotions.includes(e) ? { color: EMOTION_COLORS[e], borderColor: EMOTION_COLORS[e], background: EMOTION_COLORS[e] + '15' } : {}}>
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Scores */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { key: 'executionScore', label: 'Score Exécution' },
              { key: 'disciplineScore', label: 'Score Discipline' },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="block text-xs text-muted font-mono mb-2 uppercase">{label}: {(form as any)[key]}/10</label>
                <input type="range" min="1" max="10" value={(form as any)[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full accent-accent" />
              </div>
            ))}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs text-muted font-mono mb-2 uppercase">Notes & Raison du Trade</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={3} placeholder="Pourquoi ce trade ? Confluence, contexte marché..."
              className="w-full bg-panel border border-border rounded-lg px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-accent/50 resize-none" />
          </div>

          <div>
            <label className="block text-xs text-muted font-mono mb-2 uppercase">Leçons Apprises</label>
            <textarea value={form.lessons} onChange={e => setForm(f => ({ ...f, lessons: e.target.value }))}
              rows={2} placeholder="Ce que ce trade t'a enseigné..."
              className="w-full bg-panel border border-border rounded-lg px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-accent/50 resize-none" />
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-xs text-muted font-mono mb-3 uppercase">Screenshots</label>
            <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              isDragActive ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/30'
            }`}>
              <input {...getInputProps()} />
              <Upload className="w-8 h-8 text-muted mx-auto mb-2" />
              <p className="text-sm text-muted font-mono">Glisse tes screenshots ici ou clique</p>
            </div>

            {form.images.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mt-3">
                {form.images.map((img, i) => (
                  <div key={img.id} className="relative group rounded-lg overflow-hidden border border-border">
                    <img src={img.data} alt="" className="w-full h-24 object-cover" />
                    <button type="button" onClick={() => setForm(f => ({ ...f, images: f.images.filter((_, j) => j !== i) }))}
                      className="absolute top-1 right-1 bg-bear/80 text-white rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-border text-muted hover:text-white hover:border-muted transition-all font-mono">
              Annuler
            </button>
            <motion.button type="submit" whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
              className="flex-1 py-3 rounded-xl bg-accent text-void font-bold font-display text-xl tracking-wider hover:bg-accent-dim transition-all">
              {editTrade ? 'METTRE À JOUR' : 'ENREGISTRER'}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}
