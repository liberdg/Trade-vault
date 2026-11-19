import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const token = process.env.OANDA_API_TOKEN
  const accountId = process.env.OANDA_ACCOUNT_ID
  const environment = process.env.OANDA_ENVIRONMENT === 'live' ? 'live' : 'practice'
  if (!token || !accountId) {
    return NextResponse.json({ error: 'OANDA credentials are not configured on the server.' }, { status: 503 })
  }

  const body = await request.json()
  const instrument = typeof body.instrument === 'string' ? body.instrument.trim().toUpperCase() : ''
  const units = Number(body.units)
  const stopLoss = body.stopLossDistance === undefined ? undefined : Number(body.stopLossDistance)
  const takeProfit = body.takeProfitDistance === undefined ? undefined : Number(body.takeProfitDistance)

  if (!/^[A-Z]{3}_[A-Z]{3}$/.test(instrument)) {
    return NextResponse.json({ error: 'Instrument must use OANDA format, for example EUR_USD.' }, { status: 400 })
  }
  if (!Number.isFinite(units) || units === 0) {
    return NextResponse.json({ error: 'Units must be a non-zero number.' }, { status: 400 })
  }
  if (stopLoss !== undefined && (!Number.isFinite(stopLoss) || stopLoss <= 0)) {
    return NextResponse.json({ error: 'Stop loss distance must be positive.' }, { status: 400 })
  }
  if (takeProfit !== undefined && (!Number.isFinite(takeProfit) || takeProfit <= 0)) {
    return NextResponse.json({ error: 'Take profit distance must be positive.' }, { status: 400 })
  }
  if (environment === 'live' && (body.confirmLive !== true || process.env.OANDA_ALLOW_LIVE !== 'true')) {
    return NextResponse.json({ error: 'Live order blocked. Set server live execution opt-in and confirmLive=true.' }, { status: 403 })
  }

  const order: Record<string, unknown> = {
    type: 'MARKET',
    instrument,
    units: String(units),
  }
  if (stopLoss !== undefined) order.stopLossOnFill = { timeInForce: 'GTC', distance: String(stopLoss) }
  if (takeProfit !== undefined) order.takeProfitOnFill = { timeInForce: 'GTC', distance: String(takeProfit) }

  const baseUrl = environment === 'live'
    ? 'https://api-fxtrade.oanda.com'
    : 'https://api-fxpractice.oanda.com'

  const response = await fetch(`${baseUrl}/v3/accounts/${encodeURIComponent(accountId)}/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept-Datetime-Format': 'RFC3339',
    },
    body: JSON.stringify({ order }),
  })
  const json = await response.json()
  if (!response.ok) {
    return NextResponse.json({
      error: json.errorMessage || 'OANDA rejected the order.',
      detail: json,
    }, { status: response.status })
  }

  return NextResponse.json({
    environment,
    result: json,
  })
}
