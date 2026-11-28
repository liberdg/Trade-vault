import { NextRequest, NextResponse } from 'next/server'
import { validateBrokerConnectionRequest } from '@/lib/broker/connection-validation'

export const dynamic = 'force-dynamic'

async function testOanda() {
  const token = process.env.OANDA_API_TOKEN
  const accountId = process.env.OANDA_ACCOUNT_ID
  if (!token || !accountId) return { status: 'disconnected', message: 'OANDA server credentials are not configured.' }
  const environment = process.env.OANDA_ENVIRONMENT === 'live' ? 'live' : 'practice'
  const baseUrl = environment === 'live' ? 'https://api-fxtrade.oanda.com' : 'https://api-fxpractice.oanda.com'
  const response = await fetch(`${baseUrl}/v3/accounts/${encodeURIComponent(accountId)}/summary`, {
    cache: 'no-store',
    headers: { Authorization: `Bearer ${token}`, 'Accept-Datetime-Format': 'RFC3339' },
  })
  if (!response.ok) return { status: 'authentication_error', message: `OANDA returned HTTP ${response.status}.` }
  const json = await response.json()
  return {
    status: 'connected',
    environment,
    accountId,
    currency: json.account?.currency,
    balance: json.account?.balance ? Number(json.account.balance) : null,
  }
}

type DerivAccount = Record<string, unknown>

function getDerivAccounts(payload: unknown): DerivAccount[] {
  if (!payload || typeof payload !== 'object') return []
  const root = payload as Record<string, unknown>
  if (Array.isArray(root.data)) {
    return root.data.filter((account): account is DerivAccount => !!account && typeof account === 'object')
  }
  const data = root.data && typeof root.data === 'object' ? root.data as Record<string, unknown> : root
  const candidates = [data.accounts, data.account_list, data.items]
  const accounts = candidates.find(Array.isArray)
  return Array.isArray(accounts) ? accounts.filter((account): account is DerivAccount => !!account && typeof account === 'object') : []
}

function getAccountId(account: DerivAccount): string | undefined {
  const id = account.account_id ?? account.id ?? account.loginid ?? account.login_id
  return typeof id === 'string' || typeof id === 'number' ? String(id) : undefined
}

function accountEnvironment(account: DerivAccount): 'demo' | 'real' | undefined {
  const value = String(account.account_type ?? account.type ?? account.environment ?? account.account_category ?? '').toLowerCase()
  if (account.is_virtual === true || value.includes('demo') || value.includes('virtual') || value.includes('practice')) return 'demo'
  if (account.is_virtual === false || value.includes('real') || value.includes('live')) return 'real'
  const id = getAccountId(account)?.toUpperCase() ?? ''
  if (id.startsWith('VRTC')) return 'demo'
  if (id.startsWith('CR')) return 'real'
  return undefined
}

