// sczs_ai_api.js
// 专用于后台 Python 跑批（取数 + 存分析结果） & 前端查结果
function init() {
  // ========== 表名 ==========
  var tables = {
    region: "app_open_api_c003_wgsc_region_capacity_1",
    channel: "app_open_api_c001_wgsc_chn_capacity_1",
    staffCapacity: "app_open_api_c003_wgsc_staff_capacity_1",
    dailyRegion: "app_open_api_c002_wgsc_reg_capacity_d_1",
    dailyChannel: "app_open_api_c002_wgsc_chn_capacity_d_1",
    dailyStaff: "app_open_api_c002_wgsc_stf_capacity_d_1",
    channelInfo: "app_open_api_c003_wgsc_chn_level_1",
    staff: "app_open_api_c003_wgsc_staff_1",
    targets: "app_open_api_c003_wgsc_target_1",
    aiAnalysis: "app_open_api_c004_wgsc_ai_analysis_1",
    terminal: "app_open_api_c002_wgsc_staff_terminal_1"
  };

  // 只保留 4 个产品，千兆运营彻底移除
  var products = [
    { productId: "newNumbers",     productName: "放号",         unit: "户" },
    { productId: "plan119",        productName: "高套（129+）", unit: "户" },
    { productId: "terminal",       productName: "终端合约",     unit: "单" },
    { productId: "homeBroadband",  productName: "手宽新增",     unit: "户" }
  ];

  var MOBILEWORK_SECRET = "7cfaa66f21ca170fa5475d4d65aac07e";

  // 特殊网格：不参与任务清单、取数汇总与前端组织树
  var EXCLUDED_GRIDS = ["未知", "市统筹"];

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
  
  function productId(name) {
    name = text(name);
    if (name === "手宽归档") name = "homeBroadband";
    if (name === "129+高套" || name === "119+套餐") name = "plan119";
    for (var i = 0; i < products.length; i++) {
      if (products[i].productName === name || products[i].productId === name) return products[i].productId;
    }
    throw new Error("未知产品：" + name);
  }

  function checkAuth() {
    var secret = text(Params.secret);
    if (!secret || secret !== MOBILEWORK_SECRET) throw new Error("鉴权失败：secret 无效");
  }

  // 生成“排除特殊网格”的 SQL 片段
  function excludedGridSql(column) {
    return " AND " + column + " NOT IN ('未知','市统筹') ";
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
    if (["全部类型", "三星+渠道", "末梢渠道", "直销队伍", "营业厅"].indexOf(channelType) < 0) throw new Error("生产类型无效");

    if (["city", "branch", "grid"].indexOf(scopeType) < 0) throw new Error("scopeType 无效");
    if (scopeType !== "city" && !scopeId) throw new Error("scopeType 非 city 时必须传 scopeId");

    if (!statDate) {
      var latestRows = sql("SELECT MAX(stat_date) AS d FROM " + tables.region, {}, true);
      if (!latestRows || !latestRows[0] || !latestRows[0].d) throw new Error("产能表无数据");
      statDate = date(latestRows[0].d);
    } else {
      statDate = date(statDate);
    }

    var regionArgs = { cutoff: statDate };
    var scopeCond = "";
    if (scopeType === "branch") {
      scopeCond = " AND branch_company=#{scopeId}";
      regionArgs.scopeId = scopeId;
    } else if (scopeType === "grid") {
      var parts = scopeId.split("::");
      if (parts.length !== 2 || !parts[0] || !parts[1]) throw new Error("网格标识须为分公司::网格");
      if (EXCLUDED_GRIDS.indexOf(parts[1]) >= 0) throw new Error("不支持分析未知/市统筹网格");
      scopeCond = " AND branch_company=#{branch} AND grid_name=#{grid}";
      regionArgs.branch = parts[0];
      regionArgs.grid = parts[1];
    }

    var capacityMap = {};
    function addCap(productName, periodType, value) {
      var name = text(productName);
      if (name === "千兆运营" || name === "gigabit") return; // 拦截残留千兆运营数据
      if (value === null || value === undefined) throw new Error("产能记录为空值，请修正源数据");
      var pid = productId(productName);
      if (!capacityMap[pid]) capacityMap[pid] = { day: null, mon: null, week: null, last_mon: null };
      if (["day", "mon", "week", "last_mon"].indexOf(periodType) >= 0) {
        capacityMap[pid][periodType] = (capacityMap[pid][periodType] === null ? 0 : capacityMap[pid][periodType]) + num(value);
      }
    }

    var regionLevelCond = scopeCond;
    if (scopeType === "city") regionLevelCond += " AND branch_company='全市' AND grid_name='全市'";
    if (scopeType === "branch") regionLevelCond += " AND grid_name=#{scopeId}";
    
    function dailyDateSql(column) {
      return "SUBSTR(REPLACE(REPLACE(SUBSTR(TRIM(" + column + "),1,10),'-',''),'/',''),1,8)";
    }
    function dailyHourSql(column) {
      var value = "TRIM(" + column + ")";
      return "CASE WHEN LENGTH(" + value + ")=10 AND SUBSTR(" + value + ",5,1) NOT IN ('-','/') THEN SUBSTR(" + value +
        ",9,2) WHEN LENGTH(" + value + ")>=13 AND SUBSTR(" + value + ",11,1) IN ('T',' ') THEN SUBSTR(" + value + ",12,2) ELSE '' END";
    }
    function dailyBatchSql(column) {
      return dailyDateSql(column) + "=#{dailyDateKey} AND (" + dailyHourSql(column) + ")=#{dailyHourKey}";
    }
    var dailyLatest = sql("SELECT MAX(" + dailyDateSql("stat_date") + ") AS d FROM " + tables.dailyRegion +
      " WHERE 1=1" + regionLevelCond, regionArgs, true);
    var dailyStatDate = dailyLatest[0] && dailyLatest[0].d ? date(dailyLatest[0].d) : null;
    var dailyBatchArgs = JSON.parse(JSON.stringify(regionArgs));
    dailyBatchArgs.dailyDateKey = dailyStatDate ? dailyStatDate.replace(/-/g, "") : "";
    var dailyHours = dailyStatDate ? sql("SELECT MAX(" + dailyHourSql("stat_date") + ") AS h FROM " + tables.dailyRegion +
      " WHERE " + dailyDateSql("stat_date") + "=#{dailyDateKey}" + regionLevelCond, dailyBatchArgs, true) : [];
    var dailyStatHour = dailyHours[0] && text(dailyHours[0].h) !== "" ? text(dailyHours[0].h) : null;
    dailyBatchArgs.dailyHourKey = dailyStatHour === null ? "" : dailyStatHour;
    var dailyTable = channelType === "全部类型" ? tables.dailyRegion :
      (channelType === "三星+渠道" || channelType === "营业厅" ? tables.dailyChannel : tables.dailyStaff);
    var dailyHasData = false;
    
    function readCapacity(query, args, oldTable) {
      var legacy = sql(query, args, true), result = [];
      for (var li = 0; li < legacy.length; li++) {
        if (["mon", "week", "last_mon"].indexOf(legacy[li].prod_period_type) >= 0) result.push(legacy[li]);
      }
      if (!dailyStatDate) return result;
      var dailyArgs = JSON.parse(JSON.stringify(args));
      dailyArgs.dailyDateKey = dailyBatchArgs.dailyDateKey;
      dailyArgs.dailyHourKey = dailyBatchArgs.dailyHourKey;
      var dailyQuery = query.replace(oldTable, dailyTable)
        .replace(/(?:c\.)?prod_period_type, /g, "")
        .replace(/, (?:c\.)?prod_period_type/g, "")
        .replace(/(c\.)?stat_date=#\{cutoff\}/, function (_, alias) {
          return dailyBatchSql((alias || "") + "stat_date");
        });
      var dailyRows = sql(dailyQuery, dailyArgs, true);
      for (var di = 0; di < dailyRows.length; di++) {
        if (dailyRows[di].total !== null && dailyRows[di].total !== undefined) dailyHasData = true;
        result.push({ product_name: dailyRows[di].product_name, prod_period_type: "day", total: dailyRows[di].total });
      }
      return result;
    }
    
    if (channelType === "全部类型") {
      var rows = readCapacity("SELECT product_name, prod_period_type, SUM(capacity) AS total FROM " + tables.region + " WHERE stat_date=#{cutoff}" + regionLevelCond + excludedGridSql("grid_name") + " GROUP BY product_name, prod_period_type", regionArgs, tables.region);
      for (var i = 0; i < rows.length; i++) addCap(rows[i].product_name, rows[i].prod_period_type, rows[i].total);

    } else if (channelType === "三星+渠道" || channelType === "营业厅") {
      var cArgs = JSON.parse(JSON.stringify(regionArgs));
      cArgs.channelLevel = channelType === "营业厅" ? "营业厅" : "三星+";
      var cCond = scopeCond.replace(/branch_company/g, "c.branch_company").replace(/grid_name/g, "c.grid_name");
      var rows = readCapacity("SELECT c.product_name, c.prod_period_type, SUM(c.capacity) AS total FROM " + tables.channel + " c INNER JOIN " + "(SELECT d.* FROM " + tables.channelInfo + " d JOIN (SELECT chn_code,MAX(id) AS latest_id FROM " + tables.channelInfo + " GROUP BY chn_code) newest ON d.id=newest.latest_id) ci ON c.channel_code = ci.chn_code AND c.branch_company=ci.branch AND c.grid_name=ci.grid WHERE c.stat_date=#{cutoff} AND ci.star_level = #{channelLevel}" + cCond + excludedGridSql("c.grid_name") + " GROUP BY c.product_name, c.prod_period_type", cArgs, tables.channel);
      for (var i = 0; i < rows.length; i++) addCap(rows[i].product_name, rows[i].prod_period_type, rows[i].total);

    } else if (channelType === "末梢渠道") {
      var sArgs = JSON.parse(JSON.stringify(regionArgs));
      var sCond = scopeCond.replace(/branch_company/g, "c.branch_company").replace(/grid_name/g, "c.grid_name");
      var rows = readCapacity("SELECT c.product_name, c.prod_period_type, SUM(c.capacity) AS total FROM " + tables.staffCapacity + " c INNER JOIN " + "(SELECT d.* FROM " + tables.terminal + " d JOIN (SELECT staff_no,MAX(id) AS latest_id FROM " + tables.terminal + " GROUP BY staff_no) newest ON d.id=newest.latest_id) t ON c.staff_no = t.staff_no AND c.branch_company=t.branch AND c.grid_name=t.grid WHERE c.stat_date=#{cutoff}" + sCond + excludedGridSql("c.grid_name") + " GROUP BY c.product_name, c.prod_period_type", sArgs, tables.staffCapacity);
      for (var i = 0; i < rows.length; i++) addCap(rows[i].product_name, rows[i].prod_period_type, rows[i].total);

    } else if (channelType === "直销队伍") {
      var stArgs = JSON.parse(JSON.stringify(regionArgs));
      var stCond = scopeCond.replace(/branch_company/g, "c.branch_company").replace(/grid_name/g, "c.grid_name");
      var rows = readCapacity("SELECT c.product_name, c.prod_period_type, SUM(c.capacity) AS total FROM " + tables.staffCapacity + " c INNER JOIN " + "(SELECT d.* FROM " + tables.staff + " d JOIN (SELECT staff_no,MAX(id) AS latest_id FROM " + tables.staff + " GROUP BY staff_no) newest ON d.id=newest.latest_id) st ON c.staff_no = st.staff_no AND c.branch_company=st.branch AND c.grid_name=st.grid WHERE c.stat_date=#{cutoff}" + stCond + excludedGridSql("c.grid_name") + " GROUP BY c.product_name, c.prod_period_type", stArgs, tables.staffCapacity);
      for (var i = 0; i < rows.length; i++) addCap(rows[i].product_name, rows[i].prod_period_type, rows[i].total);
    }

    var targetMap = {};
    if (channelType === "全部类型") {
      var targetArgs = { month: statDate.slice(0, 7), monthSlash: statDate.slice(0, 7).replace("-", "/") }, targetScope = "";
      if (scopeType === "branch") { targetArgs.branch = scopeId; targetScope = " AND branch=#{branch}"; }
      if (scopeType === "grid") { var targetParts = scopeId.split("::"); targetArgs.branch = targetParts[0]; targetArgs.grid = targetParts[1]; targetScope = " AND branch=#{branch} AND grid=#{grid}"; }
      
      function loadTargetRows(targetDate) {
        var monthArgs = JSON.parse(JSON.stringify(targetArgs));
        monthArgs.month = targetDate.slice(0, 7);
        monthArgs.monthSlash = monthArgs.month.replace("-", "/");
        var targetRows = [], pageSize = 1000;
        for (var offset = 0; ; offset += pageSize) {
          // 去除了 IN 限制，直接查出全部目标
          var page = sql("SELECT id,branch,grid,product_id,month_min_target,month_base_target,month_challenge_target FROM " + tables.targets +
            " WHERE target_month IN (#{month},#{monthSlash})" + targetScope + 
            " ORDER BY id LIMIT 1000 OFFSET " + offset, monthArgs, true);
            
          var validPage = [];
          for (var pi = 0; pi < page.length; pi++) {
            var rawPid = text(page[pi].product_id);
            
            // 安全过滤1：遇到千兆运营直接跳过
            if (rawPid === "千兆运营" || rawPid === "gigabit") continue;
            
            // 安全过滤2：遇到未知产品（无法通过 productId 转换的）直接跳过，防止报错
            try {
              page[pi].product_id = productId(rawPid);
            } catch (e) {
              continue; 
            }
            
            page[pi].branch = text(page[pi].branch);
            page[pi].grid = text(page[pi].grid);
            validPage.push(page[pi]);
          }
          targetRows = targetRows.concat(validPage);
          if (page.length < pageSize) break;
          if (offset >= 999000) throw new Error("目标结果过多，请缩小范围");
        }
        return targetRows;
      }
      
      var targetRows = loadTargetRows(statDate);
      var dailyTargetRows = !dailyStatDate ? [] : dailyStatDate.slice(0, 7) === statDate.slice(0, 7) ? targetRows : loadTargetRows(dailyStatDate);
      
      var expectedGrids = sql("SELECT DISTINCT branch_company,grid_name FROM " + tables.region + " WHERE stat_date=#{cutoff}" + scopeCond +
        " AND branch_company<>'全市' AND grid_name<>branch_company" + excludedGridSql("grid_name"), regionArgs, true);
      var dailyExpectedGrids = dailyStatDate ? sql("SELECT DISTINCT branch_company,grid_name FROM " + tables.dailyRegion +
        " WHERE " + dailyBatchSql("stat_date") + scopeCond +
        " AND branch_company<>'全市' AND grid_name<>branch_company" + excludedGridSql("grid_name"),
        dailyBatchArgs, true) : [];
        
      function validTarget(v) { return v === null || v === undefined || text(v) === "" ? null : num(v); }
      function targetSum(pid, field, daily) {
        if (daily && !dailyStatDate) return null;
        var rowsForTarget = daily ? dailyTargetRows : targetRows;
        var targetDate = daily ? dailyStatDate : statDate;
        var chosen = [], summaryBranch = scopeType === "city" ? "全市" : scopeId;
        if (scopeType !== "grid") for (var ti = 0; ti < rowsForTarget.length; ti++) {
          var candidate = rowsForTarget[ti];
          if (candidate.product_id === pid && candidate.branch === summaryBranch && candidate.grid === summaryBranch) chosen.push(candidate);
        }
        if (!chosen.length) {
          var expected = scopeType === "grid" ? [{ branch_company: regionArgs.branch, grid_name: regionArgs.grid }] : (daily ? dailyExpectedGrids : expectedGrids);
          if (!expected.length) return null;
          for (var gi = 0; gi < expected.length; gi++) {
            var matches = [];
            for (var ri = 0; ri < rowsForTarget.length; ri++) if (rowsForTarget[ri].product_id === pid && rowsForTarget[ri].branch === expected[gi].branch_company && rowsForTarget[ri].grid === expected[gi].grid_name) matches.push(rowsForTarget[ri]);
            if (matches.length !== 1) return null;
            chosen.push(matches[0]);
          }
        } else if (chosen.length !== 1) return null;
        var total = 0;
        for (var ci = 0; ci < chosen.length; ci++) {
          var value = validTarget(chosen[ci][daily ? field.replace(/^day_/, "month_") : field]);
          if (value === null) return null;
          total += daily ? value / new Date(Date.UTC(Number(targetDate.slice(0, 4)), Number(targetDate.slice(5, 7)), 0)).getUTCDate() : value;
        }
        return total;
      }
      for (var pi = 0; pi < products.length; pi++) {
        var pid = products[pi].productId;
        targetMap[pid] = { monthTarget: targetSum(pid, "month_base_target", false), dayTarget: targetSum(pid, "day_base_target", true),
          monthMinTarget: targetSum(pid, "month_min_target", false), dayMinTarget: targetSum(pid, "day_min_target", true),
          monthChallengeTarget: targetSum(pid, "month_challenge_target", false), dayChallengeTarget: targetSum(pid, "day_challenge_target", true) };
      }
    }

    var elapsed = new Date(statDate + "T00:00:00Z").getUTCDate();
    var productData = [];
    for (var i = 0; i < products.length; i++) {
      var p = products[i];
      var c = capacityMap[p.productId] || { day: null, mon: null, week: null, last_mon: null };
      if (dailyStatDate && c.day === null) c.day = 0;
      if (statDate) {
        if (c.mon === null) c.mon = 0;
        if (c.week === null) c.week = 0;
        if (c.last_mon === null) c.last_mon = 0;
      }
      var tg = targetMap[p.productId] || { monthTarget: null, dayTarget: null };
      var monthAverage = c.mon === null ? null : Math.round(c.mon / elapsed * 100) / 100;
      var weekAverage  = c.week === null ? null : Math.round(c.week / 7 * 100) / 100;
      productData.push({
        productId: p.productId, productName: p.productName, unit: p.unit,
        dayProduction: c.day, monthProduction: c.mon, weekProduction: c.week, lastMonthProduction: c.last_mon,
        monthTarget: tg.monthTarget, dayTarget: tg.dayTarget,
        monthMinTarget: tg.monthMinTarget === undefined ? null : tg.monthMinTarget,
        dayMinTarget: tg.dayMinTarget === undefined ? null : tg.dayMinTarget,
        monthChallengeTarget: tg.monthChallengeTarget === undefined ? null : tg.monthChallengeTarget,
        dayChallengeTarget: tg.dayChallengeTarget === undefined ? null : tg.dayChallengeTarget,
        monthCompletionRate: c.mon !== null && tg.monthTarget ? Math.round(c.mon / tg.monthTarget * 1000) / 10 : null,
        dayCompletionRate:   c.day !== null && tg.dayTarget   ? Math.round(c.day / tg.dayTarget   * 1000) / 10 : null,
        monthAverage: monthAverage, weekAverage: weekAverage
      });
    }

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

    var branches = [], grids = [];
    if (String(Params.includeOrganization) !== "0") {
    var branchRows = sql("SELECT DISTINCT branch_company AS branchId, branch_company AS branchName FROM " + tables.region + " WHERE stat_date=#{cutoff} AND branch_company <> '全市' ORDER BY branch_company", { cutoff: statDate }, true);
    var gridRows = sql("SELECT DISTINCT branch_company AS branchId, grid_name AS gridName FROM " + tables.region + " WHERE stat_date=#{cutoff} AND branch_company <> '全市' AND grid_name <> branch_company" + excludedGridSql("grid_name") + " ORDER BY branch_company, grid_name", { cutoff: statDate }, true);
    for (var i = 0; i < branchRows.length; i++) branches.push({ branchId: branchRows[i].branchId, branchName: branchRows[i].branchName });
    for (var i = 0; i < gridRows.length; i++) grids.push({ gridId: gridRows[i].branchId + "::" + gridRows[i].gridName, gridName: gridRows[i].gridName, branchId: gridRows[i].branchId });
    }

    return {
      statDate: statDate,
      dailyStatDate: dailyStatDate,
      dailyStatHour: dailyStatHour,
      dailySource: { table: dailyTable, dateTable: tables.dailyRegion, statDate: dailyStatDate, statHour: dailyStatHour, hasData: dailyHasData },
      scopeType: scopeType,
      scopeId: scopeId,
      scopeName: scopeType === "city" ? "全市" : scopeId,
      channelType: channelType,
      dataQuality: { sourceDates: { region: statDate, dailyRegion: dailyStatDate, dailyCapacity: dailyHasData ? dailyStatDate : null }, timeProgress: timeProgress,
        warnings: channelType === "全部类型" ? [] : ["类型专属目标未配置，完成率及目标缺口未知，不套用区域总体目标"] },
      products: productData,
      alerts: alerts,
      organization: { cityName: "中山市", branches: branches, grids: grids },
      generatedAt: now()
    };
  }
  
  function saveAnalysisResult() {
    var statDate = date(Params.statDate);
    var scopeType = text(Params.scopeType);
    var scopeId = text(Params.scopeId);
    var answer = text(Params.answer);
    var channelType = text(Params.channelType) || "全部类型";
    if (channelType === "3星+渠道") channelType = "三星+渠道";
    if (["全部类型", "三星+渠道", "末梢渠道", "直销队伍", "营业厅"].indexOf(channelType) < 0) throw new Error("生产类型无效");

    if (["city", "branch", "grid"].indexOf(scopeType) < 0) throw new Error("scopeType 无效");
    if (!scopeId) throw new Error("scopeId 不能为空");
    if (scopeType === "grid") {
      var gparts = scopeId.split("::");
      if (gparts.length === 2 && EXCLUDED_GRIDS.indexOf(gparts[1]) >= 0) throw new Error("不支持写入未知/市统筹网格分析");
    }
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

  function analysisReadScope(scopeType,scopeId){
    if(text(Params.secret)){checkAuth();return {type:scopeType,id:scopeId};}
    var token=text(Params.token);if(!token)throw new Error("00008: token不能为空");
    function phoneOf(value,depth){
      value=parse(value);if(depth>4||value===null||value===undefined)return "";
      if(typeof value==="string")return /^1\d{10}$/.test(text(value))?text(value):"";
      if(typeof value!=="object")return "";
      var keys=["userphone","phone","mobile","userPhone","mobileno","phoneNumber"],i,p;
      for(i=0;i<keys.length;i++){p=text(value[keys[i]]);if(/^1\d{10}$/.test(p))return p;}
      for(var key in value)if(Object.prototype.hasOwnProperty.call(value,key)){p=phoneOf(value[key],depth+1);if(p)return p;}
      return "";
    }
    var session=parse(CustomizeUtil.redisGet({key:token})),raw=parse(session&&session.data!==undefined?session.data:session);
    raw=parse(raw&&raw.value!==undefined?raw.value:raw);if(!raw)throw new Error("00008: token已过期");
    var phone=phoneOf(raw,0);if(!phone)phone=phoneOf(CustomizeUtil.getMobile(token),0);
    if(!phone)throw new Error("00008: token未解析到手机号");
    var rows=sql("SELECT role,branch,grid FROM app_open_api_c003_wgsc_permission_1 WHERE phone=#{phone} AND enabled=1 ORDER BY id DESC LIMIT 1",{phone:phone},true);
    if(!rows.length)throw new Error("无有效查看权限");
    var user=rows[0],role={1:"city",2:"branch",3:"grid"}[String(user.role)],branch=text(user.branch),grid=text(user.grid);
    if(!role||role!=="city"&&!branch||role==="grid"&&!grid)throw new Error("权限记录缺少组织范围");
    if(role==="grid"){
      var own=branch+"::"+grid;
      if(scopeType&&scopeType!=="grid"||scopeId&&scopeId!==own)throw new Error("无权查看该区域分析");
      return {type:"grid",id:own};
    }
    if(role==="branch"){
      if(!scopeType){if(scopeId&&scopeId!==branch)throw new Error("无权查看该区域分析");return scopeId?{type:"branch",id:branch}:{type:"",id:"",branch:branch};}
      if(scopeType==="branch"&&scopeId===branch||scopeType==="grid"&&scopeId.indexOf(branch+"::")===0&&scopeId.length>branch.length+2)return {type:scopeType,id:scopeId};
      throw new Error("无权查看该区域分析");
    }
    return {type:scopeType,id:scopeId};
  }

  function getAnalysisResult() {
    var statDate = text(Params.statDate);
    var scopeType = text(Params.scopeType);
    var scopeId = text(Params.scopeId);
    var channelType = text(Params.channelType);
    var authorized=analysisReadScope(scopeType,scopeId);scopeType=authorized.type;scopeId=authorized.id;

    if (statDate) statDate = date(statDate);
    if (scopeType && ["city", "branch", "grid"].indexOf(scopeType) < 0) throw new Error("scopeType 无效");
    if (scopeType && !scopeId) throw new Error("scopeType 存在时 scopeId 不能为空");

    var where = " WHERE 1=1 ";
    var args = {};

    if(authorized.branch){args.authBranch=authorized.branch;args.authGridPrefix=authorized.branch+"::";where+=" AND ((scope_type='branch' AND scope_id=#{authBranch}) OR (scope_type='grid' AND LOCATE(#{authGridPrefix},scope_id)=1)) ";}
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

  function cleanExpiredData() {
    var statDate = date(Params.statDate);
    var dateObj = new Date(statDate + "T00:00:00Z");
    dateObj.setUTCDate(dateObj.getUTCDate() - 2);
    var cutoffDate = dateObj.getUTCFullYear() + "-" + ("0" + (dateObj.getUTCMonth() + 1)).slice(-2) + "-" + ("0" + dateObj.getUTCDate()).slice(-2);
    sql("DELETE FROM " + tables.aiAnalysis + " WHERE stat_date <= #{cutoffDate}", { cutoffDate: cutoffDate }, false);
    return { cleaned: true, cutoffDate: cutoffDate };
  }

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
      if (EXCLUDED_GRIDS.indexOf(g) >= 0) continue;
      var bk = JSON.stringify([b]), gk = JSON.stringify([b, g]);
      if (!Object.prototype.hasOwnProperty.call(branchSeen, bk)) {
        branchSeen[bk] = true; branches.push({ branchId: b, branchName: b });
      }
      if (b !== g && !Object.prototype.hasOwnProperty.call(gridSeen, gk)) {
        gridSeen[gk] = true; grids.push({ branchId: b, gridId: b + "::" + g, gridName: g });
      }
    }
    return { contractVersion: "1.8", statDate: statDate,
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
    JsResult.result = JSON.stringify({ result: { retCode: String(e.message).indexOf("00008:")===0?"00008":"1", retMsg: errDetail, data: null } });
  }
}
init();