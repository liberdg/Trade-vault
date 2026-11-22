import type { Candle } from '@/lib/market'
import type { Swing } from './engine'
export type LiquidityLevel={price:number;type:'EQH'|'EQL'|'SWING_HIGH'|'SWING_LOW';touches:number;firstIndex:number;lastIndex:number}
export type LiquiditySweep={direction:'BULLISH'|'BEARISH';level:number;candleIndex:number;reclaimed:boolean}
export function detectLiquidity(candles:Candle[],swings:Swing[],tolerancePct=0.001){
 const levels:LiquidityLevel[]=[]
 for(const type of ['HIGH','LOW'] as const){
  for(const s of swings.filter(x=>x.type===type)){
   const found=levels.find(l=>Math.abs(l.price-s.price)/Math.max(s.price,1e-12)<=tolerancePct&&(type==='HIGH'?(l.type==='EQH'||l.type==='SWING_HIGH'):(l.type==='EQL'||l.type==='SWING_LOW')))
   if(found){found.price=(found.price*found.touches+s.price)/(found.touches+1);found.touches++;found.lastIndex=s.index;found.type=type==='HIGH'?'EQH':'EQL'}
   else levels.push({price:s.price,type:type==='HIGH'?'SWING_HIGH':'SWING_LOW',touches:1,firstIndex:s.index,lastIndex:s.index})
  }
 }
 const sweeps:LiquiditySweep[]=[]
 candles.forEach((c,i)=>{if(i===0)return;for(const l of levels){if((l.type==='EQH'||l.type==='SWING_HIGH')&&c.high>l.price&&c.close<l.price)sweeps.push({direction:'BEARISH',level:l.price,candleIndex:i,reclaimed:true});else if((l.type==='EQL'||l.type==='SWING_LOW')&&c.low<l.price&&c.close>l.price)sweeps.push({direction:'BULLISH',level:l.price,candleIndex:i,reclaimed:true})}})
 return {levels:levels.sort((a,b)=>b.touches-a.touches),sweeps:sweeps.slice(-20)}
}