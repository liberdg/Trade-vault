import type { BrokerConnectionType, BrokerPermissionMode } from '@/types'

export type BrokerCapability =
  | 'accounts'
  | 'balance'
  | 'equity'
  | 'positions'
  | 'pending_orders'
  | 'history'
  | 'market_data'
  | 'place_order'
  | 'modify_order'
  | 'cancel_order'
  | 'close_position'
  | 'partial_close'

export interface BrokerCatalogEntry {
  id: string
  name: string
  description: string
  platform: 'deriv_api' | 'mt5' | 'mt4' | 'ctrader' | 'binance' | 'bybit' | 'exness_api' | 'exness_mt5' | 'oanda'
  connectionTypes: BrokerConnectionType[]
  capabilities: BrokerCapability[]
  recommendedPermission: BrokerPermissionMode
  integrationStatus: 'real_adapter' | 'bridge_required' | 'official_api_pending' | 'no_public_adapter'
  credentials: string[]
  warning: string
}

export const BROKER_CATALOG: BrokerCatalogEntry[] = [
  {
    id: 'mt5', name: 'MetaTrader 5', description: 'Broker-terminal platform',
    platform: 'mt5', connectionTypes: ['mt5_bridge'], capabilities: ['accounts'],
    recommendedPermission: 'read_only', integrationStatus: 'bridge_required',
    credentials: ['Bridge URL', 'Device pairing token'],
    warning: 'Requires a running logged-in MT5 terminal and an authenticated local/EA bridge. Web-only browser access cannot control MT5 directly.',
  },
  {
    id: 'deriv', name: 'Deriv', description: 'Deriv account API',
    platform: 'deriv_api', connectionTypes: ['official_api'], capabilities: ['accounts','balance','positions','history','market_data'],
    recommendedPermission: 'read_only', integrationStatus: 'real_adapter',
    credentials: ['Deriv API App ID', 'Personal access token'],
    warning: 'Deriv API products are separate from Deriv MT5 accounts. Demo and real accounts must remain explicitly distinct.',
  },
  {
    id: 'exness', name: 'Exness', description: 'Eligible Exness API or MT5 bridge',
    platform: 'exness_api', connectionTypes: ['official_api','mt5_bridge'], capabilities: ['accounts'],
    recommendedPermission: 'read_only', integrationStatus: 'bridge_required',
    credentials: ['Integration method'],
    warning: 'Standard Exness MT accounts cannot be assumed eligible for the Exness API. An authenticated MT5 bridge is the appropriate alternative.',
  },
  {
    id: 'binance', name: 'Binance', description: 'Spot and derivatives exchange',
    platform: 'binance', connectionTypes: ['exchange_api'], capabilities: [],
    recommendedPermission: 'read_only', integrationStatus: 'official_api_pending',
    credentials: ['API key', 'Secret key'],
    warning: 'Exchange trading credentials require IP restrictions and no withdrawal permission. Integration is pending verified exchange account testing.',
  },
  {
    id: 'bybit', name: 'Bybit', description: 'Spot and derivatives exchange',
    platform: 'bybit', connectionTypes: ['exchange_api'], capabilities: [],
    recommendedPermission: 'read_only', integrationStatus: 'official_api_pending',
    credentials: ['API key', 'Secret key'],
    warning: 'Not connected until a real adapter passes authenticated demo or account-data tests.',
  },
  {
    id: 'mt4', name: 'MetaTrader 4', description: 'Legacy broker-terminal platform',
    platform: 'mt4', connectionTypes: ['mt4_bridge'], capabilities: ['accounts'],
    recommendedPermission: 'read_only', integrationStatus: 'bridge_required',
    credentials: ['Bridge URL', 'Device pairing token'],
    warning: 'Requires a dedicated authenticated terminal bridge. A cloud-only MT4 password connection is not supported.',
  },
  {
    id: 'ctrader', name: 'cTrader', description: 'Open API or local execution environment',
    platform: 'ctrader', connectionTypes: ['ctrader_api','oauth'], capabilities: [],
    recommendedPermission: 'read_only', integrationStatus: 'official_api_pending',
    credentials: ['OAuth app credentials', 'Account access'],
    warning: 'No verified cTrader session is configured. OAuth and account-specific permissions must be tested first.',
  },
  {
    id: 'oanda', name: 'OANDA', description: 'Practice and live v20 account',
    platform: 'oanda', connectionTypes: ['official_api'], capabilities: ['accounts','balance'],
    recommendedPermission: 'read_only', integrationStatus: 'real_adapter',
    credentials: ['API token', 'Account ID'],
    warning: 'Currently verified API access is limited to account-summary retrieval (balance/currency). Positions, history and execution are not implemented in this connector yet.',
  },
]
