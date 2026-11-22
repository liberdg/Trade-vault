import { NextRequest, NextResponse } from 'next/server'
import { fetchBinanceCandles, fetchDerivCandles, fetchYahooCandles, type MarketKind } from '@/lib/market'
import { runMarketIntelligence } from '@/lib/market-intelligence'

export const dynamic = 'force-dynamic'
const DEFAULT_TIMEFRAMES = ['1d', '4h', '1h', '15m']
const ALLOWED_TIMEFRAMES = new Set(['1m', '5m', '15m', '30m', '1h', '2h', '4h', '1d', '1w'])

async function loadCandles(symbol:string,kind:MarketKind,timeframe:string) {
 if(kind==='crypto'){
  try{return {provider:'binance' as const,candles:await fetchBinanceCandles(symbol,timeframe)}}
  catch(error){try{return {provider:'yahoo' as const,candles:await fetchYahooCandles(symbol,timeframe,'crypto')}}catch{throw error}}
 }
 if(kind==='forex'||kind==='metal'){
  try{const data=await fetchDerivCandles(symbol,timeframe,kind);return {provider:'deriv' as const,candles:data.candles}}
  catch(error){if(kind==='metal'||timeframe==='2h')throw error;return {provider:'yahoo' as const,candles:await fetchYahooCandles(symbol,timeframe,'forex')}} 
 }
 return {provider:'yahoo' as const,candles:await fetchYahooCandles(symbol,timeframe,kind==='index'?'stock':'stock')}
}
export async function GET(request:NextRequest){
 const symbol=request.nextUrl.searchParams.get('symbol')?.trim().toUpperCase()
 const kindValue=request.nextUrl.searchParams.get('kind')?.trim().toLowerCase()||'crypto'
 const kinds:MarketKind[]=['crypto','forex','stock','index','metal']
 if(!symbol)return NextResponse.json({error:'Symbol is required'},{status:400})
 if(!kinds.includes(kindValue as MarketKind))return NextResponse.json({error:'Unsupported market kind'},{status:400})
 const requested=request.nextUrl.searchParams.get('timeframes')
 const timeframes=requested?requested.split(',').map(x=>x.trim()).filter(Boolean):DEFAULT_TIMEFRAMES
 const unique=[...new Set(timeframes)]
 if(!unique.length||unique.length>6||unique.some(tf=>!ALLOWED_TIMEFRAMES.has(tf)))return NextResponse.json({error:'Request 1 to 6 supported timeframes.'},{status:400})
 const results=await Promise.all(unique.map(async timeframe=>{
  try{const market=await loadCandles(symbol,kindValue as MarketKind,timeframe);return {timeframe,provider:market.provider,retrievedAt:new Date().toISOString(),candleCount:market.candles.length,analysis:runMarketIntelligence(symbol,timeframe,market.candles)}}
  catch(error){return {timeframe,status:'DATA_UNAVAILABLE' as const,error:error instanceof Error?error.message:'Provider error'}}
 }))
 const successful=results.filter(r=>'analysis' in r)
 const structures=successful.map(r=>r.analysis.core?.structure).filter(Boolean)
 const bullish=structures.includes('BULLISH'),bearish=structures.includes('BEARISH')
 const alignment=structures.length&&structures.every(s=>s===structures[0]&&s!=='RANGE'&&s!=='UNCONFIRMED')?structures[0]:bullish&&bearish?'CONFLICTING':'MIXED_OR_UNCONFIRMED'
 return NextResponse.json({symbol,kind:kindValue,timeframes:results,alignment,analyzedAt:new Date().toISOString(),availableTimeframes:successful.length,requestedTimeframes:unique.length})
}
