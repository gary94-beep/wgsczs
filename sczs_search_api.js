function createTeamControlEngine(){var D=[{id:"own",name:"网格经理",unit:"人",icon:"users"},{id:"people",name:"行随销",unit:"人",icon:"user"},{id:"halls",name:"营业厅",unit:"个",icon:"store"},{id:"stars",name:"3星+渠道",unit:"个",icon:"star"},{id:"tail",name:"末梢渠道",unit:"个",icon:"store"}];var N=["店长","渠道经理","商企经理","社区经理"];function z(n){if(n===null||n===void 0||String(n).trim()==="")return null;var e=Number(n);return isFinite(e)&&e>=0?e:null}function A(n){var e={},i={threshold:1,declineRate:10,declineValue:1};for(var r in i){e[r]=n[r]===void 0?i[r]:z(n[r]);if(e[r]===null)throw new Error("盯控标准必须为非负有限数值")}if(e.declineRate>100)throw new Error("日均下降率不能超过100%");return e}function M(n,e,i){var r=null,a=n.values||[];for(var f=0;f<a.length;f++)if(a[f].productId===e.productId)r=a[f];var o=/^\d{4}-\d{2}-\d{2}$/.test(i||""),l=o?new Date(i+"T00:00:00Z"):null,w=l?l.getUTCDate():0,S=l?Math.min(w,new Date(Date.UTC(l.getUTCFullYear(),l.getUTCMonth(),0)).getUTCDate()):0;var s=o?z(r?r.month:0):null,b=o?z(r?r.previous:0):null;var h=s===null||!w?null:s/w,g=b===null||!S?null:b/S;var d=h===null||g===null?null:h-g;var R=d===null||g===0?null:d/g*100;return{month:s,previous:b,monthAverage:h,previousAverage:g,changeValue:d,changeRate:R,low:s!==null&&s<=e.threshold,change:d!==null&&d<0&&R!==null&&-R+1e-9>=e.declineRate&&-d+1e-9>=e.declineValue,unit:r&&r.unit||"户",productId:e.productId,productName:r&&r.productName||e.productId}}function B(n){return n.isOwn&&n.role==="商企经理1"?"商企经理":n.role}function L(n){if(n.isOwn)return"own";if(n.role==="营业厅")return"halls";if(n.role==="三星+渠道"||n.role==="3星+渠道")return"stars";if(n.role==="末梢渠道")return"tail";return"people"}function U(n,e,i){var r={};for(var a in n)r[a]=n[a];r.rawRole=n.role;r.role=B(n);r.team=L(n);r.metric=M(n,e,i);return r}function C(n,e){var i=0,r=0;for(var a=0;a<n.length;a++){if(n[a].metric.low)i++;if(n[a].metric.change)r++}return{total:n.length,low:e?i:null,change:e?r:null,lowRate:e&&n.length?i/n.length*100:null,changeRate:e&&n.length?r/n.length*100:null}}function j(n,e){return{id:n.id,name:n.name,unit:n.unit,icon:n.icon,total:e.total,low:e.low,change:e.change,lowRate:e.lowRate,changeRate:e.changeRate}}function Y(n,e,i){var r=A(e);r.productId=e.productId||"newNumbers";var a=i.statDate||"",f=Boolean(a),o=[],l,w;for(l=0;l<n.length;l++)if((!e.branchId||n[l].branchId===e.branchId)&&(!e.gridId||n[l].gridId===e.gridId))o.push(U(n[l],r,a));var S=D.map(function(t){return j(t,C(o.filter(function(c){return c.team===t.id}),f))});var s=[];if(!e.gridId){var b=e.branchId?(i.organization.grids||[]).filter(function(t){return t.branchId===e.branchId}):i.organization.branches||[];for(l=0;l<b.length;l++){var h=b[l],g=Boolean(e.branchId),d=g?h.gridId:h.branchId;var R={id:d,name:g?h.gridName:h.branchName,branchId:h.branchId,cells:[]};var Z=o.filter(function(t){return(g?t.gridId:t.branchId)===d});for(w=1;w<D.length;w++){var V=D[w].id,y=C(Z.filter(function(t){return t.team===V}),f);R.cells.push({team:V,lowRate:y.lowRate,changeRate:y.changeRate,total:y.total,low:y.low,change:y.change})}s.push(R)}}var O=e.team||"",u=o.filter(function(t){return!O||t.team===O}),F=[];for(l=0;l<N.length;l++)F.push({role:N[l],stats:C(u.filter(function(t){return t.isOwn&&t.role===N[l]}),f)});var m=null;if(e.managerCode){for(l=0;l<o.length;l++)if(o[l].isOwn&&o[l].code===e.managerCode)m=o[l];if(!m)throw new Error("无权查看该网格经理或对象不存在");u=(m.children||[]).filter(function(t){return!e.relation||t.relation===e.relation}).map(function(t){var c=U(t,r,a);c.managers=[{code:m.code,name:m.name,role:m.role}];return c})}else if(e.role)u=u.filter(function(t){return t.role===e.role});var T=e.filter||"all";if(["all","low","change"].indexOf(T)<0)throw new Error("盯控分类无效");u=u.filter(function(t){return T==="all"||t.metric[T]});var q=String(e.query||"").trim().toLowerCase();if(q)u=u.filter(function(t){return(String(t.name)+" "+String(t.code)).toLowerCase().indexOf(q)>=0});u.sort(function(t,c){if(T==="change")return t.metric.changeValue-c.metric.changeValue||String(t.name).localeCompare(String(c.name));return(t.metric.month===null?Infinity:t.metric.month)-(c.metric.month===null?Infinity:c.metric.month)||String(t.name).localeCompare(String(c.name))});var I=Number(e.page||1),v=Number(e.pageSize||30);if(!isFinite(I)||I<1||Math.floor(I)!==I||!isFinite(v)||v<1||v>100||Math.floor(v)!==v)throw new Error("分页参数无效");var $=(i.exportAll?u:u.slice((I-1)*v,I*v)).map(function(t){var c={};for(var x in t)if(x!=="children")c[x]=t[x];return c});var G=S.filter(function(t){return t.id===O})[0];var E=null;if(m){E={};for(var p in m)if(p!=="children")E[p]=m[p]}return{statDate:a,monthlyOnly:true,criteria:r,organization:i.organization,overview:C(o.filter(function(t){return t.team!=="own"}),f),teams:S,summary:G||C(o,f),roles:F,regions:s,manager:E,items:i.exportAll||e.team||e.managerCode?$:[],pagination:{page:I,pageSize:v,total:u.length,hasMore:I*v<u.length}}}return{teams:D,roles:N,build:Y,criteria:A,metric:M}}
function init(){
  if(typeof Params==="undefined" || !Params || !Params.funCode){JsResult.result=JSON.stringify({result:{retCode:"0",retMsg:"速查网关就绪",data:{ready:true}}});return;}
  var tables = {
    regionDay: "app_open_api_c002_wgsc_reg_capacity_d_1",
    channelDay: "app_open_api_c002_wgsc_chn_capacity_d_1",
    staffDay: "app_open_api_c002_wgsc_stf_capacity_d_1",
    region: "app_open_api_c003_wgsc_region_capacity_1",
    channel: "app_open_api_c001_wgsc_chn_capacity_1",
    staffCapacity: "app_open_api_c003_wgsc_staff_capacity_1",
    channelInfo: "app_open_api_c003_wgsc_chn_level_1",
    terminal: "app_open_api_c002_wgsc_staff_terminal_1",
    staff: "app_open_api_c003_wgsc_staff_1",
    permission: "app_open_api_c003_wgsc_permission_1",
    staffTargets: "app_open_api_c001_wgsc_staff_target_m_1",
    ownStaff: "app_open_api_c001_wgsc_staff_own_team_1",
    selfTeam: "app_open_api_c001_wgsc_self_team_1",
    chnManager: "app_open_api_c001_wgsc_chn_manager_1"
  };
  var products = [
    { productId: "newNumbers", productName: "放号", unit: "户" },
    { productId: "plan119", productName: "高套（129+）", unit: "户" },
    { productId: "terminal", productName: "终端合约", unit: "单" },
    { productId: "homeBroadband", productName: "手宽新增", unit: "户" },
    { productId: "gigabit", productName: "千兆运营", unit: "户" }
  ];
  var user;
function text(v) {
    return String(v === null || v === undefined ? "" : v).replace(/^\s+|\s+$/g, "");
  }
  function parse(v) {
    for (var i = 0; i < 3 && typeof v === "string"; i++) {
      try { v = JSON.parse(v); } catch (e) { break; }
    }
    return v;
  }
  function find(v, keys) {
    var q = [parse(v)];
    for (var i = 0; i < q.length && i < 1000; i++) {
      var o = parse(q[i]);
      if (!o || typeof o !== "object") continue;
      for (var j = 0; j < keys.length; j++) {
        if (o[keys[j]] !== undefined && o[keys[j]] !== null && o[keys[j]] !== "") return o[keys[j]];
      }
      for (var k in o) {
        if (Object.prototype.hasOwnProperty.call(o, k)) q.push(o[k]);
      }
    }
    return "";
  }
  function sql(query, args, reading) {
    var res = parse(CustomizeUtil.abilitySql(query, args || {}));
    if (!res || typeof res !== "object") throw new Error("SQL返回结构异常");
    if (res.retCode !== undefined && String(res.retCode) !== "0") throw new Error(res.retMsg || "SQL执行失败");
    if (res.code !== undefined && ["0", "200"].indexOf(String(res.code)) < 0) throw new Error(res.message || "SQL执行失败");
    if (!reading) return res;
    var data = parse(res.data);
    if (!data || Object.prototype.toString.call(data.results) !== "[object Array]") throw new Error("SQL查询缺少data.results");
    return data.results;
  }
  function num(v) {
    if (v === null || v === undefined || text(v) === "" || !isFinite(Number(v)) || Number(v) < 0) throw new Error("数值必须非负且有限");
    return Number(v);
  }
  function pad(n) {
    return n < 10 ? "0" + n : "" + n;
  }
  function formatDate(d) {
    return d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate());
  }
  function date(v) {
    var s;
    if (Object.prototype.toString.call(v) === "[object Date]") {
      s = v.getFullYear() + "-" + pad(v.getMonth() + 1) + "-" + pad(v.getDate());
    } else if (typeof v === "number" && isFinite(v)) {
      var d1 = new Date(v + 8 * 3600000);
      s = d1.getUTCFullYear() + "-" + pad(d1.getUTCMonth() + 1) + "-" + pad(d1.getUTCDate());
    } else {
      s = text(v);
      s = s.replace(/[T\s].*$/, "").slice(0, 10);
      s = s.replace(/^(\d{4})(\d{2})(\d{2})$/, "$1-$2-$3");
      s = s.replace(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/, function (_, y, m, d) {
        return y + "-" + ("0" + m).slice(-2) + "-" + ("0" + d).slice(-2);
      });
      var m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
      if (m) s = m[1] + "-" + ("0" + m[2]).slice(-2) + "-" + ("0" + m[3]).slice(-2);
    }
    var d2 = new Date(s + "T00:00:00Z");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || isNaN(d2.getTime()) || formatDate(d2) !== s) throw new Error("无效日期：" + v + "（类型：" + typeof v + "）");
    return s;
  }
  function product(v) {
    v = text(v);
    if (v === "129+高套" || v === "119+套餐") v = "plan119";
    if (v === "手宽归档") v = "homeBroadband";
    for (var i = 0; i < products.length; i++) {
      if (products[i].productName === v || products[i].productId === v) return products[i];
    }
    throw new Error("未知产品：" + v + "；高套统一使用129+口径");
  }
  function gridId(b, g) {
    return b + "::" + g;
  }
  function normalizeMobile(value) {
    var s = String(value || '').replace(/^\s+|\s+$/g, '').replace(/^['"]+|['"]+$/g, '').replace(/\s/g, '');
    var m = s.match(/1\d{10}/);
    return m ? m[0] : s;
  }
  function permission(phone) {
    var a = sql("SELECT name,phone,role,branch,grid,super_admin FROM " + tables.permission + " WHERE phone=#{phone} AND enabled=1 ORDER BY id DESC LIMIT 1", { phone: phone }, true);
    if (!a || a.length === 0) throw new Error("该手机号无有效权限");
    var p = a[0];
    p.role = { 1: "city", 2: "branch", 3: "grid" }[String(p.role)];
    if (["city", "branch", "grid"].indexOf(p.role) < 0 || (p.role !== "city" && !p.branch) || (p.role === "grid" && !p.grid)) throw new Error("权限记录缺少组织范围");
    return {
      name: p.name, phone: p.phone, role: p.role, cityName: "中山市",
      branchName: p.branch || "", branchId: p.role === "city" ? "" : p.branch,
      gridName: p.grid || "", gridId: p.role === "grid" ? gridId(p.branch, p.grid) : "",
      isSuperAdmin: Number(p.super_admin) === 1
    };
  }
  function authenticate() {
    var token = text(Params.token);
    if (!token) throw new Error("00008: token不能为空");
    var redis = parse(CustomizeUtil.redisGet({ key: token }));
    var v = parse(redis && redis.data !== undefined ? redis.data : redis);
    v = parse(v && v.value !== undefined ? v.value : v);
    if (!v) throw new Error("00008: token已过期");
    var phone = normalizeMobile(find(v, ["userphone", "phone", "mobile", "userPhone", "mobileno"]));
    if (!/^1\d{10}$/.test(phone)) phone = normalizeMobile(find(CustomizeUtil.getMobile(token), ["userphone", "phone", "mobile", "userPhone", "mobileno"]));
    if (!/^1\d{10}$/.test(phone)) throw new Error("00008: token未解析到手机号");
    return permission(phone);
  }
  function scope(b, g, args) {
    var s = "";
    if (user.role !== "city") {
      args.authBranch = user.branchName;
      s += " AND " + b + "=#{authBranch}";
    }
    if (user.role === "grid") {
      args.authGrid = user.gridName;
      s += " AND " + g + "=#{authGrid}";
    }
    return s;
  }
  function latest(table) {
    var args = {};
    var a = sql("SELECT MAX(stat_date) AS stat_date FROM " + table + " WHERE 1=1" + scope("branch_company", "grid_name", args), args, true);
    if (!a[0] || !a[0].stat_date) return "";
    var raw = a[0].stat_date;
    try {
      return date(raw);
    } catch (e) {
      throw new Error("latest()失败：table=" + table + " raw=" + JSON.stringify(raw) + " type=" + typeof raw + " message=" + e.message);
    }
  }
  function dailyStamp(column) {
    return "CASE WHEN SUBSTRING("+column+",5,1) IN ('-','/') THEN CONCAT(REPLACE(REPLACE(SUBSTRING("+column+",1,10),'/',''),'-',''),CASE WHEN LENGTH("+column+")>=13 THEN SUBSTRING("+column+",12,2) ELSE '' END) ELSE SUBSTRING("+column+",1,10) END";
  }
  function latestDaily(table) {
    var args={}, rows=sql("SELECT MAX("+dailyStamp("stat_date")+") AS stat_date FROM "+table+" WHERE 1=1"+scope("branch_company","grid_name",args),args,true);
    var stamp=rows[0] && rows[0].stat_date ? text(rows[0].stat_date) : "";
    if(stamp && !/^\d{8}(\d{2})?$/.test(stamp))throw new Error("日表统计日期格式异常");
    if(stamp.length===10 && Number(stamp.slice(8))>23)throw new Error("日表统计小时无效");
    return {date:stamp?date(stamp.slice(0,8)):"",hour:stamp.length===10?stamp.slice(8):"",stamp:stamp};
  }
  function filtered(data, periodValue) {
    var ids = parse(Params.gridIds || "[]");
    var allowed = {};
    var out = [];
    if (Object.prototype.toString.call(ids) !== "[object Array]") throw new Error("gridIds须为数组");
    for (var i = 0; i < data.organization.grids.length; i++) allowed[data.organization.grids[i].gridId] = true;
    for (i = 0; i < ids.length; i++) if (!allowed[ids[i]]) throw new Error("无权访问该网格");
    var source = periodValue === "day" ? data.dailyRows : data.rows;
    for (i = 0; i < source.length; i++) {
      if ((!ids.length || ids.indexOf(source[i].gridId) >= 0) && (!Params.productId || source[i].productId === Params.productId)) out.push(source[i]);
    }
    return out;
  }
  function searchStaffTargets() {
    function goalValue(value) {
      var raw=text(value), n=raw===''?null:Number(raw);
      return n!==null && (!isFinite(n)||n<0)?null:n;
    }
    var rows = pagedSql("SELECT id,team_type,product_id,month_base_target,month_challenge_target FROM " + tables.staffTargets, {}, "id DESC");
    var goals = {};
    for (var i=0;i<rows.length;i++) {
      var r=rows[i];
      if (['行销经理','商企经理','装维随销'].indexOf(text(r.team_type))<0) continue;
      var p;
      try {p=product(r.product_id);} catch (e) {continue;}
      var key=JSON.stringify([text(r.team_type),p.productId]);
      if (Object.prototype.hasOwnProperty.call(goals,key)) continue;
      goals[key]={base:goalValue(r.month_base_target),challenge:goalValue(r.month_challenge_target)};
    }
    return goals;
  }
  // Readable manager search: gateway/own-search-readable.js
function ownSearch(s){var I=text(Params.query).toLowerCase();if(!I&&Params.funCode!=="wgsc_teamControl"||I.length>100)throw new Error("查询参数无效");var t={ownQuery:I},i={},g=[],A=[];var R=selectedGridClause(t,s,"d");var P="SELECT d.* FROM "+latestDimension(tables.ownStaff,"staff_no")+" d WHERE 1=1"+scope("d.branch","d.grid",t)+R+(I?" AND LOCATE(#{ownQuery},LOWER(CONCAT(COALESCE(d.staff_name,''),' ',COALESCE(d.staff_no,''))))>0":"");var T=pagedSql(P,t,"staff_no");var h=Params.productId?[product(Params.productId)]:products;function p(){return h.map(function(c){return{productId:c.productId,productName:c.productName,unit:c.unit,day:s.dailyStatDate?0:null,month:s.statDate?0:null,previous:s.statDate?0:null}})}function v(c,n,J,H,N,G,Q){n=text(n);if(!n)return;var W=JSON.stringify([N,n]);if(c.childMap[W])return;var U=N==="staff"&&n===c.code;var x={key:W,code:n,name:text(J)||n,role:text(H),entityType:N,relation:U?"本人":N==="staff"?"所管人员":"所管渠道",branchId:G,gridId:gridId(G,Q),values:p()};c.childMap[W]=x;c.children.push(x)}for(var a=0;a<T.length;a++){var r=T[a],b=text(r.staff_no);if(!b)continue;var d={key:"own:"+b,code:b,name:text(r.staff_name)||b,role:text(r.team),isOwn:true,branchId:r.branch,gridId:gridId(r.branch,r.grid),values:p(),children:[],childMap:{}};i[b]=d;A.push(b);g.push(d);v(d,b,d.name,d.role,"staff",r.branch,r.grid)}if(!A.length)return g;var C=A.map(function(c,n){t["ownManager"+n]=c;return"#{ownManager"+n+"}"}).join(",");var l=pagedSql("SELECT * FROM "+tables.selfTeam+" WHERE manager_no IN ("+C+")"+scope("branch_company","grid_name",t),t,"id");for(a=0;a<l.length;a++){r=l[a];v(i[text(r.manager_no)],r.staff_no,r.staff_name,r.team_type,"staff",r.branch_company,r.grid_name)}l=pagedSql("SELECT * FROM "+tables.chnManager+" WHERE manager_no IN ("+C+")",t,"id");var y={},f=[];for(a=0;a<l.length;a++)if(text(l[a].channel_code)&&!y[text(l[a].channel_code)]){y[text(l[a].channel_code)]={};f.push(text(l[a].channel_code))}if(f.length){var M=f.map(function(c,n){t["ownChannel"+n]=c;return"#{ownChannel"+n+"}"}).join(",");var L=pagedSql("SELECT chn_code,branch,grid FROM "+latestDimension(tables.channelInfo,"chn_code")+" d WHERE chn_code IN ("+M+")",t,"chn_code");for(a=0;a<L.length;a++)y[text(L[a].chn_code)]=L[a];var m=[];var j=s.dailyStatDate?[tables.channel,tables.channelDay]:[tables.channel];for(var O=0;O<j.length;O++)m=m.concat(pagedSql("SELECT DISTINCT channel_code AS chn_code,branch_company AS branch,grid_name AS grid FROM "+j[O]+" WHERE channel_code IN ("+M+")"+scope("branch_company","grid_name",t),t,"chn_code,branch,grid"));for(a=0;a<m.length;a++)if(!y[text(m[a].chn_code)].branch)y[text(m[a].chn_code)]=m[a];for(a=0;a<l.length;a++){r=l[a];d=i[text(r.manager_no)];var S=y[text(r.channel_code)]||{};if(user.role!=="city"&&S.branch&&(S.branch!==user.branchName||user.role==="grid"&&S.grid!==user.gridName))continue;v(d,r.channel_code,r.channel_name,r.channel_type,"channel",S.branch||d.branchId,S.grid||d.gridId.split("::").slice(1).join("::"))}}var q={staff:{},channel:{}},D={staff:{},channel:{}};for(a=0;a<g.length;a++)for(var u=0;u<g[a].children.length;u++){var _=g[a].children[u];q[_.entityType][_.code]=true}function E(c,n){if(n?!s.dailyStatDate:!s.statDate)return;var J=Object.keys(q[c]);if(!J.length)return;var H=c==="staff"?"staff_no":"channel_code",N={ownCutoff:n?s.dailyStamp:s.statDate};var G=J.map(function(z,k){N["ownCode"+k]=z;return"#{ownCode"+k+"}"}).join(",");var Q=n?c==="staff"?tables.staffDay:tables.channelDay:c==="staff"?tables.staffCapacity:tables.channel;var W=" WHERE "+H+" IN ("+G+") AND "+(n?"("+dailyStamp("stat_date")+")":"stat_date")+"=#{ownCutoff}"+scope("branch_company","grid_name",N)+(n?"":" AND prod_period_type IN ('mon','last_mon')")+" AND product_name IN ("+h.map(capacityProductNames).join(",")+")";var U=pagedSql("SELECT "+H+" AS code,product_name,"+(n?"'day'":"prod_period_type")+" AS period,SUM(capacity) AS capacity,SUM(CASE WHEN capacity IS NULL OR capacity<0 THEN 1 ELSE 0 END) AS invalid_count FROM "+Q+W+" GROUP BY "+H+",product_name"+(n?"":",prod_period_type"),N,"code,product_name,period");for(var x=0;x<U.length;x++){var F=U[x];if(Number(F.invalid_count)>0)throw new Error("产能包含空值或负数，请修正源数据");var Y=JSON.stringify([text(F.code),product(F.product_name).productId,F.period]);D[c][Y]=(D[c][Y]||0)+num(F.capacity)}}E("staff",false);E("staff",true);E("channel",false);E("channel",true);for(a=0;a<g.length;a++){d=g[a];for(u=0;u<d.children.length;u++){_=d.children[u];for(var e=0;e<_.values.length;e++)for(var o=0;o<3;o++){var w=["day","month","previous"][o],B=["day","mon","last_mon"][o];if(_.values[e][w]===null)continue;var K=D[_.entityType][JSON.stringify([_.code,_.values[e].productId,B])]||0;_.values[e][w]=K;d.values[e][w]+=K}}delete d.childMap;d.children.sort(function(c,n){return(c.relation==="本人"?-1:n.relation==="本人"?1:0)||c.name.localeCompare(n.name)})}return g}function attachSearchManagers(s,I){if(!s.length)return;var t={},i={},g=[],A={},R=[];function P(e,o){e=text(e);if(!e)return;if(!i[e]){i[e]=[];g.push(e)}if(i[e].indexOf(o)<0)i[e].push(o)}function T(e,o,w,B){return JSON.stringify([e,o,text(w),text(B)])}for(var h=0;h<s.length;h++){var p=s[h];p.managers=[];if(Params.kind==="people"||p.role!=="末梢渠道")P(p.code,p);else{var v=parse(text(p.code).replace(/^tail:/,""));if(Object.prototype.toString.call(v)!=="[object Array]")continue;var a=p.gridId.split("::").slice(1).join("::"),r=T(p.branchId,a,v[0],v[1]);A[r]=p;R.push({branch:p.branchId,grid:a,agent:v[0],name:v[1]})}}if(R.length){var b=R.map(function(e,o){t["tagBranch"+o]=e.branch;t["tagGrid"+o]=e.grid;t["tagAgent"+o]=e.agent;t["tagName"+o]=e.name;return"(d.branch=#{tagBranch"+o+"} AND d.grid=#{tagGrid"+o+"} AND d.agent=#{tagAgent"+o+"} AND d.chn_name=#{tagName"+o+"})"}).join(" OR ");var d=[{table:tables.staffCapacity,date:I.statDate},{table:tables.staffDay,date:I.dailyStamp}],C=[];for(var l=0;l<d.length;l++)if(d[l].date){t.tagDate=d[l].date;var y="SELECT DISTINCT d.branch,d.grid,d.agent,d.chn_name,c.channel_code FROM "+latestDimension(tables.terminal,"staff_no")+" d INNER JOIN "+d[l].table+" c ON c.staff_no=d.staff_no AND c.branch_company=d.branch AND c.grid_name=d.grid WHERE ("+b+") AND "+(l?"("+dailyStamp("c.stat_date")+")":"c.stat_date")+"=#{tagDate}"+(l?"":" AND c.prod_period_type='mon'")+scope("d.branch","d.grid",t);C=C.concat(pagedSql(y,t,"branch,grid,agent,chn_name,channel_code"))}for(h=0;h<C.length;h++){var f=C[h],M=A[T(f.branch,f.grid,f.agent,f.chn_name)];if(M)P(f.channel_code,M)}}if(!g.length)return;var L=g.map(function(e,o){t["tagCode"+o]=e;return"#{tagCode"+o+"}"}).join(",");var m=Params.kind==="people",j=m?tables.selfTeam:tables.chnManager,O=m?"staff_no":"channel_code";var S=pagedSql("SELECT DISTINCT l."+O+" AS object_code,m.staff_no AS manager_code,m.staff_name AS manager_name,m.team AS manager_role FROM "+j+" l INNER JOIN "+latestDimension(tables.ownStaff,"staff_no")+" m ON m.staff_no=l.manager_no WHERE l."+O+" IN ("+L+")"+scope("m.branch","m.grid",t)+(m?scope("l.branch_company","l.grid_name",t):""),t,"object_code,manager_code");for(h=0;h<S.length;h++){f=S[h];var q=i[text(f.object_code)]||[];for(var D=0;D<q.length;D++){var u=q[D].managers,_=false;for(var E=0;E<u.length;E++)if(u[E].code===text(f.manager_code))_=true;if(!_)u.push({code:text(f.manager_code),name:text(f.manager_name)||"姓名未维护",role:text(f.manager_role)||"岗位未维护"})}}}
  function search() {
    if(Params.kind === "own"){var ownData=metadata();return {results:ownSearch(ownData),statDate:ownData.statDate,dailyStatDate:ownData.dailyStatDate,dailyStatHour:ownData.dailyStatHour};}
    var data = dashboard();
    var q = text(Params.query).toLowerCase();
    var groups = {};
    var result = [];
    if (!q || q.length > 100 || ["people", "channels"].indexOf(Params.kind) < 0) throw new Error("查询参数无效");
    for (var pi = 0; pi < 3; pi++) {
      var per = pi === 2 ? "previous" : pi ? "day" : "month";
      var source = pi === 2 ? data.periodRows.filter(function (r) { return r.period === "last_mon"; }) : filtered(data, per);
      for (var i = 0; i < source.length; i++) {
        var r = source[i];
        if (Params.kind === "people" && r.channelType !== "直销队伍") continue;
        if (Params.channelType && r.channelType !== Params.channelType) continue;
        var name = Params.kind === "people" ? r.staffName : (r.microChannelName || r.channel);
        var code = Params.kind === "people" ? r.staffId : r.channelCode;
        if ((String(name) + " " + String(code)).toLowerCase().indexOf(q) < 0) continue;
        var key = JSON.stringify([r.gridId, code, r.channelType]);
        if (pi === 2 && !groups[key]) continue;
        if (!groups[key]) {
          groups[key] = { key: key, name: name, code: code, role: Params.kind === "people" ? r.staffRole : r.channelType, branchId: r.branchId, gridId: r.gridId, values: [] };
        }
        var g = groups[key];
        var m = null;
        for (var j = 0; j < g.values.length; j++) if (g.values[j].productId === r.productId) m = g.values[j];
        if (!m) {
          var p = product(r.productId);
          m = { productId: p.productId, productName: p.productName, unit: p.unit, day: null, month: null, previous: null };
          g.values.push(m);
        }
        m[per] = (m[per] === null ? 0 : m[per]) + r.production;
      }
    }
    var staffGoals = Params.kind === "people" && Object.keys(groups).length ? searchStaffTargets() : {};
    var currentDate = new Date(data.statDate + "T00:00:00Z"), days = currentDate.getUTCDate();
    var previousDays = Math.min(days, new Date(Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), 0)).getUTCDate());
    for (var key in groups) if (Object.prototype.hasOwnProperty.call(groups, key)) {
      for (var mi = 0; mi < groups[key].values.length; mi++) {
        var metric = groups[key].values[mi];
        var goalKey = JSON.stringify([text(groups[key].role),metric.productId]);
        var staffGoal = Object.prototype.hasOwnProperty.call(staffGoals,goalKey) ? staffGoals[goalKey] : null;
        metric.monthBaseTarget = staffGoal ? staffGoal.base : null;
        metric.monthChallengeTarget = staffGoal ? staffGoal.challenge : null;
        metric.monthTarget = text(groups[key].role) === '装维随销' ? metric.monthChallengeTarget : metric.monthBaseTarget;
        metric.monthAverage = metric.month === null ? null : metric.month / days;
        metric.previousAverage = metric.previous === null ? null : metric.previous / previousDays;
        metric.changeValue = metric.monthAverage === null || metric.previousAverage === null ? null : metric.monthAverage - metric.previousAverage;
        metric.changeRate = metric.changeValue === null || metric.previousAverage === 0 ? null : metric.changeValue / metric.previousAverage * 100;
      }
      result.push(groups[key]);
    }
    attachSearchManagers(result,data);
    // Own managers are queried only by kind=own; kind=people remains field sales staff.
    return { results: result, statDate: data.statDate, dailyStatDate: data.dailyStatDate, dailyStatHour: data.dailyStatHour };
  }
  function pagedSql(query, args, order) {
    var result = [], size = 1000;
    // Aggregate result sets are paged as well; do not rely on platform row limits.
    for (var offset = 0; ; offset += size) {
      var page = sql(query + " ORDER BY " + order + " LIMIT " + size + " OFFSET " + offset, args, true);
      if (page.length > size) throw new Error("SQL分页未生效，请检查网关SQL配置");
      result = result.concat(page);
      if (page.length < size) return result;
      if (offset >= 999000) throw new Error("聚合结果超过100万条，请缩小查询范围");
    }
  }
  function latestDimension(table, key) {
    return "(SELECT d.* FROM " + table + " d INNER JOIN (SELECT " + key +
      ",MAX(id) AS latest_id FROM " + table + " GROUP BY " + key + ") newest ON d.id=newest.latest_id)";
  }
  function selectedGridClause(args, data, alias) {
    var ids = parse(Params.gridIds || "[]"), allowed = {}, terms = [];
    if (Object.prototype.toString.call(ids) !== "[object Array]" || ids.length > 2000) throw new Error("gridIds须为不超过2000项的数组");
    for (var i = 0; i < data.organization.grids.length; i++) allowed[data.organization.grids[i].gridId] = true;
    for (i = 0; i < ids.length; i++) {
      if (!Object.prototype.hasOwnProperty.call(allowed, ids[i])) throw new Error("无权访问该网格");
      var parts = ids[i].split("::");
      args["selectedBranch" + i] = parts[0]; args["selectedGrid" + i] = parts.slice(1).join("::");
      terms.push("(" + alias + (alias === "d" ? ".branch" : ".branch_company") + "=#{selectedBranch" + i + "} AND " + alias + (alias === "d" ? ".grid" : ".grid_name") + "=#{selectedGrid" + i + "})");
    }
    return terms.length ? " AND (" + terms.join(" OR ") + ")" : "";
  }
  function emptyCapacityQuery() { return "SELECT '' AS branchId,'' AS gridId,'' AS productName,'' AS period,'' AS channelType,0 AS production,0 AS invalidCount,'' AS staffId,'' AS staffName,'' AS staffRole,'' AS channel,'' AS channelCode,'' AS star,'' AS microChannelName,'' AS serviceProvider,NULL AS staffCount WHERE 1=0"; }
  function capacityProductNames(p) {
    var names = [p.productName, p.productId];
    if (p.productId === "homeBroadband") names.push("手宽归档");
    if (p.productId === "plan119") names = names.concat(["129+高套", "119+套餐"]);
    return names.map(function (name) { return "'" + name + "'"; }).join(",");
  }
  // Readable SQL builder: gateway/capacity-query-readable.js
