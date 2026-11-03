// Dedicated Handle2 broadband gateway. ES5; no imports required.
// This ES5 factory is also embedded in sczs_broadband_api.js for the Handle2 runtime.
function createBroadbandEngine() {
  var categories = [
    { id: 'contractors', name: '包片商', unit: '商', cadence: '至少1天1条 · 各商独立目标', icon: 'store' },
    { id: 'managers', name: '行销/商企经理', unit: '人', cadence: '2天1条', icon: 'people' },
    { id: 'clerks', name: '营业员', unit: '人', cadence: '3天1条', icon: 'person' },
    { id: 'installers', name: '装维随销', unit: '人', cadence: '4天1条', icon: 'tools' },
    { id: 'stars', name: '3星+渠道', unit: '渠道', cadence: '5天1条', icon: 'store' },
    { id: 'residents', name: '终端驻店员', unit: '人', cadence: '6天1条', icon: 'person' }
  ];
  function numeric(v) { return v === null || v === undefined || String(v).replace(/\s/g, '') === '' || !isFinite(Number(v)) || Number(v) < 0 ? null : Number(v); }
  function calendar(value) {
    var match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
    if (!match) throw new Error('数据日期格式无效');
    var y = Number(match[1]), m = Number(match[2]), d = Number(match[3]);
    var days = new Date(Date.UTC(y, m, 0)).getUTCDate();
    if (m < 1 || m > 12 || d < 1 || d > days) throw new Error('数据日期无效');
    return { statDate: value, month: value.slice(0, 7), elapsedDays: d, daysInMonth: days,
      previousDays: Math.min(d, new Date(Date.UTC(y, m - 1, 0)).getUTCDate()), timeProgress: d / days * 100 };
  }
  function category(id) { for (var i = 0; i < categories.length; i++) if (categories[i].id === id) return categories[i]; throw new Error('宽带对象类型无效'); }
  function tier(production) {
    if (production === null) return '';
    return production === 0 ? 'E' : production <= 3 ? 'D' : production <= 6 ? 'C' : production <= 9 ? 'B' : 'A';
  }
  function entity(raw, clock) {
    var target = numeric(raw.monthlyTarget), production = numeric(raw.production);
    var noProductionRecord = raw.production === null || raw.production === undefined || String(raw.production).replace(/\s/g, '') === '';
    // Confirmed business rule: absent current-month production counts as zero.
    // Invalid recorded values and absent history remain unknown.
    if (Number(raw.invalidProduction || 0) > 0) production = null;
    else if (noProductionRecord) production = 0;
    var previous = Number(raw.invalidPrevious || 0) > 0 ? null : numeric(raw.previousProduction);
    var week = Number(raw.invalidWeek || 0) > 0 ? null : numeric(raw.weekProduction);
    var previousWeek = Number(raw.invalidPreviousWeek || 0) > 0 ? null : numeric(raw.previousWeekProduction);
    var expected = target === null ? null : target * clock.elapsedDays / clock.daysInMonth;
    var eligible = target !== null && target > 0 && production !== null;
    var monthlyRate = eligible ? production / target * 100 : null;
    var reached = eligible && production + 1e-9 >= expected;
    var monthAverage = production === null ? null : production / clock.elapsedDays;
    var previousAverage = previous === null ? null : previous / clock.previousDays;
    return { identity: String(raw.identity || ''), name: String(raw.name || raw.identity || '名称未提供'), role: String(raw.role || ''),
      branch: String(raw.branch || ''), grid: String(raw.grid || ''), location: String(raw.location || ''), categoryId: raw.categoryId,
      monthlyTarget: target, production: production, expected: expected, completionRate: monthlyRate,
      gap: eligible ? Math.max(0, target - production) : null, eligible: eligible, reached: reached,
      tier: tier(production), low: production !== null && production > 0 && production <= 3,
      zero: production === 0, missingTarget: target === null || target === 0, missingProduction: production === null,
      invalidProduction: Number(raw.invalidProduction || 0), previousProduction: previous, weekProduction: week, previousWeekProduction: previousWeek,
      monthAverage: monthAverage, previousAverage: previousAverage,
      monthChangeRate: previousAverage === null || previousAverage === 0 || monthAverage === null ? null : (monthAverage - previousAverage) / previousAverage * 100,
      status: production === null ? 'missingData' : !eligible ? 'missingTarget' : reached ? 'reached' : 'behind' };
  }
  function summarize(rows, clock) {
    var s = { totalCount: rows.length, evaluatedCount: 0, reachedCount: 0, behindCount: 0, zeroCount: 0, lowCount: 0,
      missingDataCount: 0, missingTargetCount: 0, invalidDataCount: 0, knownProduction: 0, configuredTarget: 0,
      individualGap: 0, commonTarget: null, production: null, monthlyTarget: null, expected: null, gap: null,
      completionRate: null, reachedRate: null, monthAverage: null, previousAverage: null, monthChangeRate: null, weekChangeRate: null,
      weeklyAverage: null, previousWeeklyAverage: null };
    var targets = {}, evaluatedProduction = 0, evaluatedTarget = 0, previousSum = 0, previousCount = 0, weekSum = 0, weekCount = 0, prevWeekSum = 0, prevWeekCount = 0;
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      if (r.eligible) { s.evaluatedCount++; evaluatedProduction += r.production; evaluatedTarget += r.monthlyTarget; }
      if (r.reached) s.reachedCount++;
      if (r.status === 'behind') s.behindCount++;
      if (r.zero) s.zeroCount++;
      if (r.low) s.lowCount++;
      if (r.missingProduction) s.missingDataCount++; else s.knownProduction += r.production;
      if (r.missingTarget) s.missingTargetCount++;
      if (r.invalidProduction > 0) s.invalidDataCount++;
      if (r.monthlyTarget !== null && r.monthlyTarget > 0) { s.configuredTarget += r.monthlyTarget; targets[String(r.monthlyTarget)] = true; }
      if (r.gap !== null) s.individualGap += r.gap;
      if (r.eligible && r.previousProduction !== null) { previousSum += r.previousProduction; previousCount++; }
      if (r.eligible && r.weekProduction !== null) { weekSum += r.weekProduction; weekCount++; }
      if (r.eligible && r.previousWeekProduction !== null) { prevWeekSum += r.previousWeekProduction; prevWeekCount++; }
    }
    var targetKeys = Object.keys(targets);
    if (targetKeys.length === 1) s.commonTarget = Number(targetKeys[0]);
    if (s.evaluatedCount) {
      s.production = evaluatedProduction; s.monthAverage = s.production / clock.elapsedDays;
      s.monthlyTarget = evaluatedTarget; s.expected = evaluatedTarget * clock.elapsedDays / clock.daysInMonth;
    }
    if (s.production !== null && s.monthlyTarget > 0) { s.completionRate = s.production / s.monthlyTarget * 100; s.gap = Math.max(0, s.monthlyTarget - s.production); }
    if (s.evaluatedCount) s.reachedRate = s.reachedCount / s.evaluatedCount * 100;
    if (s.evaluatedCount && previousCount === s.evaluatedCount) s.previousAverage = previousSum / clock.previousDays;
    if (s.monthAverage !== null && s.previousAverage > 0) s.monthChangeRate = (s.monthAverage - s.previousAverage) / s.previousAverage * 100;
    if (s.evaluatedCount && weekCount === s.evaluatedCount) s.weeklyAverage = weekSum / 7;
    if (s.evaluatedCount && prevWeekCount === s.evaluatedCount) s.previousWeeklyAverage = prevWeekSum / 7;
    if (s.weeklyAverage !== null && s.previousWeeklyAverage > 0) s.weekChangeRate = (s.weeklyAverage - s.previousWeeklyAverage) / s.previousWeeklyAverage * 100;
    return s;
  }
  function distribution(rows) {
    var bins = [{ id: 'E', label: '0条', count: 0 }, { id: 'D', label: '1–3条', count: 0 },
      { id: 'C', label: '4–6条', count: 0 }, { id: 'B', label: '7–9条', count: 0 }, { id: 'A', label: '9条以上', count: 0 }];
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      for (var j = 0; j < bins.length; j++) if (r.tier === bins[j].id) bins[j].count++;
    }
    for (var k = 0; k < bins.length; k++) { bins[k].total = rows.length; bins[k].rate = rows.length ? bins[k].count / rows.length * 100 : null; }
    return bins;
  }
  function regions(rows, level, clock) {
    var groups = {}, list = [];
    for (var i = 0; i < rows.length; i++) {
      var key = JSON.stringify(level === 'branch' ? [rows[i].branch] : [rows[i].branch, rows[i].grid]);
      if (!groups[key]) groups[key] = { id: key, name: level === 'branch' ? rows[i].branch : rows[i].grid, branch: rows[i].branch, grid: level === 'grid' ? rows[i].grid : '', rows: [] };
      groups[key].rows.push(rows[i]);
    }
    for (var k in groups) if (Object.prototype.hasOwnProperty.call(groups, k)) {
      var g = groups[k]; list.push({ id: g.id, name: g.name, branch: g.branch, grid: g.grid, stats: summarize(g.rows, clock), distribution: distribution(g.rows) });
    }
    list.sort(function (a, b) { return (b.stats.gap === null ? -1 : b.stats.gap) - (a.stats.gap === null ? -1 : a.stats.gap) || a.name.localeCompare(b.name); });
    return list;
  }
  function details(rows, params) {
    var status = params.status || 'behind', needle = String(params.query || '').replace(/^\s+|\s+$/g, '').toLowerCase(), selectedTier = params.tier || '';
    if (['all', 'behind', 'zero', 'low', 'focus', 'missingData', 'missingTarget'].indexOf(status) < 0) throw new Error('明细筛选类型无效');
    if (selectedTier && ['E','D','C','B','A'].indexOf(selectedTier) < 0) throw new Error('产能层级无效');
    var list = rows.filter(function (r) {
      var matchesStatus = status === 'all' || (status === 'zero' ? r.zero : status === 'low' ? r.low : status === 'focus' ? r.zero || r.low : status === 'missingData' ? r.missingProduction : status === 'missingTarget' ? r.missingTarget : r.status === 'behind');
      return matchesStatus && (!selectedTier || r.tier === selectedTier) &&
        (!needle || (r.name + ' ' + r.identity + ' ' + r.location).toLowerCase().indexOf(needle) >= 0);
    });
    list.sort(function (a, b) { return (b.gap === null ? -1 : b.gap) - (a.gap === null ? -1 : a.gap) || a.name.localeCompare(b.name); });
    var page = Number(params.page || 1), size = Number(params.pageSize || 20);
    if (!isFinite(page) || page < 1 || Math.floor(page) !== page || !isFinite(size) || size < 1 || size > 100 || Math.floor(size) !== size) throw new Error('明细分页参数无效');
    var offset = (page - 1) * size;
    return { rows: list.slice(offset, offset + size), pagination: { page: page, pageSize: size, total: list.length, hasMore: offset + size < list.length } };
  }
  return { categories: categories, category: category, calendar: calendar, numeric: numeric, entity: entity, summarize: summarize, distribution: distribution, regions: regions, details: details };
}

