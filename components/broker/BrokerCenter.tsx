'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, Link2, RefreshCw, Search, ShieldCheck, Trash2, Unlink } from 'lucide-react'
import { BROKER_CATALOG, BrokerCatalogEntry } from '@/lib/broker/core'
import { db, getSettings, updateSettings } from '@/lib/db'
import type { BrokerConnection, BrokerConnectionStatus, BrokerConnectionType } from '@/types'
import { v4 as uuidv4 } from 'uuid'
import { DerivAccountPanel } from './DerivAccountPanel'

export function BrokerCenter() {
  const [catalog, setCatalog] = useState<BrokerCatalogEntry[]>(BROKER_CATALOG)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<BrokerCatalogEntry>(BROKER_CATALOG[0])
  const [connectionType, setConnectionType] = useState<BrokerConnectionType>(BROKER_CATALOG[0].connectionTypes[0])
  const [environment, setEnvironment] = useState<'demo' | 'real'>('demo')
  const [nickname, setNickname] = useState('')
  const [derivAppId, setDerivAppId] = useState('')
  const [derivToken, setDerivToken] = useState('')
  const [derivAccounts, setDerivAccounts] = useState<Array<{ accountId: string; environment: 'demo' | 'real'; currency?: string; accountType?: string }>>([])
  const [selectedDerivAccountId, setSelectedDerivAccountId] = useState('')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ status: string; message: string; accountId?: string } | null>(null)
  const [connections, setConnections] = useState<BrokerConnection[]>([])
  const [activeAccount, setActiveAccount] = useState<{ brokerId: string; accountId: string; environment: 'demo' | 'real' } | null>(null)
  const [closeReport, setCloseReport] = useState('')

  useEffect(() => {
    db.brokerConnections.toArray().then(setConnections)
    getSettings().then(settings => {
      setDerivAppId(settings.derivAppId ?? '')
      setDerivToken(settings.derivToken ?? '')
      const active = settings.activeBrokerAccount ?? null
      setActiveAccount(active)
      if (active) {
        const entry = BROKER_CATALOG.find(item => item.id === active.brokerId)
        if (entry) { setSelected(entry); setConnectionType(entry.connectionTypes[0]); setEnvironment(active.environment) }
      }
    })
  }, [])

  const filtered = catalog.filter(entry =>
    `${entry.name} ${entry.description}`.toLowerCase().includes(query.toLowerCase())
  )

  const selectBroker = (entry: BrokerCatalogEntry) => {
    setSelected(entry)
    setConnectionType(entry.connectionTypes[0])
    setTestResult(null)
    setNickname('')
    if (entry.id !== 'deriv') { setDerivAccounts([]); setSelectedDerivAccountId('') }
  }

  const testConnection = async () => {
    if (selected.id === 'deriv' && (!derivAppId.trim() || !derivToken.trim())) {
      setTestResult({ status: 'invalid_request', message: 'Enter your Deriv App ID and Personal Access Token to test this connection.' })
      return
    }
    setTesting(true)
    setTestResult(null)
    try {
      const response = await fetch('/api/broker/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brokerId: selected.id, connectionType, environment, ...(selected.id === 'deriv' ? { appId: derivAppId.trim(), token: derivToken.trim(), ...(selectedDerivAccountId ? { accountId: selectedDerivAccountId } : {}) } : {}) }),
      })
      const result = await response.json()
      if (!response.ok) {
        setTestResult({ status: result.status || 'connection_error', message: result.message || 'Broker request rejected.' })
        return
      }
      if (result.status === 'connected' && !result.accountId) {
        setTestResult({ status: 'synchronization_error', message: 'Broker validation did not return a verified account ID. Connection was not saved.' })
        return
      }
      setTestResult(result)
      if (selected.id === 'deriv' && Array.isArray(result.accounts)) {
        const discovered = result.accounts.filter((account: unknown) => account && typeof account === 'object' && 'accountId' in account && 'environment' in account) as typeof derivAccounts
        setDerivAccounts(discovered)
        if (!selectedDerivAccountId && result.accountId) setSelectedDerivAccountId(String(result.accountId))
        // Persist discovered account identities as unverified/disconnected. Only the
        // account whose OTP WebSocket was successfully checked below becomes connected.
        const knownConnections = await db.brokerConnections.toArray()
        for (const discoveredAccount of discovered) {
          const known = knownConnections.find(connection => connection.brokerId === 'deriv' && connection.accountId === discoveredAccount.accountId && connection.environment === discoveredAccount.environment)
          if (!known) {
            await db.brokerConnections.put({
              id: uuidv4(),
              brokerId: 'deriv',
              brokerName: 'Deriv',
              connectionType: 'official_api',
              accountId: discoveredAccount.accountId,
              nickname: `Deriv ${discoveredAccount.accountId}`,
              environment: discoveredAccount.environment,
              permissionMode: 'read_only',
              status: 'disconnected',
              platform: 'deriv_api',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            })
          }
        }
      }
      if (result.status === 'connected') {
        const existing = connections.find(connection =>
          connection.brokerId === selected.id &&
          connection.connectionType === connectionType &&
          connection.accountId === result.accountId
        )
        const connection: BrokerConnection = {
          id: existing?.id ?? uuidv4(),
          brokerId: selected.id,
          brokerName: selected.name,
          connectionType,
          accountId: result.accountId,
          nickname: nickname.trim() || (selected.id === 'deriv' ? `Deriv ${result.accountId}` : existing?.nickname),
          environment,
          permissionMode: selected.recommendedPermission,
          status: 'connected',
          server: result.server,
          platform: selected.platform,
          lastSync: result.checkedAt ?? new Date().toISOString(),
          createdAt: existing?.createdAt ?? new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        await db.brokerConnections.put(connection)
        const nextActive = { brokerId: connection.brokerId, accountId: connection.accountId!, environment: connection.environment }
        await updateSettings({ activeBrokerAccount: nextActive, ...(selected.id === 'deriv' ? { derivAppId: derivAppId.trim(), derivToken: derivToken.trim() } : {}) })
        setActiveAccount(nextActive)
        setConnections(await db.brokerConnections.toArray())
      }
    } catch (error) {
      setTestResult({ status: 'connection_error', message: error instanceof Error ? error.message : 'Connection test failed.' })
    } finally {
      setTesting(false)
    }
  }

  const activateAccount = async (connection: BrokerConnection) => {
    if (!connection.accountId || connection.status !== 'connected') return
    const active = { brokerId: connection.brokerId, accountId: connection.accountId, environment: connection.environment }
    await updateSettings({ activeBrokerAccount: active })
    setActiveAccount(active)
  }

  const updateConnectionStatus = async (connection: BrokerConnection, status: BrokerConnectionStatus) => {
    const updated = { ...connection, status, updatedAt: new Date().toISOString(), lastSync: status === 'disconnected' ? connection.lastSync : new Date().toISOString() }
    await db.brokerConnections.put(updated)
    if (status === 'disconnected' && activeAccount?.brokerId === connection.brokerId && activeAccount.accountId === connection.accountId && activeAccount.environment === connection.environment) { await updateSettings({ activeBrokerAccount: undefined }); setActiveAccount(null) }
    setConnections(await db.brokerConnections.toArray())
  }

  const removeConnection = async (connection: BrokerConnection) => {
    await db.brokerConnections.delete(connection.id)
    if (activeAccount?.brokerId === connection.brokerId && activeAccount.accountId === connection.accountId && activeAccount.environment === connection.environment) { await updateSettings({ activeBrokerAccount: undefined }); setActiveAccount(null) }
    setConnections(await db.brokerConnections.toArray())
  }

  const reconnectConnection = async (connection: BrokerConnection) => {
    if (connection.brokerId === 'deriv') {
      const deriv = BROKER_CATALOG.find(entry => entry.id === 'deriv')
      if (deriv) selectBroker(deriv)
      setTestResult({ status: 'credentials_required', message: derivAppId.trim() && derivToken.trim() ? 'Stored Deriv credentials are available. Use Test & connect to verify this account.' : 'Saved Deriv credentials are missing. Enter App ID and Personal Access Token, then use Test & connect.' })
      return
    }
    setTesting(true)
    setTestResult(null)
    try {
      const response = await fetch('/api/broker/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brokerId: connection.brokerId, connectionType: connection.connectionType }),
      })
      const result = await response.json()
      if (!response.ok) {
        setTestResult({ status: result.status || 'connection_error', message: result.message || 'Broker request rejected.' })
        return
      }
      if (result.status === 'connected' && connection.accountId && result.accountId && String(result.accountId) !== connection.accountId) {
        setTestResult({ status: 'account_mismatch', message: 'The broker validated a different account. This saved connection was not reconnected to prevent account switching.' })
        await updateConnectionStatus(connection, 'disconnected')
        return
      }
      setTestResult(result)
      if (result.status === 'connected') {
        const refreshed = { ...connection, status: 'connected' as const, accountId: result.accountId || connection.accountId, server: result.server || connection.server, lastSync: result.checkedAt || new Date().toISOString(), updatedAt: new Date().toISOString() }
        await db.brokerConnections.put(refreshed)
        setConnections(await db.brokerConnections.toArray())
      }
    } catch (error) {
      setTestResult({ status: 'connection_error', message: error instanceof Error ? error.message : 'Reconnect failed.' })
    } finally {
      setTesting(false)
    }
  }

  const closeAllPositions = async () => {
    setCloseReport('')
    if (!confirm('Close all open positions on the selected accounts?')) return
    try {
      const response = await fetch('/api/broker/close-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountIds: connections.filter(connection => connection.status === 'connected').map(connection => connection.accountId || connection.id) }),
      })
      const result = await response.json()
      setCloseReport(`${response.status === 501 ? 'NOT SUPPORTED' : 'BLOCKED'} — ${result.message}`)
    } catch (error) {
      setCloseReport(error instanceof Error ? error.message : 'Close-all request failed.')
    }
  }

  const connectedCount = connections.filter(connection => connection.status === 'connected').length
  const tradingCount = connections.filter(connection => connection.permissionMode === 'trading_enabled').length

  return (
    <div className="mx-auto max-w-[1500px] space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="workstation-label">Broker connectivity</div>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-white sm:text-2xl">Connection center</h1>
          <p className="mt-1 text-xs text-muted">Independent accounts, verified capabilities and explicit execution permissions</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border lg:grid-cols-4">
        <SummaryMetric label="Configured accounts" value={String(connections.length)} />
        <SummaryMetric label="Online" value={String(connectedCount)} />
        <SummaryMetric label="Read-only" value={String(connections.filter(connection => connection.permissionMode === 'read_only').length)} />
        <SummaryMetric label="Trading enabled" value={String(tradingCount)} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[280px_1fr_360px]">
        <aside className="workstation-panel p-2">
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search broker"
              className="w-full rounded-md border border-border bg-[#090c10] py-2 pl-9 pr-3 text-xs text-white placeholder:text-muted focus:border-accent/40 focus:outline-none" />
          </div>

          <div className="space-y-1">
            {filtered.map(entry => (
              <button key={entry.id} onClick={() => selectBroker(entry)}
                className={`w-full rounded-md border px-3 py-3 text-left ${selected.id === entry.id ? 'border-accent/30 bg-brand-soft' : 'border-transparent hover:border-border hover:bg-white/[0.025]'}`}>
                <div className="text-xs font-semibold text-white">{entry.name}</div>
                <div className="mt-1 text-[9px] font-mono uppercase text-muted">{entry.integrationStatus.replaceAll('_', ' ')}</div>
              </button>
            ))}
          </div>
        </aside>

        <section className="workstation-panel p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="workstation-label">Selected broker</div>
              <h2 className="mt-2 text-lg font-semibold text-white">{selected.name}</h2>
              <p className="mt-1 text-xs leading-relaxed text-muted">{selected.description}</p>
            </div>
            <div className={`rounded-md border px-2 py-1 text-[9px] font-mono uppercase ${selected.integrationStatus === 'real_adapter' ? 'border-[#2ad39b]/20 text-[#2ad39b]' : 'border-gold/20 text-gold'}`}>
              {selected.integrationStatus.replaceAll('_', ' ')}
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Connection method">
              <select value={connectionType} onChange={event => setConnectionType(event.target.value as BrokerConnectionType)} className="market-input">
                {selected.connectionTypes.map(type => <option key={type} value={type}>{type.replaceAll('_', ' ').toUpperCase()}</option>)}
              </select>
            </Field>
            <Field label="Account environment">
              <select value={environment} onChange={event => setEnvironment(event.target.value as 'demo' | 'real')} className="market-input">
                <option value="demo">DEMO / PRACTICE</option>
                <option value="real">REAL</option>
              </select>
            </Field>
            <Field label="Account nickname">
              <input value={nickname} onChange={event => setNickname(event.target.value)} placeholder="e.g. Main account" className="market-input" />
            </Field>
          </div>

          {selected.id === 'deriv' && derivAccounts.length > 0 && (
            <div className="mt-4 rounded-lg border border-border bg-[#090c10] p-3">
              <Field label={`Authorized Deriv accounts (${derivAccounts.length})`}>
                <select value={selectedDerivAccountId} onChange={event => { setSelectedDerivAccountId(event.target.value); const account = derivAccounts.find(item => item.accountId === event.target.value); if (account) setEnvironment(account.environment); setTestResult(null) }} className="market-input">
                  {derivAccounts.map(account => <option key={account.accountId} value={account.accountId}>{account.accountId} · {account.environment.toUpperCase()} {account.currency ? `· ${account.currency}` : ''}</option>)}
                </select>
              </Field>
              <p className="mt-2 text-[10px] text-muted">Select the exact account you want to verify and use for trading. Click Test & connect after changing selection.</p>
            </div>
          )}

          {selected.id === 'deriv' && (
            <div className="mt-4 grid gap-3 rounded-lg border border-accent/20 bg-[#090c10] p-4">
              <Field label="Deriv App ID">
                <input value={derivAppId} onChange={event => setDerivAppId(event.target.value)} inputMode="numeric" placeholder="Your Deriv application ID" className="market-input" autoComplete="off" />
              </Field>
              <Field label="Personal Access Token">
                <input value={derivToken} onChange={event => setDerivToken(event.target.value)} type="password" placeholder="Paste your Deriv API token" className="market-input" autoComplete="off" />
              </Field>
              <p className="text-[10px] leading-relaxed text-muted">Token is used only for this request. It is not saved in Trade-Vault local storage or sent to GitHub.</p>
            </div>
          )}

          <div className="mt-4 rounded-lg border border-border bg-[#090c10] p-4">
            <div className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <div>
                <div className="text-xs font-semibold text-white">Connection requirements</div>
                <p className="mt-1 text-[11px] leading-relaxed text-muted">{selected.warning}</p>
              </div>
            </div>
            {selected.id !== 'deriv' && selected.credentials.map(credential => (
              <div key={credential} className="mt-2 border-t border-border pt-2 text-[10px] font-mono text-muted">Required configuration: {credential}</div>
            ))}
          </div>

          <button onClick={testConnection} disabled={testing} className="mt-4 flex h-9 items-center gap-2 rounded-md bg-accent px-4 text-xs font-bold text-[#090c10] disabled:opacity-50">
            {testing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
            Test & connect
          </button>

          {testResult && (
            <div className={`mt-4 flex items-start gap-2 rounded-lg border px-4 py-3 text-xs ${testResult.status === 'connected' ? 'border-[#2ad39b]/20 bg-[#2ad39b]/10 text-[#2ad39b]' : 'border-[#f2bd66]/20 bg-[#f2bd66]/10 text-[#f2bd66]'}`}>
              {testResult.status === 'connected' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
              <div>
                <div className="font-mono font-semibold uppercase">{testResult.status.replaceAll('_', ' ')}</div>
                <div className="mt-1 leading-relaxed text-muted">{testResult.message}</div>
              </div>
            </div>
          )}
        </section>

        <aside className="workstation-panel p-4">
          <div className="workstation-label">Configured connections</div>
          <div className="mt-2 rounded-md border border-accent/20 bg-accent/5 px-3 py-2 text-[10px] font-mono text-accent">ACTIVE ACCOUNT · {activeAccount ? `${activeAccount.brokerId.toUpperCase()} / ${activeAccount.accountId} / ${activeAccount.environment.toUpperCase()}` : 'NONE SELECTED'}</div>
          <div className="mt-3 space-y-2">
            {connections.length === 0 ? (
              <div className="rounded-lg border border-border px-3 py-5 text-center text-xs text-muted">No verified connection</div>
            ) : connections.map(connection => (
              <div key={connection.id} className="rounded-lg border border-border bg-[#090c10] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold text-white">{connection.nickname || connection.brokerName}</div>
                    <div className="mt-1 text-[9px] font-mono uppercase text-muted">{connection.brokerName} · {connection.environment} · {connection.status.replaceAll('_', ' ')}</div>
                    {connection.accountId && <div className="mt-1 text-[10px] font-mono text-muted">Account ID: {connection.accountId}</div>}
                    {activeAccount?.brokerId === connection.brokerId && activeAccount.accountId === connection.accountId && activeAccount.environment === connection.environment && <div className="mt-2 inline-flex rounded border border-[#2ad39b]/20 bg-[#2ad39b]/10 px-2 py-1 text-[9px] font-mono text-[#2ad39b]">ACTIVE TRADING ACCOUNT</div>}
                  </div>
                  <button onClick={() => removeConnection(connection)} className="text-muted hover:text-[#f06a6a]" aria-label="Remove connection"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
                <div className="mt-3 flex gap-2">
                  {connection.status === 'disconnected' && (
                    <button onClick={() => reconnectConnection(connection)} className="flex items-center gap-1.5 rounded-md border border-accent/30 px-2.5 py-1.5 text-[10px] font-mono text-accent hover:bg-accent/10">
                      <RefreshCw className="h-3 w-3" /> Reconnect
                    </button>
                  )}
                  {connection.status === 'connected' && connection.accountId && !(activeAccount?.brokerId === connection.brokerId && activeAccount.accountId === connection.accountId && activeAccount.environment === connection.environment) && <button onClick={() => activateAccount(connection)} className="flex items-center gap-1.5 rounded-md border border-accent/30 px-2.5 py-1.5 text-[10px] font-mono text-accent hover:bg-accent/10">Set active</button>}
                  <button onClick={() => updateConnectionStatus(connection, 'disconnected')} className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-[10px] font-mono text-muted hover:text-white">
                    <Unlink className="h-3 w-3" /> Disconnect
                  </button>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>


      {activeAccount?.brokerId === 'deriv' && (
        <DerivAccountPanel appId={derivAppId} token={derivToken} accountId={activeAccount.accountId} environment={activeAccount.environment} />
      )}


      <div className="grid gap-4 lg:grid-cols-2">
        <section className="workstation-panel p-4">
          <div className="workstation-label">Global position control</div>
          <p className="mt-2 text-xs leading-relaxed text-muted">Fetching and closing positions is enabled only after a broker adapter confirms live account positions. No pending order is touched by this action.</p>
          <button onClick={closeAllPositions} disabled={connectedCount === 0} className="mt-4 rounded-md border border-[#f06a6a]/30 bg-[#f06a6a]/10 px-4 py-2 text-xs font-mono font-semibold text-[#f06a6a] disabled:cursor-not-allowed disabled:opacity-40">
            CLOSE ALL POSITIONS
          </button>
          {closeReport && <div className="mt-3 rounded-lg border border-border bg-[#090c10] px-3 py-2 text-[11px] text-muted">{closeReport}</div>}
        </section>
        <section className="workstation-panel p-4">
          <div className="workstation-label">Pending orders</div>
          <p className="mt-2 text-xs leading-relaxed text-muted">Cancellation is a separate verified action. It is not available without a connected adapter exposing pending-order capabilities.</p>
          <button disabled className="mt-4 rounded-md border border-border px-4 py-2 text-xs font-mono text-muted opacity-40">CANCEL ALL PENDING ORDERS</button>
        </section>
      </div>
    </div>
  )
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-h-[76px] bg-[#0d1117] px-4 py-3">
      <div className="workstation-label">{label}</div>
      <div className="mt-3 font-mono text-lg font-semibold text-white">{value}</div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-xs font-mono uppercase text-muted">{label}</span>{children}</label>
}
