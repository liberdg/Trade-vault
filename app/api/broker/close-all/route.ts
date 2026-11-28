import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Close-all is only attempted for brokers with a verified position source.
 * Currently: OANDA open trades via v20. Other brokers remain unsupported.
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown> = {}
  try {
    const raw = await request.json()
    body = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}
  } catch {
    return NextResponse.json({ status: 'invalid_request', message: 'Request body must be valid JSON.' }, { status: 400 })
  }

  const brokerId = typeof body.brokerId === 'string' ? body.brokerId : undefined
  const accountId = typeof body.accountId === 'string' ? body.accountId.trim() : ''
  const confirm = body.confirm === true
  const accountIds = Array.isArray(body.accountIds) ? body.accountIds : []

  if (!confirm) {
    return NextResponse.json({
      status: 'confirmation_required',
      message: 'Explicit confirm=true is required before any close-all request is sent to a broker.',
      scope: accountIds,
    }, { status: 400 })
  }

  if (brokerId === 'oanda' || (!brokerId && process.env.OANDA_API_TOKEN && process.env.OANDA_ACCOUNT_ID)) {
    const token = process.env.OANDA_API_TOKEN?.trim()
    const configuredAccount = process.env.OANDA_ACCOUNT_ID?.trim()
    const environment = process.env.OANDA_ENVIRONMENT === 'live' ? 'live' : 'practice'
    if (!token || !configuredAccount) {
      return NextResponse.json({
        status: 'disconnected',
        message: 'OANDA credentials are not configured on the server.',
      }, { status: 503 })
    }
    if (accountId && accountId !== configuredAccount) {
      return NextResponse.json({
        status: 'account_mismatch',
        message: 'Requested account does not match the server-configured OANDA account. Close-all blocked.',
      }, { status: 409 })
    }
    if (environment === 'live' && process.env.OANDA_ALLOW_LIVE !== 'true') {
      return NextResponse.json({
        status: 'execution_disabled',
        message: 'Live close-all is disabled. Set OANDA_ALLOW_LIVE=true to permit live position closes.',
      }, { status: 403 })
    }

    const baseUrl = environment === 'live' ? 'https://api-fxtrade.oanda.com' : 'https://api-fxpractice.oanda.com'
    try {
      const openTradesResponse = await fetch(`${baseUrl}/v3/accounts/${encodeURIComponent(configuredAccount)}/openTrades`, {
        cache: 'no-store',
        headers: { Authorization: `Bearer ${token}`, 'Accept-Datetime-Format': 'RFC3339' },
        signal: AbortSignal.timeout(12000),
      })
      const openTradesBody = await openTradesResponse.json().catch(() => null)
      if (!openTradesResponse.ok) {
        return NextResponse.json({
          status: 'failed',
          message: `Could not retrieve OANDA open trades (HTTP ${openTradesResponse.status}). No closes were sent.`,
          detail: openTradesBody,
        }, { status: 502 })
      }
      const trades = Array.isArray(openTradesBody?.trades) ? openTradesBody.trades : []
      if (trades.length === 0) {
        return NextResponse.json({
          status: 'synchronized',
          message: 'OANDA reported zero open trades. Nothing to close.',
          closed: [],
          environment,
          accountId: configuredAccount,
        })
      }

      const closed: Array<{ tradeId: string; status: string; detail?: unknown }> = []
      const failures: Array<{ tradeId: string; message: string }> = []
      for (const trade of trades) {
        const tradeId = trade?.id != null ? String(trade.id) : ''
        if (!tradeId) continue
        const closeResponse = await fetch(`${baseUrl}/v3/accounts/${encodeURIComponent(configuredAccount)}/trades/${encodeURIComponent(tradeId)}/close`, {
          method: 'PUT',
          cache: 'no-store',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Accept-Datetime-Format': 'RFC3339' },
          body: JSON.stringify({}),
          signal: AbortSignal.timeout(15000),
        })
        const closeBody = await closeResponse.json().catch(() => null)
        if (!closeResponse.ok || !closeBody?.orderFillTransaction) {
          failures.push({
            tradeId,
            message: closeBody?.errorMessage || `Close failed with HTTP ${closeResponse.status} or missing fill confirmation.`,
          })
        } else {
          closed.push({ tradeId, status: 'filled', detail: closeBody.orderFillTransaction })
        }
      }

      return NextResponse.json({
        status: failures.length === 0 ? 'completed' : closed.length > 0 ? 'partial' : 'failed',
        environment,
        accountId: configuredAccount,
        closed,
        failures,
        message: failures.length === 0
          ? `Closed ${closed.length} OANDA trade(s) with broker fill confirmation.`
          : `Closed ${closed.length} trade(s); ${failures.length} failure(s). Verify account state before retrying.`,
      }, { status: failures.length === 0 ? 200 : closed.length > 0 ? 207 : 502 })
    } catch (error) {
      return NextResponse.json({
        status: 'failed',
        message: error instanceof Error ? error.message : 'OANDA close-all failed.',
      }, { status: 502 })
    }
  }

  return NextResponse.json({
    status: 'unsupported',
    scope: accountIds,
    message: 'No verified broker adapter currently exposes authoritative live positions for global close-all on the requested broker. No closing request was sent.',
  }, { status: 501 })
}
