// Import gateway servicecode: F539bcaeec30686a. Standalone Handle2 ES5 script.
// Handle2 globals: Params, JsResult, CustomizeUtil. Keep ES5 syntax for platform execution.
function init() {
  // Save-time validation must not authenticate or access business tables.
  if (typeof Params === "undefined" || !Params || !Params.funCode) {
    JsResult.result = JSON.stringify({result:{retCode:"0",retMsg:"导入网关就绪",data:{ready:true}}});
    return;
  }
  // ========== 表名 ==========
  var tables = {
    region: "app_open_api_c003_wgsc_region_capacity_1",
    channel: "app_open_api_c001_wgsc_chn_capacity_1",
    staffCapacity: "app_open_api_c003_wgsc_staff_capacity_1",
    channelInfo: "app_open_api_c003_wgsc_chn_level_1",
    terminal: "app_open_api_c002_wgsc_staff_terminal_1",
    staff: "app_open_api_c003_wgsc_staff_1",
    permission: "app_open_api_c003_wgsc_permission_1",
    targets: "app_open_api_c003_wgsc_target_1",
    scripts: "app_open_api_c001_wgsc_script_1",
    staffBroadbandTarget: "app_open_api_c001_wgsc_stf_bb_target_m_1",
    staffCategoryTarget: "app_open_api_c001_wgsc_staff_target_m_1",
    areaContractor: "app_open_api_c002_wgsc_area_contractor_1",
    staffOwn: "app_open_api_c001_wgsc_staff_own_team_1", // 新增
    // 新增的日产能表
    regionDay: "app_open_api_c002_wgsc_reg_capacity_d_1",
    channelDay: "app_open_api_c002_wgsc_chn_capacity_d_1",
    staffDay: "app_open_api_c002_wgsc_stf_capacity_d_1",
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

  var user;
  function now() {
    var d = new Date(new Date().getTime() + 8 * 3600000);
    return formatDate(d) + " " + pad(d.getUTCHours()) + ":" + pad(d.getUTCMinutes()) + ":" + pad(d.getUTCSeconds());
  }

  function snapshot(v) {
    if (typeof v === "number" && isFinite(v)) {
      var d = new Date(v + 8 * 3600000);
      return d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate()) + " " + pad(d.getUTCHours()) + ":" + pad(d.getUTCMinutes()) + ":" + pad(d.getUTCSeconds());
    }
    var s = text(v)
      .replace(/^(\d{4})(\d{2})(\d{2})(\d{2})$/, "$1-$2-$3 $4:00:00")
      .replace(/^(\d{4})(\d{2})(\d{2})\s+(\d{2})(\d{2})(\d{2})$/, "$1-$2-$3 $4:$5:$6")
      .replace(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})(\s+)/, function (_, y, m, d, separator) {
        return y + "-" + pad(Number(m)) + "-" + pad(Number(d)) + separator;
      })
      .replace("T", " ").slice(0, 19);
    if (!s) return now();
    date(s);
    if (!/^\d{4}-\d{2}-\d{2} (?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(s)) throw new Error("无效取数时间");
    return s;
  }

  function admin() {
    if (!user.isSuperAdmin) throw new Error("仅超级管理员可导入或维护");
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

  function importGoal(v, integer) {
    if (text(v) === "无" || text(v) === "") return null;
    var n = num(v);
    if (!/^\d+(?:\.\d{1,2})?$/.test(text(v)) || n >= 1e16 || Math.round(n * 100) > 9007199254740991 || (integer && Math.floor(n) !== n)) throw new Error("目标须为非负" + (integer ? "整数" : "数，最多两位小数"));
    return n;
  }

  function importMonth(v, shortMonth) {
    var s = text(v), m = /^(\d{4})[-/](\d{1,2})$/.exec(s) || /^(\d{4})(\d{2})$/.exec(s);
    if (m && Number(m[1]) >= 1900 && Number(m[2]) >= 1 && Number(m[2]) <= 12) return m[1] + "-" + pad(Number(m[2]));
    m = /^(\d{1,2})月$/.exec(s);
    if (shortMonth && m && Number(m[1]) >= 1 && Number(m[1]) <= 12) return Number(m[1]) + "月";
    throw new Error("月份须为YYYY-MM" + (shortMonth ? "，兼容10月" : ""));
  }

  function imports(capacity, isDaily) {
    admin();
    // Gateway parameters may arrive as strings, so only explicit true/1 enables daily mode.
    isDaily = isDaily === true || isDaily === 1 || text(isDaily) === "true" || text(isDaily) === "1";
    var configs = capacity
      ? (isDaily
        ? {
            region: ["regionDay", ["branch_company", "grid_name", "product_name", "capacity", "stat_date", "snapshot_time"]],
            channel: ["channelDay", ["branch_company", "grid_name", "channel_code", "channel_name", "product_name", "capacity", "stat_date", "snapshot_time"]],
            staff: ["staffDay", ["branch_company", "grid_name", "channel_code", "channel_name", "staff_no", "product_name", "capacity", "stat_date", "snapshot_time"]]
          }
        : {
            region: ["region", ["branch_company", "grid_name", "prod_period_type", "product_name", "capacity", "stat_date", "snapshot_time"]],
            channel: ["channel", ["branch_company", "grid_name", "channel_code", "channel_name", "prod_period_type", "product_name", "capacity", "stat_date", "snapshot_time"]],
            staff: ["staffCapacity", ["branch_company", "grid_name", "channel_code", "channel_name", "staff_no", "prod_period_type", "product_name", "capacity", "stat_date", "snapshot_time"]]
          })
      : {
          channelInfo: ["channelInfo", ["chn_code", "chn_name", "branch", "grid_code", "grid", "star", "star_level", "monthly_kd_target"]],
          terminal: ["terminal", ["staff_no", "staff_name", "agent", "branch", "grid", "chn_name"]],
          staff: ["staff", ["staff_no", "branch", "grid", "staff_name", "job", "team_type", "monthly_kd_target"]],
          staffBroadbandTarget: ["staffBroadbandTarget", ["type","name","branch","grid","business_hall","ngboss_id","monthly_kd_target"], ["ngboss_id"]],
          staffCategoryTarget: ["staffCategoryTarget", ["target_month","team_type","product_id","product_name","month_base_target","month_challenge_target"], ["target_month","team_type","product_id"]],
          areaContractor: ["areaContractor", ["branch","grid","chn_name","chn_code","monthly_kd_target","mon"], ["chn_code","mon"]],
          staffOwn: ["staffOwn", ["branch", "grid", "staff_no", "staff_name", "team"]], // 新增
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
        r.stat_date = isDaily && target === "region" ? text(r.stat_date) : date(r.stat_date);
        r.snapshot_time = snapshot(r.snapshot_time);
        if (!isDaily) r.prod_period_type = period(r.prod_period_type);
        r.product_name = product(r.product_name).productName;
        if (!r.branch_company || !r.grid_name || !r.stat_date || (target !== "region" && (!r.channel_code || !r.channel_name)) || (target === "staff" && !r.staff_no)) throw new Error("第" + (i + 1) + "行缺必填字段");
      } else {
        if (config[2]) {
          if (target === "staffCategoryTarget") {
            r.target_month = importMonth(r.target_month, false);
            if (["行销经理","商企经理","装维随销"].indexOf(r.team_type) < 0) throw new Error("人员类型无效");
            var p = product(r.product_id);
            if (r.product_name && product(r.product_name).productId !== p.productId) throw new Error("产品ID与名称不一致");
            r.product_id = p.productId; r.product_name = p.productId === "plan119" ? "129+高套" : p.productName;
            r.month_base_target = importGoal(rows[i].month_base_target, true); r.month_challenge_target = importGoal(rows[i].month_challenge_target, true);
            if (r.month_base_target === null && r.month_challenge_target === null) throw new Error("基础值和挑战值至少填写一项");
            if (r.month_base_target !== null && r.month_challenge_target !== null && r.month_challenge_target < r.month_base_target) throw new Error("挑战值不能小于基础值");
          } else {
            var limits = target === "areaContractor" ? {branch:32,grid:32,chn_name:128,chn_code:20} : {type:32,name:32,branch:32,grid:32,ngboss_id:32};
            for (var required in limits) if (!r[required] || r[required].length > limits[required]) throw new Error("第" + (i+1) + "行" + required + "缺失或过长");
            if (target === "staffBroadbandTarget" && (["营业员","终端驻店员"].indexOf(r.type) < 0 || r.business_hall.length > 64)) throw new Error("人员类型或营业厅名称无效");
            r.monthly_kd_target = importGoal(rows[i].monthly_kd_target, false);
            if (target === "areaContractor") r.mon = importMonth(r.mon, true);
          }
        } else if (target === "permission") {
          if (!r.name || !/^1\d{10}$/.test(r.phone) || ["city", "branch", "grid"].indexOf(r.role) < 0 || !/^[01]$/.test(r.is_super_admin) || !/^[01]$/.test(r.enabled)) throw new Error("权限姓名/手机号/角色/标志无效");
          if ((r.role !== "city" && !r.branch) || (r.role === "grid" && !r.grid) || (r.role === "city" && (r.branch || r.grid)) || (r.role === "branch" && r.grid)) throw new Error("权限组织范围无效");
          if (r.phone === user.phone && (r.is_super_admin !== "1" || r.enabled !== "1")) throw new Error("不能禁用或降级当前超级管理员");
          r.role = { city: 1, branch: 2, grid: 3 }[r.role];
          r.super_admin = Number(r.is_super_admin);
          delete r.is_super_admin;
        } else if (!r.branch || !r.grid || (target === "channelInfo" ? !r.chn_code || !r.chn_name : !r.staff_no || !r.staff_name)) throw new Error("第" + (i + 1) + "行缺必填字段");
        
        // 追加 staffOwn 的必填校验
        if (target === "staffOwn") {
          if (!r.branch || !r.grid || !r.staff_no || !r.staff_name) {
             throw new Error("第" + (i + 1) + "行缺必填字段(branch/grid/staff_no/staff_name)");
          }
        }

        if (target === "channelInfo") {
          var star = r.star.match(/([0-9三四五六七八九十])\s*星/);
          if (!r.star_level) r.star_level = star && (Number(star[1]) >= 3 || /[三四五六七八九十]/.test(star[1])) ? "三星+" : "非三星+";
          if (["营业厅","三星+","非三星+"].indexOf(r.star_level) < 0) throw new Error("渠道类型无效");
        }
        if (target === "channelInfo" || target === "staff") r.monthly_kd_target = importGoal(rows[i].monthly_kd_target, false);
        if (target === "staff") { r.job = r.job || r.team_type; r.team_type = r.team_type || r.job; if (!r.job || (["行销经理","商企经理","装维随销"].indexOf(r.job) >= 0 && r.job !== r.team_type)) throw new Error("岗位和队伍类别不一致"); }
        if (target === "staff" && ["行销经理", "商企经理", "装维随销"].indexOf(r.team_type) < 0) throw new Error("队伍类型须为行销经理/商企经理/装维随销");
      }
      var key = capacity
        ? JSON.stringify(isDaily
          ? [r.stat_date, r.branch_company, r.grid_name, r.channel_code, r.staff_no, r.product_name]
          : [r.stat_date, r.branch_company, r.grid_name, r.channel_code, r.staff_no, r.prod_period_type, r.product_name])
        : config[2] ? JSON.stringify(config[2].map(function (field) { return r[field]; })) : (r.phone || r.chn_code || r.staff_no);
      if (seen[key]) throw new Error("第" + (i + 1) + "行重复唯一键");
      seen[key] = true;
      records.push(r);
    }
    var errors = [];
    var success = 0;

    if (config[2]) {
      for (var n = 0; n < records.length; n++) {
        var recNew = records[n], clauses = [], tableNew = tables[config[0]];
        for (var ki = 0; ki < config[2].length; ki++) {
          var keyField = config[2][ki], monthValue = recNew[keyField];
          if ((keyField === "mon" || keyField === "target_month") && /^\d{4}-\d{2}$/.test(monthValue)) {
            recNew.importMonthSlash = monthValue.replace("-", "/"); recNew.importMonthCompact = monthValue.replace("-", "");
            clauses.push("`" + keyField + "` IN (#{" + keyField + "},#{importMonthSlash},#{importMonthCompact})");
          } else clauses.push("`" + keyField + "`=#{" + keyField + "}");
        }
        try {
          var oldRows = sql("SELECT id FROM " + tableNew + " WHERE " + clauses.join(" AND ") + " ORDER BY id DESC LIMIT 1", recNew, true);
          if (oldRows.length) {
            recNew.existingId = oldRows[0].id;
            sql("UPDATE " + tableNew + " SET " + config[1].map(function (f) { return "`" + f + "`=#{" + f + "}"; }).join(",") + " WHERE id=#{existingId}", recNew, false);
          } else upsert(tableNew, config[1], recNew);
          success++;
        } catch (writeError) { errors.push("第" + (n+1) + "行写入失败：" + writeError.message); }
      }
    } else if (target === "permission") {
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

    return { total: rows.length, success: success, failed: rows.length - success, errors: errors, mode: config[2] || target === "permission" ? "upsert" : "replace" };
  }

  function importTargets() {
    admin();
    var rows = array(Params.rows);
    var data = importMetadata();
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

  // Target imports only need the current cutoff and valid organization pairs.
  function importMetadata() {
    var cutoff = latest(tables.region);
    if (!cutoff) throw new Error("当前范围没有区域产能数据，无法确认目标月份");
    var args = {cutoff:cutoff};
    var pairs = pagedSql("SELECT DISTINCT branch_company AS branch,grid_name AS grid FROM " + tables.region +
      " WHERE stat_date=#{cutoff}" + scope("branch_company", "grid_name", args), args, "branch,grid");
    var dimensions = [tables.channelInfo,tables.terminal,tables.staff], parts = [], orgArgs = {};
    for (var i = 0; i < dimensions.length; i++) parts.push("SELECT DISTINCT branch,grid FROM " + dimensions[i] + " WHERE 1=1" + scope("branch", "grid", orgArgs));
    pairs = pairs.concat(pagedSql("SELECT branch,grid FROM (" + parts.join(" UNION ") + ") orgs", orgArgs, "branch,grid"));
    var grids = {}, result = [];
    for (i = 0; i < pairs.length; i++) {
      var b = text(pairs[i].branch), g = text(pairs[i].grid), key = gridId(b,g);
      if (!b || !g || b === "全市" || (b === g && ["未知","市统筹"].indexOf(g) < 0) || grids[key]) continue;
      grids[key] = true;
      result.push({gridId:key,gridName:g,branchId:b});
    }
    return {statDate:cutoff,organization:{grids:result}};
  }

  var handlers = {
    wgsc_importCapacity: function () { return imports(true, Params.isDaily); },
    wgsc_importRows: function () { return imports(false); },
    wgsc_importTargets: importTargets,
    wgsc_importSalesScripts: function () { return importScripts(false); },
    wgsc_saveSalesScript: function () { return importScripts(true); }
  };
  try {
    if (!Object.prototype.hasOwnProperty.call(handlers, Params.funCode)) throw new Error("非法调用");
    user = authenticate();
    admin();
    var result = handlers[Params.funCode]();
    JsResult.result = JSON.stringify({result:{retCode:"0",retMsg:"成功",data:result}});
  } catch (e) {
    JsResult.result = JSON.stringify({result:{retCode:String(e.message).indexOf("00008:")===0?"00008":"1",retMsg:e.message||"导入执行失败",data:null}});
  }
}
init();
