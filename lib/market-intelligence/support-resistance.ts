import type { Swing } from './engine'
export type PriceZone={low:number;high:number;mid:number;type:'SUPPORT'|'RESISTANCE';strength:number;lastTouchIndex:number}
export function detectSupportResistance(swings:Swing[],atr:number|null,currentPrice:number|null){
 const radius=atr&&atr>0?atr*.25:undefined;const clusters:{price:number;count:number;last:number}[]=[]
 for(const s of swings){const cluster=clusters.find(c=>Math.abs(c.price-s.price)<=(radius??s.price*.001));if(cluster){cluster.price=(cluster.price*cluster.count+s.price)/(cluster.count+1);cluster.count++;cluster.last=Math.max(cluster.last,s.index)}else clusters.push({price:s.price,count:1,last:s.index})}
 const last=currentPrice??0
 return clusters.map(c=>({low:c.price-(radius??c.price*.001),high:c.price+(radius??c.price*.001),mid:c.price,type:c.price<=last?'SUPPORT' as const:'RESISTANCE' as const,strength:c.count,lastTouchIndex:c.last})).sort((a,b)=>b.strength-a.strength).slice(0,20)
}