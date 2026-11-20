import { NextRequest, NextResponse } from 'next/server'

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

async function testDeriv() {
  const appId = process.env.DERIV_APP_ID
  const token = process.env.DERIV_API_TOKEN
  if (!appId || !token) return { status: 'disconnected', message: 'DERIV_APP_ID and DERIV_API_TOKEN are not configured on the server.' }

  return await new Promise<{ status: string; message: string; accountId?: string; currency?: string }>((resolve) => {
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
  const body = await request.json()
  const brokerId = typeof body.brokerId === 'string' ? body.brokerId : ''
  const connectionType = typeof body.connectionType === 'string' ? body.connectionType : ''

  let result
  if (brokerId === 'oanda' && connectionType === 'official_api') result = await testOanda()
  else if (brokerId === 'deriv' && ['official_api','oauth'].includes(connectionType)) result = await testDeriv()
  else if (['mt5','mt4','exness'].includes(brokerId) && ['mt5_bridge','mt4_bridge'].includes(connectionType)) result = await testMt5()
  else if (brokerId === 'exness' && connectionType === 'official_api') {
    result = { status: 'permission_error', message: 'Exness official API eligibility and credentials must be provided through a verified Exness API integration. Standard MT accounts are not assumed eligible.' }
  } else {
    result = { status: 'disconnected', message: 'This broker or connection method has no verified adapter configured.' }
  }

  return NextResponse.json({
    brokerId,
    connectionType,
    ...result,
    checkedAt: new Date().toISOString(),
  })
}
