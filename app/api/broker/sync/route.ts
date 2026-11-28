import { NextRequest, NextResponse } from 'next/server'
import { synchronizeBrokerAccount } from '@/lib/broker/sync-engine'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ status: 'failed', errors: ['Request body must be valid JSON.'], incomplete: true }, { status: 400 })
  }

  const root = body && typeof body === 'object' ? body as Record<string, unknown> : {}
  const brokerId = typeof root.brokerId === 'string' ? root.brokerId.trim() : ''
  const accountId = typeof root.accountId === 'string' ? root.accountId.trim() : ''
  const environment = root.environment === 'real' ? 'real' as const : root.environment === 'demo' ? 'demo' as const : undefined

  if (!brokerId || !accountId) {
    return NextResponse.json({
      status: 'failed',
      errors: ['brokerId and accountId are required.'],
      incomplete: true,
      synchronizedAt: new Date().toISOString(),
    }, { status: 400 })
  }

  // Deriv uses authenticated OTP WebSocket sessions with user-supplied PATs.
  // That path remains on /api/broker/deriv/account-data — never silently fabricate sync here.
  if (brokerId === 'deriv') {
    return NextResponse.json({
      status: 'failed',
      account: { brokerId, accountId, environment: environment ?? 'demo' },
      errors: [
        'Deriv synchronization requires an authenticated OTP WebSocket session.',
        'Use /api/broker/deriv/account-data with App ID, PAT, and the selected account ID.',
      ],
      capabilities: ['accounts', 'balance', 'positions', 'history', 'market_data'],
      incomplete: true,
      synchronizedAt: new Date().toISOString(),
    }, { status: 501 })
  }

  const result = await synchronizeBrokerAccount({ brokerId, accountId, environment })
  const httpStatus = result.status === 'failed' ? 502 : result.status === 'partial' ? 207 : 200
  return NextResponse.json(result, { status: httpStatus })
}
