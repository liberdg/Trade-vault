import type { Candle } from '@/lib/market'
import type { StructureState } from './engine'
export type MarketRegime='TREND'|'RANGE'|'VOLATILITY_EXPANSION'|'VOLATILITY_COMPRESSION'|'UNKNOWN'
export function classifyMarketRegime(candles:Candle[],atr:number|null,structure:StructureState){
 if(candles.length<30||!atr)return {regime:'UNKNOWN' as MarketRegime,atr,atrRatio:null}
 const tr=candles.slice(-14).map((c,i,a)=>Math.max(c.high-c.low,Math.abs(c.high-(a[i-1]?.close??c.close)),Math.abs(c.low-(a[i-1]?.close??c.close))))
 const recent=tr.reduce((s,x)=>s+x,0)/tr.length;const ratio=recent/atr
 const regime=ratio>1.35?'VOLATILITY_EXPANSION':ratio<.7?'VOLATILITY_COMPRESSION':structure==='RANGE'?'RANGE':structure==='BULLISH'||structure==='BEARISH'?'TREND':'UNKNOWN'
 return {regime,atr,atrRatio:ratio}
}