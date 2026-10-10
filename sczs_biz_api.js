// Handle2 globals: Params, JsResult, CustomizeUtil. Keep ES5 syntax for platform execution.
function init() {
  // ========== 表名 ==========
  var tables = {
    region: "app_open_api_c003_wgsc_region_capacity_1",
    channel: "app_open_api_c001_wgsc_chn_capacity_1",
    staffCapacity: "app_open_api_c003_wgsc_staff_capacity_1",
    channelInfo: "app_open_api_c002_wgsc_chn_level_1",
    terminal: "app_open_api_c001_wgsc_staff_terminal_1",
    staff: "app_open_api_c001_wgsc_staff_1",
    permission: "app_open_api_c002_wgsc_permission_1",
    targets: "app_open_api_c001_wgsc_target_1",
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
  function permission(phone) {
    var a = sql("SELECT name,phone,role,branch,grid,super_admin FROM " + tables.permission + " WHERE phone=#{phone} AND enabled=1", { phone: phone }, true);
    if (a.length !== 1) throw new Error("该手机号无有效权限");
    var p = a[0];
    p.role = { 1: "city", 2: "branch", 3: "grid" }[String(p.role)];
    if (["city", "branch", "grid"].indexOf(p.role) < 0 || (p.role !== "city" && !p.branch) || (p.role === "grid" && !p.grid)) throw new Error("权限记录缺少组织范围");
    return {
      name: p.name, phone: p.phone, role: p.role, cityName: "中山市",
      branchName: p.branch || "", branchId: p.role === "city" ? "" : p.branch,
      gridName: p.grid || "", gridId: p.role === "grid" ? gridId(p.branch, p.grid) : "",
      isSuperAdmin: p.role === "city" && Number(p.super_admin) === 1
    };
  }
  function authenticate() {
    var token = text(Params.token);
    if (!token) throw new Error("00008: token不能为空");
    var redis = parse(CustomizeUtil.redisGet({ key: token }));
    var v = parse(redis && redis.data !== undefined ? redis.data : redis);
    v = parse(v && v.value !== undefined ? v.value : v);
    if (!v) throw new Error("00008: token已过期");
    var phone = text(find(v, ["phone", "mobile", "userphone", "userPhone", "mobileno"]));
    if (!/^1\d{10}$/.test(phone)) phone = text(find(CustomizeUtil.getMobile(token), ["phone", "mobile", "userphone", "userPhone", "mobileno"]));
    if (!/^1\d{10}$/.test(phone)) throw new Error("00008: token未解析到手机号");
    return permission(phone);
  }
  var user;
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
  function readTable(table, dimension, cutoff) {
    var args = {};
    var clause = scope(dimension ? "branch" : "branch_company", dimension ? "grid" : "grid_name", args);
    if (cutoff) {
      args.cutoff = cutoff;
      clause += " AND stat_date=#{cutoff}";
    }
    var a = sql("SELECT * FROM " + table + " WHERE 1=1" + clause + " ORDER BY id LIMIT 20001", args, true);
    if (a.length > 20000) throw new Error("超过20000条，需配置分页；禁止静默截断");
    return a;
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
          if ((r.role !== "city" && !r.branch) || (r.role === "grid" && !r.grid) || (r.role === "city" && (r.branch || r.grid)) || (r.role === "branch" && r.grid) || (r.is_super_admin === "1" && r.role !== "city")) throw new Error("权限组织范围无效");
          if (r.phone === user.phone && (r.role !== "city" || r.is_super_admin !== "1" || r.enabled !== "1")) throw new Error("不能禁用或降级当前超级管理员");
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
    for (var k = 0; k < records.length; k++) {
      try {
        upsert(tables[config[0]], config[1], records[k]);
        success++;
      } catch (e) {
        errors.push("第" + (k + 1) + "行写入失败：" + e.message);
      }
    }
    return { total: rows.length, success: success, failed: rows.length - success, errors: errors, mode: "upsert" };
  }

  // ============================================================
  // dashboard
  // ============================================================
  function dashboard() {
    // ========== 1. 读取产能表最新日期 ==========
    var cutoff = latest(tables.region);
    if (!cutoff) throw new Error("当前范围没有区域产能数据");

    var cutoffChannel = latest(tables.channel);
    if (cutoffChannel !== cutoff) throw new Error("渠道产能表最新日期不一致：region=" + cutoff + " channel=" + cutoffChannel);

    var cutoffStaff = latest(tables.staffCapacity);
    if (cutoffStaff !== cutoff) throw new Error("工号产能表最新日期不一致：region=" + cutoff + " staff=" + cutoffStaff);

    // ========== 2. 读三张产能表 ==========
    var region = readTable(tables.region, false, cutoff);
    var channels = readTable(tables.channel, false, cutoff);
    var staff = readTable(tables.staffCapacity, false, cutoff);

    // ========== 3. 读三张维度表 ==========
    var dc = readTable(tables.channelInfo, true);
    var dt = readTable(tables.terminal, true);
    var ds = readTable(tables.staff, true);

    // ========== 4. 初始化聚合容器 ==========
    var branches = {};
    var grids = {};
    var cm = {};
    var tm = {};
    var sm = {};
    var records = {};
    var regionRows = [];
    var warnings = [];

    function org(b, g) {
      if (b === "全市") return;
      branches[b] = { branchId: b, branchName: b };
      if (b !== g || ["未知", "市统筹"].indexOf(g) >= 0) {
        grids[gridId(b, g)] = { gridId: gridId(b, g), gridName: g, branchId: b };
      }
    }

    // ========== 5. 处理区域产能行 ==========
    for (var i = 0; i < region.length; i++) {
      var r = region[i];
      org(r.branch_company, r.grid_name);
      var production = num(r.capacity);
      var productId = product(r.product_name).productId;
      regionRows.push({
        branchId: r.branch_company,
        gridId: gridId(r.branch_company, r.grid_name),
        level: r.branch_company === "全市" ? "city"
          : (r.branch_company === r.grid_name && ["未知", "市统筹"].indexOf(r.grid_name) < 0 ? "branch" : "grid"),
        productId: productId,
        period: r.prod_period_type,
        production: production,
        snapshotTime: r.snapshot_time
      });
    }

    // ========== 6. 处理渠道维度 → cm ==========
    for (i = 0; i < dc.length; i++) {
      r = dc[i];
      org(r.branch, r.grid);
      cm[r.chn_code] = r;
    }

    // ========== 7. 处理末梢 → tm ==========
    for (i = 0; i < dt.length; i++) {
      r = dt[i];
      org(r.branch, r.grid);
      tm[r.staff_no] = r;
    }

    // ========== 8. 处理员工 → sm ==========
    for (i = 0; i < ds.length; i++) {
      r = ds[i];
      org(r.branch, r.grid);
      sm[r.staff_no] = r;
    }

    // ========== 9. add() 聚合函数定义 ==========
    function add(row, info, type) {
      var b = row.branch_company;
      var g = row.grid_name;
      if (info.branch !== b || info.grid !== g) {
        warnings.push("归属冲突，已排除：" + (row.staff_no || row.channel_code));
        return;
      }
      org(b, g);
      var p = product(row.product_name).productId;
      var identity = type === "三星+渠道" ? row.channel_code
        : (type === "末梢渠道" ? JSON.stringify([info.agent, info.chn_name || row.channel_name]) : row.staff_no);
      var key = JSON.stringify([b, g, p, row.prod_period_type, type, identity]);
      var e = records[key];
      if (!e) {
        var star = String(info.star || "").match(/([0-9三四五])\s*星/);
        var stars = { "三": 3, "四": 4, "五": 5 };
        e = records[key] = {
          branchId: b,
          gridId: gridId(b, g),
          productId: p,
          period: row.prod_period_type,
          production: 0,
          channelType: type,
          staffId: type === "直销队伍" ? row.staff_no : "",
          staffName: info.staff_name || "",
          staffRole: info.team_type || "",
          channel: type === "三星+渠道" ? info.chn_name : row.channel_name,
          channelCode: type === "末梢渠道" ? "tail:" + identity : row.channel_code,
          channelStar: star ? (stars[star[1]] || Number(star[1])) : null,
          microChannelName: type === "末梢渠道" ? info.chn_name : "",
          serviceProvider: info.agent || "",
          staffCount: type === "三星+渠道" ? null : 0
        };
      }
      e.production += num(row.capacity);
      if (e.staffCount !== null) e.staffCount++;
    }

    // ========== 10. 聚合渠道产能（只取三星+） ==========
    for (i = 0; i < channels.length; i++) {
      r = channels[i];
      if (cm[r.channel_code] && cm[r.channel_code].star_level === "三星+") {
        add(r, cm[r.channel_code], "三星+渠道");
      }
    }

    // ========== 11. 聚合工号产能（直销 / 末梢） ==========
    for (i = 0; i < staff.length; i++) {
      r = staff[i];
      if (sm[r.staff_no] && tm[r.staff_no]) throw new Error("工号同时出现在员工与末梢维度：" + r.staff_no);
      if (sm[r.staff_no]) add(r, sm[r.staff_no], "直销队伍");
      else if (tm[r.staff_no]) add(r, tm[r.staff_no], "末梢渠道");
      else if (warnings.length < 20) warnings.push("未匹配员工/末梢维度，已排除：" + r.staff_no);
    }

    // ========== 12. 拆分月 / 日 / 周期 ==========
    var month = [];
    var day = [];
    var periodRows = [];
    for (var key in records) {
      if (Object.prototype.hasOwnProperty.call(records, key)) {
        var e2 = records[key];
        periodRows.push(e2);
        if (e2.period === "mon") month.push(e2);
        if (e2.period === "day") { e2.date = cutoff; day.push(e2); }
      }
    }

    // ========== 13. 查目标 ==========
    var args = { month: cutoff.slice(0, 7) };
    var targets = sql("SELECT * FROM " + tables.targets + " WHERE target_month=#{month}" + scope("branch", "grid", args), args, true);
    for (i = 0; i < targets.length; i++) {
      r = targets[i];
      var monthTarget = num(r.month_target);
      var dailyTarget = null;
      if (r.day_target !== null && r.day_target !== undefined) dailyTarget = num(r.day_target);
      var targetDate = "";
      if (r.target_date) targetDate = date(r.target_date);
      targets[i] = {
        gridId: gridId(r.branch, r.grid),
        productId: r.product_id,
        target: monthTarget,
        dailyTarget: dailyTarget,
        targetDate: targetDate
      };
    }

    // ========== 14. 查话术 ==========
    var scripts = sql("SELECT product_id,content,updated_at FROM " + tables.scripts + " ORDER BY product_id", {}, true);
    for (i = 0; i < scripts.length; i++) {
      r = scripts[i];
      scripts[i] = {
        productId: r.product_id,
        content: r.content,
        updatedAt: r.updated_at,
        status: "maintained",
        source: "超级管理员维护"
      };
    }

    // ========== 15. 返回 ==========
    return {
      organization: {
        cityName: "中山市",
        branches: Object.keys(branches).map(function (k) { return branches[k]; }),
        grids: Object.keys(grids).map(function (k) { return grids[k]; })
      },
      statDate: cutoff,
      products: products,
      targets: targets,
      rows: month,
      dailyRows: day,
      periodRows: periodRows,
      regionRows: regionRows,
      salesScripts: scripts,
      warnings: warnings,
      weekBasis: "rolling7",
      permission: user
    };
  }

  // ============================================================
  // importTargets
  // ============================================================
  function importTargets() {
    admin();
    var rows = array(Params.rows);
    var data = dashboard();
    var allowed = {};
    var seen = {};
    var prepared = [];
    for (var i = 0; i < data.organization.grids.length; i++) {
      for (var j = 0; j < products.length; j++) {
        allowed[data.organization.grids[i].gridId + "|" + products[j].productId] = data.organization.grids[i];
      }
    }
    for (i = 0; i < rows.length; i++) {
      var r = rows[i];
      var key = r.gridId + "|" + r.productId;
      var g = allowed[key];
      if (!g || seen[key]) throw new Error("目标有无效网格/产品或重复键");
      seen[key] = true;
      if (r.targetDate && date(r.targetDate) !== data.statDate) throw new Error("日目标须为当前统计日");
      prepared.push({
        branch: g.branchId,
        grid: g.gridName,
        product_id: r.productId,
        target_month: data.statDate.slice(0, 7),
        month_target: num(r.target),
        day_target: (r.dailyTarget === null || r.dailyTarget === undefined) ? null : num(r.dailyTarget),
        target_date: r.targetDate ? date(r.targetDate) : null
      });
    }
    for (key in allowed) {
      if (Object.prototype.hasOwnProperty.call(allowed, key) && !seen[key]) throw new Error("目标表须覆盖全部网格产品");
    }
    for (i = 0; i < prepared.length; i++) {
      upsert(tables.targets, ["branch", "grid", "product_id", "target_month", "month_target", "day_target", "target_date"], prepared[i]);
    }
    return { imported: prepared.length };
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
    return { people: people, channels: channels, statDate: data.statDate };
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
  // handlers
  // ============================================================
  var handlers = {
    wgsc_fetchDashboard: dashboard,
    wgsc_fetchAlerts: alerts,
    wgsc_searchCapacity: search,
    wgsc_importCapacity: function () { return imports(true); },
    wgsc_importRows: function () { return imports(false); },
    wgsc_importTargets: importTargets,
    wgsc_importSalesScripts: function () { return importScripts(false); },
    wgsc_saveSalesScript: function () { return importScripts(true); }
  };

  // ============================================================
  // 最外层 try/catch
  // ============================================================
  try {
    if (!Object.prototype.hasOwnProperty.call(handlers, Params.funCode)) throw new Error("非法调用");
    user = authenticate();
    var result = handlers[Params.funCode]();
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