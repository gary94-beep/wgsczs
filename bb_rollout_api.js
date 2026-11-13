// bb_rollout_api.js | F1adc42dd820394e | login required, citywide scope for this module only
// Shared with the standalone Handle2 gateway. Keep the factory ES5-compatible.
function createHourlyBroadbandEngine() {
  var groups = [
    ['城区分公司', ['东区','港口','南区','石岐区','五桂山','西区']],
    ['高新分公司', ['火炬开发区','翠亨新区','民众','南朗']],
    ['东部分公司', ['阜沙','黄圃','南头','三角']],
    ['南部分公司', ['板芙','大涌','三乡','沙溪','神湾','坦洲']],
    ['北部分公司', ['东凤','东升','古镇','横栏','小榄']]
  ];
  var classes = { A:['小榄','火炬开发区','古镇','坦洲','东区'], B:['东升','石岐区','三乡','沙溪','横栏','东凤','西区','黄圃'], C:['港口','南头','三角','大涌','南朗','民众','板芙','南区','阜沙','五桂山','神湾','翠亨新区'] };
  function text(v) { return String(v === undefined || v === null ? '' : v).replace(/^\s+|\s+$/g,''); }
  function number(v) { var s=text(v); return s && /^(?:\d+(?:\.\d*)?|\.\d+)$/.test(s) && isFinite(Number(s)) ? Number(s) : null; }
  function classify(grid) { for(var c in classes) if(classes[c].indexOf(grid)>=0)return c;return ''; }
  function clock(v) {
    var s=text(v), m=/^(\d{4})(\d{2})(\d{2})(\d{2})(?:\d{2}){0,2}$/.exec(s);
    if(!m)m=/^(\d{4})[-/](\d{2})[-/](\d{2})[ T](\d{2})(?::\d{2}){0,2}$/.exec(s);
    if(!m)throw new Error('小时统计日期应为YYYYMMDDHH，例如2026111216');
    var d=new Date(Date.UTC(+m[1],+m[2]-1,+m[3],+m[4]));
    if(d.getUTCFullYear()!==+m[1] || d.getUTCMonth()+1!==+m[2] || d.getUTCDate()!==+m[3] || +m[4]>23)throw new Error('小时统计日期无效');
    return {key:m[1]+m[2]+m[3]+m[4],date:m[1]+'-'+m[2]+'-'+m[3],hour:+m[4],label:m[1]+'-'+m[2]+'-'+m[3]+' '+m[4]+':00'};
  }
  function metric(branch,grid,raw) {
    var capacity=raw?number(raw.capacity):null,target=raw?number(raw.day_target):null;
    return {branch:branch,grid:grid,category:classify(grid),capacity:capacity,target:target,
      rate:capacity!==null && target>0?capacity/target*100:null,gap:capacity!==null && target>0?Math.max(0,target-capacity):null,
      source:raw?'table':'missing',focused:false,rank:null};
  }
  function aggregate(rows,branch,grid,explicit) {
    if(explicit)return metric(branch,grid,explicit);
    var r=metric(branch,grid,null),complete=rows.length>0,capacity=0,target=0;
    for(var i=0;i<rows.length;i++) {if(rows[i].capacity===null || !(rows[i].target>0))complete=false;else {capacity+=rows[i].capacity;target+=rows[i].target;}}
    if(complete){r=metric(branch,grid,{capacity:capacity,day_target:target});r.source='grids';}
    return r;
  }
  function compare(a,b) { return a.rate-b.rate || (a.grid<b.grid?-1:a.grid>b.grid?1:0); }
  function build(rawRows,asOf,user,params) {
    var stamp=clock(asOf),source={},i,j,key,raw;
    // Token validation belongs to this module's gateway. All signed-in users share citywide access.
    // Do not mutate the application's login permission or any other module's scope.
    params=params||{};
    var roster=[];
    for(i=0;i<groups.length;i++)for(j=0;j<groups[i][1].length;j++)roster.push({branch:groups[i][0],grid:groups[i][1][j]});
    var branch=text(params.branch),grid=text(params.grid);
    if(branch && !roster.some(function(r){return r.branch===branch;}))throw new Error('所选分公司不在正式名单中');
    if(grid && !roster.some(function(r){return r.grid===grid && (!branch || r.branch===branch);}))throw new Error('所选网格与分公司不匹配');
    if(grid && !branch)branch=roster.filter(function(r){return r.grid===grid;})[0].branch;
    // Query is ordered newest snapshot/id first. Never add parent and child rows.
    for(i=0;i<rawRows.length;i++) {
      raw=rawRows[i];if(text(raw.prod_period_type)!=='hour' || text(raw.product_name)!=='手宽新增')continue;
      try{if(clock(raw.stat_date).key!==stamp.key)continue;}catch(e){continue;}
      key=text(raw.branch_company)+'|'+text(raw.grid_name);if(!Object.prototype.hasOwnProperty.call(source,key))source[key]=raw;
    }
    var all=roster.map(function(r){return metric(r.branch,r.grid,source[r.branch+'|'+r.grid]);});
    var focus=[],limits={A:2,B:3,C:4};
    ['A','B','C'].forEach(function(c){
      var eligible=all.filter(function(r){return r.category===c && r.rate!==null;}).sort(compare);
      var descending=eligible.slice().sort(function(a,b){return b.rate-a.rate || (a.grid<b.grid?-1:1);});
      descending.forEach(function(r,n){r.rank=n+1;});
      eligible.slice(0,limits[c]).forEach(function(r){r.focused=true;focus.push(r);});
    });
    var authorized=all,visible=authorized.filter(function(r){return (!branch || r.branch===branch) && (!grid || r.grid===grid);});
    var summary=grid?visible[0]:aggregate(visible,branch||'全市',branch||'全市',source[(branch||'全市')+'|'+(branch||'全市')]);
    var branches=groups.filter(function(g){return authorized.some(function(r){return r.branch===g[0];});}).map(function(g){var rows=authorized.filter(function(r){return r.branch===g[0];});return aggregate(rows,g[0],g[0],source[g[0]+'|'+g[0]]);});
    var classStats=['A','B','C'].map(function(c){var rows=visible.filter(function(r){return r.category===c;});var r=aggregate(rows,'',c,null);r.category=c;r.count=rows.length;r.evaluated=rows.filter(function(v){return v.rate!==null;}).length;return r;});
    var options={branches:groups.filter(function(g){return roster.some(function(r){return r.branch===g[0];});}).map(function(g){return g[0];}),grids:roster};
    // Citywide shortlist; organization filters restrict only the selected view.
    var result={asOf:stamp,scope:{branch:branch,grid:grid,role:'city'},options:options,summary:summary,
      branches:branch||grid?[]:branches,grids:visible,classes:classStats,
      focus:focus.filter(function(r){return (!branch || r.branch===branch) && (!grid || r.grid===grid);}),
      reached:visible.filter(function(r){return r.rate!==null && r.rate>=100;}).length,total:visible.length,
      missingData:visible.filter(function(r){return r.capacity===null;}).length,missingTarget:visible.filter(function(r){return !(r.target>0);}).length};
    if(grid){var selected=visible[0],peers=all.filter(function(r){return r.category===selected.category;});result.peer={category:selected.category,count:peers.length,rank:selected.rank,summary:aggregate(peers,'',selected.category,null)};}
    return result;
  }
  return {build:build,clock:clock,classify:classify,groups:groups,classes:classes};
}