function createBroadbandGateway(deps) {
  var Params=deps.params,user=deps.user,tables=deps.tables,text=deps.text,date=deps.date,formatDate=deps.formatDate,latest=deps.latest,sql=deps.sql,scope=deps.scope,latestDimension=deps.latestDimension,pagedSql=deps.pagedSql;
  // New tables are read only when a broadband endpoint is requested.
  var bbTables = {
    staffRoles: "app_open_api_c001_wgsc_stf_bb_target_m_1",
    contractor: "app_open_api_c002_wgsc_area_contractor_1"
  };
  function bbContext() {
    var statDate = text(Params.statDate) ? date(Params.statDate) : latest(tables.region);
    if (!statDate) throw new Error('当前权限范围暂无产能日期');
    var branch = text(Params.branch), grid = text(Params.grid);
    if (branch.length > 64 || grid.length > 64) throw new Error('组织筛选参数过长');
    if (user.role !== 'city') {
      if (branch && branch !== user.branchName) throw new Error('无权访问该分公司');
      branch = user.branchName;
    }
    if (user.role === 'grid') {
      if (grid && grid !== user.gridName) throw new Error('无权访问该网格');
      grid = user.gridName;
    }
    if (grid && !branch) throw new Error('请选择网格所属分公司');
    var engine = createBroadbandEngine(), clock = engine.calendar(statDate);
    var previousWeek = new Date(statDate + 'T00:00:00Z'); previousWeek.setUTCDate(previousWeek.getUTCDate() - 7);
    return { engine: engine, clock: clock, branch: branch, grid: grid,
      args: { bbDate: statDate, bbPreviousWeek: formatDate(previousWeek), bbProduct: '手宽新增', bbMonth: clock.month,
        bbMonthSlash: clock.month.replace('-', '/'), bbMonthCompact: clock.month.replace('-', ''), bbMonthChinese: String(Number(clock.month.slice(5))) + '月', bbMonthChinesePadded: clock.month.slice(5) + '月' } };
  }
  function bbScope(ctx, branchField, gridField, args) {
    var condition = scope(branchField, gridField, args);
    if (ctx.branch) { args.bbBranch = ctx.branch; condition += ' AND ' + branchField + '=#{bbBranch}'; }
    if (ctx.grid) { args.bbGrid = ctx.grid; condition += ' AND ' + gridField + '=#{bbGrid}'; }
    return condition;
  }
  function bbRoster(ctx, id, args) {
    var source, identity, label, role, location, branch = 'd.branch', grid = 'd.grid', target = 'd.monthly_kd_target', extra = '';
    if (id === 'contractors') {
      var current = '(SELECT d.* FROM ' + bbTables.contractor + ' d INNER JOIN (SELECT chn_code,MAX(id) AS latest_id FROM ' + bbTables.contractor +
        ' WHERE TRIM(mon) IN (#{bbMonth},#{bbMonthSlash},#{bbMonthCompact},#{bbMonthChinese},#{bbMonthChinesePadded}) GROUP BY chn_code) newest ON d.id=newest.latest_id)';
      source = latestDimension(bbTables.contractor, 'chn_code') + ' d LEFT JOIN ' + current + ' goal ON d.chn_code=goal.chn_code';
      identity = 'd.chn_code'; label = 'COALESCE(goal.chn_name,d.chn_name)'; role = "'包片商'"; location = "''";
      branch = 'COALESCE(goal.branch,d.branch)'; grid = 'COALESCE(goal.grid,d.grid)'; target = 'goal.monthly_kd_target';
    } else if (id === 'stars') {
      source = latestDimension(tables.channelInfo, 'chn_code') + ' d'; identity = 'd.chn_code'; label = 'd.chn_name'; role = "'3星+渠道'"; location = 'd.star';
      extra = " AND d.star_level='三星+'";
    } else if (id === 'managers' || id === 'installers') {
      source = latestDimension(tables.staff, 'staff_no') + ' d'; identity = 'd.staff_no'; label = 'd.staff_name'; role = 'd.job'; location = "''";
      extra = id === 'managers' ? " AND d.job IN ('行销经理','商企经理')" : " AND d.job='装维随销'";
    } else {
      source = latestDimension(bbTables.staffRoles, '`ngboss_id`') + ' d'; identity = 'd.`ngboss_id`'; label = 'd.`name`'; role = 'd.`type`'; location = 'd.`business_hall`';
      branch = 'd.`branch`'; grid = 'd.`grid`'; extra = id === 'clerks' ? " AND d.`type`='营业员'" : " AND d.`type`='终端驻店员'";
    }
    return 'SELECT ' + branch + ' AS branch,' + grid + ' AS grid,CAST(' + identity + ' AS CHAR) AS identity,' + label + ' AS name,' +
      role + ' AS role,' + location + ' AS location,' + target + ' AS monthlyTarget FROM ' + source +
      " WHERE " + identity + " IS NOT NULL AND TRIM(" + identity + ")<>''" + extra + bbScope(ctx, branch, grid, args);
  }
  function bbCapacity(ctx, table, identity, args) {
    function amount(period, alias, prior) {
      var when = "c.stat_date=" + (prior ? '#{bbPreviousWeek}' : '#{bbDate}') + " AND c.prod_period_type='" + period + "'";
      return 'CASE WHEN SUM(CASE WHEN ' + when + ' THEN 1 ELSE 0 END)>0 THEN SUM(CASE WHEN ' + when + ' THEN c.capacity ELSE 0 END) ELSE NULL END AS ' + alias +
        ',SUM(CASE WHEN ' + when + ' AND (c.capacity IS NULL OR c.capacity<0) THEN 1 ELSE 0 END) AS invalid' + alias.charAt(0).toUpperCase() + alias.slice(1);
    }
    return 'SELECT c.branch_company AS branch,c.grid_name AS grid,CAST(c.' + identity + ' AS CHAR) AS identity,' +
      amount('mon', 'production', false) + ',' + amount('last_mon', 'previousProduction', false) + ',' +
      amount('week', 'weekProduction', false) + ',' + amount('week', 'previousWeekProduction', true) +
      ' FROM ' + table + " c WHERE c.product_name=#{bbProduct} AND ((c.stat_date=#{bbDate} AND c.prod_period_type IN ('mon','last_mon','week')) OR (c.stat_date=#{bbPreviousWeek} AND c.prod_period_type='week'))" +
      bbScope(ctx, 'c.branch_company', 'c.grid_name', args) + ' GROUP BY c.branch_company,c.grid_name,c.' + identity;
  }
  function bbRows(ctx, categoryId) {
    ctx.engine.category(categoryId);
    var args = JSON.parse(JSON.stringify(ctx.args)), channel = categoryId === 'contractors' || categoryId === 'stars';
    var roster = bbRoster(ctx, categoryId, args);
    var capacity = bbCapacity(ctx, channel ? tables.channel : tables.staffCapacity, channel ? 'channel_code' : 'staff_no', args);
    var query = 'SELECT r.*,p.production,p.previousProduction,p.weekProduction,p.previousWeekProduction,' +
      'p.invalidProduction,p.invalidPreviousProduction AS invalidPrevious,p.invalidWeekProduction AS invalidWeek,p.invalidPreviousWeekProduction AS invalidPreviousWeek' +
      ' FROM (' + roster + ') r LEFT JOIN (' + capacity + ') p ON r.branch=p.branch AND r.grid=p.grid AND r.identity=p.identity';
    var raw = pagedSql(query, args, 'branch,grid,identity'), result = [];
    for (var i = 0; i < raw.length; i++) {
      raw[i].categoryId = categoryId;
      result.push(ctx.engine.entity(raw[i], ctx.clock));
    }
    return result;
  }
  function bbDates(ctx) {
    var args = JSON.parse(JSON.stringify(ctx.args)), sources = {}, warnings = [];
    var names = ['channel', 'staffCapacity'];
    for (var i = 0; i < names.length; i++) {
      var rows = sql('SELECT MAX(stat_date) AS stat_date FROM ' + tables[names[i]] +
        " WHERE product_name=#{bbProduct} AND prod_period_type='mon'" + bbScope(ctx, 'branch_company', 'grid_name', args), args, true);
      sources[names[i]] = rows[0] && rows[0].stat_date ? date(rows[0].stat_date) : '';
      if (sources[names[i]] !== ctx.clock.statDate) warnings.push((i ? '工号' : '渠道') + '手宽最新日期为' + (sources[names[i]] || '无记录') + '，本次按' + ctx.clock.statDate + '读取，当前月份缺失产能记录按零产计，请核对取数日期');
    }
    return { sources: sources, warnings: warnings };
  }
  function bbBase(ctx) {
    return { statDate: ctx.clock.statDate, clock: ctx.clock, scope: { branch: ctx.branch, grid: ctx.grid }, demo: false,
      missingPolicy: 'current-no-record-is-zero-history-unknown' };
  }
  function bbOverview() {
    var ctx = bbContext(), result = bbBase(ctx), dates = bbDates(ctx);
    result.sourceDates = dates.sources; result.warnings = dates.warnings; result.categories = [];
    for (var i = 0; i < ctx.engine.categories.length; i++) {
      var item = ctx.engine.categories[i];
      result.categories.push({ id: item.id, name: item.name, unit: item.unit, cadence: item.cadence, icon: item.icon,
        stats: ctx.engine.summarize(bbRows(ctx, item.id), ctx.clock) });
    }
    return result;
  }
  function bbRegions() {
    var ctx = bbContext(), item = ctx.engine.category(text(Params.categoryId)), result = bbBase(ctx);
    var level = text(Params.level) || (user.role === 'city' && !ctx.branch ? 'branch' : 'grid');
    if (level !== 'branch' && level !== 'grid') throw new Error('区域层级无效');
    var rows = bbRows(ctx, item.id);
    result.category = item; result.level = level; result.stats = ctx.engine.summarize(rows, ctx.clock); result.distribution = ctx.engine.distribution(rows);
    result.regions = ctx.engine.regions(rows, level, ctx.clock);
    return result;
  }
  function bbDetails() {
    var ctx = bbContext(), item = ctx.engine.category(text(Params.categoryId)), result = bbBase(ctx);
    var query = text(Params.query);
    if (query.length > 100) throw new Error('搜索内容请控制在100字以内');
    var rows = bbRows(ctx, item.id), details = ctx.engine.details(rows, { status: text(Params.status) || 'behind', tier: text(Params.tier), query: query, page: Params.page, pageSize: Params.pageSize });
    result.category = item; result.stats = ctx.engine.summarize(rows, ctx.clock); result.distribution = ctx.engine.distribution(rows);
    result.rows = details.rows; result.pagination = details.pagination;
    return result;
  }

  return {overview:bbOverview,regions:bbRegions,details:bbDetails};
}

