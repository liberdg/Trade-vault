import type { Candle } from '@/lib/market'
export type OrderBlock={direction:'BULLISH'|'BEARISH';low:number;high:number;originIndex:number;impulseIndex:number;mitigated:boolean;invalidated:boolean}
export function detectOrderBlocks(candles:Candle[],atr:number|null,lookback=80){
 const out:OrderBlock[]=[];if(!atr||atr<=0)return out
 const start=Math.max(1,candles.length-lookback)
 for(let i=start;i<candles.length-2;i++){
  const origin=candles[i],later=candles[i+2]
  const moveUp=later.close-origin.open>=atr*1.2&&later.close>origin.high
  const moveDown=origin.open-later.close>=atr*1.2&&later.close<origin.low
  if(moveUp&&origin.close<origin.open){const low=origin.low,high=origin.open;const after=candles.slice(i+3);out.push({direction:'BULLISH',low,high,originIndex:i,impulseIndex:i+2,mitigated:after.some(c=>c.low<=high&&c.high>=low),invalidated:after.some(c=>c.close<low)})}
  if(moveDown&&origin.close>origin.open){const low=origin.open,high=origin.high;const after=candles.slice(i+3);out.push({direction:'BEARISH',low,high,originIndex:i,impulseIndex:i+2,mitigated:after.some(c=>c.high>=low&&c.low<=high),invalidated:after.some(c=>c.close>high)})}
 }
 return out.filter(x=>!x.invalidated).slice(-20)
}