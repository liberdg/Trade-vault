import type { Swing } from './engine'
import type { LiquiditySweep } from './liquidity'
import type { OrderBlock } from './order-blocks'
import type { FairValueGap } from './fvg'
export type TradeSetup={direction:'BUY'|'SELL';score:number;confidence:'LOW'|'MEDIUM'|'HIGH';reasons:string[];status:'WATCH'}
type Structure='BULLISH'|'BEARISH'|'RANGE'|'UNCONFIRMED'
const distance=(price:number,low:number,high:number)=>price<low?low-price:price>high?price-high:0
export function detectTradeSetups(swings:Swing[],sweeps:LiquiditySweep[],blocks:OrderBlock[],gaps:FairValueGap[],structure:Structure,currentPrice:number,atr:number,candleCount:number){
 const result:TradeSetup[]=[]
 if(!Number.isFinite(currentPrice)||currentPrice<=0||!Number.isFinite(atr)||atr<=0)return result
 for(const direction of ['BUY','SELL'] as const){
  const bias=direction==='BUY'?'BULLISH':'BEARISH',reasons:string[]=[];let score=0
  if(structure===bias){score+=2;reasons.push('Structure alignment')}
  const recentSweep=sweeps.some(s=>s.direction===bias&&s.candleIndex>=Math.max(0,candleCount-20))
  if(recentSweep){score+=2;reasons.push('Recent liquidity sweep')}
  const nearBlock=blocks.some(b=>b.direction===bias&&!b.mitigated&&distance(currentPrice,b.low,b.high)<=atr*1.5)
  if(nearBlock){score+=2;reasons.push('Price near unmitigated order block')}
  const nearGap=gaps.some(g=>g.direction===bias&&g.filledPercent<50&&distance(currentPrice,g.low,g.high)<=atr*1.5)
  if(nearGap){score+=1;reasons.push('Price near open fair value gap')}
  const directionalSwing=swings.some(s=>direction==='BUY'?s.type==='LOW':s.type==='HIGH')
  if(directionalSwing&&reasons.length>=2){score+=1;reasons.push('Confirmed swing context')}
  if(score>=3)result.push({direction,score,confidence:score>=5?'HIGH':score>=4?'MEDIUM':'LOW',reasons,status:'WATCH'})
 }
 return result.sort((a,b)=>b.score-a.score)
}