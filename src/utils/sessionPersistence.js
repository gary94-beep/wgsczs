export function isExpiredSessionError(error) {
  return ['00008','600100001','600100002','600100003','SESSION_PERMISSION'].includes(String(error?.code || ''))
}
export function createSessionPersistence(storage,key) {
  return {
    key,
    read(){try{const value=JSON.parse(storage?.getItem(key)||'null');return value?.version===1 && typeof value.token==='string' && value.token.trim()?{token:value.token,mobile:typeof value.mobile==='string'?value.mobile:''}:null}catch{return null}},
    save(identity){try{if(!storage || !identity?.token)return false;storage.setItem(key,JSON.stringify({version:1,token:identity.token,mobile:identity.mobile||'',savedAt:Date.now()}));return true}catch{return false}},
    clear(){try{storage?.removeItem(key)}catch{/* The memory session is cleared even if browser storage is unavailable. */}}
  }
}
