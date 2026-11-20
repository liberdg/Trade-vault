import { describe, expect, it } from 'vitest'
import { validateBrokerConnectionRequest } from './connection-validation'

describe('broker connection request validation', () => {
  it('accepts a supported broker and connection method', () => {
    expect(validateBrokerConnectionRequest('deriv', 'official_api').valid).toBe(true)
  })

  it('rejects unknown brokers', () => {
    expect(validateBrokerConnectionRequest('not-a-broker', 'official_api').valid).toBe(false)
  })

  it('rejects unsupported broker-method combinations', () => {
    expect(validateBrokerConnectionRequest('oanda', 'mt5_bridge').valid).toBe(false)
  })

  it('rejects missing or non-string inputs', () => {
    expect(validateBrokerConnectionRequest('', 'official_api').valid).toBe(false)
    expect(validateBrokerConnectionRequest('oanda', null).valid).toBe(false)
  })
})
