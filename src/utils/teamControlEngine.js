// Shared ES5 monthly rules, also embedded in the independent Handle2 search gateway.
export function createTeamControlEngine() {
  var teams=[{id:'own',name:'网格经理',unit:'人',icon:'users'},{id:'people',name:'行随销',unit:'人',icon:'user'},{id:'halls',name:'营业厅',unit:'个',icon:'store'},{id:'stars',name:'3星+渠道',unit:'个',icon:'star'},{id:'tail',name:'末梢渠道',unit:'个',icon:'store'}];
  var roles=['店长','渠道经理','商企经理','社区经理'];
  function number(value){if(value===null||value===undefined||String(value).trim()==='')return null;var n=Number(value);return isFinite(n)&&n>=0?n:null;}
  function criteria(p){var out={},defaults={threshold:1,declineRate:10,declineValue:1};for(var k in defaults){out[k]=p[k]===undefined?defaults[k]:number(p[k]);if(out[k]===null)throw new Error('盯控标准必须为非负有限数值');}if(out.declineRate>100)throw new Error('日均下降率不能超过100%');return out;}
  function metric(record,p,date){
    var value=null,values=record.values||[];for(var i=0;i<values.length;i++)if(values[i].productId===p.productId)value=values[i];
    var known=/^\d{4}-\d{2}-\d{2}$/.test(date||''),d=known?new Date(date+'T00:00:00Z'):null,days=d?d.getUTCDate():0,previousDays=d?Math.min(days,new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),0)).getUTCDate()):0;
    var month=known?number(value?value.month:0):null,previous=known?number(value?value.previous:0):null;
    var average=month===null||!days?null:month/days,previousAverage=previous===null||!previousDays?null:previous/previousDays;
    var difference=average===null||previousAverage===null?null:average-previousAverage;
    var rate=difference===null||previousAverage===0?null:difference/previousAverage*100;
    return {month:month,previous:previous,monthAverage:average,previousAverage:previousAverage,changeValue:difference,changeRate:rate,
      low:month!==null&&month<=p.threshold,change:difference!==null&&difference<0&&rate!==null&&-rate+1e-9>=p.declineRate&&-difference+1e-9>=p.declineValue,
      unit:value&&value.unit||'户',productId:p.productId,productName:value&&value.productName||p.productId};
  }
  function role(record){return record.isOwn&&record.role==='商企经理1'?'商企经理':record.role;}
  function category(record){if(record.isOwn)return 'own';if(record.role==='营业厅')return 'halls';if(record.role==='三星+渠道'||record.role==='3星+渠道')return 'stars';if(record.role==='末梢渠道')return 'tail';return 'people';}
  function enrich(record,p,date){var out={};for(var k in record)out[k]=record[k];out.rawRole=record.role;out.role=role(record);out.team=category(record);out.metric=metric(record,p,date);return out;}
  function stats(list,known){var low=0,change=0;for(var i=0;i<list.length;i++){if(list[i].metric.low)low++;if(list[i].metric.change)change++;}
    return {total:list.length,low:known?low:null,change:known?change:null,lowRate:known&&list.length?low/list.length*100:null,changeRate:known&&list.length?change/list.length*100:null};}
  function copyTeam(t,s){return {id:t.id,name:t.name,unit:t.unit,icon:t.icon,total:s.total,low:s.low,change:s.change,lowRate:s.lowRate,changeRate:s.changeRate};}
  function build(records,params,options){
    var p=criteria(params);p.productId=params.productId||'newNumbers';var date=options.statDate||'',known=Boolean(date),all=[],i,j;
    for(i=0;i<records.length;i++)if((!params.branchId||records[i].branchId===params.branchId)&&(!params.gridId||records[i].gridId===params.gridId))all.push(enrich(records[i],p,date));
    var teamStats=teams.map(function(t){return copyTeam(t,stats(all.filter(function(r){return r.team===t.id;}),known));});
    var matrix=[];
    if(!params.gridId){var regions=params.branchId?(options.organization.grids||[]).filter(function(g){return g.branchId===params.branchId;}):(options.organization.branches||[]);
      for(i=0;i<regions.length;i++){
        var region=regions[i],grid=Boolean(params.branchId),id=grid?region.gridId:region.branchId;
        var row={id:id,name:grid?region.gridName:region.branchName,branchId:region.branchId,cells:[]};
        var subset=all.filter(function(r){return (grid?r.gridId:r.branchId)===id;});
        for(j=1;j<teams.length;j++){var idTeam=teams[j].id,s=stats(subset.filter(function(r){return r.team===idTeam;}),known);row.cells.push({team:idTeam,lowRate:s.lowRate,changeRate:s.changeRate,total:s.total,low:s.low,change:s.change});}
        matrix.push(row);
      }
    }
    var selectedTeam=params.team||'',list=all.filter(function(r){return !selectedTeam||r.team===selectedTeam;}),roleStats=[];
    for(i=0;i<roles.length;i++)roleStats.push({role:roles[i],stats:stats(list.filter(function(r){return r.isOwn&&r.role===roles[i];}),known)});
    var manager=null;
    if(params.managerCode){
      for(i=0;i<all.length;i++)if(all[i].isOwn&&all[i].code===params.managerCode)manager=all[i];
      if(!manager)throw new Error('无权查看该网格经理或对象不存在');
      list=(manager.children||[]).filter(function(c){return !params.relation||c.relation===params.relation;}).map(function(c){var r=enrich(c,p,date);r.managers=[{code:manager.code,name:manager.name,role:manager.role}];return r;});
    }else if(params.role)list=list.filter(function(r){return r.role===params.role;});
    var filter=params.filter||'all';if(['all','low','change'].indexOf(filter)<0)throw new Error('盯控分类无效');
    list=list.filter(function(r){return filter==='all'||r.metric[filter];});
    var query=String(params.query||'').trim().toLowerCase();if(query)list=list.filter(function(r){return (String(r.name)+' '+String(r.code)).toLowerCase().indexOf(query)>=0;});
    list.sort(function(a,b){if(filter==='change')return a.metric.changeValue-b.metric.changeValue||String(a.name).localeCompare(String(b.name));return (a.metric.month===null?Infinity:a.metric.month)-(b.metric.month===null?Infinity:b.metric.month)||String(a.name).localeCompare(String(b.name));});
    var page=Number(params.page||1),size=Number(params.pageSize||30);if(!isFinite(page)||page<1||Math.floor(page)!==page||!isFinite(size)||size<1||size>100||Math.floor(size)!==size)throw new Error('分页参数无效');
    var items=(options.exportAll?list:list.slice((page-1)*size,page*size)).map(function(r){var out={};for(var k in r)if(k!=='children')out[k]=r[k];return out;});
    var selected=teamStats.filter(function(t){return t.id===selectedTeam;})[0];
    var managerResult=null;if(manager){managerResult={};for(var k in manager)if(k!=='children')managerResult[k]=manager[k];}
    return {statDate:date,monthlyOnly:true,criteria:p,organization:options.organization,overview:stats(all.filter(function(r){return r.team!=='own';}),known),teams:teamStats,
      summary:selected||stats(all,known),roles:roleStats,regions:matrix,manager:managerResult,items:options.exportAll||params.team||params.managerCode?items:[],
      pagination:{page:page,pageSize:size,total:list.length,hasMore:page*size<list.length}};
  }
  return {teams:teams,roles:roles,build:build,criteria:criteria,metric:metric};
}

export const teamControlEngine=createTeamControlEngine()