function init() {
  function result(code,message,data){JsResult.result=JSON.stringify({result:{retCode:code,retMsg:message,data:data===undefined?null:data}});}
  if(typeof Params==='undefined'||!Params||!Params.funCode){result('0','宽带攻坚调度网关已加载',{ready:true});return;}
  function text(value) { return String(value === null || value === undefined ? '' : value).replace(/^\s+|\s+$/g, ''); }
  function parse(value) { for (var i = 0; i < 3 && typeof value === 'string'; i++) { try { value = JSON.parse(value); } catch (error) { break; } } return value; }
  function find(value, keys) {
    var queue = [parse(value)];
    for (var i = 0; i < queue.length && i < 1000; i++) {
      var item = parse(queue[i]);
      if (!item || typeof item !== 'object') continue;
      for (var j = 0; j < keys.length; j++) if (item[keys[j]] !== undefined && item[keys[j]] !== null && item[keys[j]] !== '') return item[keys[j]];
      for (var key in item) if (Object.prototype.hasOwnProperty.call(item, key)) queue.push(item[key]);
    }
    return '';
  }
  function sql(query, args, reading) {
    var response = parse(CustomizeUtil.abilitySql(query, args || {}));
    if (!response || typeof response !== 'object') throw new Error('SQL返回结构异常');
    if (response.retCode !== undefined && String(response.retCode) !== '0') throw new Error(response.retMsg || 'SQL执行失败');
    if (response.code !== undefined && ['0', '200'].indexOf(String(response.code)) < 0) throw new Error(response.message || 'SQL执行失败');
    if (!reading) return response;
    var data = parse(response.data);
    if (!data || Object.prototype.toString.call(data.results) !== '[object Array]') throw new Error('SQL查询缺少data.results');
    return data.results;
  }
  function normalizeMobile(value) { var match = text(value).replace(/\s/g, '').match(/1\d{10}/); return match ? match[0] : ''; }
  function authenticate() {
    var token = text(Params.token);
    if (!token) throw new Error('00008: token不能为空');
    var redis = parse(CustomizeUtil.redisGet({ key: token }));
    var value = parse(redis && redis.data !== undefined ? redis.data : redis); value = parse(value && value.value !== undefined ? value.value : value);
    if (!value) throw new Error('00008: token已过期');
    var phone = normalizeMobile(find(value, ['userphone', 'phone', 'mobile', 'userPhone', 'mobileno']));
    if (!/^1\d{10}$/.test(phone)) phone = normalizeMobile(find(CustomizeUtil.getMobile(token), ['userphone', 'phone', 'mobile', 'userPhone', 'mobileno']));
    if (!/^1\d{10}$/.test(phone)) throw new Error('00008: token未解析到手机号');
    return { signedIn: true };
  }

  try {
    if(text(Params.funCode)!=='wgsc_bbRollout')throw new Error('非法调用');
    var user=authenticate(),engine=createHourlyBroadbandEngine();
    var table='app_open_api_c001_wgsc_bb_progress_d_1';
    var latest=sql('SELECT MAX(stat_date) AS stat_date FROM '+table+' WHERE prod_period_type=#{period} AND product_name=#{product}',{period:'hour',product:'手宽新增'},true);
    if(!latest.length || !text(latest[0].stat_date))throw new Error('宽带小时级产能表尚无hour类型的手宽新增数据');
    var stamp=text(latest[0].stat_date);engine.clock(stamp);
    var rows=sql('SELECT id,branch_company,grid_name,prod_period_type,product_name,day_target,capacity,stat_date,snapshot_time FROM '+table+' WHERE stat_date=#{stamp} AND prod_period_type=#{period} AND product_name=#{product} ORDER BY snapshot_time DESC,id DESC LIMIT 1001',{stamp:stamp,period:'hour',product:'手宽新增'},true);
    if(rows.length>1000)throw new Error('同小时记录重复过多，请清理该批次重复记录');
    result('0','成功',engine.build(rows,stamp,user,{branch:text(Params.branch),grid:text(Params.grid)}));
  } catch(error) { var message=error.message||'宽带攻坚调度执行失败';result(message.indexOf('00008:')===0?'00008':'1',message); }
}
init();