function capacityQuery(o,a,c,s,f){if(f===void 0){var N=s||(a&&Params.funCode==="wgsc_fetchChangeAlerts"?["mon","last_mon"]:a&&Params.funCode==="wgsc_searchCapacity"?["mon","last_mon","day"]:a&&["wgsc_fetchAlerts","wgsc_fetchChannelOptions"].indexOf(Params.funCode)>=0?[Params.period==="day"?"day":"mon"]:["mon","week","last_mon","day"]);var l=N.filter(function(n){return n!=="day"}),u=[];if(l.length&&o.statDate)u.push(capacityQuery(o,a,c,l,false));if(N.indexOf("day")>=0&&o.dailyStatDate)u.push(capacityQuery(o,a,c,[],true));return u.length?u.join(" UNION ALL "):emptyCapacityQuery()}c.cutoff=o.statDate;c.dailyCutoff=o.dailyStamp;var A=" WHERE "+(f?"("+dailyStamp("c.stat_date")+")=#{dailyCutoff}":"c.stat_date=#{cutoff}")+scope("c.branch_company","c.grid_name",c);if(a)A+=selectedGridClause(c,o,"c");if(!f)A+=" AND c.prod_period_type IN ("+s.map(function(n){return"'"+n+"'"}).join(",")+")";var t=text(Params.channelType),r=["三星+渠道","直销队伍","末梢渠道","营业厅"];if(t==="3星+渠道")t="三星+渠道";if(t==="全部类型")t="";if(t&&r.indexOf(t)<0)throw new Error("生产类型无效");if(a&&t)r=[t];if(a&&Params.funCode==="wgsc_searchCapacity"&&Params.kind==="people")r=r.filter(function(n){return n==="直销队伍"});if(a&&Params.funCode==="wgsc_searchCapacity"&&Params.kind==="channels")r=r.filter(function(n){return n!=="直销队伍"});if(a&&Params.funCode==="wgsc_searchCapacity"&&Params.kind==="channels"&&!t)r=r.filter(function(n){return n!=="营业厅"});var E=a&&Params.productId?[product(Params.productId)]:products;if(a&&Params.productId)A+=" AND c.product_name IN ("+capacityProductNames(E[0])+")";var I=E.map(function(n){return"SELECT '"+n.productId+"' AS productId,'"+n.productName+"' AS productName"}).join(" UNION ALL ");var L=(f?["day"]:s).map(function(n){return"SELECT '"+n+"' AS period"}).join(" UNION ALL ");var S=[];for(var i=0;i<r.length;i++){var p=r[i],e=p==="三星+渠道"||p==="营业厅",d=p==="末梢渠道";var D=f?e?tables.channelDay:tables.staffDay:e?tables.channel:tables.staffCapacity;var y=e?tables.channelInfo:d?tables.terminal:tables.staff,h=e?"chn_code":"staff_no",_=e?"channel_code":"staff_no";var m=" WHERE 1=1"+scope("d.branch","d.grid",c);if(a)m+=selectedGridClause(c,o,"d");if(e)m+=p==="营业厅"?" AND d.star_level='营业厅'":" AND d.star_level='三星+'";else m+=" AND NOT EXISTS (SELECT 1 FROM "+(d?tables.staff:tables.terminal)+" conflict WHERE conflict.staff_no=d.staff_no)";var O=e?"d.chn_code":d?"JSON_ARRAY(d.agent,d.chn_name)":"d.staff_no";if(a&&Params.funCode==="wgsc_searchCapacity"){c.searchQuery=text(Params.query).toLowerCase();if(!c.searchQuery||c.searchQuery.length>100||["people","channels"].indexOf(Params.kind)<0)throw new Error("查询参数无效");var P=e||d?"d.chn_name":"d.staff_name";m+=" AND LOCATE(#{searchQuery},LOWER(CONCAT(COALESCE("+P+",''),' ',COALESCE("+O+",''))))>0"}var b="c."+_+"=d."+h+" AND c.branch_company=d.branch AND c.grid_name=d.grid";var v=A;if(Params.funCode==="wgsc_searchCapacity")v+=" AND EXISTS (SELECT 1 FROM "+latestDimension(y,h)+" d"+m+" AND "+b+")";var T="SELECT c.branch_company,c.grid_name,c."+_+" AS identity,c.product_name,"+(f?"'day'":"c.prod_period_type")+" AS period,SUM(c.capacity) AS production,SUM(CASE WHEN c.capacity IS NULL OR c.capacity<0 THEN 1 ELSE 0 END) AS invalidCount,MIN(c.channel_name) AS channel FROM "+D+" c"+v+" GROUP BY c.branch_company,c.grid_name,c."+_+",c.product_name"+(f?"":",c.prod_period_type");var C="d.branch AS branchId,CONCAT(d.branch,'::',d.grid) AS gridId,p.productName,v.period,'"+p+"' AS channelType,SUM(COALESCE(m.production,0)) AS production,SUM(COALESCE(m.invalidCount,0)) AS invalidCount,";if(a)C+=(e||d?"''":"MAX(d.staff_no)")+" AS staffId,"+(e||d?"''":"MAX(d.staff_name)")+" AS staffName,"+(e||d?"''":"MAX(d.team_type)")+" AS staffRole,"+(e||d?"MAX(d.chn_name)":"COALESCE(MIN(m.channel),'')")+" AS channel,"+(e?"MAX(d.chn_code)":"''")+" AS channelCode,"+(e?"MAX(d.star)":"''")+" AS star,"+(d?"MAX(d.chn_name)":"''")+" AS microChannelName,"+(d?"MAX(d.agent)":"''")+" AS serviceProvider,"+(e?"NULL":"COUNT(DISTINCT d.staff_no)")+" AS staffCount";else C+="'' AS staffId,'' AS staffName,'' AS staffRole,'' AS channel,'' AS channelCode,'' AS star,'' AS microChannelName,'' AS serviceProvider,NULL AS staffCount";var R="(m.product_name=p.productName OR m.product_name=p.productId OR (p.productId='homeBroadband' AND m.product_name='手宽归档') OR (p.productId='plan119' AND m.product_name IN ('129+高套','119+套餐')))";S.push("SELECT "+C+" FROM "+latestDimension(y,h)+" d CROSS JOIN ("+I+") p CROSS JOIN ("+L+") v LEFT JOIN ("+T+") m ON m.identity=d."+h+" AND m.branch_company=d.branch AND m.grid_name=d.grid AND m.period=v.period AND "+R+m+" GROUP BY d.branch,d.grid,p.productName,v.period"+(a?","+O:""))}return S.length?S.join(" UNION ALL "):emptyCapacityQuery()}
  function mapCapacity(r, statDate) {
    if (Number(r.invalidCount) > 0) throw new Error("产能包含空值或负数，不能作为零聚合，请修正源数据");
    var star = String(r.star || "").match(/([0-9三四五])\s*星/), stars = { "三": 3, "四": 4, "五": 5 };
    var out = { branchId: r.branchId, gridId: r.gridId, productId: product(r.productName).productId,
      period: r.period, production: num(r.production), channelType: r.channelType,
      staffId: r.staffId || "", staffName: r.staffName || "", staffRole: r.staffRole || "",
      channel: r.channel || "", channelCode: r.channelType === "末梢渠道" ? "tail:" + JSON.stringify([r.serviceProvider || "", r.microChannelName || ""]) : r.channelCode || "",
      channelStar: star ? stars[star[1]] || Number(star[1]) : null,
      microChannelName: r.microChannelName || "", serviceProvider: r.serviceProvider || "",
      staffCount: r.staffCount === null ? null : Number(r.staffCount) };
    if (r.monthProduction !== undefined) {
      var d = new Date(statDate + "T00:00:00Z"), days = d.getUTCDate();
      var previousDays = Math.min(days, new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 0)).getUTCDate());
      out.monthAverage = r.monthProduction === null ? null : Number(r.monthProduction) / days;
      out.previousAverage = r.previousProduction === null ? null : Number(r.previousProduction) / previousDays;
    }
    return out;
  }
  function metadata(monthlyOnly) {
    var cutoff=latest(tables.region),batch=monthlyOnly?{date:"",hour:"",stamp:""}:latestDaily(tables.regionDay);
    var data={statDate:cutoff,dailyStatDate:batch.date,dailyStatHour:batch.hour,dailyStamp:batch.stamp,
      organization:{cityName:"中山市",branches:[],grids:[]},products:products,rows:[],dailyRows:[],periodRows:[],missingCapacityIsZero:true};
    var parts=[],args={},dims=[tables.channelInfo,tables.staff,tables.terminal,tables.ownStaff];
    for(var i=0;i<dims.length;i++)parts.push("SELECT DISTINCT branch,grid FROM "+dims[i]+" WHERE 1=1"+scope("branch","grid",args));
    if(cutoff){args.orgCutoff=cutoff;parts.push("SELECT DISTINCT branch_company AS branch,grid_name AS grid FROM "+tables.region+" WHERE stat_date=#{orgCutoff}"+scope("branch_company","grid_name",args));}
    if(batch.date){args.orgDay=batch.stamp;parts.push("SELECT DISTINCT branch_company AS branch,grid_name AS grid FROM "+tables.regionDay+" WHERE ("+dailyStamp("stat_date")+")=#{orgDay}"+scope("branch_company","grid_name",args));}
    var rows=pagedSql("SELECT branch,grid FROM ("+parts.join(" UNION ")+") orgs",args,"branch,grid"),branches={};
    for(i=0;i<rows.length;i++){
      var b=text(rows[i].branch),g=text(rows[i].grid);
      if(!b || !g || /统筹|^(未知|全市|市公司|中山市)$/.test(g) || b===g)continue;
      if(!branches[b]){data.organization.branches.push({branchId:b,branchName:b});branches[b]=true;}
      data.organization.grids.push({branchId:b,gridId:gridId(b,g),gridName:g});
    }
    return data;
  }
  function dashboard() {
    var data=metadata(),args={};
    if(!data.statDate && !data.dailyStatDate)return data;
    var relation=capacityQuery(data,true,args),rows=pagedSql("SELECT * FROM ("+relation+") capacity_groups",args,
      "branchId,gridId,productName,period,channelType,staffId,channelCode,microChannelName,serviceProvider");
    for(var i=0;i<rows.length;i++){
      var row=mapCapacity(rows[i],data.statDate);data.periodRows.push(row);
      if(row.period==="mon")data.rows.push(row);
      if(row.period==="day"){row.date=data.dailyStatDate;data.dailyRows.push(row);}
    }
    return data;
  }


  // Monthly team-control implementation: gateway/team-control-monthly.js
