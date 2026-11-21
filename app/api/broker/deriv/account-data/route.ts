import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type DerivWsMessage = Record<string, unknown>

function numericValue(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return undefined
}

function normalizeStatementTransaction(value: unknown): Record<string, unknown> {
  const tx = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  return {
    action_type: tx.action_type,
    amount: numericValue(tx.amount),
    balance_after: numericValue(tx.balance_after),
    transaction_id: tx.transaction_id,
    transaction_time: numericValue(tx.transaction_time),
    currency: tx.currency,
    contract_id: tx.contract_id,
    shortcode: tx.shortcode,
    longcode: tx.longcode,
    underlying_symbol: tx.underlying_symbol ?? tx.symbol,
  }
}

function openSocket(url: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    let settled = false
    const socket = new WebSocket(url)
    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      try { socket.close() } catch {}
      reject(new Error('Deriv authenticated WebSocket timed out.'))
    }, 12000)
    socket.onopen = () => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve(socket)
    }
    socket.onerror = () => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      reject(new Error('Could not open the authenticated Deriv WebSocket.'))
    }
  })
}

function wsRequest(socket: WebSocket, request: Record<string, unknown>, reqId: number): Promise<DerivWsMessage> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.removeEventListener('message', onMessage)
      reject(new Error(`Deriv request ${reqId} timed out.`))
    }, 10000)
    const onMessage = (event: MessageEvent) => {
      let data: DerivWsMessage
      try { data = JSON.parse(String(event.data)) as DerivWsMessage } catch { return }
      if (data.req_id !== reqId) return
      clearTimeout(timer)
      socket.removeEventListener('message', onMessage)
      if (data.error && typeof data.error === 'object') {
        const error = data.error as Record<string, unknown>
        reject(new Error(typeof error.message === 'string' ? error.message : 'Deriv rejected the account-data request.'))
      } else resolve(data)
    }
    socket.addEventListener('message', onMessage)
    socket.send(JSON.stringify({ ...request, req_id: reqId }))
  })
}

export async function POST(request: NextRequest) {
  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }
  const root = body && typeof body === 'object' ? body as Record<string, unknown> : {}
  const token = typeof root.token === 'string' ? root.token.trim() : ''
  const appId = typeof root.appId === 'string' ? root.appId.trim() : ''
  const accountId = typeof root.accountId === 'string' ? root.accountId.trim() : ''
  const environment = root.environment === 'real' ? 'real' : 'demo'
  if (!token || !appId || !accountId) return NextResponse.json({ error: 'App ID, token and account ID are required.' }, { status: 400 })

  let socket: WebSocket | undefined
  try {
    const otpResponse = await fetch(`https://api.derivws.com/trading/v1/options/accounts/${encodeURIComponent(accountId)}/otp`, {
      method: 'POST',
      cache: 'no-store',
      signal: AbortSignal.timeout(12000),
      headers: { Authorization: `Bearer ${token}`, 'Deriv-App-ID': appId, Accept: 'application/json' },
    })
    const otpBody = await otpResponse.json().catch(() => null) as Record<string, unknown> | null
    if (!otpResponse.ok) {
      const errors = otpBody && Array.isArray(otpBody.errors) ? otpBody.errors : []
      const first = errors[0] as Record<string, unknown> | undefined
      return NextResponse.json({ error: typeof first?.message === 'string' ? first.message : `Deriv OTP failed with HTTP ${otpResponse.status}.` }, { status: otpResponse.status })
    }
    const data = otpBody?.data && typeof otpBody.data === 'object' ? otpBody.data as Record<string, unknown> : otpBody
    const url = typeof data?.url === 'string' ? data.url : ''
    if (!url) return NextResponse.json({ error: 'Deriv OTP response has no WebSocket URL.' }, { status: 502 })
    const parsed = new URL(url)
    const expectedPath = environment === 'real' ? '/trading/v1/options/ws/real' : '/trading/v1/options/ws/demo'
    if (parsed.protocol !== 'wss:' || parsed.hostname !== 'api.derivws.com' || parsed.pathname !== expectedPath) {
      return NextResponse.json({ error: 'Deriv OTP URL environment does not match the selected account.' }, { status: 409 })
    }
    socket = await openSocket(url)
    const [balanceMessage, portfolioMessage, statementMessage] = await Promise.all([
      wsRequest(socket, { balance: 1 }, 501),
      wsRequest(socket, { portfolio: 1 }, 502),
      wsRequest(socket, { statement: 1, description: 1, limit: 20 }, 503),
    ])
    const balance = balanceMessage.balance && typeof balanceMessage.balance === 'object' ? balanceMessage.balance as Record<string, unknown> : null
    const portfolio = portfolioMessage.portfolio && typeof portfolioMessage.portfolio === 'object' ? portfolioMessage.portfolio as Record<string, unknown> : null
    const contracts = Array.isArray(portfolio?.contracts) ? portfolio.contracts : []
    const statement = statementMessage.statement && typeof statementMessage.statement === 'object' ? statementMessage.statement as Record<string, unknown> : null
    const transactions = Array.isArray(statement?.transactions) ? statement.transactions.map(normalizeStatementTransaction) : []
    const normalizedBalance = numericValue(balance?.balance)
    if (normalizedBalance === undefined || typeof balance?.currency !== 'string' || !balance.currency) {
      return NextResponse.json({ error: 'Deriv session authenticated, but its balance response was incomplete. No placeholder balance was returned.' }, { status: 502 })
    }
    return NextResponse.json({
      status: 'verified',
      accountId,
      environment,
      balance: normalizedBalance,
      currency: balance?.currency,
      accountName: balance?.loginid,
      portfolio: contracts,
      transactions,
      positionsCount: contracts.length,
      retrievedAt: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Deriv account data request failed.' }, { status: 502 })
  } finally {
    try { socket?.close() } catch {}
  }
}
