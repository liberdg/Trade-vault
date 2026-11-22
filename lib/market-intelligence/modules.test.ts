import {describe,expect,it} from 'vitest'
import {detectLiquidity} from './liquidity'
import {detectFairValueGaps} from './fvg'
import {classifyMarketRegime} from './regime'
import type {Candle} from '@/lib/market'
import type {Swing} from './engine'
const candle=(time:number,open:number,high:number,low:number,close:number):Candle=>({time,open,high,low,close})
describe('SMRT intelligence modules',()=>{
 it('clusters equal highs and ignores sweep before a swing is confirmed',()=>{
  const data=[candle(1,10,11,9,10),candle(2,10,12,9.5,11),candle(3,11,13,10,12),candle(4,12,14,11,12),candle(5,13,15,12,13),candle(6,14,16,13,14)]
  const swings:Swing[]=[{index:1,time:2,price:12,type:'HIGH'},{index:3,time:4,price:12.01,type:'HIGH'}]
  const result=detectLiquidity(data,swings,0.002)
  expect(result.levels.some(x=>x.type==='EQH')).toBe(true)
  expect(result.sweeps.every(x=>x.candleIndex>3)).toBe(true)
 })
 it('finds a three-candle bullish fair value gap',()=>{
  const data=[candle(1,10,11,9,10),candle(2,10,12,10,11),candle(3,12,14,12.5,13.5)]
  expect(detectFairValueGaps(data).some(x=>x.direction==='BULLISH'&&x.low===11&&x.high===12.5)).toBe(true)
 })
 it('classifies unavailable regime with insufficient history',()=>{
  expect(classifyMarketRegime([],null,'UNCONFIRMED').regime).toBe('UNKNOWN')
 })
})
