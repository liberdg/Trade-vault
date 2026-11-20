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

async function testDeriv(token: string, appId: string) {
  return await new Promise<{ status: string; message: string; accountId?: string; currency?: string; environment?: 'demo' | 'real' }>((resolve) => {
    let settled = false
    let socket: WebSocket
    try {
      socket = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${encodeURIComponent(appId)}`)
    } catch (error) {
      resolve({ status: 'connection_error', message: error instanceof Error ? error.message : 'Unable to create Deriv WebSocket.' })
      return
    }

    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true
        socket.close()
        resolve({ status: 'synchronization_error', message: 'Deriv authentication timed out.' })
      }
    }, 8000)

    socket.onopen = () => socket.send(JSON.stringify({ authorize: token, req_id: 1 }))
    socket.onmessage = event => {
      try {
        const data = JSON.parse(String(event.data))
        if (data.error) {
          settled = true
          clearTimeout(timeout)
          socket.close()
          resolve({ status: 'authentication_error', message: data.error.message || 'Deriv authorization failed.' })
          return
        }
        if (data.authorize) {
          settled = true
          clearTimeout(timeout)
          socket.close()
          resolve({
            status: 'connected',
            message: 'Deriv authorization succeeded.',
            accountId: data.authorize.loginid,
            currency: data.authorize.currency,
            environment: data.authorize.is_virtual ? 'demo' : 'real',
          })
        }
      } catch {
        settled = true
        clearTimeout(timeout)
        socket.close()
        resolve({ status: 'synchronization_error', message: 'Deriv returned an invalid response.' })
      }
    }
    socket.onerror = () => {
      if (!settled) {
        settled = true
        clearTimeout(timeout)
        resolve({ status: 'connection_error', message: 'Deriv WebSocket connection failed.' })
      }
    }
  })
}

async function testMt5() {
  const bridgeUrl = process.env.MT5_BRIDGE_URL
  const pairingToken = process.env.MT5_BRIDGE_TOKEN
  if (!bridgeUrl || !pairingToken) return { status: 'disconnected', message: 'MT5 bridge URL and pairing token are not configured on the server.' }
  try {
    const response = await fetch(`${bridgeUrl.replace(/\/$/, '')}/health`, {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${pairingToken}` },
    })
    if (!response.ok) return { status: 'connection_error', message: `MT5 bridge returned HTTP ${response.status}.` }
    const json = await response.json()
    if (!json.connected || !json.accountId) return { status: 'disconnected', message: json.message || 'MT5 terminal is not connected to an account.' }
    return {
      status: 'connected',
      accountId: String(json.accountId),
      server: json.server,
      currency: json.currency,
      balance: typeof json.balance === 'number' ? json.balance : null,
      message: 'MT5 bridge authenticated and returned a terminal account.',
    }
  } catch (error) {
    return { status: 'connection_error', message: error instanceof Error ? error.message : 'MT5 bridge is unreachable.' }
  }
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
  const validation = validateBrokerConnectionRequest(brokerId, connectionType)
  if (!validation.valid) {
    return NextResponse.json({ status: 'invalid_request', message: validation.message }, { status: 400 })
  }

  let result
  try {
    if (brokerId === 'oanda' && connectionType === 'official_api') result = await testOanda()
    else if (brokerId === 'deriv' && connectionType === 'official_api') {
      if (!appId || !token) result = { status: 'invalid_request', message: 'Deriv App ID and Personal Access Token are required.' }
      else {
        result = await testDeriv(token, appId)
        if (result.status === 'connected' && result.environment !== environment) result = { status: 'account_environment_mismatch', message: `The token authenticated a ${result.environment} account, but ${environment} was selected.`, accountId: result.accountId }
      }
    }
    else if (['mt5', 'mt4', 'exness'].includes(brokerId as string) && ['mt5_bridge', 'mt4_bridge'].includes(connectionType as string)) result = await testMt5()
    else if (brokerId === 'exness' && connectionType === 'official_api') {
      result = { status: 'permission_error', message: 'Exness official API eligibility and credentials must be provided through a verified Exness API integration. Standard MT accounts are not assumed eligible.' }
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
