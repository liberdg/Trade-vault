import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type WsMessage = Record<string, unknown>

function request(socket: WebSocket, payload: Record<string, unknown>, reqId: number): Promise<WsMessage> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.removeEventListener('message', onMessage)
      reject(new Error('Deriv public market request timed out.'))
    }, 10000)
    const onMessage = (event: MessageEvent) => {
      let data: WsMessage
      try { data = JSON.parse(String(event.data)) as WsMessage } catch { return }
      if (data.req_id !== reqId) return
      clearTimeout(timer)
      socket.removeEventListener('message', onMessage)
      if (data.error && typeof data.error === 'object') {
        const err = data.error as Record<string, unknown>
        reject(new Error(typeof err.message === 'string' ? err.message : 'Deriv market request rejected.'))
      } else resolve(data)
    }
    socket.addEventListener('message', onMessage)
    socket.send(JSON.stringify({ ...payload, req_id: reqId }))
  })
}

function openSocket(): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket('wss://api.derivws.com/trading/v1/options/ws/public')
    const timer = setTimeout(() => {
      try { socket.close() } catch {}
      reject(new Error('Deriv public market socket timed out.'))
    }, 10000)
    socket.onopen = () => { clearTimeout(timer); resolve(socket) }
    socket.onerror = () => { clearTimeout(timer); reject(new Error('Could not connect to Deriv public market data.')) }
  })
}

export async function POST(req: NextRequest) {
  let raw: unknown
  try { raw = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 }) }
  const body = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}
  const action = body.action
  if (action !== 'symbols' && action !== 'proposal') return NextResponse.json({ error: 'Unsupported action.' }, { status: 400 })

  const socket: WebSocket | undefined = undefined
  let ws: WebSocket | undefined
  try {
    ws = await openSocket()
    if (action === 'symbols') {
      const response = await request(ws, { active_symbols: 'brief', product_type: 'basic' }, 601)
      const active = Array.isArray(response.active_symbols) ? response.active_symbols : []
      const symbols = active.filter((item: unknown) => item && typeof item === 'object').map((item: Record<string, unknown>) => ({
        symbol: item.symbol,
        displayName: item.display_name,
        market: item.market,
        marketDisplayName: item.market_display_name,
        submarket: item.submarket,
        submarketDisplayName: item.submarket_display_name,
        exchange: item.exchange,
        isOpen: item.is_trading_suspended !== true,
      })).filter((item: { symbol?: unknown; displayName?: unknown }) => typeof item.symbol === 'string' && typeof item.displayName === 'string')
      return NextResponse.json({ symbols, retrievedAt: new Date().toISOString() }, { headers: { 'Cache-Control': 'no-store' } })
    }

    const symbol = typeof body.symbol === 'string' ? body.symbol.trim() : ''
    const contractType = body.contractType === 'PUT' ? 'PUT' : body.contractType === 'CALL' ? 'CALL' : ''
    const amount = Number(body.amount)
    const duration = Number(body.duration)
    const durationUnit = body.durationUnit === 'm' ? 'm' : body.durationUnit === 't' ? 't' : body.durationUnit === 'h' ? 'h' : 's'
    const currency = typeof body.currency === 'string' ? body.currency.trim() : ''
    if (!symbol || !contractType || !currency || !Number.isFinite(amount) || amount <= 0 || amount > 10000 || !Number.isInteger(duration) || duration <= 0 || duration > 86400) {
      return NextResponse.json({ error: 'Invalid proposal parameters.' }, { status: 400 })
    }
    const response = await request(ws, {
      proposal: 1, amount, basis: 'stake', contract_type: contractType,
      currency, duration, duration_unit: durationUnit, underlying_symbol: symbol,
    }, 602)
    const proposal = response.proposal && typeof response.proposal === 'object' ? response.proposal as Record<string, unknown> : null
    if (!proposal) return NextResponse.json({ error: 'Deriv returned no proposal.' }, { status: 502 })
    return NextResponse.json({ proposal, retrievedAt: new Date().toISOString() }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Deriv market request failed.' }, { status: 502 })
  } finally {
    try { ws?.close() } catch {}
  }
}
