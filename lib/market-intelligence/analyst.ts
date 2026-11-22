import type { MarketIntelligence } from './engine'
import type { LiquidityLevel,LiquiditySweep } from './liquidity'
import type { OrderBlock } from './order-blocks'
import type { FairValueGap } from './fvg'
import type { PriceZone } from './support-resistance'
import type { TradeSetup } from './setups'
export function buildMarketAnalystSummary(input:{symbol:string;timeframe:string;core:MarketIntelligence;liquidity:LiquidityLevel[];sweeps:LiquiditySweep[];blocks:OrderBlock[];gaps:FairValueGap[];zones:PriceZone[];setups:TradeSetup[]}){
 const core=input.core;const top=input.setups[0];const notes=[ 'Market structure: '+core.structure+'.','ATR: '+(core.atr??'unavailable')+'.','Liquidity levels: '+input.liquidity.length+'; sweeps: '+input.sweeps.length+'.','Order blocks: '+input.blocks.length+'; FVGs: '+input.gaps.length+'.','Support/resistance zones: '+input.zones.length+'.','Top setup: '+(top?top.direction+' (score '+top.score+')':'NO TRADE')+'.' ]
 return {symbol:input.symbol,timeframe:input.timeframe,bias:core.structure,topSetup:top??null,summary:notes.join(' '),components:{liquidity:input.liquidity.length,sweeps:input.sweeps.length,orderBlocks:input.blocks.length,fvgs:input.gaps.length,zones:input.zones.length},limitations:['Rule-based technical analysis only; not an AI model or financial advice.','Setups are candidates, not execution instructions.']}
}