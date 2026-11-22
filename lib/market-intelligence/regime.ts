import type { Candle } from '@/lib/market'
import type { StructureState } from './engine'
export type MarketRegime='TREND'|'RANGE'|'VOLATILITY_EXPANSION'|'VOLATILITY_COMPRESSION'|'UNKNOWN'
function trueRange(c:Candle,previous?:Candle){return previous?Math.max(c.high-c.low,Math.abs(c.high-previous.close),Math.abs(c.low-previous.close)):c.high-c.low}
function mean(values:number[]){return values.length?values.reduce((a,b)=>a+b,0)/values.length:null}
export function classifyMarketRegime(candles:Candle[],atr:number|null,structure:StructureState){
 if(candles.length<30||!atr||atr<=0)return {regime:'UNKNOWN' as MarketRegime,atr,atrRatio:null}
 const ranges=candles.map((c,i)=>trueRange(c,candles[i-1]))
 const recent=mean(ranges.slice(-14))
 const baseline=mean(ranges.slice(-64,-14))
 const ratio=recent&&baseline?recent/baseline:null
 const regime=ratio!==null&&ratio>1.35?'VOLATILITY_EXPANSION':ratio!==null&&ratio<.7?'VOLATILITY_COMPRESSION':structure==='RANGE'?'RANGE':structure==='BULLISH'||structure==='BEARISH'?'TREND':'UNKNOWN'
 return {regime,atr,atrRatio:ratio}
}