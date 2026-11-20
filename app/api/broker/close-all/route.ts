import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const accountIds = Array.isArray(body?.accountIds) ? body.accountIds : []

  return NextResponse.json({
    status: 'unsupported',
    scope: accountIds,
    message: 'No verified broker adapter currently exposes authoritative live positions for global close-all. No closing request was sent.',
  }, { status: 501 })
}
