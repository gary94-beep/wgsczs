// sczs_ai_api.js
// 专用于后台 Python 跑批（取数 + 存分析结果） & 前端查结果
function init() {
  // ========== 表名 ==========
  var tables = {
    region: "app_open_api_c003_wgsc_region_capacity_1",
    channel: "app_open_api_c001_wgsc_chn_capacity_1",
    staffCapacity: "app_open_api_c003_wgsc_staff_capacity_1",
    channelInfo: "app_open_api_c002_wgsc_chn_level_1",
    staff: "app_open_api_c002_wgsc_staff_1",
    targets: "app_open_api_c001_wgsc_target_1",
    aiAnalysis: "app_open_api_c004_wgsc_ai_analysis_1",
    terminal: "app_open_api_c002_wgsc_staff_terminal_1"
  };

  var products = [
    { productId: "newNumbers",     productName: "放号",         unit: "户" },
    { productId: "plan119",        productName: "高套（129+）", unit: "户" },
    { productId: "terminal",       productName: "终端合约",     unit: "单" },
    { productId: "homeBroadband",  productName: "手宽新增",     unit: "户" },
    { productId: "gigabit",        productName: "千兆运营",     unit: "户" }
  ];

  var MOBILEWORK_SECRET = "7cfaa66f21ca170fa5475d4d65aac07e";

  function text(v) { return String(v === null || v === undefined ? "" : v).replace(/^\s+|\s+$/g, ""); }
  function parse(v) { for (var i = 0; i < 3 && typeof v === "string"; i++) { try { v = JSON.parse(v); } catch (e) { break; } } return v; }
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
  function num(v) { var n = Number(v); if (!isFinite(n) || n < 0) throw new Error("数值必须非负且有限：" + v); return n; }
  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function formatDate(d) { return d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate()); }
  function date(v) {
    var s;
    if (Object.prototype.toString.call(v) === "[object Date]") s = v.getFullYear() + "-" + pad(v.getMonth() + 1) + "-" + pad(v.getDate());
    else if (typeof v === "number" && isFinite(v)) { var d1 = new Date(v + 8 * 3600000); s = d1.getUTCFullYear() + "-" + pad(d1.getUTCMonth() + 1) + "-" + pad(d1.getUTCDate()); }
    else {
      s = text(v).replace(/[T\s].*$/, "").slice(0, 10).replace(/^(\d{4})(\d{2})(\d{2})$/, "$1-$2-$3").replace(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/, function (_, y, m, d) { return y + "-" + ("0" + m).slice(-2) + "-" + ("0" + d).slice(-2); });
      var m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/); if (m) s = m[1] + "-" + ("0" + m[2]).slice(-2) + "-" + ("0" + m[3]).slice(-2);
    }
    var d2 = new Date(s + "T00:00:00Z");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || isNaN(d2.getTime()) || formatDate(d2) !== s) throw new Error("无效日期：" + v);
    return s;
  }
  function now() { var d = new Date(new Date().getTime() + 8 * 3600000); return formatDate(d) + " " + pad(d.getUTCHours()) + ":" + pad(d.getUTCMinutes()) + ":" + pad(d.getUTCSeconds()); }
  function productId(name) { for (var i = 0; i < products.length; i++) { if (products[i].productName === name || products[i].productId === name) return products[i].productId; } throw new Error("未知产品：" + name); }

  function checkAuth() {
    var secret = text(Params.secret);
    if (!secret || secret !== MOBILEWORK_SECRET) throw new Error("鉴权失败：secret 无效");
  }

  // ============================================================
  // 接口 1：取分析输入（含渠道过滤）
  // ============================================================
  function fetchAnalysisInput() {
    var statDate = text(Params.statDate);
    var scopeType = text(Params.scopeType) || "city";
    var scopeId = text(Params.scopeId);
    var channelType = text(Params.channelType) || "全部类型";

    if (["city", "branch", "grid"].indexOf(scopeType) < 0) throw new Error("scopeType 无效");
    if (scopeType !== "city" && !scopeId) throw new Error("scopeType 非 city 时必须传 scopeId");

    if (!statDate) {
      var latestRows = sql("SELECT MAX(stat_date) AS d FROM " + tables.region, {}, true);
      if (!latestRows || !latestRows[0] || !latestRows[0].d) throw new Error("产能表无数据");
      statDate = date(latestRows[0].d);
    } else {
      statDate = date(statDate);
    }

    // 基础过滤参数
    var regionArgs = { cutoff: statDate };
    var scopeCond = "";
    if (scopeType === "branch") {
      scopeCond = " AND branch_company=#{scopeId}";
      regionArgs.scopeId = scopeId;
    } else if (scopeType === "grid") {
      var parts = scopeId.split("::");
      scopeCond = " AND branch_company=#{branch} AND grid_name=#{grid}";
      regionArgs.branch = parts[0];
      regionArgs.grid = parts[1];
    }

    // ---------- 1. 根据类型查询产能并组装 ----------
    var capacityMap = {};
    function addCap(productName, periodType, value) {
      var pid = productId(productName);
      if (!capacityMap[pid]) capacityMap[pid] = { day: 0, mon: 0, week: 0, last_mon: 0 };
      if (["day", "mon", "week", "last_mon"].indexOf(periodType) >= 0) {
        capacityMap[pid][periodType] += num(value);
      }
    }

    if (channelType === "全部类型") {
      // 查区域产能表
      var rows = sql("SELECT product_name, prod_period_type, SUM(capacity) AS total FROM " + tables.region + " WHERE stat_date=#{cutoff}" + scopeCond + " GROUP BY product_name, prod_period_type", regionArgs, true);
      for (var i = 0; i < rows.length; i++) addCap(rows[i].product_name, rows[i].prod_period_type, rows[i].total);
      
    } else if (channelType === "三星+渠道") {
      // 查渠道产能表联表渠道维度表 (使用别名)
      var cArgs = JSON.parse(JSON.stringify(regionArgs));
      var cCond = scopeCond.replace(/branch_company/g, "c.branch_company").replace(/grid_name/g, "c.grid_name");
      var rows = sql("SELECT c.product_name, c.prod_period_type, SUM(c.capacity) AS total FROM " + tables.channel + " c INNER JOIN " + tables.channelInfo + " ci ON c.channel_code = ci.chn_code WHERE c.stat_date=#{cutoff} AND ci.star_level = '三星+'" + cCond + " GROUP BY c.product_name, c.prod_period_type", cArgs, true);
      for (var i = 0; i < rows.length; i++) addCap(rows[i].product_name, rows[i].prod_period_type, rows[i].total);

    } else if (channelType === "末梢渠道") {
      // 查工号产能表联表末梢维度表
      var sArgs = JSON.parse(JSON.stringify(regionArgs));
      var sCond = scopeCond.replace(/branch_company/g, "c.branch_company").replace(/grid_name/g, "c.grid_name");
      var rows = sql("SELECT c.product_name, c.prod_period_type, SUM(c.capacity) AS total FROM " + tables.staffCapacity + " c INNER JOIN " + tables.terminal + " t ON c.staff_no = t.staff_no WHERE c.stat_date=#{cutoff}" + sCond + " GROUP BY c.product_name, c.prod_period_type", sArgs, true);
      for (var i = 0; i < rows.length; i++) addCap(rows[i].product_name, rows[i].prod_period_type, rows[i].total);

    } else if (channelType === "直销队伍") {
      // 查工号产能表联表员工维度表
      var stArgs = JSON.parse(JSON.stringify(regionArgs));
      var stCond = scopeCond.replace(/branch_company/g, "c.branch_company").replace(/grid_name/g, "c.grid_name");
      var rows = sql("SELECT c.product_name, c.prod_period_type, SUM(c.capacity) AS total FROM " + tables.staffCapacity + " c INNER JOIN " + tables.staff + " st ON c.staff_no = st.staff_no WHERE c.stat_date=#{cutoff}" + stCond + " GROUP BY c.product_name, c.prod_period_type", stArgs, true);
      for (var i = 0; i < rows.length; i++) addCap(rows[i].product_name, rows[i].prod_period_type, rows[i].total);
    }

    // ---------- 2. 查询目标 ----------
    var targetScope = "";
    var targetArgs = { month: statDate.slice(0, 7) };
    if (scopeType === "branch") {
      targetScope = " AND branch=#{scopeId}";
      targetArgs.scopeId = scopeId;
    } else if (scopeType === "grid") {
      var p2 = scopeId.split("::");
      targetScope = " AND branch=#{branch} AND grid=#{grid}";
      targetArgs.branch = p2[0];
      targetArgs.grid = p2[1];
    }
    var targetRows = sql("SELECT product_id, SUM(month_target) AS month_target, SUM(day_target) AS day_target FROM " + tables.targets + " WHERE target_month=#{month}" + targetScope + " GROUP BY product_id", targetArgs, true);
    var targetMap = {};
    for (var i = 0; i < targetRows.length; i++) {
      var t = targetRows[i];
      targetMap[t.product_id] = {
        monthTarget: t.month_target !== null ? num(t.month_target) : null,
        dayTarget:   t.day_target   !== null ? num(t.day_target) : null
      };
    }

    // ---------- 3. 组装产品数据 ----------
    var elapsed = new Date(statDate + "T00:00:00Z").getUTCDate();
    var productData = [];
    for (var i = 0; i < products.length; i++) {
      var p = products[i];
      var c = capacityMap[p.productId] || { day: 0, mon: 0, week: 0, last_mon: 0 };
      var tg = targetMap[p.productId] || { monthTarget: null, dayTarget: null };
      var monthAverage = c.mon === 0 ? undefined : Math.round(c.mon / elapsed * 100) / 100;
      var weekAverage  = c.week === 0 ? undefined : Math.round(c.week / 7 * 100) / 100;
      productData.push({
        productId: p.productId, productName: p.productName, unit: p.unit,
        dayProduction: c.day, monthProduction: c.mon, weekProduction: c.week, lastMonthProduction: c.last_mon,
        monthTarget: tg.monthTarget, dayTarget: tg.dayTarget,
        monthCompletionRate: tg.monthTarget ? Math.round(c.mon / tg.monthTarget * 1000) / 10 : null,
        dayCompletionRate:   tg.dayTarget   ? Math.round(c.day / tg.dayTarget   * 1000) / 10 : null,
        monthAverage: monthAverage, weekAverage: weekAverage
      });
    }

    // ---------- 4. 极简查预警（给大模型看足够了） ----------
    // 避免复杂的 JOIN 导致报错，这里只取产能最差的工号和渠道
    var lowPeople = [];
    var lowChannels = [];
    try {
      var lpSql = "SELECT staff_no AS id, branch_company AS b, grid_name AS g, channel_name AS c, SUM(capacity) AS v FROM " + tables.staffCapacity + " WHERE stat_date=#{cutoff} AND prod_period_type='day'" + scopeCond + " GROUP BY staff_no, branch_company, grid_name, channel_name ORDER BY v ASC LIMIT 10";
      var lpRows = sql(lpSql, regionArgs, true);
      for (var i = 0; i < lpRows.length; i++) {
        lowPeople.push({ staffNo: lpRows[i].id, branchName: lpRows[i].b, gridName: lpRows[i].g, channelName: lpRows[i].c, production: num(lpRows[i].v) });
      }

      var lcSql = "SELECT channel_code AS id, branch_company AS b, grid_name AS g, channel_name AS c, SUM(capacity) AS v FROM " + tables.channel + " WHERE stat_date=#{cutoff} AND prod_period_type='day'" + scopeCond + " GROUP BY channel_code, branch_company, grid_name, channel_name ORDER BY v ASC LIMIT 10";
      var lcRows = sql(lcSql, regionArgs, true);
      for (var i = 0; i < lcRows.length; i++) {
        lowChannels.push({ channelCode: lcRows[i].id, branchName: lcRows[i].b, gridName: lcRows[i].g, channelName: lcRows[i].c, production: num(lcRows[i].v) });
      }
    } catch (e) {}

    var alerts = [];
    if (lowPeople.length > 0 || lowChannels.length > 0) {
      alerts.push({
        productId: "all", productName: "综合预警",
        lowPeople: lowPeople, lowChannels: lowChannels
      });
    }

    // ---------- 5. 查组织架构（前端/跑批通用） ----------
    var branchRows = sql("SELECT DISTINCT branch_company AS branchId, branch_company AS branchName FROM " + tables.region + " WHERE stat_date=#{cutoff} AND branch_company <> '全市' ORDER BY branch_company", { cutoff: statDate }, true);
    var gridRows = sql("SELECT DISTINCT branch_company AS branchId, grid_name AS gridName FROM " + tables.region + " WHERE stat_date=#{cutoff} AND branch_company <> '全市' AND grid_name <> branch_company ORDER BY branch_company, grid_name", { cutoff: statDate }, true);
    var branches = [], grids = [];
    for (var i = 0; i < branchRows.length; i++) branches.push({ branchId: branchRows[i].branchId, branchName: branchRows[i].branchName });
    for (var i = 0; i < gridRows.length; i++) grids.push({ gridId: gridRows[i].branchId + "::" + gridRows[i].gridName, gridName: gridRows[i].gridName, branchId: gridRows[i].branchId });

    return {
      statDate: statDate, 
      scopeType: scopeType, 
      scopeId: scopeId, 
      scopeName: scopeType === "city" ? "全市" : scopeId,
      channelType: channelType,
      products: productData, 
      alerts: alerts,
      organization: { cityName: "中山市", branches: branches, grids: grids }, 
      generatedAt: now()
    };
  }
  // ============================================================
  // 接口 2：写分析结果（带清理）
  // ============================================================
  function saveAnalysisResult() {
    var statDate = date(Params.statDate);
    var scopeType = text(Params.scopeType);
    var scopeId = text(Params.scopeId);
    var answer = text(Params.answer);
    var channelType = text(Params.channelType) || "全部类型"; 

    if (["city", "branch", "grid"].indexOf(scopeType) < 0) throw new Error("scopeType 无效");
    if (!scopeId) throw new Error("scopeId 不能为空");
    if (!answer) throw new Error("answer 不能为空");
    if (answer.length > 8000) throw new Error("answer 超过 8000 字");

    var ts = now();

    sql(
      "INSERT INTO " + tables.aiAnalysis +
      " (stat_date, scope_type, scope_id, channel_type, answer, created_at, updated_at) " +
      "VALUES (#{statDate}, #{scopeType}, #{scopeId}, #{channelType}, #{answer}, #{createdAt}, #{updatedAt}) " +
      "ON DUPLICATE KEY UPDATE channel_type=VALUES(channel_type), answer=VALUES(answer), updated_at=VALUES(updated_at)",
      { statDate: statDate, scopeType: scopeType, scopeId: scopeId, channelType: channelType, answer: answer, createdAt: ts, updatedAt: ts },
      false
    );

    try {
      var dateObj = new Date(statDate + "T00:00:00Z");
      dateObj.setUTCDate(dateObj.getUTCDate() - 2);
      var cutoffDate = dateObj.getUTCFullYear() + "-" + ("0" + (dateObj.getUTCMonth() + 1)).slice(-2) + "-" + ("0" + dateObj.getUTCDate()).slice(-2);
      sql("DELETE FROM " + tables.aiAnalysis + " WHERE stat_date <= #{cutoffDate}", { cutoffDate: cutoffDate }, false);
    } catch (delErr) { }

    return { statDate: statDate, scopeType: scopeType, scopeId: scopeId, channelType: channelType, saved: true };
  }

  // ============================================================
  // 接口 3：读分析结果（前端调用）
  // ============================================================
  function getAnalysisResult() {
    var statDate = text(Params.statDate);
    var scopeType = text(Params.scopeType);
    var scopeId = text(Params.scopeId);
    var channelType = text(Params.channelType);

    if (statDate) statDate = date(statDate);
    if (scopeType && ["city", "branch", "grid"].indexOf(scopeType) < 0) throw new Error("scopeType 无效");
    if (scopeType && !scopeId) throw new Error("scopeType 存在时 scopeId 不能为空");

    var where = " WHERE 1=1 ";
    var args = {};

    if (statDate) { args.statDate = statDate; where += " AND stat_date=#{statDate} "; }
    if (scopeType) { args.scopeType = scopeType; args.scopeId = scopeId; where += " AND scope_type=#{scopeType} AND scope_id=#{scopeId} "; }
    
    if (channelType !== "") {
      args.channelType = channelType;
      where += " AND channel_type=#{channelType} ";
    } else {
      args.channelType = "全部类型";
      where += " AND channel_type=#{channelType} ";
    }

    var rows = sql("SELECT id, stat_date, scope_type, scope_id, channel_type, answer, created_at, updated_at FROM " + tables.aiAnalysis + where + " ORDER BY stat_date DESC, scope_type, scope_id LIMIT 200", args, true);
    var out = [];
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      out.push({ 
        id: r.id, 
        statDate: date(r.stat_date), 
        scopeType: text(r.scope_type), 
        scopeId: text(r.scope_id), 
        channelType: text(r.channel_type) || "全部类型", 
        answer: text(r.answer), 
        createdAt: text(r.created_at), 
        updatedAt: text(r.updated_at) 
      });
    }
    return { count: out.length, rows: out };
  }

  // ============================================================
  // 接口 4：独立清理数据
  // ============================================================
  function cleanExpiredData() {
    var statDate = date(Params.statDate);
    var dateObj = new Date(statDate + "T00:00:00Z");
    dateObj.setUTCDate(dateObj.getUTCDate() - 2);
    var cutoffDate = dateObj.getUTCFullYear() + "-" + ("0" + (dateObj.getUTCMonth() + 1)).slice(-2) + "-" + ("0" + dateObj.getUTCDate()).slice(-2);
    sql("DELETE FROM " + tables.aiAnalysis + " WHERE stat_date <= #{cutoffDate}", { cutoffDate: cutoffDate }, false);
    return { cleaned: true, cutoffDate: cutoffDate };
  }

  var handlers = {
    wgsc_aiFetchAnalysisInput: fetchAnalysisInput,
    wgsc_aiSaveAnalysisResult: saveAnalysisResult,
    wgsc_aiGetAnalysisResult: getAnalysisResult,
    wgsc_aiCleanExpiredData: cleanExpiredData
  };

  try {
    if (!Object.prototype.hasOwnProperty.call(handlers, Params.funCode)) throw new Error("非法调用");
    if (Params.funCode !== "wgsc_aiGetAnalysisResult") {
      checkAuth();
    }
    var result = handlers[Params.funCode]();
    JsResult.result = JSON.stringify({ result: { retCode: "0", retMsg: "成功", data: result } });
  } catch (e) {
    var errDetail;
    try { errDetail = JSON.stringify({ name: e && e.name, message: e && e.message, stack: e && e.stack }); } catch (ee) { errDetail = String(e); }
    JsResult.result = JSON.stringify({ result: { retCode: "1", retMsg: errDetail, data: null } });
  }
}
init();