async function derivFetch(path: string, token: string, appId: string, method: 'GET' | 'POST' = 'GET') {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12000)
  try {
    const response = await fetch(`https://api.derivws.com${path}`, {
      method,
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${token}`,
        'Deriv-App-ID': appId,
        Accept: 'application/json',
        ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}),
      },
    })
    const body = await response.json().catch(() => null)
    return { response, body }
  } finally {
    clearTimeout(timeout)
  }
}

function derivApiMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== 'object') return fallback
  const root = body as Record<string, unknown>
  const errors = Array.isArray(root.errors) ? root.errors : []
  const first = errors[0] as Record<string, unknown> | undefined
  const message = first?.message ?? root.message
  return typeof message === 'string' ? message : fallback
}

async function verifyDerivWebSocket(url: string): Promise<{ ok: true } | { ok: false; message: string }> {
  return await new Promise(resolve => {
    let settled = false
    let socket: WebSocket
    const finish = (result: { ok: true } | { ok: false; message: string }) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      try { socket.close() } catch {}
      resolve(result)
    }
    const timeout = setTimeout(() => finish({ ok: false, message: 'Authenticated WebSocket timed out while opening.' }), 10000)
    try {
      socket = new WebSocket(url)
    } catch {
      finish({ ok: false, message: 'Could not create the authenticated Deriv WebSocket.' })
      return
    }
    socket.onopen = () => finish({ ok: true })
    socket.onerror = () => finish({ ok: false, message: 'Authenticated WebSocket failed to open. Check network access and account authorization.' })
    socket.onclose = event => {
      if (!settled) finish({ ok: false, message: `Authenticated WebSocket closed before verification (code ${event.code}).` })
    }
  })
}

async function testDeriv(token: string, appId: string, environment: 'demo' | 'real', requestedAccountId?: string) {
  try {
    // Step 1: PAT-authenticated REST request. Deriv-App-ID is mandatory for PAT.
    const accountsResult = await derivFetch('/trading/v1/options/accounts', token, appId)
    if (!accountsResult.response.ok) {
      return {
        status: accountsResult.response.status === 401 ? 'authentication_error' : accountsResult.response.status === 403 ? 'permission_error' : 'connection_error',
        message: `Deriv account lookup returned HTTP ${accountsResult.response.status}: ${derivApiMessage(accountsResult.body, 'Account lookup failed.')}`,
      }
    }

    const accounts = getDerivAccounts(accountsResult.body)
    if (!accounts.length) {
      return { status: 'synchronization_error', message: 'Deriv accepted the credentials but returned no recognizable Options accounts. The response format or account permissions need review.' }
    }

    const accountSummaries = accounts.map(account => ({ accountId: getAccountId(account), environment: accountEnvironment(account), currency: typeof account.currency === 'string' ? account.currency : undefined, accountType: typeof account.account_type === 'string' ? account.account_type : undefined })).filter(account => !!account.accountId && !!account.environment)
    const matching = accounts.filter(account => accountEnvironment(account) === environment)
    const selected = requestedAccountId ? matching.find(account => getAccountId(account) === requestedAccountId) : matching.find(account => getAccountId(account)) 
    if (!selected) {
      const available = accounts.map(account => accountEnvironment(account)).filter(Boolean)
      return {
        status: 'account_environment_mismatch',
        message: `No ${environment} account was found among the authorized accounts. Available account environments: ${available.length ? Array.from(new Set(available)).join(', ') : 'unknown'}.`,
        accounts: accountSummaries,
      }
    }
    const accountId = getAccountId(selected)
    if (!accountId) return { status: 'synchronization_error', message: 'A matching account was returned, but its account ID could not be read.' }

    // Step 2: Obtain the single-use OTP URL for this specific account.
    const otpResult = await derivFetch(`/trading/v1/options/accounts/${encodeURIComponent(accountId)}/otp`, token, appId, 'POST')
    if (!otpResult.response.ok) {
      return {
        status: otpResult.response.status === 401 ? 'authentication_error' : otpResult.response.status === 403 ? 'permission_error' : 'connection_error',
        message: `Deriv OTP endpoint returned HTTP ${otpResult.response.status}: ${derivApiMessage(otpResult.body, 'OTP generation failed.')}`,
        accountId,
      }
    }
    const root = otpResult.body as Record<string, unknown> | null
    const otpData = root?.data && typeof root.data === 'object' ? root.data as Record<string, unknown> : root
    const wsUrl = otpData && typeof otpData.url === 'string' ? otpData.url : ''
    if (!wsUrl) return { status: 'synchronization_error', message: 'Deriv OTP response did not contain an authenticated WebSocket URL.', accountId }

    // Only accept Deriv's authenticated API host and the expected environment path.
    let parsedUrl: URL
    try { parsedUrl = new URL(wsUrl) } catch { return { status: 'synchronization_error', message: 'Deriv returned an invalid WebSocket URL.', accountId } }
    const expectedPath = environment === 'demo' ? '/trading/v1/options/ws/demo' : '/trading/v1/options/ws/real'
    if (parsedUrl.protocol !== 'wss:' || parsedUrl.hostname !== 'api.derivws.com' || parsedUrl.pathname !== expectedPath) {
      return { status: 'account_environment_mismatch', message: 'The OTP URL host or account environment does not match the expected Deriv endpoint.', accountId }
    }

    // Step 3: Opening the OTP URL confirms the authenticated account session.
    const websocketResult = await verifyDerivWebSocket(parsedUrl.toString())
    if (!websocketResult.ok) return { status: 'connection_error', message: websocketResult.message, accountId }

    const currency = selected.currency
    return {
      status: 'connected',
      message: 'Deriv PAT verified, account matched, OTP WebSocket authenticated and opened.',
      accountId,
      currency: typeof currency === 'string' ? currency : undefined,
      environment,
      accounts: accountSummaries,
    }
  } catch (error) {
    const isAbort = error instanceof Error && error.name === 'AbortError'
    return { status: 'connection_error', message: isAbort ? 'Deriv REST request timed out.' : error instanceof Error ? error.message : 'Deriv connection verification failed.' }
  }
}

async function testMtBridge(kind: 'mt5' | 'mt4') {
  const bridgeUrl = (kind === 'mt4' ? process.env.MT4_BRIDGE_URL : process.env.MT5_BRIDGE_URL)?.trim()
  const pairingToken = (kind === 'mt4' ? process.env.MT4_BRIDGE_TOKEN : process.env.MT5_BRIDGE_TOKEN)?.trim()
  const label = kind.toUpperCase()
  if (!bridgeUrl || !pairingToken) {
    return { status: 'disconnected', message: `${label} bridge URL and pairing token are not configured on the server.` }
  }
  try {
    const response = await fetch(`${bridgeUrl.replace(/\/$/, '')}/health`, {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${pairingToken}` },
    })
    if (!response.ok) return { status: 'connection_error', message: `${label} bridge returned HTTP ${response.status}.` }
    const json = await response.json()
    if (!json.connected || !json.accountId) return { status: 'disconnected', message: json.message || `${label} terminal is not connected to an account.` }
    return {
      status: 'connected',
      accountId: String(json.accountId),
      server: json.server,
      currency: json.currency,
      balance: typeof json.balance === 'number' ? json.balance : null,
      message: `${label} bridge authenticated and returned a terminal account.`,
    }
  } catch (error) {
    return { status: 'connection_error', message: error instanceof Error ? error.message : `${label} bridge is unreachable.` }
  }
}

