import type { Candle } from '@/lib/market'
import { analyzeMarketIntelligence } from './engine'
import { detectLiquidity } from './liquidity'
import { detectOrderBlocks } from './order-blocks'
import { detectFairValueGaps } from './fvg'
import { detectSupportResistance } from './support-resistance'
import { classifyMarketRegime } from './regime'
import { detectTradeSetups } from './setups'
import { buildMarketAnalystSummary } from './analyst'
export function runMarketIntelligence(symbol:string,timeframe:string,candles:Candle[]){
 const core=analyzeMarketIntelligence(candles)
 if(core.status!=='READY')return {status:core.status,symbol,timeframe,core,liquidity:null,orderBlocks:null,fvgs:null,supportResistance:null,regime:null,setups:[],analyst:null}
 const liquidity=detectLiquidity(candles,core.latestSwings)
 const orderBlocks=detectOrderBlocks(candles,core.atr)
 const fvgs=detectFairValueGaps(candles)
 const supportResistance=detectSupportResistance(core.latestSwings,core.atr,core.currentPrice)
 const regime=classifyMarketRegime(candles,core.atr,core.structure)
 const setups=detectTradeSetups(core.latestSwings,liquidity.sweeps,orderBlocks,fvgs,core.structure,core.currentPrice??0,core.atr??0,candles.length)
 const analyst=buildMarketAnalystSummary({symbol,timeframe,core,liquidity:liquidity.levels,sweeps:liquidity.sweeps,blocks:orderBlocks,gaps:fvgs,zones:supportResistance,setups})
 return {status:'READY',symbol,timeframe,core,liquidity,orderBlocks,fvgs,supportResistance,regime,setups,analyst}
}