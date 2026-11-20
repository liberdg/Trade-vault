import { BrokerOrderForm } from '@/components/broker/BrokerOrderForm'
import { LockKeyhole, RefreshCw } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface BrokerStatus {
  configured: boolean
  connected: boolean
  environment: 'practice' | 'live'
  liveExecutionEnabled: boolean
  message?: string
  accountId?: string
  currency?: string
  balance?: number
  nav?: number
  openTradeCount?: number
  marginAvailable?: number
}

async function getBrokerStatus(): Promise<BrokerStatus> {
  const token = process.env.OANDA_API_TOKEN
  const accountId = process.env.OANDA_ACCOUNT_ID
  const environment = process.env.OANDA_ENVIRONMENT === 'live' ? 'live' : 'practice'
  const liveExecutionEnabled = environment === 'live' && process.env.OANDA_ALLOW_LIVE === 'true'

  if (!token || !accountId) {
    return {
      configured: false,
      connected: false,
      environment,
      liveExecutionEnabled: false,
      message: 'OANDA credentials are not configured on the server.',
    }
  }

  const baseUrl = environment === 'live'
    ? 'https://api-fxtrade.oanda.com'
    : 'https://api-fxpractice.oanda.com'

  try {
    const response = await fetch(`${baseUrl}/v3/accounts/${encodeURIComponent(accountId)}/summary`, {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${token}`, 'Accept-Datetime-Format': 'RFC3339' },
    })
    if (!response.ok) {
      return {
        configured: true,
        connected: false,
        environment,
        liveExecutionEnabled,
        message: `OANDA returned HTTP ${response.status}. Check account ID and token permissions.`,
      }
    }
    const json = await response.json()
    const account = json.account
    return {
      configured: true,
      connected: true,
      environment,
      liveExecutionEnabled,
      accountId,
      currency: account?.currency,
      balance: account?.balance ? Number(account.balance) : undefined,
      nav: account?.NAV ? Number(account.NAV) : undefined,
      openTradeCount: account?.openTradeCount ? Number(account.openTradeCount) : 0,
      marginAvailable: account?.marginAvailable ? Number(account.marginAvailable) : undefined,
    }
  } catch (error) {
    return {
      configured: true,
      connected: false,
      environment,
      liveExecutionEnabled,
      message: error instanceof Error ? error.message : 'Unable to reach OANDA.',
    }
  }
}

export default async function BrokerPage() {
  const status = await getBrokerStatus()

  return (
    <div className="mx-auto max-w-[1500px] space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="workstation-label">Execution control</div>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-white sm:text-2xl">Broker accounts</h1>
          <p className="mt-1 text-xs text-muted">OANDA v20 — authenticated account and order control</p>
        </div>
        <a href="/broker" className="flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/10 px-4 py-2 font-mono text-sm text-accent">
          <RefreshCw className="h-4 w-4" />
          Vérifier
        </a>
      </div>

      <div className="workstation-panel p-4">
        {status.connected ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <StatusMetric label="Environnement" value={status.environment === 'practice' ? 'Practice' : 'Live'} positive={status.environment === 'practice'} />
            <StatusMetric label="Compte" value={status.accountId ?? '—'} />
            <StatusMetric label="Solde" value={status.balance !== undefined ? `${status.balance.toLocaleString('en-US')} ${status.currency ?? ''}` : '—'} />
            <StatusMetric label="NAV" value={status.nav !== undefined ? `${status.nav.toLocaleString('en-US')} ${status.currency ?? ''}` : '—'} />
            <StatusMetric label="Positions ouvertes" value={String(status.openTradeCount ?? 0)} />
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
            <div>
              <p className="font-mono text-sm font-bold text-gold">Compte non connecté</p>
              <p className="mt-1 text-sm text-muted">{status.message}</p>
            </div>
          </div>
        )}
      </div>

      <BrokerOrderForm connected={status.connected} environment={status.environment} liveExecutionEnabled={status.liveExecutionEnabled} />

      <div className="rounded-xl border border-border bg-surface p-4 text-xs leading-relaxed text-muted">
        Les identifiants OANDA restent uniquement dans les variables d’environnement serveur. Aucun secret n’est stocké dans le navigateur.
        Les ordres live sont bloqués sauf opt-in serveur explicite et confirmation utilisateur.
      </div>
    </div>
  )
}

function StatusMetric({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="text-[10px] font-mono uppercase text-muted">{label}</div>
      <div className={`mt-2 font-mono text-sm font-bold ${positive ? 'text-bull' : 'text-white'}`}>{value}</div>
    </div>
  )
}
