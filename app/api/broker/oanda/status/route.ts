import { NextRequest, NextResponse } from 'next/server'
import { assertExecutionAuthorized } from '@/lib/broker/execution-guard'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const auth = assertExecutionAuthorized(request)
  if (!auth.ok) return NextResponse.json({ error: auth.message, configured: false, connected: false }, { status: auth.status })

  const token = process.env.OANDA_API_TOKEN
  const accountId = process.env.OANDA_ACCOUNT_ID
  const environment = process.env.OANDA_ENVIRONMENT === 'live' ? 'live' : 'practice'
  const liveExecutionEnabled = environment === 'live' && process.env.OANDA_ALLOW_LIVE === 'true'

  if (!token || !accountId) {
    return NextResponse.json({
      configured: false,
      connected: false,
      environment,
      liveExecutionEnabled: false,
      message: 'OANDA credentials are not configured on the server.',
    })
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
      return NextResponse.json({
        configured: true,
        connected: false,
        environment,
        liveExecutionEnabled,
        message: `OANDA returned HTTP ${response.status}. Check account ID and token permissions.`,
      })
    }
    const json = await response.json()
    const account = json.account
    return NextResponse.json({
      configured: true,
      connected: true,
      environment,
      liveExecutionEnabled,
      accountId,
      currency: account?.currency,
      balance: account?.balance ? Number(account.balance) : null,
      nav: account?.NAV ? Number(account.NAV) : null,
      openTradeCount: account?.openTradeCount ? Number(account.openTradeCount) : 0,
      openPositionCount: account?.openPositionCount ? Number(account.openPositionCount) : 0,
      marginAvailable: account?.marginAvailable ? Number(account.marginAvailable) : null,
    })
  } catch (error) {
    return NextResponse.json({
      configured: true,
      connected: false,
      environment,
      liveExecutionEnabled,
      message: error instanceof Error ? error.message : 'Unable to reach OANDA.',
    })
  }
}