async function testOandaWithEnvironment(requestedEnvironment: 'demo' | 'real') {
  const result = await testOanda()
  if (result.status !== 'connected') return result
  const mapped = result.environment === 'live' ? 'real' : 'demo'
  if (mapped !== requestedEnvironment) {
    return {
      status: 'account_environment_mismatch',
      message: `OANDA server is configured for ${result.environment}, but ${requestedEnvironment} was selected in the UI.`,
      accountId: result.accountId,
      environment: mapped,
    }
  }
  return { ...result, environment: mapped }
}

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ status: 'invalid_request', message: 'Request body must be valid JSON.' }, { status: 400 })
  }

  const brokerId = typeof body === 'object' && body !== null && 'brokerId' in body ? body.brokerId : undefined
  const connectionType = typeof body === 'object' && body !== null && 'connectionType' in body ? body.connectionType : undefined
  const token = typeof body === 'object' && body !== null && 'token' in body && typeof body.token === 'string' ? body.token.trim() : ''
  const appId = typeof body === 'object' && body !== null && 'appId' in body && typeof body.appId === 'string' ? body.appId.trim() : ''
  const environment = typeof body === 'object' && body !== null && 'environment' in body && body.environment === 'real' ? 'real' : 'demo'
  const requestedAccountId = typeof body === 'object' && body !== null && 'accountId' in body && typeof body.accountId === 'string' ? body.accountId : undefined
  const validation = validateBrokerConnectionRequest(brokerId, connectionType)
  if (!validation.valid) {
    return NextResponse.json({ status: 'invalid_request', message: validation.message }, { status: 400 })
  }

  let result
  try {
    if (brokerId === 'oanda' && connectionType === 'official_api') result = await testOandaWithEnvironment(environment)
    else if (brokerId === 'deriv' && connectionType === 'official_api') {
      const resolvedAppId = appId || process.env.DERIV_APP_ID?.trim() || ''
      const resolvedToken = token || process.env.DERIV_API_TOKEN?.trim() || ''
      if (!resolvedAppId || !resolvedToken) {
        result = { status: 'invalid_request', message: 'Deriv App ID and Personal Access Token are required (request body or server DERIV_APP_ID / DERIV_API_TOKEN).' }
      } else {
        result = await testDeriv(resolvedToken, resolvedAppId, environment, requestedAccountId)
        if (result.status === 'connected' && result.environment !== environment) {
          result = { status: 'account_environment_mismatch', message: `The token authenticated a ${result.environment} account, but ${environment} was selected.`, accountId: result.accountId }
        }
      }
    }
    else if (brokerId === 'mt5' && connectionType === 'mt5_bridge') result = await testMtBridge('mt5')
    else if (brokerId === 'mt4' && connectionType === 'mt4_bridge') result = await testMtBridge('mt4')
    else if (brokerId === 'exness' && connectionType === 'mt5_bridge') result = await testMtBridge('mt5')
    else if (brokerId === 'exness' && connectionType === 'official_api') {
      result = { status: 'permission_error', message: 'Exness official API eligibility and credentials must be provided through a verified Exness API integration. Standard MT accounts are not assumed eligible.' }
    } else if (connectionType === 'exchange_api' || connectionType === 'ctrader_api' || connectionType === 'oauth') {
      result = { status: 'disconnected', message: 'This broker has no verified adapter yet. Test & connect is disabled until an authenticated demo integration passes.' }
    } else {
      result = { status: 'disconnected', message: 'This broker or connection method has no verified adapter configured.' }
    }
  } catch (error) {
    result = { status: 'connection_error', message: error instanceof Error ? error.message : 'Broker connection test failed.' }
  }

  return NextResponse.json({
    brokerId,
    connectionType,
    ...result,
    checkedAt: new Date().toISOString(),
  })
}
