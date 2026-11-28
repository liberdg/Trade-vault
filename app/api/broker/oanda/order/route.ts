import { NextRequest, NextResponse } from 'next/server'
import { calculateBrokerRisk } from '@/lib/broker/risk-engine'
import { assertExecutionAuthorized } from '@/lib/broker/execution-guard'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type OandaInstrument = {
  name: string
  displayPrecision: number
  tradeUnitsPrecision: number
  minimumTradeSize: string
  maximumOrderUnits: string
  pipLocation: number
}

function numeric(value: unknown): number | null {
  const number = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
  return Number.isFinite(number) ? number : null
}

async function oandaFetch(baseUrl: string, token: string, path: string) {
  return fetch(`${baseUrl}${path}`, {
    headers: { Authorization: `Bearer ${token}`, 'Accept-Datetime-Format': 'RFC3339' },
    cache: 'no-store',
    signal: AbortSignal.timeout(12000),
  })
}

export async function POST(request: NextRequest) {
  const auth = assertExecutionAuthorized(request)
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const token = process.env.OANDA_API_TOKEN
  const accountId = process.env.OANDA_ACCOUNT_ID
  const environment = process.env.OANDA_ENVIRONMENT === 'live' ? 'live' : 'practice'
  if (!token || !accountId) {
    return NextResponse.json({ error: 'OANDA credentials are not configured on the server.' }, { status: 503 })
  }

  let body: Record<string, unknown>
  try {
    const raw = await request.json()
    body = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const instrument = typeof body.instrument === 'string' ? body.instrument.trim().toUpperCase() : ''
  const unitsInput = numeric(body.units)
  const stopLossDistance = numeric(body.stopLossDistance)
  const takeProfitDistance = body.takeProfitDistance === undefined ? undefined : numeric(body.takeProfitDistance)
  const maxRiskPercent = numeric(body.maxRiskPercent)
  if (!/^[A-Z]{3}_[A-Z]{3}$/.test(instrument)) return NextResponse.json({ error: 'Instrument must use OANDA format, for example EUR_USD.' }, { status: 400 })
  if (unitsInput === null || unitsInput === 0) return NextResponse.json({ error: 'Units must be a non-zero number.' }, { status: 400 })
  if (stopLossDistance === null || stopLossDistance <= 0) return NextResponse.json({ error: 'A positive Stop Loss distance is mandatory for risk validation.' }, { status: 400 })
  if (body.takeProfitDistance !== undefined && (takeProfitDistance == null || takeProfitDistance <= 0)) return NextResponse.json({ error: 'Take Profit distance must be positive.' }, { status: 400 })
  if (maxRiskPercent === null || maxRiskPercent <= 0 || maxRiskPercent > 5) return NextResponse.json({ error: 'Maximum risk percentage must be between 0 and 5%.' }, { status: 400 })
  if (environment === 'live' && (body.confirmLive !== true || process.env.OANDA_ALLOW_LIVE !== 'true')) return NextResponse.json({ error: 'Live order blocked. Server live execution opt-in and explicit confirmation are both required.' }, { status: 403 })

  const validatedStopLossDistance = stopLossDistance as number
  const validatedTakeProfitDistance = takeProfitDistance === undefined || takeProfitDistance === null ? undefined : takeProfitDistance
  const validatedMaxRiskPercent = maxRiskPercent as number
  const validatedUnitsInput = unitsInput as number

  const baseUrl = environment === 'live' ? 'https://api-fxtrade.oanda.com' : 'https://api-fxpractice.oanda.com'
  try {
    const [summaryResponse, instrumentsResponse, pricingResponse] = await Promise.all([
      oandaFetch(baseUrl, token, `/v3/accounts/${encodeURIComponent(accountId)}/summary`),
      oandaFetch(baseUrl, token, `/v3/accounts/${encodeURIComponent(accountId)}/instruments?instruments=${encodeURIComponent(instrument)}`),
      oandaFetch(baseUrl, token, `/v3/accounts/${encodeURIComponent(accountId)}/pricing?instruments=${encodeURIComponent(instrument)}`),
    ])
    const [summary, instrumentData, pricingData] = await Promise.all([
      summaryResponse.json(), instrumentsResponse.json(), pricingResponse.json(),
    ])
    if (!summaryResponse.ok) return NextResponse.json({ error: summary.errorMessage || 'Could not retrieve OANDA account summary for risk validation.' }, { status: summaryResponse.status })
    if (!instrumentsResponse.ok) return NextResponse.json({ error: instrumentData.errorMessage || 'Could not retrieve instrument specifications from OANDA.' }, { status: instrumentsResponse.status })
    if (!pricingResponse.ok) return NextResponse.json({ error: pricingData.errorMessage || 'Could not retrieve current OANDA pricing.' }, { status: pricingResponse.status })

    const account = summary.account as Record<string, unknown> | undefined
    const accountCurrency = typeof account?.currency === 'string' ? account.currency : ''
    const balance = numeric(account?.balance)
    const equity = numeric(account?.NAV)
    const specsRaw = (instrumentData.instruments as OandaInstrument[] | undefined)?.[0]
    const quoteCurrency = instrument.split('_')[1]
    const prices = (pricingData.prices as Array<Record<string, unknown>> | undefined)?.[0]
    const bid = numeric((prices?.bids as Array<Record<string, unknown>> | undefined)?.[0]?.price)
    const ask = numeric((prices?.asks as Array<Record<string, unknown>> | undefined)?.[0]?.price)
    if (!accountCurrency || balance === null || equity === null || !specsRaw || bid === null || ask === null) {
      return NextResponse.json({ error: 'Live account, instrument, or price metadata is incomplete. Risk validation was blocked.' }, { status: 502 })
    }
    if (quoteCurrency !== accountCurrency) {
      return NextResponse.json({ error: `Risk conversion from ${quoteCurrency} to ${accountCurrency} is not verified yet. Order blocked to avoid inaccurate risk.` }, { status: 422 })
    }
    const precision = specsRaw.displayPrecision
    const unitPrecision = specsRaw.tradeUnitsPrecision
    const minimum = numeric(specsRaw.minimumTradeSize)
    const maximum = numeric(specsRaw.maximumOrderUnits)
    if (!Number.isInteger(precision) || precision < 0 || !Number.isInteger(unitPrecision) || unitPrecision < 0 || minimum === null || maximum === null || minimum <= 0 || maximum <= 0) {
      return NextResponse.json({ error: 'OANDA instrument volume/precision metadata is incomplete. Risk validation was blocked.' }, { status: 502 })
    }

    const tickSize = 10 ** -precision
    const unitStep = 10 ** -unitPrecision
    const signedUnits = validatedUnitsInput
    const direction = signedUnits > 0 ? 'BUY' : 'SELL'
    const entryPrice = direction === 'BUY' ? ask : bid
    const stopLoss = direction === 'BUY' ? entryPrice - validatedStopLossDistance : entryPrice + validatedStopLossDistance
    const takeProfit = validatedTakeProfitDistance === undefined
      ? undefined
      : direction === 'BUY'
        ? entryPrice + validatedTakeProfitDistance
        : entryPrice - validatedTakeProfitDistance
    const units = Math.abs(signedUnits)
    const normalizedUnits = Number(units.toFixed(unitPrecision))
    if (Math.abs(units - normalizedUnits) > 1e-9) {
      return NextResponse.json({ error: `Order units exceed the broker's supported precision (${unitPrecision}).` }, { status: 400 })
    }

    const risk = calculateBrokerRisk({
      balance, equity, riskBasis: 'equity', sizingMode: 'fixed_lots', fixedLots: units,
      entryPrice, stopLoss, takeProfit, direction,
      specs: {
        tickSize, tickValuePerLot: tickSize, contractSize: 1,
        volumeMin: minimum, volumeMax: maximum, volumeStep: unitStep,
        quoteToAccountRate: 1,
      },
    })
    if (!risk.valid || risk.estimatedLoss === null) {
      return NextResponse.json({ error: 'Pre-trade risk validation rejected this order.', risk, accountCurrency }, { status: 422 })
    }
    if (risk.lots === null || Math.abs(risk.lots - units) > 1e-9) {
      return NextResponse.json({ error: 'Submitted volume does not match the broker-normalized volume. Order blocked.', risk, accountCurrency }, { status: 422 })
    }
    const maximumRiskAmount = equity * validatedMaxRiskPercent / 100
    if (risk.estimatedLoss > maximumRiskAmount) {
      return NextResponse.json({
        error: `Order blocked: estimated loss (${risk.estimatedLoss.toFixed(2)} ${accountCurrency}) exceeds your ${validatedMaxRiskPercent}% equity risk limit (${maximumRiskAmount.toFixed(2)} ${accountCurrency}).`,
        risk: { ...risk, maximumRiskAmount, maxRiskPercent: validatedMaxRiskPercent },
        accountCurrency,
      }, { status: 422 })
    }

    const order: Record<string, unknown> = { type: 'MARKET', instrument, units: String(signedUnits) }
    order.stopLossOnFill = { timeInForce: 'GTC', distance: String(validatedStopLossDistance) }
    if (validatedTakeProfitDistance !== undefined) order.takeProfitOnFill = { timeInForce: 'GTC', distance: String(validatedTakeProfitDistance) }
    const response = await fetch(`${baseUrl}/v3/accounts/${encodeURIComponent(accountId)}/orders`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Accept-Datetime-Format': 'RFC3339' },
      body: JSON.stringify({ order }),
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    })
    const result = await response.json()
    if (!response.ok) return NextResponse.json({ error: result.errorMessage || 'OANDA rejected the order.', detail: result, risk, accountCurrency }, { status: response.status })

    // Distinguish broker-confirmed fill / acceptance from a bare HTTP 201.
    const orderCreate = result.orderCreateTransaction
    const orderFill = result.orderFillTransaction
    const orderCancel = result.orderCancelTransaction
    const orderReject = result.orderRejectTransaction
    let orderStatus: 'submitted' | 'accepted' | 'filled' | 'canceled' | 'rejected' | 'uncertain' = 'submitted'
    if (orderReject) orderStatus = 'rejected'
    else if (orderFill) orderStatus = 'filled'
    else if (orderCancel) orderStatus = 'canceled'
    else if (orderCreate) orderStatus = 'accepted'
    else orderStatus = 'uncertain'

    if (orderStatus === 'uncertain') {
      return NextResponse.json({
        error: 'OANDA accepted the HTTP request but did not return a recognizable create/fill transaction. Order state is uncertain — verify the account before retrying.',
        environment,
        accountId,
        accountCurrency,
        risk,
        result,
        orderStatus,
      }, { status: 502 })
    }
    if (orderStatus === 'rejected') {
      return NextResponse.json({
        error: orderReject?.rejectReason || 'OANDA rejected the order after submission.',
        environment,
        accountId,
        accountCurrency,
        risk,
        result,
        orderStatus,
      }, { status: 422 })
    }

    return NextResponse.json({
      environment,
      accountId,
      accountCurrency,
      risk,
      result,
      orderStatus,
      brokerOrderId: orderCreate?.id ?? orderFill?.orderID ?? orderFill?.id,
      fillPrice: orderFill?.price ? Number(orderFill.price) : undefined,
      filledUnits: orderFill?.units ? Number(orderFill.units) : undefined,
      verified: orderStatus === 'filled' || orderStatus === 'accepted',
    })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Order submission or risk validation failed.' }, { status: 502 })
  }
}
