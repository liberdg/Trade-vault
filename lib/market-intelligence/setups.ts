import type { Swing } from './engine'
import type { LiquiditySweep } from './liquidity'
import type { OrderBlock } from './order-blocks'
import type { FairValueGap } from './fvg'
export type TradeSetup={direction:'BUY'|'SELL';score:number;confidence:'LOW'|'MEDIUM'|'HIGH';reasons:string[];status:'WATCH'|'CONFIRMED'}
export function detectTradeSetups(swings:Swing[],sweeps:LiquiditySweep[],blocks:OrderBlock[],gaps:FairValueGap[],structure:'BULLISH'|'BEARISH'|'RANGE'|'UNCONFIRMED'){
 const result:TradeSetup[]=[]
 for(const direction of ['BUY','SELL'] as const){const bias=direction==='BUY'?'BULLISH':'BEARISH';const reasons:string[]=[];let score=0
 if(structure===bias){score+=2;reasons.push('Structure alignment')}
 if(sweeps.some(s=>s.direction===bias)){score+=2;reasons.push('Liquidity sweep')}
 if(blocks.some(b=>b.direction===bias&&!b.mitigated)){score+=2;reasons.push('Unmitigated order block')}
 if(gaps.some(g=>g.direction===bias&&g.filledPercent<50)){score+=1;reasons.push('Open fair value gap')}
 if(score>=3)result.push({direction,score,confidence:score>=5?'HIGH':'MEDIUM',reasons,status:score>=5?'CONFIRMED':'WATCH'})
 }
 return result.sort((a,b)=>b.score-a.score)
}