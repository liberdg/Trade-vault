import { BROKER_CATALOG } from './core'

export function validateBrokerConnectionRequest(brokerId: unknown, connectionType: unknown) {
  if (typeof brokerId !== 'string' || !brokerId.trim()) {
    return { valid: false as const, message: 'A broker ID is required.' }
  }
  if (typeof connectionType !== 'string' || !connectionType.trim()) {
    return { valid: false as const, message: 'A connection type is required.' }
  }

  const broker = BROKER_CATALOG.find(entry => entry.id === brokerId)
  if (!broker) return { valid: false as const, message: 'Unknown broker.' }
  if (!broker.connectionTypes.includes(connectionType as never)) {
    return { valid: false as const, message: 'This connection method is not supported for the selected broker.' }
  }
  return { valid: true as const, broker }
}
