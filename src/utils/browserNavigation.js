// History state holds only opaque entry IDs. UI snapshots stay in this tab's memory.
export function createBrowserNavigation({window:win=window,restore}) {
  let session='',entries=[],index=-1,serial=0,active=false,restoring=false,restoreSequence=0
  const mark=entry=>({...win.history.state,wgscNavigation:{session,id:entry.id}})
  const copy=value=>JSON.parse(JSON.stringify(value))
  function start(snapshot,key) {
    restoreSequence++;restoring=false;session=Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)
    entries=[{id:++serial,key,snapshot:copy(snapshot)}];index=0;active=true
    win.history.replaceState(mark(entries[0]),'',win.location.href)
  }
  function reset(){restoreSequence++;restoring=false;active=false;entries=[];index=-1;session=''}
  function commit(snapshot,key) {
    if(!active || restoring)return
    if(entries[index]?.key===key){entries[index].snapshot=copy(snapshot);return}
    // Breadcrumbs return to an existing ancestor instead of creating back/forward loops.
    for(let i=index-1;i>=0;i--)if(entries[i].key===key){win.history.go(i-index);return}
    entries=entries.slice(0,index+1)
    const entry={id:++serial,key,snapshot:copy(snapshot)}
    win.history.pushState(mark(entry),'',win.location.href)
    entries.push(entry);index++
  }
  function back(){if(!active || restoring || index<=0)return false;win.history.back();return true}
  async function pop(event) {
    if(!active)return
    const state=event.state?.wgscNavigation
    if(!state || state.session!==session)return
    const target=entries.findIndex(entry=>entry.id===state.id)
    if(target<0)return
    index=target;restoring=true
    const currentRestore=++restoreSequence
    try{await restore(copy(entries[index].snapshot))}finally{if(currentRestore===restoreSequence)restoring=false}
  }
  win.addEventListener('popstate',pop)
  return {start,reset,commit,back,get restoring(){return restoring},dispose(){reset();win.removeEventListener('popstate',pop)}}
}
