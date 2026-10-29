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
    targets: "app_open_api_c002_wgsc_target_1",
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
    if (channelType === "3星+渠道") channelType = "三星+渠道";
    if (["全部类型", "三星+渠道", "末梢渠道", "直销队伍"].indexOf(channelType) < 0) throw new Error("生产类型无效");

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
      if (parts.length !== 2 || !parts[0] || !parts[1]) throw new Error("网格标识须为分公司::网格");
      scopeCond = " AND branch_company=#{branch} AND grid_name=#{grid}";
      regionArgs.branch = parts[0];
      regionArgs.grid = parts[1];
    }

    // ---------- 1. 根据类型查询产能并组装 ----------
    var capacityMap = {};
    function addCap(productName, periodType, value) {
      if (value === null || value === undefined) return;
      var pid = productId(productName);
      if (!capacityMap[pid]) capacityMap[pid] = { day: null, mon: null, week: null, last_mon: null };
      if (["day", "mon", "week", "last_mon"].indexOf(periodType) >= 0) {
        capacityMap[pid][periodType] = (capacityMap[pid][periodType] === null ? 0 : capacityMap[pid][periodType]) + num(value);
      }
    }

    var regionLevelCond = scopeCond;
    if (scopeType === "city") regionLevelCond += " AND branch_company='全市' AND grid_name='全市'";
    if (scopeType === "branch") regionLevelCond += " AND grid_name=#{scopeId}";
    if (channelType === "全部类型") {
      // 查区域产能表
      var rows = sql("SELECT product_name, prod_period_type, SUM(capacity) AS total FROM " + tables.region + " WHERE stat_date=#{cutoff}" + regionLevelCond + " GROUP BY product_name, prod_period_type", regionArgs, true);
      for (var i = 0; i < rows.length; i++) addCap(rows[i].product_name, rows[i].prod_period_type, rows[i].total);
      
    } else if (channelType === "三星+渠道") {
      // 查渠道产能表联表渠道维度表 (使用别名)
      var cArgs = JSON.parse(JSON.stringify(regionArgs));
      var cCond = scopeCond.replace(/branch_company/g, "c.branch_company").replace(/grid_name/g, "c.grid_name");
      var rows = sql("SELECT c.product_name, c.prod_period_type, SUM(c.capacity) AS total FROM " + tables.channel + " c INNER JOIN " + "(SELECT d.* FROM " + tables.channelInfo + " d JOIN (SELECT chn_code,MAX(id) AS latest_id FROM " + tables.channelInfo + " GROUP BY chn_code) newest ON d.id=newest.latest_id) ci ON c.channel_code = ci.chn_code AND c.branch_company=ci.branch AND c.grid_name=ci.grid WHERE c.stat_date=#{cutoff} AND ci.star_level = '三星+'" + cCond + " GROUP BY c.product_name, c.prod_period_type", cArgs, true);
      for (var i = 0; i < rows.length; i++) addCap(rows[i].product_name, rows[i].prod_period_type, rows[i].total);

    } else if (channelType === "末梢渠道") {
      // 查工号产能表联表末梢维度表
      var sArgs = JSON.parse(JSON.stringify(regionArgs));
      var sCond = scopeCond.replace(/branch_company/g, "c.branch_company").replace(/grid_name/g, "c.grid_name");
      var rows = sql("SELECT c.product_name, c.prod_period_type, SUM(c.capacity) AS total FROM " + tables.staffCapacity + " c INNER JOIN " + "(SELECT d.* FROM " + tables.terminal + " d JOIN (SELECT staff_no,MAX(id) AS latest_id FROM " + tables.terminal + " GROUP BY staff_no) newest ON d.id=newest.latest_id) t ON c.staff_no = t.staff_no AND c.branch_company=t.branch AND c.grid_name=t.grid WHERE c.stat_date=#{cutoff}" + sCond + " GROUP BY c.product_name, c.prod_period_type", sArgs, true);
      for (var i = 0; i < rows.length; i++) addCap(rows[i].product_name, rows[i].prod_period_type, rows[i].total);

    } else if (channelType === "直销队伍") {
      // 查工号产能表联表员工维度表
      var stArgs = JSON.parse(JSON.stringify(regionArgs));
      var stCond = scopeCond.replace(/branch_company/g, "c.branch_company").replace(/grid_name/g, "c.grid_name");
      var rows = sql("SELECT c.product_name, c.prod_period_type, SUM(c.capacity) AS total FROM " + tables.staffCapacity + " c INNER JOIN " + "(SELECT d.* FROM " + tables.staff + " d JOIN (SELECT staff_no,MAX(id) AS latest_id FROM " + tables.staff + " GROUP BY staff_no) newest ON d.id=newest.latest_id) st ON c.staff_no = st.staff_no AND c.branch_company=st.branch AND c.grid_name=st.grid WHERE c.stat_date=#{cutoff}" + stCond + " GROUP BY c.product_name, c.prod_period_type", stArgs, true);
      for (var i = 0; i < rows.length; i++) addCap(rows[i].product_name, rows[i].prod_period_type, rows[i].total);
    }

    // 类型专属目标尚未维护时不使用区域总体目标。
    var targetMap = {};
    if (channelType === "全部类型") {
      var targetArgs = { month: statDate.slice(0, 7) }, targetScope = "";
      if (scopeType === "branch") { targetArgs.branch = scopeId; targetScope = " AND branch=#{branch}"; }
      if (scopeType === "grid") { var targetParts = scopeId.split("::"); targetArgs.branch = targetParts[0]; targetArgs.grid = targetParts[1]; targetScope = " AND branch=#{branch} AND grid=#{grid}"; }
      var targetRows = [], pageSize = 1000;
      for (var offset = 0; ; offset += pageSize) {
        var page = sql("SELECT id,branch,grid,product_id,month_base_target,month_challenge_target,day_base_target,day_challenge_target,target_date FROM " + tables.targets +
          " WHERE target_month=#{month}" + targetScope + " ORDER BY id LIMIT 1000 OFFSET " + offset, targetArgs, true);
        targetRows = targetRows.concat(page);
        if (page.length < pageSize) break;
        if (offset >= 999000) throw new Error("目标结果过多，请缩小范围");
      }
      var expectedGrids = sql("SELECT DISTINCT branch_company,grid_name FROM " + tables.region + " WHERE stat_date=#{cutoff}" + scopeCond +
        " AND branch_company<>'全市' AND (grid_name<>branch_company OR grid_name IN ('未知','市统筹'))", regionArgs, true);
      function validTarget(v) { return v === null || v === undefined || text(v) === "" ? null : num(v); }
      function targetSum(pid, field, daily) {
        var chosen = [], summaryBranch = scopeType === "city" ? "全市" : scopeId;
        if (scopeType !== "grid") for (var ti = 0; ti < targetRows.length; ti++) {
          var candidate = targetRows[ti];
          if (candidate.product_id === pid && candidate.branch === summaryBranch && candidate.grid === summaryBranch) chosen.push(candidate);
        }
        if (!chosen.length) {
          var expected = scopeType === "grid" ? [{ branch_company: regionArgs.branch, grid_name: regionArgs.grid }] : expectedGrids;
          if (!expected.length) return null;
          for (var gi = 0; gi < expected.length; gi++) {
            var matches = [];
            for (var ri = 0; ri < targetRows.length; ri++) if (targetRows[ri].product_id === pid && targetRows[ri].branch === expected[gi].branch_company && targetRows[ri].grid === expected[gi].grid_name) matches.push(targetRows[ri]);
            if (matches.length !== 1) return null;
            chosen.push(matches[0]);
          }
        } else if (chosen.length !== 1) return null;
        var total = 0;
        for (var ci = 0; ci < chosen.length; ci++) {
          if (daily && (!chosen[ci].target_date || date(chosen[ci].target_date) !== statDate)) return null;
          var value = validTarget(chosen[ci][field]);
          if (value === null) return null;
          total += value;
        }
        return total;
      }
      for (var pi = 0; pi < products.length; pi++) {
        var pid = products[pi].productId;
        targetMap[pid] = { monthTarget: targetSum(pid, "month_base_target", false), dayTarget: targetSum(pid, "day_base_target", true),
          monthChallengeTarget: targetSum(pid, "month_challenge_target", false), dayChallengeTarget: targetSum(pid, "day_challenge_target", true) };
      }
    }

    // ---------- 3. 组装产品数据 ----------
    var elapsed = new Date(statDate + "T00:00:00Z").getUTCDate();
    var productData = [];
    for (var i = 0; i < products.length; i++) {
      var p = products[i];
      var c = capacityMap[p.productId] || { day: null, mon: null, week: null, last_mon: null };
      var tg = targetMap[p.productId] || { monthTarget: null, dayTarget: null };
      var monthAverage = c.mon === null ? null : Math.round(c.mon / elapsed * 100) / 100;
      var weekAverage  = c.week === null ? null : Math.round(c.week / 7 * 100) / 100;
      productData.push({
        productId: p.productId, productName: p.productName, unit: p.unit,
        dayProduction: c.day, monthProduction: c.mon, weekProduction: c.week, lastMonthProduction: c.last_mon,
        monthTarget: tg.monthTarget, dayTarget: tg.dayTarget,
        monthChallengeTarget: tg.monthChallengeTarget === undefined ? null : tg.monthChallengeTarget,
        dayChallengeTarget: tg.dayChallengeTarget === undefined ? null : tg.dayChallengeTarget,
        monthCompletionRate: c.mon !== null && tg.monthTarget ? Math.round(c.mon / tg.monthTarget * 1000) / 10 : null,
        dayCompletionRate:   c.day !== null && tg.dayTarget   ? Math.round(c.day / tg.dayTarget   * 1000) / 10 : null,
        monthAverage: monthAverage, weekAverage: weekAverage
      });
    }

    // 逐产品摘要，禁止把不同产品/不同单位的产能混加成综合低产榜。
    var alerts = [];
    var cutoffDate = new Date(statDate + "T00:00:00Z");
    var daysInMonth = new Date(Date.UTC(cutoffDate.getUTCFullYear(), cutoffDate.getUTCMonth() + 1, 0)).getUTCDate();
    var timeProgress = elapsed / daysInMonth * 100;
    for (var ai = 0; ai < productData.length; ai++) {
      var item = productData[ai];
      if (item.monthCompletionRate !== null && item.monthCompletionRate < timeProgress) alerts.push({
        productId: item.productId, productName: item.productName, unit: item.unit,
        completionRate: item.monthCompletionRate, timeProgress: timeProgress,
        progressGapPercentagePoints: item.monthCompletionRate - timeProgress,
        targetGap: Math.max(item.monthTarget - item.monthProduction, 0) });
    }

    // ---------- 5. 查组织架构（前端/跑批通用） ----------
    var branches = [], grids = [];
    if (String(Params.includeOrganization) !== "0") {
    var branchRows = sql("SELECT DISTINCT branch_company AS branchId, branch_company AS branchName FROM " + tables.region + " WHERE stat_date=#{cutoff} AND branch_company <> '全市' ORDER BY branch_company", { cutoff: statDate }, true);
    var gridRows = sql("SELECT DISTINCT branch_company AS branchId, grid_name AS gridName FROM " + tables.region + " WHERE stat_date=#{cutoff} AND branch_company <> '全市' AND grid_name <> branch_company ORDER BY branch_company, grid_name", { cutoff: statDate }, true);
    for (var i = 0; i < branchRows.length; i++) branches.push({ branchId: branchRows[i].branchId, branchName: branchRows[i].branchName });
    for (var i = 0; i < gridRows.length; i++) grids.push({ gridId: gridRows[i].branchId + "::" + gridRows[i].gridName, gridName: gridRows[i].gridName, branchId: gridRows[i].branchId });
    }

    return {
      statDate: statDate, 
      scopeType: scopeType, 
      scopeId: scopeId, 
      scopeName: scopeType === "city" ? "全市" : scopeId,
      channelType: channelType,
      dataQuality: { sourceDates: { region: statDate }, timeProgress: timeProgress,
        warnings: channelType === "全部类型" ? [] : ["类型专属目标未配置，完成率及目标缺口未知，不套用区域总体目标"] },
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
    if (channelType === "3星+渠道") channelType = "三星+渠道";
    if (["全部类型", "三星+渠道", "末梢渠道", "直销队伍"].indexOf(channelType) < 0) throw new Error("生产类型无效"); 

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

    var rows = [];
    for (var offset = 0; ; offset += 1000) {
      var page = sql("SELECT id, stat_date, scope_type, scope_id, channel_type, answer, created_at, updated_at FROM " + tables.aiAnalysis + where +
        " ORDER BY stat_date DESC, scope_type, scope_id, id LIMIT 1000 OFFSET " + offset, args, true);
      if (page.length > 1000) throw new Error("分析结果分页未生效");
      rows = rows.concat(page);
      if (page.length < 1000) break;
      if (offset >= 99000) throw new Error("分析结果过多，请指定日期和区域");
    }
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

  // Lightweight job discovery. Only organization pairs are read, no capacity
  // SUMs, personnel/channel details or MoMA requests are performed here.
  function fetchBatchManifest() {
    var statDate = text(Params.statDate);
    if (statDate) statDate = date(statDate);
    else {
      var latestRows = sql("SELECT MAX(stat_date) AS d FROM " + tables.region, {}, true);
      if (!latestRows[0] || !latestRows[0].d) throw new Error("产能表无数据");
      statDate = date(latestRows[0].d);
    }
    var pairs = [], pageSize = 1000;
    for (var offset = 0; ; offset += pageSize) {
      var page = sql("SELECT DISTINCT branch_company AS branchId,grid_name AS gridName FROM " + tables.region +
        " WHERE stat_date=#{cutoff} ORDER BY branch_company,grid_name LIMIT 1000 OFFSET " + offset,
        { cutoff: statDate }, true);
      if (page.length > pageSize) throw new Error("组织清单分页未生效");
      pairs = pairs.concat(page);
      if (page.length < pageSize) break;
      if (offset >= 99000) throw new Error("组织清单过大，请缩小范围");
    }
    if (!pairs.length) throw new Error("指定日期没有区域产能数据");
    var branches = [], grids = [], branchSeen = {}, gridSeen = {};
    for (var i = 0; i < pairs.length; i++) {
      var b = text(pairs[i].branchId), g = text(pairs[i].gridName);
      if (!b || !g || b === "全市") continue;
      var bk = JSON.stringify([b]), gk = JSON.stringify([b, g]);
      if (!Object.prototype.hasOwnProperty.call(branchSeen, bk)) {
        branchSeen[bk] = true; branches.push({ branchId: b, branchName: b });
      }
      if ((b !== g || ["未知", "市统筹"].indexOf(g) >= 0) && !Object.prototype.hasOwnProperty.call(gridSeen, gk)) {
        gridSeen[gk] = true; grids.push({ branchId: b, gridId: b + "::" + g, gridName: g });
      }
    }
    return { contractVersion: "1.6", statDate: statDate,
      organization: { cityName: "中山市", branches: branches, grids: grids } };
  }

  var handlers = {
    wgsc_aiFetchBatchManifest: fetchBatchManifest,
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