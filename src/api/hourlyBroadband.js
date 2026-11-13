import {normalizeHourlyBroadband} from '../utils/hourlyBroadbandDisplay.js'
import {isMock,postHandle2} from './client.js'
import {createHourlyBroadbandEngine} from '../utils/hourlyBroadband.js'
const code=import.meta.env.VITE_BB_ROLLOUT_SERVICE_CODE
const cache=new Map()
export async function fetchHourlyBroadband(params,token,refresh=false){
  const key=JSON.stringify([token,params.branch||'',params.grid||'']),now=Date.now(),old=cache.get(key)
  if(!refresh && old && now-old.time<60000)return old.data
  let data
  if(isMock){
    const engine=createHourlyBroadbandEngine(),d=new Date(),pad=n=>String(n).padStart(2,'0'),stamp=`${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}${pad(d.getHours())}`
    const rows=[];let index=0
    for(const [branch,grids] of engine.groups)for(const grid of grids){const target=index<5?22:17;rows.push({id:++index,branch_company:branch,grid_name:grid,prod_period_type:'hour',product_name:'手宽新增',day_target:target,capacity:index%7===0?0:Math.floor(target*(index%11)/9),stat_date:stamp})}
    rows.push({branch_company:'全市',grid_name:'全市',prod_period_type:'hour',product_name:'手宽新增',day_target:450,capacity:rows.reduce((sum,r)=>sum+r.capacity,0),stat_date:stamp})
    data=engine.build(rows,stamp,{signedIn:true},params)
  }else{
    if(!code)throw new Error('宽带攻坚调度网关未配置，请填写VITE_BB_ROLLOUT_SERVICE_CODE')
    if(!token)throw new Error('登录已过期，请重新登录')
    data=await postHandle2('ability_customize',{servicecode:code,token,params:{branch:params.branch||'',grid:params.grid||'',token,funCode:'wgsc_bbRollout'}},{timeoutMs:30000})
  }
  if(!data?.asOf || !data?.options)throw new Error('宽带攻坚调度返回格式不完整，请检查新网关是否发布')
  data=normalizeHourlyBroadband(data)
  cache.clear();cache.set(key,{time:Date.now(),data});return data
}
