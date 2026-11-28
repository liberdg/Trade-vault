import {describe,expect,it} from 'vitest'
import {classifyMarketRegime} from './regime'
import {detectTradeSetups} from './setups'
import type {OrderBlock} from './order-blocks'
import type {FairValueGap} from './fvg'
import type {Candle} from '@/lib/market'
import type {Swing} from './engine'
const candle=(time:number,open:number,high:number,low:number,close:number):Candle=>({time,open,high,low,close})
describe('market intelligence refinements',()=>{
 it('does not promote distant zones into setup candidates',()=>{
  const swings:Swing[]=[{index:5,time:5,price:95,type:'LOW'}]
  const blocks=[{direction:'BULLISH' as const,low:90,high:91,originIndex:1,impulseIndex:3,mitigated:false,invalidated:false}] as OrderBlock[]
  const gaps=[{direction:'BULLISH' as const,low:91,high:92,index:3,filledPercent:0,invalidated:false}] as FairValueGap[]
  expect(detectTradeSetups(swings,[],blocks,gaps,'BULLISH',100,2,100)).toEqual([])
 })
 it('keeps setup candidates in WATCH status',()=>{
  const swings:Swing[]=[{index:5,time:5,price:99,type:'LOW'}]
  const blocks=[{direction:'BULLISH' as const,low:99,high:100,originIndex:1,impulseIndex:3,mitigated:false,invalidated:false}] as OrderBlock[]
  const gaps=[{direction:'BULLISH' as const,low:99,high:100,index:3,filledPercent:0,invalidated:false}] as FairValueGap[]
  const result=detectTradeSetups(swings,[],blocks,gaps,'BULLISH',99.5,2,100)
  expect(result.some(x=>x.status==='WATCH')).toBe(true)
  expect(result.every(x=>String(x.status)!=='CONFIRMED')).toBe(true)
 })
 it('compares recent volatility to a historical baseline',()=>{
  const quiet=Array.from({length:70},(_,i)=>candle(i,100,101,99,100))
  const expanding=quiet.slice()
  for(let i=56;i<70;i++)expanding[i]=candle(i,100,110,90,100)
  expect(classifyMarketRegime(expanding,2,'RANGE').regime).toBe('VOLATILITY_EXPANSION')
  expect(classifyMarketRegime(quiet,2,'RANGE').atrRatio).toBeCloseTo(1)
 })
})