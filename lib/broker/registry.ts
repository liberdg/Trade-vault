import type { BrokerAdapter } from './adapter'
import { BrokerCapabilityError } from './adapter'
import { createMtBridgeAdapter } from './mt-bridge-adapter'
import { createOandaAdapter } from './oanda-adapter'

const adapters: Record<string, () => BrokerAdapter> = {
  oanda: () => createOandaAdapter(),
  mt5: () => createMtBridgeAdapter('mt5'),
  mt4: () => createMtBridgeAdapter('mt4'),
  exness: () => createMtBridgeAdapter('exness'),
}

export function getBrokerAdapter(brokerId: string): BrokerAdapter {
  const factory = adapters[brokerId]
  if (!factory) {
    throw new BrokerCapabilityError('adapter', `No verified adapter is registered for broker "${brokerId}".`)
  }
  return factory()
}

export function listRegisteredAdapters(): string[] {
  return Object.keys(adapters)
}

export function hasBrokerAdapter(brokerId: string): boolean {
  return brokerId in adapters
}
