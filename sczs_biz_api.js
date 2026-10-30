// Handle2 globals: Params, JsResult, CustomizeUtil. Keep ES5 syntax for platform execution.
function init() {
  // ========== 表名 ==========
  var tables = {
    region: "app_open_api_c003_wgsc_region_capacity_1",
    channel: "app_open_api_c001_wgsc_chn_capacity_1",
    staffCapacity: "app_open_api_c003_wgsc_staff_capacity_1",
    channelInfo: "app_open_api_c002_wgsc_chn_level_1",
    terminal: "app_open_api_c002_wgsc_staff_terminal_1",
    staff: "app_open_api_c002_wgsc_staff_1",
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
  function now() {
    var d = new Date(new Date().getTime() + 8 * 3600000);
    return formatDate(d) + " " + pad(d.getUTCHours()) + ":" + pad(d.getUTCMinutes()) + ":" + pad(d.getUTCSeconds());
  }
  function snapshot(v) {
    if (typeof v === "number" && isFinite(v)) {
      var d = new Date(v + 8 * 3600000);
      return d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate()) + " " + pad(d.getUTCHours()) + ":" + pad(d.getUTCMinutes()) + ":" + pad(d.getUTCSeconds());
    }
    var s = text(v).replace(/^(\d{4})(\d{2})(\d{2})\s+(\d{2})(\d{2})(\d{2})$/, "$1-$2-$3 $4:$5:$6").replace("T", " ").slice(0, 19);
    if (!s) return now();
    date(s);
    if (!/^\d{4}-\d{2}-\d{2} (?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(s)) throw new Error("无效取数时间");
    return s;
  }
  function product(v) {
    v = text(v);
    if (v === "129+高套" || v === "119+套餐") v = "plan119";
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
  function admin() {
    if (!user.isSuperAdmin) throw new Error("仅超级管理员可导入或维护");
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
  function array(v) {
    var a = parse(v);
    if (Object.prototype.toString.call(a) !== "[object Array]" || !a.length || a.length > 10000) throw new Error("rows须为1至10000条数组");
    return a;
  }
  function upsert(table, fields, record) {
    var vals = [];
    var updates = [];
    for (var i = 0; i < fields.length; i++) {
      vals.push("#{" + fields[i] + "}");
      updates.push(fields[i] + "=VALUES(" + fields[i] + ")");
    }
    sql("INSERT INTO " + table + " (" + fields.join(",") + ") VALUES (" + vals.join(",") + ") ON DUPLICATE KEY UPDATE " + updates.join(","), record, false);
  }

  // ============================================================
  // imports
  // ============================================================
  function imports(capacity) {
    admin();
    var configs = capacity
      ? {
          region: ["region", ["branch_company", "grid_name", "prod_period_type", "product_name", "capacity", "stat_date", "snapshot_time"]],
          channel: ["channel", ["branch_company", "grid_name", "channel_code", "channel_name", "prod_period_type", "product_name", "capacity", "stat_date", "snapshot_time"]],
          staff: ["staffCapacity", ["branch_company", "grid_name", "channel_code", "channel_name", "staff_no", "prod_period_type", "product_name", "capacity", "stat_date", "snapshot_time"]]
        }
      : {
          channelInfo: ["channelInfo", ["uni_code", "chn_code", "chn_name", "branch", "grid_code", "grid", "star", "star_level"]],
          terminal: ["terminal", ["staff_no", "staff_name", "agent", "branch", "grid", "chn_name"]],
          staff: ["staff", ["staff_no", "branch", "grid", "staff_name", "job", "team_type"]],
          permission: ["permission", ["name", "phone", "role", "branch", "grid", "super_admin", "enabled"]]
        };
    var target = text(Params.target);
    var config = configs[target];
    if (!config) throw new Error("无效target");
    var rows = array(Params.rows);
    var records = [];
    var seen = {};
    for (var i = 0; i < rows.length; i++) {
      var r = {};
      var fields = config[1];
      for (var j = 0; j < fields.length; j++) r[fields[j]] = text(rows[i][fields[j]]);
      if (target === "permission") r.is_super_admin = text(rows[i].is_super_admin === undefined ? rows[i].super_admin : rows[i].is_super_admin);
      if (capacity) {
        r.capacity = num(rows[i].capacity);
        r.stat_date = date(r.stat_date);
        r.snapshot_time = snapshot(r.snapshot_time);
        r.prod_period_type = period(r.prod_period_type);
        r.product_name = product(r.product_name).productName;
        if (!r.branch_company || !r.grid_name || (target !== "region" && (!r.channel_code || !r.channel_name)) || (target === "staff" && !r.staff_no)) throw new Error("第" + (i + 1) + "行缺必填字段");
      } else {
        if (target === "permission") {
          if (!r.name || !/^1\d{10}$/.test(r.phone) || ["city", "branch", "grid"].indexOf(r.role) < 0 || !/^[01]$/.test(r.is_super_admin) || !/^[01]$/.test(r.enabled)) throw new Error("权限姓名/手机号/角色/标志无效");
          if ((r.role !== "city" && !r.branch) || (r.role === "grid" && !r.grid) || (r.role === "city" && (r.branch || r.grid)) || (r.role === "branch" && r.grid)) throw new Error("权限组织范围无效");
          if (r.phone === user.phone && (r.is_super_admin !== "1" || r.enabled !== "1")) throw new Error("不能禁用或降级当前超级管理员");
          r.role = { city: 1, branch: 2, grid: 3 }[r.role];
          r.super_admin = Number(r.is_super_admin);
          delete r.is_super_admin;
        } else if (!r.branch || !r.grid || (target === "channelInfo" ? !r.uni_code || !r.chn_code || !r.chn_name : !r.staff_no || !r.staff_name)) throw new Error("第" + (i + 1) + "行缺必填字段");
        if (target === "channelInfo") {
          var star = r.star.match(/([0-9三四五六七八九十])\s*星/);
          r.star_level = star && (Number(star[1]) >= 3 || /[三四五六七八九十]/.test(star[1])) ? "三星+" : "非三星+";
        }
        if (target === "staff" && ["行销经理", "商企经理", "装维随销"].indexOf(r.team_type) < 0) throw new Error("队伍类型须为行销经理/商企经理/装维随销");
      }
      var key = capacity
        ? JSON.stringify([r.stat_date, r.branch_company, r.grid_name, r.channel_code, r.staff_no, r.prod_period_type, r.product_name])
        : (r.phone || r.chn_code || r.staff_no);
      if (seen[key]) throw new Error("第" + (i + 1) + "行重复唯一键");
      seen[key] = true;
      records.push(r);
    }
    var errors = [];
    var success = 0;

    if (target === "permission") {
      // permission 表：保留原有的先查后写逻辑（增量更新）
      for (var k = 0; k < records.length; k++) {
        var rec = records[k];
        try {
          var existing = sql("SELECT id FROM " + tables.permission + " WHERE phone=#{phone} LIMIT 1", { phone: rec.phone }, true);
          if (existing && existing.length) {
            sql("UPDATE " + tables.permission + " SET name=#{name}, role=#{role}, branch=#{branch}, grid=#{grid}, super_admin=#{super_admin}, enabled=#{enabled} WHERE phone=#{phone}", rec, false);
          } else {
            sql("INSERT INTO " + tables.permission + " (name, phone, role, branch, grid, super_admin, enabled) VALUES (#{name}, #{phone}, #{role}, #{branch}, #{grid}, #{super_admin}, #{enabled})", rec, false);
          }
          success++;
        } catch (e) {
          errors.push("第" + (k + 1) + "行写入失败：" + e.message);
        }
      }
    } else {
      // ========================================================
      // 【核心修改】：先全表清空，再批量 INSERT
      // ========================================================
      var tableName = tables[config[0]];
      
      // 1. 第一步：清空整表
      try {
        sql("DELETE FROM " + tableName, {}, false);
      } catch (delErr) {
        throw new Error("清空表 " + tableName + " 失败，终止导入。原因：" + delErr.message);
      }

      // 2. 第二步：分批批量插入 (防止一次性插入过多导致 SQL 过长报错)
      var fields = config[1];
      var BATCH_SIZE = 500; 
      
      for (var b = 0; b < records.length; b += BATCH_SIZE) {
        var batch = records.slice(b, b + BATCH_SIZE);
        var args = {};
        var valueParts = [];

        for (var bi = 0; bi < batch.length; bi++) {
          var placeholders = [];
          for (var fi = 0; fi < fields.length; fi++) {
            var paramName = "v_" + bi + "_" + fi;
            args[paramName] = batch[bi][fields[fi]];
            placeholders.push("#{" + paramName + "}");
          }
          valueParts.push("(" + placeholders.join(",") + ")");
        }

        var insertSql = "INSERT INTO " + tableName + " (" + fields.join(",") + ") VALUES " + valueParts.join(",");

        try {
          sql(insertSql, args, false);
          success += batch.length;
        } catch (e) {
          errors.push("第 " + (b + 1) + "~" + (b + batch.length) + " 行批量写入失败：" + e.message);
        }
      }
    }

    return { total: rows.length, success: success, failed: rows.length - success, errors: errors, mode: capacity ? "replace" : "replace" };
  }

  // ============================================================
  // dashboard
  // ============================================================


  // ============================================================
  // importTargets
  // ============================================================
  function importTargets() {
    admin();
    var rows = array(Params.rows);
    var data = dashboard();
    var seen = {};
    var prepared = [];
    if (!rows.length || rows.length > 20000) throw new Error("目标导入记录数量无效");

    // 统一目标月份：以当前数据月份为准（YYYY-MM）
    var currentMonth = data.statDate.slice(0, 7); // "2026-10"
    if (!/^\d{4}-\d{2}$/.test(currentMonth)) throw new Error("当前统计日期无效：" + data.statDate);

    // 归一化月份：兼容 2026/10、202610、2026-10-01 等写法
    function normalizeMonth(v) {
      var s = text(v).replace(/[\/\.]/g, "-");
      var m = s.match(/^(\d{4})-(\d{1,2})(?:-\d{1,2})?$/);
      if (m) return m[1] + "-" + ("0" + m[2]).slice(-2);
      var c = s.match(/^(\d{4})(\d{2})$/);
      if (c) return c[1] + "-" + c[2];
      return s;
    }

    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      var key = r.gridId + "|" + r.productId;

      if (seen[key]) throw new Error("目标有重复键：" + key);
      seen[key] = true;

      // gridId 格式：branch::grid
      var parts = String(r.gridId).split("::");
      if (parts.length !== 2 || !parts[0] || !parts[1]) throw new Error("第" + (i + 1) + "行 gridId 格式无效：" + r.gridId);

      // 校验网格存在（放行全市及分公司汇总层级）
      var validGrid = false;
      if (r.gridId === "全市::全市" || parts[0] === parts[1]) {
        validGrid = true;
      } else {
        for (var gi = 0; gi < data.organization.grids.length; gi++) {
          if (data.organization.grids[gi].gridId === r.gridId) { validGrid = true; break; }
        }
      }
      if (!validGrid) throw new Error("第" + (i + 1) + "行网格无效：" + r.gridId);

      // 产品归一化：允许传中文名或 productId
      var productInfo;
      try { productInfo = product(r.productId); }
      catch (e) { throw new Error("第" + (i + 1) + "行产品无效：" + r.productId); }

      // 目标月份校验（归一化后比较）
      var rowMonth = normalizeMonth(r.targetMonth || currentMonth);
      if (rowMonth !== currentMonth) {
        throw new Error("第" + (i + 1) + "行目标月份须为当前数据月份（" + currentMonth + "），实际：" + r.targetMonth);
      }

      var mb = optionalTarget(r.monthBaseTarget), mc = optionalTarget(r.monthChallengeTarget);
      var mm = optionalTarget(r.monthMinTarget);
      if (mm !== null && ((mb !== null && mm > mb) || (mc !== null && mm > mc))) throw new Error("第" + (i + 1) + "行底线目标不能大于基础或挑战目标");
      if (mb !== null && mc !== null && mc < mb) {
        throw new Error("第" + (i + 1) + "行挑战目标不能小于基础目标");
      }
      if (mm === null && mb === null && mc === null) {
        throw new Error("第" + (i + 1) + "行至少填写一个目标值");
      }


      prepared.push({
        branch: parts[0],
        grid: parts[1],
        product_id: productInfo.productId,
        target_month: currentMonth,
        month_min_target: mm,
        month_base_target: mb,
        month_challenge_target: mc
      });
    }

    // 依赖唯一键：branch, grid, product_id, target_month
    var fields = [
      "branch", "grid", "product_id", "target_month",
      "month_min_target", "month_base_target", "month_challenge_target"
    ];
    var BATCH_SIZE = 500;
    var errors = [];
    var success = 0;

    for (var b = 0; b < prepared.length; b += BATCH_SIZE) {
      var batch = prepared.slice(b, b + BATCH_SIZE);
      var args = {};
      var valueParts = [];

      for (var bi = 0; bi < batch.length; bi++) {
        var placeholders = [];
        for (var fi = 0; fi < fields.length; fi++) {
          var paramName = "v_" + bi + "_" + fi;
          args[paramName] = batch[bi][fields[fi]];
          placeholders.push("#{" + paramName + "}");
        }
        valueParts.push("(" + placeholders.join(",") + ")");
      }

      var insertSql = "INSERT INTO " + tables.targets + " (" + fields.join(",") + ") VALUES " + valueParts.join(",") +
        " ON DUPLICATE KEY UPDATE " +
        "month_min_target=VALUES(month_min_target)," +
        "month_base_target=VALUES(month_base_target)," +
        "month_challenge_target=VALUES(month_challenge_target)";

      try {
        sql(insertSql, args, false);
        success += batch.length;
      } catch (e) {
        errors.push("第 " + (b + 1) + "~" + (b + batch.length) + " 行写入失败：" + e.message);
      }
    }

    return {
      imported: success,
      success: success,
      failed: prepared.length - success,
      errors: errors,
      mode: "upsert",
      targetMonth: currentMonth
    };
  }

  // ============================================================
  // importScripts
  // ============================================================
  function importScripts(single) {
    admin();
    var rows = single ? [parse(Params.script)] : array(Params.rows);
    var prepared = [];
    var seen = {};
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      var id = product(r.productId).productId;
      var content = text(r.content);
      if (seen[id] || !content || content.length > 4000) throw new Error("话术产品重复或内容无效");
      seen[id] = true;
      prepared.push({ product_id: id, content: content, updated_at: now(), updated_by: user.phone });
    }
    for (i = 0; i < prepared.length; i++) {
      upsert(tables.scripts, ["product_id", "content", "updated_at", "updated_by"], prepared[i]);
    }
    return single
      ? { productId: prepared[0].product_id, content: prepared[0].content, updatedAt: prepared[0].updated_at, status: "maintained" }
      : { imported: prepared.length };
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
    return { people: people, channels: channels, statDate: data.statDate, totals: populationTotals(data), totalSource: "dimension" };
  }

  // ============================================================
  // search
  // ============================================================
  function search() {
    var data = dashboard();
    var q = text(Params.query).toLowerCase();
    var groups = {};
    var result = [];
    if (!q || q.length > 100 || ["people", "channels"].indexOf(Params.kind) < 0) throw new Error("查询参数无效");
    for (var pi = 0; pi < 2; pi++) {
      var per = pi ? "day" : "month";
      var source = filtered(data, per);
      for (var i = 0; i < source.length; i++) {
        var r = source[i];
        if (Params.kind === "people" && r.channelType !== "直销队伍") continue;
        if (Params.channelType && r.channelType !== Params.channelType) continue;
        var name = Params.kind === "people" ? r.staffName : (r.microChannelName || r.channel);
        var code = Params.kind === "people" ? r.staffId : r.channelCode;
        if ((String(name) + " " + String(code)).toLowerCase().indexOf(q) < 0) continue;
        var key = JSON.stringify([r.gridId, code, r.channelType]);
        if (!groups[key]) {
          groups[key] = { key: key, name: name, code: code, role: Params.kind === "people" ? r.staffRole : r.channelType, branchId: r.branchId, gridId: r.gridId, values: [] };
        }
        var g = groups[key];
        var m = null;
        for (var j = 0; j < g.values.length; j++) if (g.values[j].productId === r.productId) m = g.values[j];
        if (!m) {
          var p = product(r.productId);
          m = { productId: p.productId, productName: p.productName, unit: p.unit, day: null, month: null };
          g.values.push(m);
        }
        m[per] = (m[per] === null ? 0 : m[per]) + r.production;
      }
    }
    for (var key in groups) if (Object.prototype.hasOwnProperty.call(groups, key)) result.push(groups[key]);
    return { results: result, statDate: data.statDate };
  }

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
          if (t.gridId === key && t.productId === productId) { match = t; break; }
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
    var summary = { scope: user.role === "city" ? "中山市" : user.gridName || user.branchName, statDate: data.statDate, demo: false, channelType: category || "全部类型", weekBasis: "rolling7", products: [] };
    for (i = 0; i < selectedProducts.length; i++) {
      var p = selectedProducts[i], day = sum("day", p.productId), month = sum("mon", p.productId), week = sum("week", p.productId), last = sum("last_mon", p.productId);
      var weeklyAverage = week === null ? null : week / 7, monthAverage = month === null ? null : month / elapsed, previousAverage = last === null ? null : last / previousDays;
      summary.products.push({ product: p.productName, unit: p.unit, day: progress(day, goal(p.productId, true)), month: progress(month, goal(p.productId, false)), weeklyAverage: weeklyAverage, monthAverage: monthAverage, previousAverage: previousAverage, dayComparison: change(day, weeklyAverage), monthComparison: change(monthAverage, previousAverage) });
    }
    if (Params.view === "alerts") {
      if (["day", "month"].indexOf(Params.period) < 0) throw new Error("预警周期无效");
      summary.period = Params.period; summary.threshold = num(Params.threshold);
      summary.scope = ids.length === 1 ? "选定网格" : "选定网格范围";
      summary.alerts = [{ category: "直销人员", count: 0 }, { category: "3星+渠道", count: 0 }, { category: "末梢渠道", count: 0 }];
      var alertCounts = aiAlertCounts(data);
      for (j = 0; j < alertCounts.length; j++) {
        var categoryIndex = ["直销队伍", "三星+渠道", "末梢渠道"].indexOf(alertCounts[j].channelType);
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
      terms.push("(" + alias + ".branch_company=#{selectedBranch" + i + "} AND " + alias + ".grid_name=#{selectedGrid" + i + "})");
    }
    return terms.length ? " AND (" + terms.join(" OR ") + ")" : "";
  }
  function capacityQuery(data, detail, args, periods) {
    args.cutoff = data.statDate;
    var clause = " WHERE c.stat_date=#{cutoff}" + scope("c.branch_company", "c.grid_name", args);
    if (detail) clause += selectedGridClause(args, data, "c");
    if (detail && Params.productId) { args.selectedProduct = product(Params.productId).productName; clause += " AND c.product_name=#{selectedProduct}"; }
    if (periods) {
      clause += " AND c.prod_period_type IN (" + periods.map(function (p) { return "'" + p + "'"; }).join(",") + ")";
    } else if (detail) {
      if (Params.funCode === "wgsc_fetchChangeAlerts") clause += " AND c.prod_period_type IN ('mon','last_mon')";
      else if (Params.funCode === "wgsc_searchCapacity") clause += " AND c.prod_period_type IN ('mon','day')";
      else if (Params.funCode === "wgsc_fetchAlerts" || Params.funCode === "wgsc_fetchChannelOptions") {
        args.selectedPeriod = Params.period === "day" ? "day" : "mon";
        clause += " AND c.prod_period_type=#{selectedPeriod}";
      }
    }
    var channelType = text(Params.channelType), selectedTypes = ["三星+渠道", "直销队伍", "末梢渠道"];
    if (channelType === "3星+渠道") channelType = "三星+渠道";
    if (channelType === "全部类型") channelType = "";
    if (channelType && selectedTypes.indexOf(channelType) < 0) throw new Error("生产类型无效");
    // A dashboard always includes every type so switching the selector is local.
    if (detail && channelType) selectedTypes = [channelType];
    if (detail && Params.funCode === "wgsc_searchCapacity" && Params.kind === "people") selectedTypes = selectedTypes.filter(function (v) { return v === "直销队伍"; });
    if (detail && Params.funCode === "wgsc_searchCapacity" && Params.kind === "channels") selectedTypes = selectedTypes.filter(function (v) { return v !== "直销队伍"; });
    var blocks = [];
    for (var i = 0; i < selectedTypes.length; i++) {
      var type = selectedTypes[i], stars = type === "三星+渠道", tail = type === "末梢渠道";
      var table = stars ? tables.channel : tables.staffCapacity;
      var dimension = stars ? tables.channelInfo : tail ? tables.terminal : tables.staff;
      var key = stars ? "chn_code" : "staff_no";
      var join = " INNER JOIN " + latestDimension(dimension, key) + " d ON c." + (stars ? "channel_code" : "staff_no") + "=d." + key;
      join += " AND c.branch_company=d.branch AND c.grid_name=d.grid";
      var condition = clause + (stars ? " AND d.star_level='三星+'" : "");
      if (!stars) condition += " AND NOT EXISTS (SELECT 1 FROM " + (tail ? tables.staff : tables.terminal) + " conflict WHERE conflict.staff_no=c.staff_no)";
      var identity = stars ? "d.chn_code" : tail ? "JSON_ARRAY(d.agent,d.chn_name)" : "d.staff_no";
      var label = stars || tail ? "d.chn_name" : "c.channel_name";
      if (detail && Params.funCode === "wgsc_searchCapacity") {
        args.searchQuery = text(Params.query).toLowerCase();
        if (!args.searchQuery || args.searchQuery.length > 100 || ["people", "channels"].indexOf(Params.kind) < 0) throw new Error("查询参数无效");
        var name = stars || tail ? "d.chn_name" : "d.staff_name";
        condition += " AND LOCATE(#{searchQuery},LOWER(CONCAT(COALESCE(" + name + ",''),' ',COALESCE(" + identity + ",''))))>0";
      }
      var cols = "c.branch_company AS branchId,CONCAT(c.branch_company,'::',c.grid_name) AS gridId," +
        "c.product_name AS productName,c.prod_period_type AS period,'" + type + "' AS channelType," +
        "SUM(c.capacity) AS production,SUM(CASE WHEN c.capacity IS NULL OR c.capacity<0 THEN 1 ELSE 0 END) AS invalidCount,";
      if (detail) cols += (stars || tail ? "''" : "MAX(d.staff_no)") + " AS staffId," +
        (stars || tail ? "''" : "MAX(d.staff_name)") + " AS staffName," +
        (stars || tail ? "''" : "MAX(d.team_type)") + " AS staffRole," +
        "MIN(" + label + ") AS channel," + (stars ? "MAX(d.chn_code)" : "''") + " AS channelCode," +
        (stars ? "MAX(d.star)" : "''") + " AS star," +
        (tail ? "MAX(d.chn_name)" : "''") + " AS microChannelName," +
        (tail ? "MAX(d.agent)" : "''") + " AS serviceProvider," +
        (stars ? "NULL" : "COUNT(*)") + " AS staffCount";
      else cols += "'' AS staffId,'' AS staffName,'' AS staffRole,'' AS channel,'' AS channelCode,'' AS star,'' AS microChannelName,'' AS serviceProvider,NULL AS staffCount";
      blocks.push("SELECT " + cols + " FROM " + table + " c" + join + condition +
        " GROUP BY c.branch_company,c.grid_name,c.product_name,c.prod_period_type" + (detail ? "," + identity : ""));
    }
    if (!blocks.length) return "SELECT '' AS branchId,'' AS gridId,'' AS productName,'' AS period,'' AS channelType,0 AS production,0 AS invalidCount,'' AS staffId,'' AS staffName,'' AS staffRole,'' AS channel,'' AS channelCode,'' AS star,'' AS microChannelName,'' AS serviceProvider,NULL AS staffCount WHERE 1=0";
    return blocks.join(" UNION ALL ");
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
    var cutoff = latest(tables.region);
    var data = { organization: { cityName: "中山市", branches: [], grids: [] }, statDate: cutoff,
      products: products, targets: [], rows: [], dailyRows: [], periodRows: [], regionRows: [],
      salesScripts: [], warnings: [], weekBasis: "rolling7", permission: user, aggregated: true };
    if (!cutoff) { data.warnings.push("当前范围没有区域产能数据"); return data; }
    var args = { cutoff: cutoff }, regionClause = scope("branch_company", "grid_name", args);
    var region = pagedSql("SELECT branch_company,grid_name,product_name,prod_period_type,SUM(capacity) AS capacity," +
      "SUM(CASE WHEN capacity IS NULL OR capacity<0 THEN 1 ELSE 0 END) AS invalid_count,MAX(snapshot_time) AS snapshot_time FROM " +
      tables.region + " WHERE stat_date=#{cutoff}" + regionClause + " GROUP BY branch_company,grid_name,product_name,prod_period_type", args,
      "branch_company,grid_name,product_name,prod_period_type");
    var branches = {}, grids = {};
    function org(b, g) {
      if (!b || !g || b === "全市") return;
      branches[b] = { branchId: b, branchName: b };
      if (b !== g || ["未知", "市统筹"].indexOf(g) >= 0) grids[gridId(b, g)] = { gridId: gridId(b, g), gridName: g, branchId: b };
    }
    for (var i = 0; i < region.length; i++) {
      var r = region[i];
      if (Number(r.invalid_count) > 0) throw new Error("区域产能包含空值或负数");
      org(r.branch_company, r.grid_name);
      data.regionRows.push({ branchId: r.branch_company, gridId: gridId(r.branch_company, r.grid_name),
        level: r.branch_company === "全市" ? "city" : r.branch_company === r.grid_name && ["未知", "市统筹"].indexOf(r.grid_name) < 0 ? "branch" : "grid",
        productId: product(r.product_name).productId, period: r.prod_period_type, production: num(r.capacity), snapshotTime: r.snapshot_time });
    }
    // Distinct organization pairs, never the full personnel/channel dimensions.
    var dimensions = [tables.channelInfo, tables.terminal, tables.staff], orgParts = [], orgArgs = {};
    for (i = 0; i < dimensions.length; i++) orgParts.push("SELECT DISTINCT branch,grid FROM " + dimensions[i] + " WHERE 1=1" + scope("branch", "grid", orgArgs));
    var orgs = pagedSql("SELECT branch,grid FROM (" + orgParts.join(" UNION ") + ") orgs", orgArgs, "branch,grid");
    for (i = 0; i < orgs.length; i++) org(orgs[i].branch, orgs[i].grid);
    data.organization.branches = Object.keys(branches).sort().map(function (k) { return branches[k]; });
    data.organization.grids = Object.keys(grids).sort().map(function (k) { return grids[k]; });
    if (Params.funCode === "wgsc_importTargets") return data;
    var targetMonth = cutoff.slice(0, 7);
    var targetArgs = { month: targetMonth, monthSlash: targetMonth.replace("-", "/") };
    var goals = pagedSql("SELECT * FROM " + tables.targets + " WHERE target_month IN (#{month},#{monthSlash})" + scope("branch", "grid", targetArgs), targetArgs, "id");
    var targetMonthDays = new Date(Date.UTC(Number(cutoff.slice(0, 4)), Number(cutoff.slice(5, 7)), 0)).getUTCDate();
    for (i = 0; i < goals.length; i++) {
      r = goals[i]; var base = optionalTarget(r.month_base_target), challenge = optionalTarget(r.month_challenge_target), minimum = optionalTarget(r.month_min_target);
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
    data.sourceDates = { region: cutoff, channel: channelDate, staff: staffDate };
    if (channelDate !== cutoff) data.warnings.push("渠道产能表最新日期（" + (channelDate || "无") + "）与区域产能表（" + cutoff + "）不一致，本次按区域表日期读取");
    if (staffDate !== cutoff) data.warnings.push("工号产能表最新日期（" + (staffDate || "无") + "）与区域产能表（" + cutoff + "）不一致，本次按区域表日期读取");
    return data;
  }
  function dashboard() {
    if (dashboardMemo) return dashboardMemo;
    var data = metadata();
    if (!data.statDate || Params.funCode === "wgsc_importTargets") { dashboardMemo = data; return data; }
    var args = {}, detail = ["wgsc_fetchAlerts", "wgsc_fetchChangeAlerts", "wgsc_searchCapacity", "wgsc_fetchChannelOptions"].indexOf(Params.funCode) >= 0;
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
      if (row.period === "day") { var dailyRow = copyRow(row); dailyRow.date = data.statDate; data.dailyRows.push(dailyRow); }
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
        " AS identity FROM " + latestDimension(table, kind === "stars" ? "chn_code" : "staff_no") +
        " d WHERE 1=1" + scope("d.branch", "d.grid", args) + extra;
    }
    var relation = roster(tables.staff, "d.staff_no", "people", "") + " UNION ALL " +
      roster(tables.channelInfo, "d.chn_code", "stars", " AND d.star_level='三星+'") + " UNION ALL " +
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
        "(roster.kind='tail' AND m.channelType='末梢渠道' AND JSON_ARRAY(m.serviceProvider,m.microChannelName)=roster.identity)))";
    }
    var counts = sql("SELECT kind,COUNT(DISTINCT CONCAT(gridId,CHAR(31),identity)) AS total FROM (" + relation + ") roster" + where + " GROUP BY kind", args, true);
    var result = { people: 0, stars: 0, tail: 0 };
    for (var j = 0; j < counts.length; j++) result[counts[j].kind] = Number(counts[j].total);
    return result;
  }
  function channelOptions() {
    var data = metadata(), args = {};
    if (!data.statDate) return { channels: [], statDate: "" };
    var query = capacityQuery(data, true, args);
    var rows = pagedSql("SELECT DISTINCT channel FROM (" + query + ") channel_groups WHERE channel IS NOT NULL AND channel<>''", args, "channel");
    return { channels: rows.map(function (r) { return r.channel; }), statDate: data.statDate };
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
    if (!data.statDate) return { people: [], channels: [], statDate: "", totals: { people: 0, stars: 0, tail: 0 }, totalSource: "dimension" };
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
    if (["wgsc_fetchAlerts", "wgsc_fetchChangeAlerts", "wgsc_searchCapacity"].indexOf(Params.funCode) < 0) return result;
    var page = Number(Params.page || 1), size = Number(Params.pageSize || 200);
    if (!isFinite(page) || page < 1 || Math.floor(page) !== page || !isFinite(size) || size < 1 || size > 1000 || Math.floor(size) !== size) throw new Error("分页参数无效");
    var offset = (page - 1) * size;
    var list = result.results || result.people.concat(result.channels), total = list.length;
    if (result.results) result.results = list.slice(offset, offset + size);
    else {
      result.counts = { people: result.people.length,
        stars: result.channels.filter(function (r) { return r.channelType === "三星+渠道"; }).length,
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
    wgsc_fetchAlerts: alerts,
    wgsc_searchCapacity: search,
    wgsc_importCapacity: function () { return imports(true); },
    wgsc_importRows: function () { return imports(false); },
    wgsc_importTargets: importTargets,
    wgsc_importSalesScripts: function () { return importScripts(false); },
    wgsc_saveSalesScript: function () { return importScripts(true); }
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