// Handle2 globals: Params, JsResult, CustomizeUtil. Read-only ES5 gateway.
function init() {
  function result(code, message, data) { JsResult.result = JSON.stringify({ result: { retCode: code, retMsg: message, data: data === undefined ? null : data } }); }
  if (typeof Params === 'undefined' || !Params || !Params.funCode) { result('0', '宽带网关已加载，请通过Handle2传入funCode和token调用', { ready: true }); return; }
  function text(value) { return String(value === null || value === undefined ? '' : value).replace(/^\s+|\s+$/g, ''); }
  function parse(value) { for (var i = 0; i < 3 && typeof value === 'string'; i++) { try { value = JSON.parse(value); } catch (error) { break; } } return value; }
  function find(value, keys) {
    var queue = [parse(value)];
    for (var i = 0; i < queue.length && i < 1000; i++) {
      var item = parse(queue[i]);
      if (!item || typeof item !== 'object') continue;
      for (var j = 0; j < keys.length; j++) if (item[keys[j]] !== undefined && item[keys[j]] !== null && item[keys[j]] !== '') return item[keys[j]];
      for (var key in item) if (Object.prototype.hasOwnProperty.call(item, key)) queue.push(item[key]);
    }
    return '';
  }
  function sql(query, args, reading) {
    var response = parse(CustomizeUtil.abilitySql(query, args || {}));
    if (!response || typeof response !== 'object') throw new Error('SQL返回结构异常');
    if (response.retCode !== undefined && String(response.retCode) !== '0') throw new Error(response.retMsg || 'SQL执行失败');
    if (response.code !== undefined && ['0', '200'].indexOf(String(response.code)) < 0) throw new Error(response.message || 'SQL执行失败');
    if (!reading) return response;
    var data = parse(response.data);
    if (!data || Object.prototype.toString.call(data.results) !== '[object Array]') throw new Error('SQL查询缺少data.results');
    return data.results;
  }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function formatDate(d) { return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()); }
  function date(value) {
    var s;
    if (Object.prototype.toString.call(value) === '[object Date]') s = value.getFullYear() + '-' + pad(value.getMonth() + 1) + '-' + pad(value.getDate());
    else if (typeof value === 'number' && isFinite(value)) s = formatDate(new Date(value + 8 * 3600000));
    else s = text(value).replace(/[T\s].*$/, '').slice(0, 10).replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3').replace(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/, function (_, y, m, d) { return y + '-' + ('0' + m).slice(-2) + '-' + ('0' + d).slice(-2); });
    var d = new Date(s + 'T00:00:00Z');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || isNaN(d.getTime()) || formatDate(d) !== s) throw new Error('无效日期');
    return s;
  }
  var tables = {
    region: 'app_open_api_c003_wgsc_region_capacity_1', channel: 'app_open_api_c001_wgsc_chn_capacity_1',
    staffCapacity: 'app_open_api_c003_wgsc_staff_capacity_1', channelInfo: 'app_open_api_c003_wgsc_chn_level_1', staff: 'app_open_api_c003_wgsc_staff_1'
  };
  var user;
  function normalizeMobile(value) { var match = text(value).replace(/\s/g, '').match(/1\d{10}/); return match ? match[0] : ''; }
  function authenticate() {
    var token = text(Params.token);
    if (!token) throw new Error('00008: token不能为空');
    var redis = parse(CustomizeUtil.redisGet({ key: token }));
    var value = parse(redis && redis.data !== undefined ? redis.data : redis); value = parse(value && value.value !== undefined ? value.value : value);
    if (!value) throw new Error('00008: token已过期');
    var phone = normalizeMobile(find(value, ['userphone', 'phone', 'mobile', 'userPhone', 'mobileno']));
    if (!/^1\d{10}$/.test(phone)) phone = normalizeMobile(find(CustomizeUtil.getMobile(token), ['userphone', 'phone', 'mobile', 'userPhone', 'mobileno']));
    if (!/^1\d{10}$/.test(phone)) throw new Error('00008: token未解析到手机号');
    var rows = sql('SELECT name,phone,role,branch,grid,super_admin FROM app_open_api_c003_wgsc_permission_1 WHERE phone=#{phone} AND enabled=1 ORDER BY id DESC LIMIT 1', { phone: phone }, true);
    if (!rows.length) throw new Error('该手机号无有效权限');
    var row = rows[0], role = { 1: 'city', 2: 'branch', 3: 'grid' }[String(row.role)];
    if (!role || (role !== 'city' && !text(row.branch)) || (role === 'grid' && !text(row.grid))) throw new Error('权限记录缺少组织范围');
    return { role: role, branchName: text(row.branch), gridName: text(row.grid) };
  }
  function scope(branch, grid, args) {
    var s = '';
    if (user.role !== 'city') { args.authBranch = user.branchName; s += ' AND ' + branch + '=#{authBranch}'; }
    if (user.role === 'grid') { args.authGrid = user.gridName; s += ' AND ' + grid + '=#{authGrid}'; }
    return s;
  }
  function latest(table) {
    var args = {}, rows = sql('SELECT MAX(stat_date) AS stat_date FROM ' + table + ' WHERE 1=1' + scope('branch_company', 'grid_name', args), args, true);
    return rows[0] && rows[0].stat_date ? date(rows[0].stat_date) : '';
  }
  function latestDimension(table, key) { return '(SELECT d.* FROM ' + table + ' d INNER JOIN (SELECT ' + key + ',MAX(id) AS latest_id FROM ' + table + ' GROUP BY ' + key + ') newest ON d.id=newest.latest_id)'; }
  function pagedSql(query, args, order) {
    var result = [], size = 1000;
    for (var offset = 0; ; offset += size) {
      var page = sql(query + ' ORDER BY ' + order + ' LIMIT ' + size + ' OFFSET ' + offset, args, true);
      if (page.length > size) throw new Error('SQL分页未生效');
      result = result.concat(page);
      if (page.length < size) return result;
      if (offset >= 999000) throw new Error('对象数量过多，请缩小查询范围');
    }
  }
  try {
    if (['wgsc_bbOverview', 'wgsc_bbRegions', 'wgsc_bbDetails'].indexOf(text(Params.funCode)) < 0) throw new Error('非法调用');
    user = authenticate();
    var api = createBroadbandGateway({ params: Params, user: user, tables: tables, text: text, date: date, formatDate: formatDate, latest: latest,
      sql: sql, scope: scope, latestDimension: latestDimension, pagedSql: pagedSql });
    var handlers = { wgsc_bbOverview: api.overview, wgsc_bbRegions: api.regions, wgsc_bbDetails: api.details };
    result('0', '成功', handlers[Params.funCode]());
  } catch (error) { var message = error.message || '宽带专项执行失败'; result(String(message).indexOf('00008:') === 0 ? '00008' : '1', message); }
}
init();
