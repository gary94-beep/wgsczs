// Handle a one-finger right swipe delivered to the page, independently of host gestures.
export function installSwipeBack({target,canGoBack,back,routeKey,getStyle=el=>getComputedStyle(el),now=()=>Date.now()}) {
  let gesture=null
  const cancel=()=>{gesture=null}
  function eligible(element) {
    if(!element?.closest?.('.dashboard-page') || element.closest('input,textarea,select,button,a,[contenteditable]:not([contenteditable="false"]),[role="slider"],[data-no-swipe-back]'))return false
    for(let el=element;el && el!==target;el=el.parentElement){
      if(el.scrollWidth>el.clientWidth+3 && /auto|scroll/.test(getStyle(el).overflowX))return false
    }
    return true
  }
  function start(event) {
    cancel()
    if(event.touches.length!==1 || !canGoBack() || !eligible(event.target))return
    const point=event.touches[0]
    // Start within the left content area; ordinary swipes over the rest of a chart stay local.
    if(point.clientX<0 || point.clientX>110)return
    gesture={id:point.identifier,x:point.clientX,y:point.clientY,time:now(),key:routeKey(),locked:false,dx:0,dy:0}
  }
  function move(event) {
    if(!gesture)return
    if(event.touches.length!==1 || gesture.key!==routeKey() || !canGoBack()){cancel();return}
    const point=event.touches[0]
    if(point.identifier!==gesture.id){cancel();return}
    const dx=point.clientX-gesture.x,dy=point.clientY-gesture.y
    if(!gesture.locked){
      if(Math.abs(dy)>8 && Math.abs(dy)>=Math.abs(dx)){cancel();return}
      if(dx < -8){cancel();return}
      if(dx<10 || dx<Math.abs(dy)*1.7)return
      // If the host has already taken the gesture, do not also perform a JS back.
      if(!event.cancelable){cancel();return}
      gesture.locked=true
    }
    if(event.cancelable)event.preventDefault()
    else {cancel();return}
    gesture.dx=dx;gesture.dy=dy
  }
  function end(event) {
    const current=gesture;cancel()
    if(!current?.locked || event.touches.length || current.key!==routeKey() || !canGoBack())return
    const point=Array.from(event.changedTouches).find(point=>point.identifier===current.id)
    if(!point)return
    const dx=point.clientX-current.x,dy=Math.abs(point.clientY-current.y)
    if(dx<65 || dx<dy*1.7 || now()-current.time>1000)return
    if(event.cancelable)event.preventDefault()
    back()
  }
  target.addEventListener('touchstart',start,{passive:true})
  target.addEventListener('touchmove',move,{passive:false})
  target.addEventListener('touchend',end,{passive:false})
  target.addEventListener('touchcancel',cancel,{passive:true})
  return ()=>{cancel();target.removeEventListener('touchstart',start);target.removeEventListener('touchmove',move);target.removeEventListener('touchend',end);target.removeEventListener('touchcancel',cancel)}
}
