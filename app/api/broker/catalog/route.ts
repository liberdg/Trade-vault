import { NextResponse } from 'next/server'
import { BROKER_CATALOG } from '@/lib/broker/core'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    brokers: BROKER_CATALOG,
    retrievedAt: new Date().toISOString(),
  })
}