function teamMetadata(){var r=metadata(!0),a=["南部分公司","北部分公司","城区分公司","高新分公司","东部分公司"],y=["小榄","火炬开发区","古镇","坦洲","东区","东升","石岐区","三乡","沙溪","横栏","东凤","西区","黄圃","港口","南头","三角","大涌","南朗","民众","板芙","南区","阜沙","五桂山","神湾","翠亨新区"];return r.organization.branches=r.organization.branches.filter(function(p){return a.indexOf(p.branchId)>=0}),r.organization.grids=r.organization.grids.filter(function(p){return a.indexOf(p.branchId)>=0&&y.indexOf(p.gridName)>=0}),r}function teamControl(){var r=teamMetadata(),a={productId:Params.productId||"newNumbers",branchId:text(Params.branchId),gridId:text(Params.gridId),threshold:Params.threshold,declineRate:Params.declineRate,declineValue:Params.declineValue,team:text(Params.team),role:text(Params.role),filter:Params.filter||"all",query:Params.query,managerCode:text(Params.managerCode),relation:text(Params.relation),page:Params.page,pageSize:Params.pageSize};if(product(a.productId),createTeamControlEngine().criteria(a),a.team&&["own","people","halls","stars","tail"].indexOf(a.team)<0)throw new Error("队伍类型无效");if(a.branchId&&!r.organization.branches.some(function(t){return t.branchId===a.branchId}))throw new Error("无权查看该分公司");if(a.gridId&&!r.organization.grids.some(function(t){return t.gridId===a.gridId&&(!a.branchId||t.branchId===a.branchId)}))throw new Error("无权查看该网格");var y={},p={},g=[],M={staff:{},channel:{}},R={staff:{},channel:{}},j={},e,Z;r.organization.grids.forEach(function(t){p[t.gridId]=!0,(!a.branchId||t.branchId===a.branchId)&&(!a.gridId||t.gridId===a.gridId)&&(y[t.gridId]=!0)});function F(t,o){return y[gridId(t,o)]===!0}function T(t,o){return p[gridId(t,o)]===!0}function C(t,o){var n={},c="SELECT d.* FROM "+latestDimension(t,o)+" d WHERE 1=1"+scope("d.branch","d.grid",n);return pagedSql(c,n,o).filter(function(m){return F(m.branch,m.grid)})}function J(t){if(r.statDate){var o=t==="staff"?"staff_no":"channel_code",n={cutoff:r.statDate},c="SELECT branch_company,grid_name,"+o+" AS code,SUM(CASE WHEN prod_period_type='mon' THEN capacity ELSE 0 END) AS month_capacity,SUM(CASE WHEN prod_period_type='last_mon' THEN capacity ELSE 0 END) AS previous_capacity,SUM(CASE WHEN capacity IS NULL OR capacity<0 THEN 1 ELSE 0 END) AS invalid_count FROM "+(t==="staff"?tables.staffCapacity:tables.channel)+" WHERE stat_date=#{cutoff} AND prod_period_type IN ('mon','last_mon') AND product_name IN ("+capacityProductNames(product(a.productId))+")"+scope("branch_company","grid_name",n);a.branchId&&!E&&(n.selectedBranch=a.branchId,c+=" AND branch_company=#{selectedBranch}"),a.gridId&&!E&&(n.selectedGrid=a.gridId.split("::").slice(1).join("::"),c+=" AND grid_name=#{selectedGrid}");for(var m=pagedSql(c+" GROUP BY branch_company,grid_name,"+o,n,"branch_company,grid_name,code"),l=0;l<m.length;l++){var i=m[l];if((E?T:F)(i.branch_company,i.grid_name)){if(Number(i.invalid_count)>0)throw new Error("产能包含空值或负数，请修正源数据");var w=JSON.stringify([i.branch_company,i.grid_name,text(i.code)]),K=M[t][w]||(M[t][w]={month:0,previous:0}),Q=R[t][text(i.code)]||(R[t][text(i.code)]={month:0,previous:0});K.month+=num(i.month_capacity),K.previous+=num(i.previous_capacity),Q.month+=num(i.month_capacity),Q.previous+=num(i.previous_capacity),j[t+":"+text(i.code)]={branch:i.branch_company,grid:i.grid_name}}}}}var E=!a.team||a.team==="own";(!a.team||a.team==="own"||a.team==="people"||a.team==="tail")&&J("staff"),(!a.team||a.team==="own"||a.team==="halls"||a.team==="stars")&&J("channel");function I(t,o,n,c,m,l){var i=M[l][JSON.stringify([c,m,text(t)])]||{month:0,previous:0},w=product(a.productId);return{key:l+":"+t,code:text(t),name:text(o)||text(t),role:text(n),branchId:c,gridId:gridId(c,m),values:[{productId:a.productId,productName:w.productName,unit:w.unit,month:i.month,previous:i.previous}]}}var O=!a.team||a.team==="people"||a.team==="tail"?C(tables.staff,"staff_no"):[],x=!a.team||a.team==="people"||a.team==="tail"?C(tables.terminal,"staff_no"):[],S={};for(e=0;e<O.length;e++)S[text(O[e].staff_no)]=!0;for(e=0;e<x.length;e++)S[text(x[e].staff_no)]&&(S[text(x[e].staff_no)]=2);if(!a.team||a.team==="people")for(e=0;e<O.length;e++){var b=O[e];S[text(b.staff_no)]!==2&&g.push(I(b.staff_no,b.staff_name,b.team_type,b.branch,b.grid,"staff"))}if(!a.team||a.team==="tail"){var U={};for(e=0;e<x.length;e++){var d=x[e];if(!S[text(d.staff_no)]){var H=JSON.stringify([d.branch,d.grid,text(d.agent),text(d.chn_name)]),u=U[H],z=I(d.staff_no,d.chn_name,"末梢渠道",d.branch,d.grid,"staff");u||(u=U[H]=z,u.key="tail:"+H,u.code="tail:"+JSON.stringify([text(d.agent),text(d.chn_name)]),u.values[0].month=0,u.values[0].previous=0,g.push(u),z=I(d.staff_no,d.chn_name,"末梢渠道",d.branch,d.grid,"staff")),u.values[0].month+=z.values[0].month,u.values[0].previous+=z.values[0].previous}}}var B=!a.team||E||a.team==="stars"||a.team==="halls"?C(tables.channelInfo,"chn_code"):[],G={};for(e=0;e<B.length;e++){var s=B[e];G[text(s.chn_code)]={branch:s.branch,grid:s.grid},(!a.team||a.team==="halls")&&s.star_level==="营业厅"&&g.push(I(s.chn_code,s.chn_name,"营业厅",s.branch,s.grid,"channel")),(!a.team||a.team==="stars")&&s.star_level==="三星+"&&g.push(I(s.chn_code,s.chn_name,"三星+渠道",s.branch,s.grid,"channel"))}if(E){var t=function(o,n,c){c=text(c);var m=n+":"+c;if(!(!c||o.seen[m])){o.seen[m]=!0;var l=R[n][c];l&&(o.values[0].month+=l.month,o.values[0].previous+=l.previous)}},k=t,_=C(tables.ownStaff,"staff_no"),P={},D={},q=[];for(e=0;e<_.length;e++){var N=_[e],h=I(N.staff_no,N.staff_name,N.team,N.branch,N.grid,"staff");h.isOwn=!0,h.key="own:"+h.code,h.values[0].month=0,h.values[0].previous=0,h.seen={},P[h.code]=h,D["manager"+e]=h.code,q.push("#{manager"+e+"}"),g.push(h)}for(e=0;e<_.length;e++)t(P[text(_[e].staff_no)],"staff",_[e].staff_no);if(q.length){var f=pagedSql("SELECT manager_no,staff_no,branch_company,grid_name FROM "+tables.selfTeam+" WHERE manager_no IN ("+q.join(",")+")"+scope("branch_company","grid_name",D),D,"manager_no,staff_no");for(e=0;e<f.length;e++)T(f[e].branch_company,f[e].grid_name)&&t(P[text(f[e].manager_no)],"staff",f[e].staff_no);for(f=pagedSql("SELECT manager_no,channel_code FROM "+tables.chnManager+" WHERE manager_no IN ("+q.join(",")+")",D,"manager_no,channel_code"),e=0;e<f.length;e++){var L=G[text(f[e].channel_code)]||j["channel:"+text(f[e].channel_code)];(!L||T(L.branch,L.grid))&&t(P[text(f[e].manager_no)],"channel",f[e].channel_code)}}for(e=0;e<_.length;e++)delete P[text(_[e].staff_no)].seen}if(a.managerCode){var V=g.filter(function(t){return t.isOwn&&t.code===a.managerCode})[0];if(!V)throw new Error("无权查看该网格经理");var A={query:Params.query,kind:Params.kind,gridIds:Params.gridIds,productId:Params.productId};try{Params.query=a.managerCode,Params.productId=a.productId,Params.kind="own",Params.gridIds=JSON.stringify(Object.keys(y));var Y=ownSearch(r).filter(function(t){return t.code===a.managerCode});V.children=Y.length?Y[0].children:[]}finally{Params.query=A.query,Params.kind=A.kind,Params.gridIds=A.gridIds,Params.productId=A.productId}}if(text(Params.exportMode)==="1"){var t=function(o){return a.filter=o,createTeamControlEngine().build(g,a,{statDate:r.statDate,organization:r.organization,exportAll:!0}).items.map(function(n){return{code:n.code,name:n.name,role:n.role,team:n.team,branchId:n.branchId,gridId:n.gridId,metric:n.metric}})},aa=t;if(a.managerCode)throw new Error("请返回队伍列表导出低产与异动明细");var W={statDate:r.statDate,criteria:createTeamControlEngine().criteria(a)},$=a.filter;return a.page=1,a.pageSize=100,W.low=t("low"),W.change=t("change"),W}var v=createTeamControlEngine().build(g,a,{statDate:r.statDate,organization:r.organization});if(v.hasManager=!!(v.manager&&v.manager.code),a.team&&a.team!=="own"&&v.items.length){var X=Params.kind;try{Params.kind=a.team==="people"?"people":"channels",attachSearchManagers(v.items,r)}finally{Params.kind=X}}return v}

  try {
    if(["wgsc_searchCapacity","wgsc_teamControl","wgsc_teamControlMeta"].indexOf(Params.funCode)<0)throw new Error("非法调用");
    user=authenticate();
    if(Params.funCode==="wgsc_teamControlMeta"){var meta=teamMetadata();JsResult.result=JSON.stringify({result:{retCode:"0",retMsg:"成功",data:{statDate:meta.statDate,organization:meta.organization}}});return;}
    if(Params.funCode==="wgsc_teamControl"){JsResult.result=JSON.stringify({result:{retCode:"0",retMsg:"成功",data:teamControl()}});return;}
    var result=search(),page=Number(Params.page||1),size=Number(Params.pageSize||200);
    if(!isFinite(page)||page<1||Math.floor(page)!==page||!isFinite(size)||size<1||size>1000||Math.floor(size)!==size)throw new Error("分页参数无效");
    var total=result.results.length,offset=(page-1)*size;
    result.results=result.results.slice(offset,offset+size);
    result.pagination={page:page,pageSize:size,total:total,hasMore:offset+size<total};
    JsResult.result=JSON.stringify({result:{retCode:"0",retMsg:"成功",data:result}});
  }catch(e){JsResult.result=JSON.stringify({result:{retCode:String(e.message).indexOf("00008:")===0?"00008":"1",retMsg:e.message||"速查执行失败",data:null}});}
}
init();

