// This ES5 factory is also embedded in sczs_broadband_api.js for the Handle2 runtime.
export function createBroadbandEngine() {
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

  // Geographic grid classes are independent of the E-A production tiers.
  var geographicClasses = {
    A: ['小榄','火炬开发区','古镇','坦洲','东区'],
    B: ['东升','石岐区','三乡','沙溪','横栏','东凤','西区','黄圃'],
    C: ['港口','南头','三角','大涌','南朗','民众','板芙','南区','阜沙','五桂山','神湾','翠亨新区']
  };
  function gridClass(value) {
    var name = String(value || '').replace(/^\s+|\s+$/g,'');
    for (var exact in geographicClasses) if (Object.prototype.hasOwnProperty.call(geographicClasses,exact) && geographicClasses[exact].indexOf(name) >= 0) return exact;
    name = name.replace(/(?:综合网格|网格|街道|镇)$/,'');
    if (name === '火炬' || name === '火炬高新区') name = '火炬开发区';
    for (var key in geographicClasses) if (Object.prototype.hasOwnProperty.call(geographicClasses,key) && geographicClasses[key].indexOf(name) >= 0) return key;
    return null;
  }
  function rankingAnalysis(rows, clock) {
    function candidates(level) {
      return regions(rows,level,clock).filter(function (r) {
        return r.name && !/统筹|^(未知|全市|市公司|中山市)$/.test(r.name) && (level !== 'grid' || r.name !== r.branch) && r.stats.completionRate !== null && isFinite(r.stats.completionRate) && r.stats.monthlyTarget > 0;
      }).map(function (r) {
        return {name:r.name,branch:r.branch,grid:r.grid,completionRate:r.stats.completionRate,production:r.stats.production,monthlyTarget:r.stats.monthlyTarget};
      });
    }
    function order(a,b) {
      return a.completionRate-b.completionRate || String(a.name).localeCompare(String(b.name)) || String(a.branch).localeCompare(String(b.branch));
    }
    function ranked(list,count) {
      var sorted=list.slice().sort(order), best=list.slice().sort(function (a,b) {return b.completionRate-a.completionRate || order(a,b);});
      return {count:list.length,best:best.length?best[0]:null,worst:sorted.slice(0,count)};
    }
    var branches=ranked(candidates('branch').filter(function (r) {return !/统筹|未知|全市/.test(r.name);}),1), grids=candidates('grid'), classified=[], unknown=0;
    for (var i=0;i<grids.length;i++) if (!gridClass(grids[i].grid)) unknown++;
    ['A','B','C'].forEach(function (type,index) {
      var selected=grids.filter(function (r) {return gridClass(r.grid)===type;});
      var item=ranked(selected,index+1);item.type=type;item.worstLimit=index+1;classified.push(item);
    });
    return {branches:branches,grids:classified,unclassifiedCount:unknown};
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
  return { categories: categories, category: category, calendar: calendar, numeric: numeric, entity: entity, summarize: summarize, distribution: distribution, regions: regions, gridClass: gridClass, rankingAnalysis: rankingAnalysis, details: details };
}
