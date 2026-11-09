const TTL=60000,entries=new Map()
const identityKey=identity=>JSON.stringify([identity.token||'',identity.permission?.phone||'',identity.permission?.role||'',identity.permission?.branchId||identity.permission?.branchName||'',identity.permission?.gridId||identity.permission?.gridName||'',Boolean(identity.permission?.isSuperAdmin)])
const requestKey=params=>JSON.stringify(Object.keys(params).sort().map(key=>[key,params[key]]))
export function clearTeamControlCache(identity){
  const scope=identity?identityKey(identity):null
  for(const [key,entry] of entries)if(scope===null||entry.scope===scope)entries.delete(key)
}
export function cachedTeamControl(identity,type,params,fetcher,now=Date.now){
  const scope=identityKey(identity),key=JSON.stringify([scope,type,requestKey(params)]),existing=entries.get(key)
  if(existing?.promise)return existing.promise
  if(existing&&existing.expires>now())return Promise.resolve(existing.data)
  entries.delete(key)
  const entry={scope,promise:null,expires:0}
  entry.promise=Promise.resolve().then(fetcher).then(data=>{
    if(entries.get(key)===entry){entry.data=data;entry.expires=now()+TTL;entry.promise=null}
    return data
  },error=>{if(entries.get(key)===entry)entries.delete(key);throw error})
  entries.set(key,entry)
  while(entries.size>32)entries.delete(entries.keys().next().value)
  return entry.promise
}
