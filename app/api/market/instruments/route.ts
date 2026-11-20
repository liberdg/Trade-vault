import { NextResponse } from 'next/server'
import { MARKET_INSTRUMENTS } from '@/lib/market-instruments'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    instruments: MARKET_INSTRUMENTS,
    retrievedAt: new Date().toISOString(),
  })
}
