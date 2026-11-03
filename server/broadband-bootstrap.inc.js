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
