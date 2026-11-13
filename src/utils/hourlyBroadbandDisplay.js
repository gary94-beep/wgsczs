// Handle2 may serialize a null SQL value as {}. Never coerce objects/booleans to numbers.
export function hourlyNumber(value){
  if(typeof value==='string'){
    const s=value.trim()
    if(!s || !/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(s))return null
    value=Number(s)
  }
  return typeof value==='number' && Number.isFinite(value) && value>=0 ? value : null
}
export const hourlyHasNumber=v=>hourlyNumber(v)!==null
export function hourlyFormat(v){const value=hourlyNumber(v);return value===null?'暂无':value.toLocaleString('zh-CN',{maximumFractionDigits:1})}
export function hourlyPercent(v){return hourlyHasNumber(v)?`${hourlyFormat(v)}%`:'暂无'}
export function hourlyFill(v){return `${Math.min(100,hourlyNumber(v)??0)}%`}
export function hourlyGridOrder(rows,order='desc'){
  return rows.slice().sort((a,b)=>{
    const x=hourlyNumber(a.rate),y=hourlyNumber(b.rate)
    return x===null&&y!==null?1:x!==null&&y===null?-1:x!==null&&y!==null&&x!==y?(order==='asc'?x-y:y-x):a.grid.localeCompare(b.grid)
  })
}
export function hourlyBelowCity(data){
  const baseline=hourlyNumber(data?.summary?.rate)
  if(data?.scope?.branch || data?.scope?.grid || baseline===null)return []
  return (data?.branches||[]).filter(r=>hourlyNumber(r.rate)!==null && hourlyNumber(r.rate)<baseline)
    .map(r=>({...r,behind:baseline-hourlyNumber(r.rate)})).sort((a,b)=>a.rate-b.rate||a.branch.localeCompare(b.branch))
}
export function normalizeHourlyBroadband(data){
  const metric=r=>{
    const row={...(r||{})}
    for(const field of ['capacity','target','rate','gap','rank'])row[field]=hourlyNumber(row[field])
    return row
  }
  const rows=name=>Array.isArray(data[name])?data[name].map(metric):[]
  return {...data,summary:metric(data.summary),branches:rows('branches'),grids:rows('grids'),classes:rows('classes'),focus:rows('focus'),peer:data.peer?.category?{...data.peer,summary:metric(data.peer.summary),rank:hourlyNumber(data.peer.rank)}:null}
}
