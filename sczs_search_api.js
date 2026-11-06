// Dedicated Handle2 capacity search gateway. ES5. No imports or external JS dependency.
function init(){
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
  function ownSearch(data) {
    var q=text(Params.query).toLowerCase();
    if(!q || q.length>100)throw new Error("查询参数无效");
    var args={ownQuery:q}, managers={}, result=[], ids=[];
    var chosen=selectedGridClause(args,data,"d");
    var selector="SELECT d.* FROM "+latestDimension(tables.ownStaff,"staff_no")+" d WHERE 1=1"+
      scope("d.branch","d.grid",args)+chosen+
      " AND LOCATE(#{ownQuery},LOWER(CONCAT(COALESCE(d.staff_name,''),' ',COALESCE(d.staff_no,''))))>0";
    var roster=pagedSql(selector,args,"staff_no");
    var ps=Params.productId?[product(Params.productId)]:products;
    function metrics(){return ps.map(function(p){return {productId:p.productId,productName:p.productName,unit:p.unit,
      day:data.dailyStatDate?0:null,month:data.statDate?0:null,previous:data.statDate?0:null};});}
    function addChild(g,code,name,role,kind,branch,grid){
      code=text(code);if(!code)return;
      var key=JSON.stringify([kind,code]);
      if(g.childMap[key])return;
      var self=kind==="staff" && code===g.code;
      var child={key:key,code:code,name:text(name)||code,role:text(role),entityType:kind,
        relation:self?"本人":kind==="staff"?"所管人员":"所管渠道",branchId:branch,gridId:gridId(branch,grid),values:metrics()};
      g.childMap[key]=child;g.children.push(child);
    }
    for(var i=0;i<roster.length;i++){
      var r=roster[i],code=text(r.staff_no);if(!code)continue;
      var g={key:"own:"+code,code:code,name:text(r.staff_name)||code,role:text(r.team),isOwn:true,
        branchId:r.branch,gridId:gridId(r.branch,r.grid),values:metrics(),children:[],childMap:{}};
      managers[code]=g;ids.push(code);result.push(g);
      addChild(g,code,g.name,g.role,"staff",r.branch,r.grid);
    }
    if(!ids.length)return result;
    var placeholders=ids.map(function(code,i){args["ownManager"+i]=code;return "#{ownManager"+i+"}";}).join(",");
    var links=pagedSql("SELECT * FROM "+tables.selfTeam+" WHERE manager_no IN ("+placeholders+")"+
      scope("branch_company","grid_name",args),args,"id");
    for(i=0;i<links.length;i++){
      r=links[i];addChild(managers[text(r.manager_no)],r.staff_no,r.staff_name,r.team_type,"staff",r.branch_company,r.grid_name);
    }
    links=pagedSql("SELECT * FROM "+tables.chnManager+" WHERE manager_no IN ("+placeholders+")",args,"id");
    // Resolve channel geography where available; an omitted zero-channel inherits its authorized manager's location.
    var channels={}, channelIds=[];
    for(i=0;i<links.length;i++)if(text(links[i].channel_code) && !channels[text(links[i].channel_code)]){
      channels[text(links[i].channel_code)]={};channelIds.push(text(links[i].channel_code));
    }
    if(channelIds.length){
      var cp=channelIds.map(function(code,i){args["ownChannel"+i]=code;return "#{ownChannel"+i+"}";}).join(",");
      var chns=pagedSql("SELECT chn_code,branch,grid FROM "+latestDimension(tables.channelInfo,"chn_code")+" d WHERE chn_code IN ("+cp+")",args,"chn_code");
      for(i=0;i<chns.length;i++)channels[text(chns[i].chn_code)]=chns[i];
      // Some contractor/tail codes exist only in capacity tables. Read distinct scoped locations, not production rows.
      var locations=[];
      var sources=[tables.channel,tables.channelDay];
      for(var si=0;si<sources.length;si++)locations=locations.concat(pagedSql("SELECT DISTINCT channel_code AS chn_code,branch_company AS branch,grid_name AS grid FROM "+sources[si]+" WHERE channel_code IN ("+cp+")"+scope("branch_company","grid_name",args),args,"chn_code,branch,grid"));
      for(i=0;i<locations.length;i++)if(!channels[text(locations[i].chn_code)].branch)channels[text(locations[i].chn_code)]=locations[i];
      for(i=0;i<links.length;i++){
        r=links[i];g=managers[text(r.manager_no)];var loc=channels[text(r.channel_code)]||{};
        if(user.role!=="city" && loc.branch && (loc.branch!==user.branchName || user.role==="grid" && loc.grid!==user.gridName))continue;
        addChild(g,r.channel_code,r.channel_name,r.channel_type,"channel",loc.branch||g.branchId,loc.grid||g.gridId.split("::").slice(1).join("::"));
      }
    }
    var wanted={staff:{},channel:{}}, values={staff:{},channel:{}};
    for(i=0;i<result.length;i++)for(var j=0;j<result[i].children.length;j++){
      var child=result[i].children[j];wanted[child.entityType][child.code]=true;
    }
    function readCapacity(kind,daily){
      if(daily?!data.dailyStatDate:!data.statDate)return;
      var codes=Object.keys(wanted[kind]);if(!codes.length)return;
      var key=kind==="staff"?"staff_no":"channel_code",a={ownCutoff:daily?data.dailyStamp:data.statDate};
      var fields=codes.map(function(code,i){a["ownCode"+i]=code;return "#{ownCode"+i+"}";}).join(",");
      var table=daily?(kind==="staff"?tables.staffDay:tables.channelDay):(kind==="staff"?tables.staffCapacity:tables.channel);
      var where=" WHERE "+key+" IN ("+fields+") AND "+(daily?"("+dailyStamp("stat_date")+")":"stat_date")+"=#{ownCutoff}"+
        scope("branch_company","grid_name",a)+(daily?"":" AND prod_period_type IN ('mon','last_mon')")+
        " AND product_name IN ("+ps.map(capacityProductNames).join(",")+")";
      var measured=pagedSql("SELECT "+key+" AS code,product_name,"+(daily?"'day'":"prod_period_type")+" AS period,SUM(capacity) AS capacity,"+
        "SUM(CASE WHEN capacity IS NULL OR capacity<0 THEN 1 ELSE 0 END) AS invalid_count FROM "+table+where+
        " GROUP BY "+key+",product_name"+(daily?"":",prod_period_type"),a,"code,product_name,period");
      for(var x=0;x<measured.length;x++){
        var row=measured[x];if(Number(row.invalid_count)>0)throw new Error("产能包含空值或负数，请修正源数据");
        var k=JSON.stringify([text(row.code),product(row.product_name).productId,row.period]);
        values[kind][k]=(values[kind][k]||0)+num(row.capacity);
      }
    }
    readCapacity("staff",false);readCapacity("staff",true);readCapacity("channel",false);readCapacity("channel",true);
    for(i=0;i<result.length;i++){
      g=result[i];
      for(j=0;j<g.children.length;j++){
        child=g.children[j];
        for(var m=0;m<child.values.length;m++)for(var v=0;v<3;v++){
          var field=["day","month","previous"][v],period=["day","mon","last_mon"][v];
          if(child.values[m][field]===null)continue;
          var amount=values[child.entityType][JSON.stringify([child.code,child.values[m].productId,period])]||0;
          child.values[m][field]=amount;g.values[m][field]+=amount;
        }
      }
      delete g.childMap;
      g.children.sort(function(a,b){return (a.relation==="本人"?-1:b.relation==="本人"?1:0)||a.name.localeCompare(b.name);});
    }
    return result;
  }
  function attachSearchManagers(results,data) {
    if(!results.length)return;
    var args={}, targets={}, codes=[], tailResults={}, tails=[];
    function addTarget(code,item){code=text(code);if(!code)return;if(!targets[code]){targets[code]=[];codes.push(code);}if(targets[code].indexOf(item)<0)targets[code].push(item);}
    function tailKey(branch,grid,agent,name){return JSON.stringify([branch,grid,text(agent),text(name)]);}
    for(var i=0;i<results.length;i++){
      var item=results[i];item.managers=[];
      if(Params.kind==="people" || item.role!=="末梢渠道")addTarget(item.code,item);
      else {
        var parts=parse(text(item.code).replace(/^tail:/,""));
        if(Object.prototype.toString.call(parts)!=="[object Array]")continue;
        var grid=item.gridId.split("::").slice(1).join("::"),k=tailKey(item.branchId,grid,parts[0],parts[1]);
        tailResults[k]=item;tails.push({branch:item.branchId,grid:grid,agent:parts[0],name:parts[1]});
      }
    }
    // Tail UI identities are synthetic: resolve real channel codes via staff links, never compare synthetic IDs to channel_code.
    if(tails.length){
      var conditions=tails.map(function(t,i){args["tagBranch"+i]=t.branch;args["tagGrid"+i]=t.grid;args["tagAgent"+i]=t.agent;args["tagName"+i]=t.name;
        return "(d.branch=#{tagBranch"+i+"} AND d.grid=#{tagGrid"+i+"} AND d.agent=#{tagAgent"+i+"} AND d.chn_name=#{tagName"+i+"})";}).join(" OR ");
      var source=[{table:tables.staffCapacity,date:data.statDate},{table:tables.staffDay,date:data.dailyStamp}],maps=[];
      for(var si=0;si<source.length;si++)if(source[si].date){
        args.tagDate=source[si].date;
        var query="SELECT DISTINCT d.branch,d.grid,d.agent,d.chn_name,c.channel_code FROM "+latestDimension(tables.terminal,"staff_no")+" d INNER JOIN "+source[si].table+
          " c ON c.staff_no=d.staff_no AND c.branch_company=d.branch AND c.grid_name=d.grid WHERE ("+conditions+") AND "+
          (si?"("+dailyStamp("c.stat_date")+")":"c.stat_date")+"=#{tagDate}"+(si?"":" AND c.prod_period_type='mon'")+scope("d.branch","d.grid",args);
        maps=maps.concat(pagedSql(query,args,"branch,grid,agent,chn_name,channel_code"));
      }
      for(i=0;i<maps.length;i++){
        var row=maps[i],target=tailResults[tailKey(row.branch,row.grid,row.agent,row.chn_name)];if(target)addTarget(row.channel_code,target);
      }
    }
    if(!codes.length)return;
    var parameters=codes.map(function(code,i){args["tagCode"+i]=code;return "#{tagCode"+i+"}";}).join(",");
    var people=Params.kind==="people",relation=people?tables.selfTeam:tables.chnManager,key=people?"staff_no":"channel_code";
    var rows=pagedSql("SELECT DISTINCT l."+key+" AS object_code,m.staff_no AS manager_code,m.staff_name AS manager_name,m.team AS manager_role FROM "+relation+
      " l INNER JOIN "+latestDimension(tables.ownStaff,"staff_no")+" m ON m.staff_no=l.manager_no WHERE l."+key+" IN ("+parameters+")"+
      scope("m.branch","m.grid",args)+(people?scope("l.branch_company","l.grid_name",args):""),args,"object_code,manager_code");
    for(i=0;i<rows.length;i++){
      row=rows[i];var matched=targets[text(row.object_code)]||[];
      for(var j=0;j<matched.length;j++){
        var list=matched[j].managers,exists=false;
        for(var m=0;m<list.length;m++)if(list[m].code===text(row.manager_code))exists=true;
        if(!exists)list.push({code:text(row.manager_code),name:text(row.manager_name)||"姓名未维护",role:text(row.manager_role)||"岗位未维护"});
      }
    }
  }
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
  function capacityQuery(data, detail, args, periods, daily) {
    if (daily === undefined) {
      var wanted=periods || (detail && Params.funCode==="wgsc_fetchChangeAlerts" ? ["mon","last_mon"] :
        detail && Params.funCode==="wgsc_searchCapacity" ? ["mon","last_mon","day"] :
        detail && ["wgsc_fetchAlerts","wgsc_fetchChannelOptions"].indexOf(Params.funCode)>=0 ? [Params.period==="day"?"day":"mon"] : ["mon","week","last_mon","day"]);
      var historical=wanted.filter(function(p){return p!=="day";}), queries=[];
      if(historical.length && data.statDate)queries.push(capacityQuery(data,detail,args,historical,false));
      if(wanted.indexOf("day")>=0 && data.dailyStatDate)queries.push(capacityQuery(data,detail,args,[],true));
      return queries.length?queries.join(" UNION ALL "):emptyCapacityQuery();
    }
    args.cutoff = data.statDate;
    args.dailyCutoff = data.dailyStamp;
    var clause = " WHERE " + (daily ? "("+dailyStamp("c.stat_date")+")=#{dailyCutoff}" : "c.stat_date=#{cutoff}") + scope("c.branch_company", "c.grid_name", args);
    if (detail) clause += selectedGridClause(args, data, "c");
    if (!daily) clause += " AND c.prod_period_type IN (" + periods.map(function(p){return "'"+p+"'";}).join(",") + ")";
    var channelType = text(Params.channelType), selectedTypes = ["三星+渠道", "直销队伍", "末梢渠道", "营业厅"];
    if (channelType === "3星+渠道") channelType = "三星+渠道";
    if (channelType === "全部类型") channelType = "";
    if (channelType && selectedTypes.indexOf(channelType) < 0) throw new Error("生产类型无效");
    // A dashboard always includes every type so switching the selector is local.
    if (detail && channelType) selectedTypes = [channelType];
    if (detail && Params.funCode === "wgsc_searchCapacity" && Params.kind === "people") selectedTypes = selectedTypes.filter(function (v) { return v === "直销队伍"; });
    if (detail && Params.funCode === "wgsc_searchCapacity" && Params.kind === "channels") selectedTypes = selectedTypes.filter(function (v) { return v !== "直销队伍"; });
    if (detail && Params.funCode === "wgsc_searchCapacity" && Params.kind === "channels" && !channelType) selectedTypes = selectedTypes.filter(function (v) { return v !== "营业厅"; });
    var requestedProducts = detail && Params.productId ? [product(Params.productId)] : products;
    if (detail && Params.productId) clause += " AND c.product_name IN (" + capacityProductNames(requestedProducts[0]) + ")";
    var productQuery = requestedProducts.map(function(p){return "SELECT '"+p.productId+"' AS productId,'"+p.productName+"' AS productName";}).join(" UNION ALL ");
    var periodQuery = (daily ? ["day"] : periods).map(function(p){return "SELECT '"+p+"' AS period";}).join(" UNION ALL ");
    var blocks = [];
    for (var i = 0; i < selectedTypes.length; i++) {
      var type=selectedTypes[i], stars=type==="三星+渠道" || type==="营业厅", tail=type==="末梢渠道";
      var table=daily ? (stars?tables.channelDay:tables.staffDay) : (stars?tables.channel:tables.staffCapacity);
      var dimension=stars?tables.channelInfo:tail?tables.terminal:tables.staff, key=stars?"chn_code":"staff_no", capacityKey=stars?"channel_code":"staff_no";
      var condition=" WHERE 1=1"+scope("d.branch","d.grid",args);
      if(detail)condition+=selectedGridClause(args,data,"d");
      if(stars)condition+=type==="营业厅"?" AND d.star_level='营业厅'":" AND d.star_level='三星+'";
      else condition+=" AND NOT EXISTS (SELECT 1 FROM "+(tail?tables.staff:tables.terminal)+" conflict WHERE conflict.staff_no=d.staff_no)";
      var identity=stars?"d.chn_code":tail?"JSON_ARRAY(d.agent,d.chn_name)":"d.staff_no";
      if(detail && Params.funCode==="wgsc_searchCapacity"){
        args.searchQuery=text(Params.query).toLowerCase();
        if(!args.searchQuery || args.searchQuery.length>100 || ["people","channels"].indexOf(Params.kind)<0)throw new Error("查询参数无效");
        var name=stars||tail?"d.chn_name":"d.staff_name";
        condition+=" AND LOCATE(#{searchQuery},LOWER(CONCAT(COALESCE("+name+",''),' ',COALESCE("+identity+",''))))>0";
      }
      var matchIdentity = "c."+capacityKey+"=d."+key+" AND c.branch_company=d.branch AND c.grid_name=d.grid";
      
      // Filter matching roster identities before source aggregation; retain the outer roster for absent records.
      var sourceClause = clause;
      if (Params.funCode === "wgsc_searchCapacity") sourceClause += " AND EXISTS (SELECT 1 FROM "+
        latestDimension(dimension,key)+" d"+condition+" AND "+matchIdentity+")";
      var measured="SELECT c.branch_company,c.grid_name,c."+capacityKey+" AS identity,c.product_name,"+(daily?"'day'":"c.prod_period_type")+" AS period,"+
        "SUM(c.capacity) AS production,SUM(CASE WHEN c.capacity IS NULL OR c.capacity<0 THEN 1 ELSE 0 END) AS invalidCount,MIN(c.channel_name) AS channel"+
        " FROM "+table+" c"+sourceClause+
        " GROUP BY c.branch_company,c.grid_name,c."+capacityKey+",c.product_name"+(daily?"":",c.prod_period_type");
      var columns="d.branch AS branchId,CONCAT(d.branch,'::',d.grid) AS gridId,p.productName,v.period,'"+type+"' AS channelType,"+
        "SUM(COALESCE(m.production,0)) AS production,SUM(COALESCE(m.invalidCount,0)) AS invalidCount,";
      if(detail)columns+=(stars||tail?"''":"MAX(d.staff_no)")+" AS staffId,"+(stars||tail?"''":"MAX(d.staff_name)")+" AS staffName,"+
        (stars||tail?"''":"MAX(d.team_type)")+" AS staffRole,"+(stars||tail?"MAX(d.chn_name)":"COALESCE(MIN(m.channel),'')")+" AS channel,"+
        (stars?"MAX(d.chn_code)":"''")+" AS channelCode,"+(stars?"MAX(d.star)":"''")+" AS star,"+
        (tail?"MAX(d.chn_name)":"''")+" AS microChannelName,"+(tail?"MAX(d.agent)":"''")+" AS serviceProvider,"+
        (stars?"NULL":"COUNT(DISTINCT d.staff_no)")+" AS staffCount";
      else columns+="'' AS staffId,'' AS staffName,'' AS staffRole,'' AS channel,'' AS channelCode,'' AS star,'' AS microChannelName,'' AS serviceProvider,NULL AS staffCount";
      var productMatch="(m.product_name=p.productName OR m.product_name=p.productId OR (p.productId='homeBroadband' AND m.product_name='手宽归档') OR (p.productId='plan119' AND m.product_name IN ('129+高套','119+套餐')))";
      blocks.push("SELECT "+columns+" FROM "+latestDimension(dimension,key)+" d CROSS JOIN ("+productQuery+") p CROSS JOIN ("+periodQuery+") v"+
        " LEFT JOIN ("+measured+") m ON m.identity=d."+key+" AND m.branch_company=d.branch AND m.grid_name=d.grid AND m.period=v.period AND "+productMatch+condition+
        " GROUP BY d.branch,d.grid,p.productName,v.period"+(detail?","+identity:""));
    }
    return blocks.length?blocks.join(" UNION ALL "):emptyCapacityQuery();
  }
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
  function metadata() {
    var cutoff=latest(tables.region),batch=latestDaily(tables.regionDay);
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

  try {
    if(Params.funCode!=="wgsc_searchCapacity")throw new Error("非法调用");
    user=authenticate();
    var result=search(),page=Number(Params.page||1),size=Number(Params.pageSize||200);
    if(!isFinite(page)||page<1||Math.floor(page)!==page||!isFinite(size)||size<1||size>1000||Math.floor(size)!==size)throw new Error("分页参数无效");
    var total=result.results.length,offset=(page-1)*size;
    result.results=result.results.slice(offset,offset+size);
    result.pagination={page:page,pageSize:size,total:total,hasMore:offset+size<total};
    JsResult.result=JSON.stringify({result:{retCode:"0",retMsg:"成功",data:result}});
  }catch(e){JsResult.result=JSON.stringify({result:{retCode:String(e.message).indexOf("00008:")===0?"00008":"1",retMsg:e.message||"速查执行失败",data:null}});}
}
init();
