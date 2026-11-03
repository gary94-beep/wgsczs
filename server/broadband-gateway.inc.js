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
