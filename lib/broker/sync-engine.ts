import type { BrokerSyncResult } from './adapter'
import { BrokerCapabilityError } from './adapter'
import { getBrokerAdapter, hasBrokerAdapter } from './registry'

export interface SyncRequest {
  brokerId: string
  accountId: string
  environment?: 'demo' | 'real'
}

/**
 * Account synchronization orchestrator.
 * Never reports success when the adapter returns incomplete or failed data.
 */
export async function synchronizeBrokerAccount(request: SyncRequest): Promise<BrokerSyncResult> {
  if (!request.brokerId?.trim()) {
    return {
      status: 'failed',
      account: { brokerId: '', accountId: request.accountId, environment: request.environment ?? 'demo' },
      capabilities: [],
      errors: ['Broker ID is required.'],
      synchronizedAt: new Date().toISOString(),
      incomplete: true,
    }
  }
  if (!request.accountId?.trim()) {
    return {
      status: 'failed',
      account: { brokerId: request.brokerId, accountId: '', environment: request.environment ?? 'demo' },
      capabilities: [],
      errors: ['Account ID is required.'],
      synchronizedAt: new Date().toISOString(),
      incomplete: true,
    }
  }

  if (!hasBrokerAdapter(request.brokerId)) {
    return {
      status: 'failed',
      account: {
        brokerId: request.brokerId,
        accountId: request.accountId,
        environment: request.environment ?? 'demo',
      },
      capabilities: [],
      errors: [
        `Broker "${request.brokerId}" has no verified server-side sync adapter. ` +
        'Deriv account sync uses the dedicated /api/broker/deriv/account-data endpoint with an authenticated OTP session.',
      ],
      synchronizedAt: new Date().toISOString(),
      incomplete: true,
    }
  }

  try {
    const adapter = getBrokerAdapter(request.brokerId)
    const result = await adapter.synchronizeAccount(request.accountId)
    if (request.environment && result.account.environment !== request.environment) {
      return {
        ...result,
        status: 'failed',
        incomplete: true,
        errors: [
          ...result.errors,
          `Environment mismatch: requested ${request.environment}, adapter reported ${result.account.environment}.`,
        ],
      }
    }
    if (result.status === 'synchronized' && result.incomplete) {
      return { ...result, status: 'partial' }
    }
    if (result.status === 'synchronized' && !result.balance) {
      return {
        ...result,
        status: 'failed',
        incomplete: true,
        errors: [...result.errors, 'Synchronization claimed success without a verified balance snapshot.'],
      }
    }
    return result
  } catch (error) {
    if (error instanceof BrokerCapabilityError) {
      return {
        status: 'failed',
        account: {
          brokerId: request.brokerId,
          accountId: request.accountId,
          environment: request.environment ?? 'demo',
        },
        capabilities: [],
        errors: [error.message],
        synchronizedAt: new Date().toISOString(),
        incomplete: true,
      }
    }
    return {
      status: 'failed',
      account: {
        brokerId: request.brokerId,
        accountId: request.accountId,
        environment: request.environment ?? 'demo',
      },
      capabilities: [],
      errors: [error instanceof Error ? error.message : 'Synchronization failed.'],
      synchronizedAt: new Date().toISOString(),
      incomplete: true,
    }
  }
}
