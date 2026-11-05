// History state holds only opaque entry IDs. UI snapshots stay in this tab's memory.
export function createBrowserNavigation({window:win=window,restore,onExitHint,now=()=>Date.now()}) {
  let session='',entries=[],index=-1,serial=0,active=false,restoring=false,restoreSequence=0,pendingUntil=0
  const guarded=typeof onExitHint==='function',scope=win.location.href.split(/[?#]/)[0]
  let guardId='',rootDepth=1,exitUntil=0
  const mark=(entry,depth=rootDepth+index)=>({...win.history.state,wgscNavigation:{session,id:entry.id,...(guarded?{guardId,scope,depth}:{})}})
  const ownGuard=state=>guarded && state?.guardId===guardId && state.scope===scope && Number.isInteger(state.depth) && state.depth>=0
  const copy=value=>JSON.parse(JSON.stringify(value))
  function start(snapshot,key) {
    restoreSequence++;restoring=false;pendingUntil=0;exitUntil=0;session=now().toString(36)+'-'+Math.random().toString(36).slice(2)
    entries=[{id:++serial,key,snapshot:copy(snapshot)}];index=0;active=true
    const previous=win.history.state?.wgscNavigation
    if(guarded){
      // Reuse the guard after refresh, including a refresh performed inside a module.
      const reusable=previous?.scope===scope && typeof previous.guardId==='string' && previous.guardId && Number.isInteger(previous.depth) && previous.depth>0 && previous.depth<10000
      guardId=reusable?previous.guardId:session;rootDepth=reusable?previous.depth:1
      if(!reusable){win.history.replaceState(mark({id:'exit-guard'},0),'',win.location.href);win.history.pushState(mark(entries[0]),'',win.location.href)}
      else win.history.replaceState(mark(entries[0]),'',win.location.href)
    }else win.history.replaceState(mark(entries[0]),'',win.location.href)
  }
  function reset(){restoreSequence++;restoring=false;active=false;entries=[];index=-1;session='';pendingUntil=0;exitUntil=0}
  function commit(snapshot,key) {
    if(!active || restoring || now()<pendingUntil)return
    if(entries[index]?.key===key){entries[index].snapshot=copy(snapshot);return}
    exitUntil=0
    // Breadcrumbs return to an existing ancestor instead of creating back/forward loops.
    for(let i=index-1;i>=0;i--)if(entries[i].key===key){pendingUntil=now()+1000;win.history.go(i-index);return}
    entries=entries.slice(0,index+1)
    const entry={id:++serial,key,snapshot:copy(snapshot)}
    win.history.pushState(mark(entry,rootDepth+index+1),'',win.location.href)
    entries.push(entry);index++
  }
  function canGoBack(){return active && !restoring && (index>0 || guarded) && now()>=pendingUntil}
  function back(){
    if(!canGoBack())return false
    if(index===0 && guarded){
      if(now()<exitUntil){exitUntil=0;pendingUntil=now()+1000;win.history.go(-(rootDepth+1))}
      else {exitUntil=now()+2000;onExitHint()}
      return true
    }
    pendingUntil=now()+1000;win.history.back();return true
  }
  async function pop(event) {
    pendingUntil=0
    if(!active)return
    const state=event.state?.wgscNavigation
    if(index===0 && ownGuard(state) && state.depth<rootDepth){
      if(now()<exitUntil){exitUntil=0;pendingUntil=now()+1000;win.history.go(-(state.depth+1));return}
      // The first native back lands on our guard. Re-arm exactly one root entry.
      const root={...entries[0],id:++serial};entries=[root];index=0;rootDepth=state.depth+1
      win.history.pushState(mark(root),'',win.location.href);exitUntil=now()+2000;onExitHint();return
    }
    if(!state || state.session!==session)return
    const target=entries.findIndex(entry=>entry.id===state.id)
    if(target<0)return
    exitUntil=0;index=target;restoring=true
    const currentRestore=++restoreSequence
    try{await restore(copy(entries[index].snapshot))}finally{if(currentRestore===restoreSequence)restoring=false}
  }
  win.addEventListener('popstate',pop)
  return {start,reset,commit,back,canGoBack,get entryKey(){return session+':'+entries[index]?.id},get restoring(){return restoring},dispose(){reset();win.removeEventListener('popstate',pop)}}
}
