import type { Candle } from '@/lib/market'
export type FairValueGap={direction:'BULLISH'|'BEARISH';low:number;high:number;index:number;filledPercent:number;invalidated:boolean}
export function detectFairValueGaps(candles:Candle[]){
 const gaps:FairValueGap[]=[]
 for(let i=2;i<candles.length;i++){const a=candles[i-2],c=candles[i]
  if(c.low>a.high){const low=a.high,high=c.low;const later=candles.slice(i+1);const fill=later.length?Math.max(0,Math.min(100,(high-Math.min(...later.map(x=>x.low)))/(high-low)*100)):0;gaps.push({direction:'BULLISH',low,high,index:i,filledPercent:fill,invalidated:later.some(x=>x.close<low)})}
  if(c.high<a.low){const low=c.high,high=a.low;const later=candles.slice(i+1);const fill=later.length?Math.max(0,Math.min(100,(Math.max(...later.map(x=>x.high))-low)/(high-low)*100)):0;gaps.push({direction:'BEARISH',low,high,index:i,filledPercent:fill,invalidated:later.some(x=>x.close>high)})}
 }
 return gaps.filter(g=>!g.invalidated).slice(-30)
}