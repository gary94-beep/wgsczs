// Handle2 globals: Params, JsResult, CustomizeUtil. Keep ES5 syntax for platform execution.
function init() {
  // ========== 表名 ==========
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
    targets: "app_open_api_c003_wgsc_target_1",
    scripts: "app_open_api_c001_wgsc_script_1"
  };
  // ========== 产品 ==========
  var products = [
    { productId: "newNumbers", productName: "放号", unit: "户" },
    { productId: "plan119", productName: "高套（129+）", unit: "户" },
    { productId: "terminal", productName: "终端合约", unit: "单" },
    { productId: "homeBroadband", productName: "手宽新增", unit: "户" },
    { productId: "gigabit", productName: "千兆运营", unit: "户" }
  ];
  // ========== 工具函数 ==========
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
  function optionalTarget(v) {
    return v === null || v === undefined || text(v) === "" ? null : num(v);
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
  function period(v) {
    var map = {
      "月产能（mon）": "mon",
      "日产能（day）": "day",
      "7天产能（week）": "week",
      "上月同期产能（last mon）": "last_mon"
    };
    v = map[text(v)] || text(v);
    if (["mon", "day", "week", "last_mon"].indexOf(v) < 0) throw new Error("无效周期");
    return v;
  }
  function gridId(b, g) {
    return b + "::" + g;
  }
  // 手机号清洗，与 sczs_common_api.js 保持一致
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
  var user;
  var alertRoster = null;
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
  // ============================================================
  // filtered
  // ============================================================
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
  // ============================================================
  // alerts
  // ============================================================
  function alerts() {
    if (["month", "day"].indexOf(Params.period) < 0) throw new Error("预警周期无效");
    product(Params.productId);
    var data = dashboard();
    var source = filtered(data, Params.period);
    var threshold = num(Params.threshold);
    var people = [];
    var channels = [];
    for (var i = 0; i < source.length; i++) {
      if (source[i].production <= threshold && (!Params.channel || source[i].channel === Params.channel)) {
        if (source[i].channelType === "直销队伍") people.push(source[i]);
        else channels.push(source[i]);
      }
    }
    people.sort(function (a, b) { return a.production - b.production; });
    channels.sort(function (a, b) { return a.production - b.production; });
    return { people: people, channels: channels, statDate: Params.period === "day" ? data.dailyStatDate : data.statDate, dailyStatDate: data.dailyStatDate, dailyStatHour: data.dailyStatHour, comparisonStatDate: data.statDate, totals: populationTotals(data), totalSource: "dimension" };
  }
  // ============================================================
  // search
  // ============================================================
  // Monthly staff goals are read only for matching personnel search results.
  // Query only matched managers and their distinct current links; never load these at login.
  // ============================================================
  // buildAiSummary
  // ============================================================
  function buildAiSummary() {
    if (String(Params.consent) !== "1") throw new Error("请先同意将汇总指标发送至MoMA分析");
    if (["overview", "alerts"].indexOf(Params.view) < 0) throw new Error("分析页面无效");
    var category = text(Params.channelType);
    if (["", "三星+渠道", "末梢渠道", "直销队伍"].indexOf(category) < 0) throw new Error("生产类型无效");
    var data = dashboard(), ids = parse(Params.gridIds || "[]"), allowed = {}, chosen = {};
    if (Object.prototype.toString.call(ids) !== "[object Array]") throw new Error("gridIds须为数组");
    var i, j, r;
    for (i = 0; i < data.organization.grids.length; i++) allowed[data.organization.grids[i].gridId] = true;
    for (i = 0; i < ids.length; i++) {
      if (!allowed[ids[i]]) throw new Error("无权分析该网格");
      chosen[ids[i]] = true;
    }
    if (!ids.length) chosen = allowed;
    var selectedProducts = Params.view === "alerts" ? [product(Params.productId)] : products;
    var cutoff = new Date(data.statDate + "T00:00:00Z"), elapsed = cutoff.getUTCDate();
    var previousDays = Math.min(elapsed, new Date(Date.UTC(cutoff.getUTCFullYear(), cutoff.getUTCMonth(), 0)).getUTCDate());
    var rootScope = Params.view === "overview" && !ids.length;
    function sum(periodValue, productId) {
      var list = category ? data.periodRows : data.regionRows, total = null;
      for (var k = 0; k < list.length; k++) {
        var row = list[k];
        if (row.productId !== productId || row.period !== periodValue) continue;
        if (category ? (row.channelType !== category || !chosen[row.gridId]) : rootScope ?
          (row.level !== user.role || (user.role === "branch" && row.branchId !== user.branchId) || (user.role === "grid" && row.gridId !== user.gridId)) :
          (row.level !== "grid" || !chosen[row.gridId])) continue;
        total = (total === null ? 0 : total) + row.production;
      }
      return total;
    }
    function goal(productId, daily) {
      if (category) return null;
      var value = 0, count = 0;
      for (var key in chosen) if (Object.prototype.hasOwnProperty.call(chosen, key)) {
        var match = null;
        for (var k = 0; k < data.targets.length; k++) {
          var t = data.targets[k];
          if (t.gridId === key && t.productId === productId && t.targetMonth === (daily ? data.dailyStatDate : data.statDate).slice(0,7)) { match = t; break; }
        }
        if (!match || (!daily && match.target === null) || (daily && match.dailyTarget === null)) return null;
        value += daily ? match.dailyTarget : match.target; count++;
      }
      return count ? value : null;
    }
    function progress(value, target) {
      return { production: value, target: target, gap: value === null || target === null ? null : Math.max(target - value, 0), completionRate: value === null || target === null || target === 0 ? null : value / target * 100 };
    }
    function change(value, base) {
      return { value: value === null || base === null ? null : value - base, rate: value === null || base === null || base === 0 ? null : (value - base) / base * 100 };
    }
    var summary = { scope: user.role === "city" ? "中山市" : user.gridName || user.branchName, statDate: data.statDate, dailyStatDate: data.dailyStatDate, dailyStatHour: data.dailyStatHour, demo: false, channelType: category || "全部类型", weekBasis: "rolling7", products: [] };
    for (i = 0; i < selectedProducts.length; i++) {
      var p = selectedProducts[i], day = sum("day", p.productId), month = sum("mon", p.productId), week = sum("week", p.productId), last = sum("last_mon", p.productId);
      var weeklyAverage = week === null ? null : week / 7, monthAverage = month === null ? null : month / elapsed, previousAverage = last === null ? null : last / previousDays;
      summary.products.push({ product: p.productName, unit: p.unit, day: progress(day, goal(p.productId, true)), month: progress(month, goal(p.productId, false)), weeklyAverage: weeklyAverage, monthAverage: monthAverage, previousAverage: previousAverage, dayComparison: change(day, weeklyAverage), monthComparison: change(monthAverage, previousAverage) });
    }
    if (Params.view === "alerts") {
      if (["day", "month"].indexOf(Params.period) < 0) throw new Error("预警周期无效");
      summary.period = Params.period; summary.threshold = num(Params.threshold);
      summary.scope = ids.length === 1 ? "选定网格" : "选定网格范围";
      summary.alerts = [{ category: "直销人员", count: 0 }, { category: "3星+渠道", count: 0 }, { category: "末梢渠道", count: 0 }, { category: "营业厅", count: 0 }];
      var alertCounts = aiAlertCounts(data);
      for (j = 0; j < alertCounts.length; j++) {
        var categoryIndex = ["直销队伍", "三星+渠道", "末梢渠道", "营业厅"].indexOf(alertCounts[j].channelType);
        if (categoryIndex >= 0) summary.alerts[categoryIndex].count = Number(alertCounts[j].total);
      }
    }
    return summary;
  }
  // SQL aggregation boundary: never select raw capacity tables into JavaScript.
  var dashboardMemo = null;
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
      var matchIdentity = "c."+capacityKey+"=d."+key+" AND c.branch_company=d.branch AND c.grid_name=d.grid";
      if (!detail) {
        // Summarize only measured records. Never enumerate a personnel/product/period matrix at login.
        var normalizedProduct = "CASE " + products.map(function (p) {
          return "WHEN c.product_name IN ("+capacityProductNames(p)+") THEN '"+p.productName+"'";
        }).join(" ") + " END";
        blocks.push("SELECT c.branch_company AS branchId,CONCAT(c.branch_company,'::',c.grid_name) AS gridId,"+
          normalizedProduct+" AS productName,"+(daily?"'day'":"c.prod_period_type")+" AS period,'"+type+"' AS channelType,"+
          "SUM(c.capacity) AS production,SUM(CASE WHEN c.capacity IS NULL OR c.capacity<0 THEN 1 ELSE 0 END) AS invalidCount,"+
          "'' AS staffId,'' AS staffName,'' AS staffRole,'' AS channel,'' AS channelCode,'' AS star,'' AS microChannelName,'' AS serviceProvider,NULL AS staffCount"+
          " FROM "+table+" c INNER JOIN "+latestDimension(dimension,key)+" d ON "+matchIdentity+condition+
          clause.replace(" WHERE "," AND ")+" AND ("+normalizedProduct+") IS NOT NULL"+
          " GROUP BY c.branch_company,c.grid_name,"+normalizedProduct+(daily?"":",c.prod_period_type"));
        continue;
      }
      // Filter matching roster identities before source aggregation; retain the outer roster for absent records.
      var sourceClause = clause;
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
  function fillSummaryZeros(data, selected) {
    var seen = {}, types = ["三星+渠道", "直销队伍", "末梢渠道", "营业厅"], periods = [];
    if (data.statDate) periods = ["mon", "week", "last_mon"];
    if (data.dailyStatDate) periods.push("day");
    function key(grid, type, name, period) { return JSON.stringify([grid, type, name, period]); }
    for (var i = 0; i < selected.length; i++) {
      var r = selected[i];
      seen[key(r.gridId, r.channelType, r.productName, r.period)] = true;
    }
    for (i = 0; i < data.organization.grids.length; i++) {
      var grid = data.organization.grids[i];
      for (var t = 0; t < types.length; t++) for (var p = 0; p < products.length; p++) for (var v = 0; v < periods.length; v++) {
        if (!seen[key(grid.gridId, types[t], products[p].productName, periods[v])]) selected.push({
          branchId: grid.branchId, gridId: grid.gridId, channelType: types[t], productName: products[p].productName,
          period: periods[v], production: 0, invalidCount: 0, staffCount: null
        });
      }
    }
    return selected;
  }
  function mapCapacity(r, statDate) {
    if (Number(r.invalidCount) > 0) throw new Error("产能包含空值或负数，不能作为零聚合，请修正源数据");
    // 过滤 Handle2 网关把 null 转成的空对象 {}，如果是纯文本则保留
    var rawStar = (typeof r.star === 'object' && r.star !== null) ? null : r.star;
    if (rawStar === "") rawStar = null;
    var out = { branchId: r.branchId, gridId: r.gridId, productId: product(r.productName).productId,
      period: r.period, production: num(r.production), channelType: r.channelType,
      staffId: r.staffId || "", staffName: r.staffName || "", staffRole: r.staffRole || "",
      channel: r.channel || "", channelCode: r.channelType === "末梢渠道" ? "tail:" + JSON.stringify([r.serviceProvider || "", r.microChannelName || ""]) : r.channelCode || "",
      // 直接返回原始文本（如"六星C"），如果为空则返回 null
      channelStar: rawStar,
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
    var cutoff = latest(tables.region), dailyBatch = latestDaily(tables.regionDay), dailyCutoff = dailyBatch.date;
    var data = { organization: { cityName: "中山市", branches: [], grids: [] }, statDate: cutoff, dailyStatDate: dailyCutoff, dailyStatHour: dailyBatch.hour, dailyStamp: dailyBatch.stamp,
      products: products, targets: [], rows: [], dailyRows: [], periodRows: [], regionRows: [],
      salesScripts: [], warnings: [], missingCapacityIsZero: true, weekBasis: "rolling7", permission: user, aggregated: true };
    if (!cutoff) data.warnings.push("当前范围没有区域周期产能数据");
    if (!dailyCutoff) data.warnings.push("当前范围没有区域日产能数据");
    if (!cutoff && !dailyCutoff) return data;
    var args = { cutoff: cutoff }, regionClause = scope("branch_company", "grid_name", args);
    var region = pagedSql("SELECT branch_company,grid_name,product_name,prod_period_type,SUM(capacity) AS capacity," +
      "SUM(CASE WHEN capacity IS NULL OR capacity<0 THEN 1 ELSE 0 END) AS invalid_count,MAX(snapshot_time) AS snapshot_time FROM " +
      tables.region + " WHERE stat_date=#{cutoff} AND prod_period_type IN ('mon','week','last_mon')" + regionClause + " GROUP BY branch_company,grid_name,product_name,prod_period_type", args,
      "branch_company,grid_name,product_name,prod_period_type");
    if (dailyCutoff) {
      var dayArgs={dailyCutoff:dailyBatch.stamp}, dayClause=scope("branch_company","grid_name",dayArgs);
      var dailyRegion=pagedSql("SELECT branch_company,grid_name,product_name,'day' AS prod_period_type,SUM(capacity) AS capacity,"+
        "SUM(CASE WHEN capacity IS NULL OR capacity<0 THEN 1 ELSE 0 END) AS invalid_count,MAX(snapshot_time) AS snapshot_time FROM "+tables.regionDay+
        " WHERE "+"("+dailyStamp("stat_date")+")=#{dailyCutoff}"+dayClause+" GROUP BY branch_company,grid_name,product_name",dayArgs,"branch_company,grid_name,product_name");
      region=region.concat(dailyRegion);
    }
    var branches = {}, grids = {};
     function org(b, g) {
      var excludeNames = ["全市", "市统筹", "未知", "中山", "中山市", "市公司"];
      if (!b || !g || excludeNames.indexOf(b) >= 0 || excludeNames.indexOf(g) >= 0) {
        return; 
      }
      branches[b] = { branchId: b, branchName: b };
      if (b !== g && !/统筹|^(未知|全市|市公司|中山市)$/.test(g)) {
        grids[gridId(b, g)] = { gridId: gridId(b, g), gridName: g, branchId: b };
      }
    }
    for (var i = 0; i < region.length; i++) {
      var r = region[i];
      if (Number(r.invalid_count) > 0) throw new Error("区域产能包含空值或负数");
      org(r.branch_company, r.grid_name);
      data.regionRows.push({ branchId: r.branch_company, gridId: gridId(r.branch_company, r.grid_name),
        level: r.branch_company === "全市" ? "city" : r.branch_company === r.grid_name && ["未知", "市统筹"].indexOf(r.grid_name) < 0 ? "branch" : "grid",
        productId: product(r.product_name).productId, period: r.prod_period_type, production: num(r.capacity), snapshotTime: r.snapshot_time, statDate: r.prod_period_type === "day" ? dailyCutoff : cutoff });
    }
    // Distinct organization pairs, never the full personnel/channel dimensions.
    var dimensions = [tables.channelInfo, tables.terminal, tables.staff], orgParts = [], orgArgs = {};
    for (i = 0; i < dimensions.length; i++) orgParts.push("SELECT DISTINCT branch,grid FROM " + dimensions[i] + " WHERE 1=1" + scope("branch", "grid", orgArgs));
    var orgs = pagedSql("SELECT branch,grid FROM (" + orgParts.join(" UNION ") + ") orgs", orgArgs, "branch,grid");
    for (i = 0; i < orgs.length; i++) org(orgs[i].branch, orgs[i].grid);
    data.organization.branches = Object.keys(branches).sort().map(function (k) { return branches[k]; });
    data.organization.grids = Object.keys(grids).sort().map(function (k) { return grids[k]; });
    var targetMonth = (cutoff || dailyCutoff).slice(0, 7), dailyMonth = (dailyCutoff || cutoff).slice(0, 7);
    var targetArgs = { month: targetMonth, monthSlash: targetMonth.replace("-", "/"), dailyMonth: dailyMonth, dailyMonthSlash: dailyMonth.replace("-", "/") };
    var goals = pagedSql("SELECT * FROM " + tables.targets + " WHERE target_month IN (#{month},#{monthSlash},#{dailyMonth},#{dailyMonthSlash})" + scope("branch", "grid", targetArgs), targetArgs, "id");
    var targetMonthDays;
    for (i = 0; i < goals.length; i++) {
      r = goals[i]; var base = optionalTarget(r.month_base_target), challenge = optionalTarget(r.month_challenge_target), minimum = optionalTarget(r.month_min_target);
      var goalMonth = text(r.target_month).replace("/", "-");
      targetMonthDays = new Date(Date.UTC(Number(goalMonth.slice(0,4)),Number(goalMonth.slice(5,7)),0)).getUTCDate();
      var daily = base === null ? null : base / targetMonthDays;
      data.targets.push({ gridId: gridId(text(r.branch), text(r.grid)), productId: product(r.product_id).productId,
        target: base, dailyTarget: daily, monthBaseTarget: base, monthChallengeTarget: challenge,
        monthMinTarget: minimum, dayMinTarget: minimum === null ? null : minimum / targetMonthDays,
        dayBaseTarget: daily, dayChallengeTarget: challenge === null ? null : challenge / targetMonthDays,
        targetMonth: text(r.target_month).replace("/", "-") });
    }
    var scripts = pagedSql("SELECT product_id,content,updated_at FROM " + tables.scripts, {}, "product_id,id");
    for (i = 0; i < scripts.length; i++) data.salesScripts.push({ productId: scripts[i].product_id, content: scripts[i].content, updatedAt: scripts[i].updated_at, status: "maintained", source: "超级管理员维护" });
    var channelDate = latest(tables.channel), staffDate = latest(tables.staffCapacity);
    var channelBatch=latestDaily(tables.channelDay), staffBatch=latestDaily(tables.staffDay);
    data.sourceDates = { region: cutoff, channel: channelDate, staff: staffDate, daily: {region: dailyCutoff, channel: channelBatch.date, staff: staffBatch.date}, dailyHours: {region: dailyBatch.hour, channel: channelBatch.hour, staff: staffBatch.hour} };
    if(dailyCutoff && channelBatch.stamp!==dailyBatch.stamp)data.warnings.push("渠道日表与区域日表批次不一致，日数据统一按"+dailyCutoff+(dailyBatch.hour?" "+dailyBatch.hour+"时":"")+"读取，未出现的工号或渠道按0统计");
    if(dailyCutoff && staffBatch.stamp!==dailyBatch.stamp)data.warnings.push("工号日表与区域日表批次不一致，日数据统一按"+dailyCutoff+(dailyBatch.hour?" "+dailyBatch.hour+"时":"")+"读取，未出现的工号或渠道按0统计");
    if (channelDate !== cutoff) data.warnings.push("渠道产能表最新日期（" + (channelDate || "无") + "）与区域产能表（" + cutoff + "）不一致，本次按区域表日期读取");
    if (staffDate !== cutoff) data.warnings.push("工号产能表最新日期（" + (staffDate || "无") + "）与区域产能表（" + cutoff + "）不一致，本次按区域表日期读取");
    return data;
  }
  function dashboard() {
    if (dashboardMemo) return dashboardMemo;
    var data = metadata();
    if (!data.statDate && !data.dailyStatDate) { dashboardMemo = data; return data; }
    var args = {}, detail = ["wgsc_fetchAlerts", "wgsc_fetchChangeAlerts", "wgsc_fetchChannelOptions"].indexOf(Params.funCode) >= 0;
    var conflictArgs = { cutoff: data.statDate };
    var conflicts = sql("SELECT 1 AS found FROM " + tables.staffCapacity + " c WHERE c.stat_date=#{cutoff}" +
      scope("c.branch_company", "c.grid_name", conflictArgs) +
      " AND EXISTS (SELECT 1 FROM " + tables.staff + " s WHERE s.staff_no=c.staff_no)" +
      " AND EXISTS (SELECT 1 FROM " + tables.terminal + " t WHERE t.staff_no=c.staff_no) LIMIT 1", conflictArgs, true);
    if (conflicts.length) throw new Error("工号同时出现在员工与末梢维度，请先修正归属");
    var relation = capacityQuery(data, detail, args);
    var condition = " WHERE 1=1";
    if (detail && text(Params.channel)) { args.selectedChannel = text(Params.channel); condition += " AND channel=#{selectedChannel}"; }
    if (Params.funCode === "wgsc_fetchAlerts") { args.threshold = num(Params.threshold); condition += " AND production<=#{threshold}"; }
    var selectedQuery = "SELECT * FROM (" + relation + ") capacity_groups" + condition;
    if (Params.funCode === "wgsc_fetchAlerts") {
      // Export comparisons accompany only matched identities. The browser no
      // longer needs all identities' current/previous capacity records.
      var history = capacityQuery(data, true, args, ["mon", "last_mon"]);
      var keys = ["branchId", "gridId", "productName", "channelType", "staffId", "channelCode", "microChannelName", "serviceProvider"];
      var pivot = "SELECT " + keys.join(",") + "," +
        "CASE WHEN SUM(CASE WHEN period='mon' THEN 1 ELSE 0 END)>0 THEN SUM(CASE WHEN period='mon' THEN production ELSE 0 END) ELSE NULL END AS monthProduction," +
        "CASE WHEN SUM(CASE WHEN period='last_mon' THEN 1 ELSE 0 END)>0 THEN SUM(CASE WHEN period='last_mon' THEN production ELSE 0 END) ELSE NULL END AS previousProduction" +
        " FROM (" + history + ") history_groups GROUP BY " + keys.join(",");
      selectedQuery = "SELECT selected.*,h.monthProduction,h.previousProduction FROM (" + selectedQuery + ") selected LEFT JOIN (" + pivot +
        ") h ON " + keys.map(function (key) { return "selected." + key + "=h." + key; }).join(" AND ");
    }
    var selected = pagedSql(selectedQuery, args,
      "branchId,gridId,productName,period,channelType,staffId,channelCode,microChannelName,serviceProvider");
    if (!detail) selected = fillSummaryZeros(data, selected);
    function copyRow(row) {
      var out = {};
      for (var key in row) if (Object.prototype.hasOwnProperty.call(row, key)) out[key] = row[key];
      return out;
    }
    for (var i = 0; i < selected.length; i++) {
      var mapped = mapCapacity(selected[i], data.statDate);
      // Summary rows need no empty identity or nullable dimension fields.
      var row = detail ? mapped : { branchId: mapped.branchId, gridId: mapped.gridId,
        productId: mapped.productId, period: mapped.period, production: mapped.production, channelType: mapped.channelType };
      data.periodRows.push(copyRow(row));
      if (row.period === "mon") data.rows.push(copyRow(row));
      if (row.period === "day") { var dailyRow = copyRow(row); dailyRow.date = data.dailyStatDate; data.dailyRows.push(dailyRow); }
    }
    if (Params.funCode === "wgsc_fetchDashboard") {
      data.capacityDiagnostics = categoryDiagnostics(data);
      for (var di = 0; di < data.capacityDiagnostics.types.length; di++) {
        var diagnostic = data.capacityDiagnostics.types[di];
        if (!diagnostic.aggregateRows) data.warnings.push(diagnostic.channelType + "在当前截止日没有可用分类记录，请核对产能日期及维度关联");
      }
    }
    dashboardMemo = data;
    return data;
  }
  function categoryDiagnostics(data) {
    var types = ["三星+渠道", "直销队伍", "末梢渠道"], diagnostics = [], rawCounts = {};
    for (var i = 0; i < types.length; i++) {
      var type = types[i], rows = data.periodRows.filter(function (r) { return r.channelType === type; }), grids = {};
      for (var j = 0; j < rows.length; j++) grids[rows[j].gridId] = true;
      var item = { channelType: type, aggregateRows: rows.length, coveredGrids: Object.keys(grids).length };
      if (!rows.length) {
        var star = type === "三星+渠道", table = star ? tables.channel : tables.staffCapacity;
        var dimension = star ? tables.channelInfo : type === "直销队伍" ? tables.staff : tables.terminal;
        var key = star ? "chn_code" : "staff_no", capacityKey = star ? "channel_code" : "staff_no";
        var args = { cutoff: data.statDate }, condition = " WHERE c.stat_date=#{cutoff}" + scope("c.branch_company", "c.grid_name", args);
        if (rawCounts[table] === undefined) {
          var raw = sql("SELECT COUNT(*) AS total FROM " + table + " c" + condition, args, true);
          rawCounts[table] = Number(raw[0] && raw[0].total || 0);
        }
        item.sourceRowsOnDate = rawCounts[table];
        var join = " INNER JOIN " + latestDimension(dimension, key) + " d ON c." + capacityKey + "=d." + key;
        var match = sql("SELECT COUNT(*) AS code_matches,SUM(CASE WHEN c.branch_company=d.branch AND c.grid_name=d.grid THEN 1 ELSE 0 END) AS organization_matches" +
          (star ? ",SUM(CASE WHEN c.branch_company=d.branch AND c.grid_name=d.grid AND d.star_level='三星+' THEN 1 ELSE 0 END) AS star_matches" : "") +
          " FROM " + table + " c" + join + condition, args, true);
        item.codeMatchedRows = Number(match[0] && match[0].code_matches || 0);
        item.organizationMatchedRows = Number(match[0] && match[0].organization_matches || 0);
        if (star) item.starQualifiedRows = Number(match[0] && match[0].star_matches || 0);
      }
      diagnostics.push(item);
    }
    return { statDate: data.statDate, sourceDates: { region: data.sourceDates.region,
      channel: data.sourceDates.channel, staff: data.sourceDates.staff }, types: diagnostics };
  }
  function populationTotals(data) {
    var args = {}, chosen = selectedGridClause(args, data, "c");
    // The roster includes registered entities with no capacity records.
    function roster(table, key, kind, extra) {
      return "SELECT d.branch AS branchId,CONCAT(d.branch,'::',d.grid) AS gridId,'" + kind + "' AS kind," + key +
        " AS identity FROM " + latestDimension(table, kind === "stars" || kind === "halls" ? "chn_code" : "staff_no") +
        " d WHERE 1=1" + scope("d.branch", "d.grid", args) + extra;
    }
    var relation = roster(tables.staff, "d.staff_no", "people", "") + " UNION ALL " +
      roster(tables.channelInfo, "d.chn_code", "stars", " AND d.star_level='三星+'") + " UNION ALL " +
      roster(tables.channelInfo, "d.chn_code", "halls", " AND d.star_level='营业厅'") + " UNION ALL " +
      roster(tables.terminal, "JSON_ARRAY(d.agent,d.chn_name)", "tail", "");
    var ids = parse(Params.gridIds || "[]"), where = " WHERE 1=1";
    if (ids.length) {
      var placeholders = [];
      for (var i = 0; i < ids.length; i++) { args["rosterGrid" + i] = ids[i]; placeholders.push("#{rosterGrid" + i + "}"); }
      where += " AND gridId IN (" + placeholders.join(",") + ")";
    }
    if (text(Params.channel)) {
      // Resolve membership with SQL; do not reuse the already threshold-filtered alert list.
      var matchArgs = {}, matchQuery = capacityQuery(data, true, matchArgs);
      for (var key in matchArgs) if (Object.prototype.hasOwnProperty.call(matchArgs, key)) args[key] = matchArgs[key];
      args.selectedChannel = text(Params.channel);
      where += " AND EXISTS (SELECT 1 FROM (" + matchQuery + ") m WHERE m.gridId=roster.gridId AND m.channel=#{selectedChannel} AND " +
        "((roster.kind='people' AND m.channelType='直销队伍' AND m.staffId=roster.identity) OR " +
        "(roster.kind='stars' AND m.channelType='三星+渠道' AND m.channelCode=roster.identity) OR " +
        "(roster.kind='halls' AND m.channelType='营业厅' AND m.channelCode=roster.identity) OR " +
        "(roster.kind='tail' AND m.channelType='末梢渠道' AND JSON_ARRAY(m.serviceProvider,m.microChannelName)=roster.identity)))";
    }
    var counts = sql("SELECT kind,COUNT(DISTINCT CONCAT(gridId,CHAR(31),identity)) AS total FROM (" + relation + ") roster" + where + " GROUP BY kind", args, true);
    var result = { people: 0, stars: 0, tail: 0, halls: 0 };
    for (var j = 0; j < counts.length; j++) result[counts[j].kind] = Number(counts[j].total);
    return result;
  }
  function channelOptions() {
    var data = metadata(), args = {};
    if (!(Params.period === "day" ? data.dailyStatDate : data.statDate)) return { channels: [], statDate: "", dailyStatDate: data.dailyStatDate };
    var query = capacityQuery(data, true, args);
    var rows = pagedSql("SELECT DISTINCT channel FROM (" + query + ") channel_groups WHERE channel IS NOT NULL AND channel<>''", args, "channel");
    return { channels: rows.map(function (r) { return r.channel; }), statDate: Params.period === "day" ? data.dailyStatDate : data.statDate, dailyStatDate: data.dailyStatDate };
  }
  function aiAlertCounts(data) {
    var args = {}, relation = capacityQuery(data, true, args, [Params.period === "day" ? "day" : "mon"]);
    args.aiThreshold = num(Params.threshold);
    var condition = " WHERE production<=#{aiThreshold}";
    if (text(Params.channel)) { args.aiChannel = text(Params.channel); condition += " AND channel=#{aiChannel}"; }
    return sql("SELECT channelType,COUNT(*) AS total FROM (" + relation + ") qualified" + condition + " GROUP BY channelType", args, true);
  }
  function changeAlerts() {
    product(Params.productId);
    var rate = num(Params.declineRate === undefined ? 30 : Params.declineRate);
    var decrease = num(Params.declineValue === undefined ? 5 : Params.declineValue);
    if (rate > 100) throw new Error("日均减少率须为0至100");
    var data = metadata(), args = {};
    selectedGridClause(args, data, "c");
    if (!data.statDate) return { people: [], channels: [], statDate: "", totals: { people: 0, stars: 0, tail: 0, halls: 0 }, totalSource: "dimension" };
    var d = new Date(data.statDate + "T00:00:00Z");
    args.elapsed = d.getUTCDate();
    args.previousDays = Math.min(args.elapsed, new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 0)).getUTCDate());
    args.declineValue = decrease; args.declineRate = rate;
    var relation = capacityQuery(data, true, args);
    var pivot = "SELECT branchId,gridId,productName,channelType,staffId,channelCode,microChannelName,serviceProvider," +
      "MAX(staffName) AS staffName,MAX(staffRole) AS staffRole,MAX(channel) AS channel,MAX(star) AS star,MAX(staffCount) AS staffCount," +
      "SUM(invalidCount) AS invalidCount,SUM(CASE WHEN period='mon' THEN production ELSE 0 END) AS currentProduction," +
      "SUM(CASE WHEN period='last_mon' THEN production ELSE 0 END) AS previousProduction," +
      "SUM(CASE WHEN period='mon' THEN 1 ELSE 0 END) AS currentCount,SUM(CASE WHEN period='last_mon' THEN 1 ELSE 0 END) AS previousCount" +
      " FROM (" + relation + ") detail_groups GROUP BY branchId,gridId,productName,channelType,staffId,channelCode,microChannelName,serviceProvider";
    var delta = "(previousProduction/#{previousDays}-currentProduction/#{elapsed})";
    var ratio = "(" + delta + "/(previousProduction/#{previousDays})*100)";
    var where = " WHERE currentCount>0 AND previousCount>0 AND previousProduction>0 AND invalidCount=0 AND " +
      delta + ">0 AND " + delta + "+0.000000001>=#{declineValue} AND " + ratio + "+0.000000001>=#{declineRate}";
    if (text(Params.channel)) { args.selectedChannel = text(Params.channel); where += " AND channel=#{selectedChannel}"; }
    var rows = pagedSql("SELECT * FROM (" + pivot + ") comparisons" + where, args,
      "branchId,gridId,productName,channelType,staffId,channelCode,microChannelName,serviceProvider");
    var people = [], channels = [];
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i]; r.period = "mon"; r.production = r.currentProduction;
      var out = mapCapacity(r);
      out.monthAverage = Number(r.currentProduction) / args.elapsed;
      out.previousAverage = Number(r.previousProduction) / args.previousDays;
      out.declineValue = out.previousAverage - out.monthAverage;
      out.declineRate = out.declineValue / out.previousAverage * 100;
      (out.channelType === "直销队伍" ? people : channels).push(out);
    }
    function order(a, b) { return b.declineRate - a.declineRate || b.declineValue - a.declineValue || a.gridId.localeCompare(b.gridId); }
    people.sort(order); channels.sort(order);
    return { people: people, channels: channels, statDate: data.statDate, totals: populationTotals(data), totalSource: "dimension" };
  }
  function resultPage(result) {
    if (["wgsc_fetchAlerts", "wgsc_fetchChangeAlerts"].indexOf(Params.funCode) < 0) return result;
    var page = Number(Params.page || 1), size = Number(Params.pageSize || 200);
    if (!isFinite(page) || page < 1 || Math.floor(page) !== page || !isFinite(size) || size < 1 || size > 1000 || Math.floor(size) !== size) throw new Error("分页参数无效");
    var offset = (page - 1) * size;
    var list = result.results || result.people.concat(result.channels), total = list.length;
    if (result.results) result.results = list.slice(offset, offset + size);
    else {
      result.counts = { people: result.people.length,
        stars: result.channels.filter(function (r) { return r.channelType === "三星+渠道"; }).length,
        halls: result.channels.filter(function (r) { return r.channelType === "营业厅"; }).length,
        tail: result.channels.filter(function (r) { return r.channelType === "末梢渠道"; }).length };
      var selected = list.slice(offset, offset + size);
      result.people = selected.filter(function (r) { return r.channelType === "直销队伍"; });
      result.channels = selected.filter(function (r) { return r.channelType !== "直销队伍"; });
    }
    result.pagination = { page: page, pageSize: size, total: total, hasMore: offset + size < total };
    return result;
  }
  var handlers = {
    wgsc_fetchSession: function () { return { permission: user }; },
    wgsc_fetchChannelOptions: channelOptions,
    wgsc_fetchChangeAlerts: changeAlerts,
    wgsc_fetchAiSummary: buildAiSummary,
    wgsc_fetchDashboard: dashboard,
    wgsc_fetchAlerts: alerts
  };
  try {
    if (!Object.prototype.hasOwnProperty.call(handlers, Params.funCode)) throw new Error("非法调用");
    user = authenticate();
    var result = resultPage(handlers[Params.funCode]());
    JsResult.result = JSON.stringify({
      result: { retCode: "0", retMsg: "成功", data: result }
    });
  } catch (e) {
    JsResult.result = JSON.stringify({
      result: {
        retCode: String(e.message).indexOf("00008:") === 0 ? "00008" : "1",
        retMsg: e.message || "业务执行失败",
        data: null
      }
    });
  }
}
init();
