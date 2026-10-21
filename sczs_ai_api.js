// sczs_ai_api.js
// Handle2 globals: Params, JsResult, CustomizeUtil. Keep ES5 syntax for platform execution.
function init() {
  // ========== 表名 ==========
  var tables = {
    region: "app_open_api_c003_wgsc_region_capacity_1",
    channel: "app_open_api_c001_wgsc_chn_capacity_1",
    staffCapacity: "app_open_api_c003_wgsc_staff_capacity_1",
    targets: "app_open_api_c001_wgsc_target_1",
    aiAnalysis: "app_open_api_c003_wgsc_ai_analysis_1"
  };

  // ========== 产品 ==========
  var products = [
    { productId: "newNumbers",     productName: "放号",         unit: "户" },
    { productId: "plan119",        productName: "高套（129+）", unit: "户" },
    { productId: "terminal",       productName: "终端合约",     unit: "单" },
    { productId: "homeBroadband",  productName: "手宽新增",     unit: "户" },
    { productId: "gigabit",        productName: "千兆运营",     unit: "户" }
  ];

  // ========== 共享密钥 ==========
  var MOBILEWORK_SECRET = "7cfaa66f21ca170fa5475d4d65aac07e";

  // ========== 阈值 ==========
  var LOW_STAFF_LIMIT_PER_PRODUCT = 10;
  var LOW_CHANNEL_LIMIT_PER_PRODUCT = 10;

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
    var n = Number(v);
    if (!isFinite(n) || n < 0) throw new Error("数值必须非负且有限：" + v);
    return n;
  }
  function pad(n) { return n < 10 ? "0" + n : "" + n; }
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
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || isNaN(d2.getTime()) || formatDate(d2) !== s) throw new Error("无效日期：" + v);
    return s;
  }
  function now() {
    var d = new Date(new Date().getTime() + 8 * 3600000);
    return formatDate(d) + " " + pad(d.getUTCHours()) + ":" + pad(d.getUTCMinutes()) + ":" + pad(d.getUTCSeconds());
  }
  function productId(name) {
    for (var i = 0; i < products.length; i++) {
      if (products[i].productName === name || products[i].productId === name) return products[i].productId;
    }
    throw new Error("未知产品：" + name);
  }

  // ========== 鉴权 ==========
  function checkAuth() {
    var secret = text(Params.secret);
    if (!secret || secret !== MOBILEWORK_SECRET) throw new Error("鉴权失败：secret 无效");
  }

  // ============================================================
  // 接口 1：取分析输入
  // ============================================================
  function fetchAnalysisInput() {
    var statDate = text(Params.statDate);
    var scopeType = text(Params.scopeType) || "city";
    var scopeId = text(Params.scopeId);

    if (["city", "branch", "grid"].indexOf(scopeType) < 0) throw new Error("scopeType 无效");
    if (scopeType !== "city" && !scopeId) throw new Error("scopeType 非 city 时必须传 scopeId");

    if (!statDate) {
      var latestRows = sql("SELECT MAX(stat_date) AS d FROM " + tables.region, {}, true);
      if (!latestRows || !latestRows[0] || !latestRows[0].d) throw new Error("产能表无数据");
      statDate = date(latestRows[0].d);
    } else {
      statDate = date(statDate);
    }

    // 范围过滤
    var regionScope = "";
    var regionArgs = { cutoff: statDate };
    if (scopeType === "branch") {
      regionScope = " AND branch_company=#{scopeId}";
      regionArgs.scopeId = scopeId;
    } else if (scopeType === "grid") {
      var parts = scopeId.split("::");
      if (parts.length !== 2) throw new Error("grid scopeId 格式须为 branch::grid");
      regionScope = " AND branch_company=#{branch} AND grid_name=#{grid}";
      regionArgs.branch = parts[0];
      regionArgs.grid = parts[1];
    }

    // ---- 1. 区域产能：各产品各周期汇总 ----
    var capacityRows = sql(
      "SELECT product_name, prod_period_type, SUM(capacity) AS total " +
      "FROM " + tables.region + " WHERE stat_date=#{cutoff}" + regionScope +
      " GROUP BY product_name, prod_period_type",
      regionArgs, true
    );
    var capacityMap = {};
    for (var i = 0; i < capacityRows.length; i++) {
      var row = capacityRows[i];
      var pid = productId(row.product_name);
      if (!capacityMap[pid]) capacityMap[pid] = { day: 0, mon: 0, week: 0, last_mon: 0 };
      var periodKey = row.prod_period_type;
      if (["day", "mon", "week", "last_mon"].indexOf(periodKey) >= 0) {
        capacityMap[pid][periodKey] += num(row.total);
      }
    }

    // ---- 2. 目标 ----
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
    var targetRows = sql(
      "SELECT product_id, SUM(month_target) AS month_target, SUM(day_target) AS day_target " +
      "FROM " + tables.targets + " WHERE target_month=#{month}" + targetScope +
      " GROUP BY product_id",
      targetArgs, true
    );
    var targetMap = {};
    for (i = 0; i < targetRows.length; i++) {
      var t = targetRows[i];
      targetMap[t.product_id] = {
        monthTarget: t.month_target === null || t.month_target === undefined ? null : num(t.month_target),
        dayTarget:   t.day_target   === null || t.day_target   === undefined ? null : num(t.day_target)
      };
    }

    // ---- 3. 组装 products ----
    var elapsed = new Date(statDate + "T00:00:00Z").getUTCDate();
    var productData = [];
    for (i = 0; i < products.length; i++) {
      var p = products[i];
      var c = capacityMap[p.productId] || { day: 0, mon: 0, week: 0, last_mon: 0 };
      var tg = targetMap[p.productId] || { monthTarget: null, dayTarget: null };
      var monthAverage = c.mon === 0 ? undefined : Math.round(c.mon / elapsed * 100) / 100;
      var weekAverage  = c.week === 0 ? undefined : Math.round(c.week / 7 * 100) / 100;
      productData.push({
        productId: p.productId,
        productName: p.productName,
        unit: p.unit,
        dayProduction: c.day,
        monthProduction: c.mon,
        weekProduction: c.week,
        lastMonthProduction: c.last_mon,
        monthTarget: tg.monthTarget,
        dayTarget: tg.dayTarget,
        monthCompletionRate: tg.monthTarget ? Math.round(c.mon / tg.monthTarget * 1000) / 10 : null,
        dayCompletionRate:   tg.dayTarget   ? Math.round(c.day / tg.dayTarget   * 1000) / 10 : null,
        monthAverage: monthAverage,
        weekAverage: weekAverage
      });
    }

    // ---- 4. 低产工号 ----
    var lowStaffRows = sql(
      "SELECT product_name, branch_company, grid_name, channel_name, staff_no, " +
      "       SUM(capacity) AS total " +
      "FROM " + tables.staffCapacity + " " +
      "WHERE stat_date=#{cutoff} AND prod_period_type='day'" + regionScope + " " +
      "GROUP BY product_name, branch_company, grid_name, channel_name, staff_no " +
      "ORDER BY total ASC LIMIT 500",
      regionArgs, true
    );

    // ---- 5. 低产渠道 ----
    var lowChannelRows = sql(
      "SELECT product_name, branch_company, grid_name, channel_code, channel_name, " +
      "       SUM(capacity) AS total " +
      "FROM " + tables.channel + " " +
      "WHERE stat_date=#{cutoff} AND prod_period_type='day'" + regionScope + " " +
      "GROUP BY product_name, branch_company, grid_name, channel_code, channel_name " +
      "ORDER BY total ASC LIMIT 500",
      regionArgs, true
    );

    // ---- 6. 组装 alerts ----
    var alertsMap = {};
    function ensureAlert(pid, pname) {
      if (!alertsMap[pid]) {
        alertsMap[pid] = { productId: pid, productName: pname, lowPeople: [], lowChannels: [] };
      }
      return alertsMap[pid];
    }

    for (i = 0; i < lowStaffRows.length; i++) {
      var s = lowStaffRows[i];
      var pid2 = productId(s.product_name);
      var a2 = ensureAlert(pid2, s.product_name);
      if (a2.lowPeople.length < LOW_STAFF_LIMIT_PER_PRODUCT) {
        a2.lowPeople.push({
          staffNo: s.staff_no || "",
          gridName: s.grid_name || "",
          branchName: s.branch_company || "",
          channelName: s.channel_name || "",
          production: num(s.total)
        });
      }
    }

    for (i = 0; i < lowChannelRows.length; i++) {
      var c2 = lowChannelRows[i];
      var pid3 = productId(c2.product_name);
      var a3 = ensureAlert(pid3, c2.product_name);
      if (a3.lowChannels.length < LOW_CHANNEL_LIMIT_PER_PRODUCT) {
        a3.lowChannels.push({
          channelCode: c2.channel_code || "",
          channelName: c2.channel_name || "",
          gridName: c2.grid_name || "",
          branchName: c2.branch_company || "",
          production: num(c2.total)
        });
      }
    }

    var alerts = [];
    for (var key in alertsMap) {
      if (Object.prototype.hasOwnProperty.call(alertsMap, key)) {
        alerts.push(alertsMap[key]);
      }
    }

    // ---- 7. 组织列表 ----
    var branchRows = sql(
      "SELECT DISTINCT branch_company AS branchId, branch_company AS branchName " +
      "FROM " + tables.region + " WHERE stat_date=#{cutoff} " +
      "AND branch_company <> '全市' ORDER BY branch_company",
      { cutoff: statDate }, true
    );
    var gridRows = sql(
      "SELECT DISTINCT branch_company AS branchId, grid_name AS gridName " +
      "FROM " + tables.region + " WHERE stat_date=#{cutoff} " +
      "AND branch_company <> '全市' AND grid_name <> branch_company " +
      "ORDER BY branch_company, grid_name",
      { cutoff: statDate }, true
    );
    var branches = [];
    for (i = 0; i < branchRows.length; i++) {
      branches.push({ branchId: branchRows[i].branchId, branchName: branchRows[i].branchName });
    }
    var grids = [];
    for (i = 0; i < gridRows.length; i++) {
      var g = gridRows[i];
      grids.push({
        gridId: g.branchId + "::" + g.gridName,
        gridName: g.gridName,
        branchId: g.branchId
      });
    }

    return {
      statDate: statDate,
      scopeType: scopeType,
      scopeId: scopeId,
      scopeName: scopeType === "city" ? "全市" : scopeId,
      products: productData,
      alerts: alerts,
      organization: {
        cityName: "中山市",
        branches: branches,
        grids: grids
      },
      generatedAt: now()
    };
  }

  // ============================================================
  // 接口 2：写分析结果
  // ============================================================
  function saveAnalysisResult() {
    var statDate = date(Params.statDate);
    var scopeType = text(Params.scopeType);
    var scopeId = text(Params.scopeId);
    var answer = text(Params.answer);

    if (["city", "branch", "grid"].indexOf(scopeType) < 0) {
      throw new Error("scopeType 无效");
    }
    if (!scopeId) throw new Error("scopeId 不能为空");
    if (!answer) throw new Error("answer 不能为空");
    if (answer.length > 8000) throw new Error("answer 超过 8000 字");

    var ts = now();

    // 1. 插入或更新当前数据
    sql(
      "INSERT INTO " + tables.aiAnalysis +
      " (stat_date, scope_type, scope_id, answer, created_at, updated_at) " +
      "VALUES (#{statDate}, #{scopeType}, #{scopeId}, #{answer}, #{createdAt}, #{updatedAt}) " +
      "ON DUPLICATE KEY UPDATE " +
      "  answer=VALUES(answer), " +
      "  updated_at=VALUES(updated_at)",
      {
        statDate: statDate,
        scopeType: scopeType,
        scopeId: scopeId,
        answer: answer,
        createdAt: ts,
        updatedAt: ts
      },
      false
    );

    // 2. 清理旧数据：删除当前 statDate 向前推 2 天（及更早）的数据
    try {
      // 计算 cutoffDate（例如 statDate 是 2023-10-27，两天前就是 2023-10-25）
      // 这里使用 Date 对象计算，并格式化为 YYYY-MM-DD
      var dateObj = new Date(statDate + "T00:00:00Z");
      dateObj.setUTCDate(dateObj.getUTCDate() - 2);
      
      // 复用脚本顶部的 formatDate 函数，或者直接写
      var cutoffDate = dateObj.getUTCFullYear() + "-" + 
                       ("0" + (dateObj.getUTCMonth() + 1)).slice(-2) + "-" + 
                       ("0" + dateObj.getUTCDate()).slice(-2);

      // 执行删除 SQL
      // 注意：这里只保留这个 statDate（也就是最新一次）和上一天的数据。
      sql(
        "DELETE FROM " + tables.aiAnalysis + 
        " WHERE stat_date <= #{cutoffDate}",
        { 
          cutoffDate: cutoffDate, 
          scopeType: scopeType, 
          scopeId: scopeId 
        },
        false
      );
    } catch (delErr) {
      console.warn("清理旧数据失败: " + delErr.message);
    }

    return {
      statDate: statDate,
      scopeType: scopeType,
      scopeId: scopeId,
      saved: true
    };
  }

  // ============================================================
  // 接口 3：读分析结果
  // ============================================================
  function getAnalysisResult() {
    var statDate = text(Params.statDate);
    var scopeType = text(Params.scopeType);
    var scopeId = text(Params.scopeId);

    if (statDate) statDate = date(statDate);
    if (scopeType && ["city", "branch", "grid"].indexOf(scopeType) < 0) {
      throw new Error("scopeType 无效");
    }
    if (scopeType && !scopeId) throw new Error("scopeType 存在时 scopeId 不能为空");

    var where = " WHERE 1=1 ";
    var args = {};

    if (statDate) {
      args.statDate = statDate;
      where += " AND stat_date=#{statDate} ";
    }
    if (scopeType) {
      args.scopeType = scopeType;
      args.scopeId = scopeId;
      where += " AND scope_type=#{scopeType} AND scope_id=#{scopeId} ";
    }

    var rows = sql(
      "SELECT id, stat_date, scope_type, scope_id, answer, created_at, updated_at " +
      "FROM " + tables.aiAnalysis + where +
      " ORDER BY stat_date DESC, scope_type, scope_id LIMIT 200",
      args,
      true
    );

    var out = [];
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      out.push({
        id: r.id,
        statDate: date(r.stat_date),
        scopeType: text(r.scope_type),
        scopeId: text(r.scope_id),
        scopeName: text(r.scope_id),
        answer: text(r.answer),
        createdAt: text(r.created_at),
        updatedAt: text(r.updated_at)
      });
    }

    return { count: out.length, rows: out };
  }

  // ========== handlers ==========
  var handlers = {
    wgsc_aiFetchAnalysisInput: fetchAnalysisInput,
    wgsc_aiSaveAnalysisResult: saveAnalysisResult,
    wgsc_aiGetAnalysisResult: getAnalysisResult
  };

  // ========== 最外层 try/catch（带完整错误打印）==========
  try {
    if (!Object.prototype.hasOwnProperty.call(handlers, Params.funCode)) throw new Error("非法调用");
    if (Params.funCode !== "wgsc_aiGetAnalysisResult") {
      checkAuth();
    }
    var result = handlers[Params.funCode]();
    JsResult.result = JSON.stringify({
      result: { retCode: "0", retMsg: "成功", data: result }
    });
  } catch (e) {
    var errDetail;
    try {
      errDetail = JSON.stringify({
        name: e && e.name,
        message: e && e.message,
        stack: e && e.stack
      });
    } catch (ee) {
      errDetail = String(e);
    }

    JsResult.result = JSON.stringify({
      result: {
        retCode: "1",
        retMsg: errDetail,
        data: null
      }
    });
  }
}
init();
