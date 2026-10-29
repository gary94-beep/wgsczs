from pathlib import Path

root = Path(__file__).resolve().parents[1]
text = (root / 'server/baseline/sczs_ai_api.js.txt').read_text(encoding='utf-8')
text = text.replace('targets: "app_open_api_c001_wgsc_target_1"', 'targets: "app_open_api_c002_wgsc_target_1"')
text = text.replace('var channelType = text(Params.channelType) || "全部类型";', '''var channelType = text(Params.channelType) || "全部类型";
    if (channelType === "3星+渠道") channelType = "三星+渠道";
    if (["全部类型", "三星+渠道", "末梢渠道", "直销队伍"].indexOf(channelType) < 0) throw new Error("生产类型无效");''')
text = text.replace('var parts = scopeId.split("::");', 'var parts = scopeId.split("::");\n      if (parts.length !== 2 || !parts[0] || !parts[1]) throw new Error("网格标识须为分公司::网格");')
text = text.replace('      if (!capacityMap[pid]) capacityMap[pid] = { day: 0, mon: 0, week: 0, last_mon: 0 };',
    '      if (!capacityMap[pid]) capacityMap[pid] = { day: null, mon: null, week: null, last_mon: null };')
text = text.replace('capacityMap[pid][periodType] += num(value);', 'capacityMap[pid][periodType] = (capacityMap[pid][periodType] === null ? 0 : capacityMap[pid][periodType]) + num(value);')
text = text.replace('      var pid = productId(productName);', '      if (value === null || value === undefined) return;\n      var pid = productId(productName);')
text = text.replace('    if (channelType === "全部类型") {', '''    var regionLevelCond = scopeCond;
    if (scopeType === "city") regionLevelCond += " AND branch_company='全市' AND grid_name='全市'";
    if (scopeType === "branch") regionLevelCond += " AND grid_name=#{scopeId}";
    if (channelType === "全部类型") {''', 1)
text = text.replace('" WHERE stat_date=#{cutoff}" + scopeCond + " GROUP BY product_name, prod_period_type"',
    '" WHERE stat_date=#{cutoff}" + regionLevelCond + " GROUP BY product_name, prod_period_type"', 1)
for table, alias, key in [('channelInfo', 'ci', 'chn_code'), ('terminal', 't', 'staff_no'), ('staff', 'st', 'staff_no')]:
    text = text.replace('tables.' + table + ' + " ' + alias + ' ON',
        '"(SELECT d.* FROM " + tables.' + table + ' + " d JOIN (SELECT ' + key + ',MAX(id) AS latest_id FROM " + tables.' + table +
        ' + " GROUP BY ' + key + ') newest ON d.id=newest.latest_id) ' + alias + ' ON')
text = text.replace("ci.chn_code WHERE c.stat_date", "ci.chn_code AND c.branch_company=ci.branch AND c.grid_name=ci.grid WHERE c.stat_date")
text = text.replace("t.staff_no WHERE c.stat_date", "t.staff_no AND c.branch_company=t.branch AND c.grid_name=t.grid WHERE c.stat_date")
text = text.replace("st.staff_no WHERE c.stat_date", "st.staff_no AND c.branch_company=st.branch AND c.grid_name=st.grid WHERE c.stat_date")
text = text.replace("st.staff_no AND c.branch_company=t.branch AND c.grid_name=t.grid", "st.staff_no AND c.branch_company=st.branch AND c.grid_name=st.grid")
start = text.index('    // ---------- 2. 查询目标 ----------')
end = text.index('    // ---------- 3.', start)
text = text[:start] + '''    // 类型专属目标尚未维护时不使用区域总体目标。
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

''' + text[end:]
text = text.replace('|| { day: 0, mon: 0, week: 0, last_mon: 0 }', '|| { day: null, mon: null, week: null, last_mon: null }')
text = text.replace('c.mon === 0 ? undefined', 'c.mon === null ? null').replace('c.week === 0 ? undefined', 'c.week === null ? null')
text = text.replace('monthTarget: tg.monthTarget, dayTarget: tg.dayTarget,',
    'monthTarget: tg.monthTarget, dayTarget: tg.dayTarget,\n        monthChallengeTarget: tg.monthChallengeTarget === undefined ? null : tg.monthChallengeTarget,\n        dayChallengeTarget: tg.dayChallengeTarget === undefined ? null : tg.dayChallengeTarget,')
text = text.replace('tg.monthTarget ? Math.round(c.mon', 'c.mon !== null && tg.monthTarget ? Math.round(c.mon')
text = text.replace('tg.dayTarget   ? Math.round(c.day', 'c.day !== null && tg.dayTarget   ? Math.round(c.day')
start = text.index('    // ---------- 4.')
end = text.index('    // ---------- 5.', start)
text = text[:start] + '''    // 逐产品摘要，禁止把不同产品/不同单位的产能混加成综合低产榜。
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

''' + text[end:]
text = text.replace('      products: productData,', '''      dataQuality: { sourceDates: { region: statDate }, timeProgress: timeProgress,
        warnings: channelType === "全部类型" ? [] : ["类型专属目标未配置，完成率及目标缺口未知，不套用区域总体目标"] },
      products: productData,''')
(root / 'sczs_ai_api.js').write_text(text, encoding='utf-8')
print('Updated AI SQL aggregations and target definitions')
