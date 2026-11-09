  function capacityQuery(data, detail, args, periods, daily) {
    if (daily === undefined) {
      var wanted=periods || (detail && Params.funCode==="wgsc_fetchChangeAlerts" ? ["mon","last_mon"] :
        detail && Params.funCode==="wgsc_searchCapacity" ? ["mon","last_mon","day"] :
        detail && ["wgsc_fetchAlerts","wgsc_fetchChannelOptions"].indexOf(Params.funCode)>=0 ? [Params.period==="day"?"day":"mon"] : ["mon","week","last_mon","day"]);
      var historical=wanted.filter(function(p){return p!=="day";}), queries=[];
      if(historical.length && data.statDate)queries.push(capacityQuery(data,detail,args,historical,false));
      if(wanted.indexOf("day")>=0 && data.dailyStatDate)queries.push(capacityQuery(data,detail,args,[],true));
      return queries.length?queries.join(" UNION ALL "):emptyCapacityQuery();
    }
    args.cutoff = data.statDate;
    args.dailyCutoff = data.dailyStamp;
    var clause = " WHERE " + (daily ? "("+dailyStamp("c.stat_date")+")=#{dailyCutoff}" : "c.stat_date=#{cutoff}") + scope("c.branch_company", "c.grid_name", args);
    if (detail) clause += selectedGridClause(args, data, "c");
    if (!daily) clause += " AND c.prod_period_type IN (" + periods.map(function(p){return "'"+p+"'";}).join(",") + ")";
    var channelType = text(Params.channelType), selectedTypes = ["三星+渠道", "直销队伍", "末梢渠道", "营业厅"];
    if (channelType === "3星+渠道") channelType = "三星+渠道";
    if (channelType === "全部类型") channelType = "";
    if (channelType && selectedTypes.indexOf(channelType) < 0) throw new Error("生产类型无效");
    // A dashboard always includes every type so switching the selector is local.
    if (detail && channelType) selectedTypes = [channelType];
    if (detail && Params.funCode === "wgsc_searchCapacity" && Params.kind === "people") selectedTypes = selectedTypes.filter(function (v) { return v === "直销队伍"; });
    if (detail && Params.funCode === "wgsc_searchCapacity" && Params.kind === "channels") selectedTypes = selectedTypes.filter(function (v) { return v !== "直销队伍"; });
    if (detail && Params.funCode === "wgsc_searchCapacity" && Params.kind === "channels" && !channelType) selectedTypes = selectedTypes.filter(function (v) { return v !== "营业厅"; });
    var requestedProducts = detail && Params.productId ? [product(Params.productId)] : products;
    if (detail && Params.productId) clause += " AND c.product_name IN (" + capacityProductNames(requestedProducts[0]) + ")";
    var productQuery = requestedProducts.map(function(p){return "SELECT '"+p.productId+"' AS productId,'"+p.productName+"' AS productName";}).join(" UNION ALL ");
    var periodQuery = (daily ? ["day"] : periods).map(function(p){return "SELECT '"+p+"' AS period";}).join(" UNION ALL ");
    var blocks = [];
    for (var i = 0; i < selectedTypes.length; i++) {
      var type=selectedTypes[i], stars=type==="三星+渠道" || type==="营业厅", tail=type==="末梢渠道";
      var table=daily ? (stars?tables.channelDay:tables.staffDay) : (stars?tables.channel:tables.staffCapacity);
      var dimension=stars?tables.channelInfo:tail?tables.terminal:tables.staff, key=stars?"chn_code":"staff_no", capacityKey=stars?"channel_code":"staff_no";
      var condition=" WHERE 1=1"+scope("d.branch","d.grid",args);
      if(detail)condition+=selectedGridClause(args,data,"d");
      if(stars)condition+=type==="营业厅"?" AND d.star_level='营业厅'":" AND d.star_level='三星+'";
      else condition+=" AND NOT EXISTS (SELECT 1 FROM "+(tail?tables.staff:tables.terminal)+" conflict WHERE conflict.staff_no=d.staff_no)";
      var identity=stars?"d.chn_code":tail?"JSON_ARRAY(d.agent,d.chn_name)":"d.staff_no";
      if(detail && Params.funCode==="wgsc_searchCapacity"){
        args.searchQuery=text(Params.query).toLowerCase();
        if(!args.searchQuery || args.searchQuery.length>100 || ["people","channels"].indexOf(Params.kind)<0)throw new Error("查询参数无效");
        var name=stars||tail?"d.chn_name":"d.staff_name";
        condition+=" AND LOCATE(#{searchQuery},LOWER(CONCAT(COALESCE("+name+",''),' ',COALESCE("+identity+",''))))>0";
      }
      var matchIdentity = "c."+capacityKey+"=d."+key+" AND c.branch_company=d.branch AND c.grid_name=d.grid";
      
      // Filter matching roster identities before source aggregation; retain the outer roster for absent records.
      var sourceClause = clause;
      if (Params.funCode === "wgsc_searchCapacity") sourceClause += " AND EXISTS (SELECT 1 FROM "+
        latestDimension(dimension,key)+" d"+condition+" AND "+matchIdentity+")";
      var measured="SELECT c.branch_company,c.grid_name,c."+capacityKey+" AS identity,c.product_name,"+(daily?"'day'":"c.prod_period_type")+" AS period,"+
        "SUM(c.capacity) AS production,SUM(CASE WHEN c.capacity IS NULL OR c.capacity<0 THEN 1 ELSE 0 END) AS invalidCount,MIN(c.channel_name) AS channel"+
        " FROM "+table+" c"+sourceClause+
        " GROUP BY c.branch_company,c.grid_name,c."+capacityKey+",c.product_name"+(daily?"":",c.prod_period_type");
      var columns="d.branch AS branchId,CONCAT(d.branch,'::',d.grid) AS gridId,p.productName,v.period,'"+type+"' AS channelType,"+
        "SUM(COALESCE(m.production,0)) AS production,SUM(COALESCE(m.invalidCount,0)) AS invalidCount,";
      if(detail)columns+=(stars||tail?"''":"MAX(d.staff_no)")+" AS staffId,"+(stars||tail?"''":"MAX(d.staff_name)")+" AS staffName,"+
        (stars||tail?"''":"MAX(d.team_type)")+" AS staffRole,"+(stars||tail?"MAX(d.chn_name)":"COALESCE(MIN(m.channel),'')")+" AS channel,"+
        (stars?"MAX(d.chn_code)":"''")+" AS channelCode,"+(stars?"MAX(d.star)":"''")+" AS star,"+
        (tail?"MAX(d.chn_name)":"''")+" AS microChannelName,"+(tail?"MAX(d.agent)":"''")+" AS serviceProvider,"+
        (stars?"NULL":"COUNT(DISTINCT d.staff_no)")+" AS staffCount";
      else columns+="'' AS staffId,'' AS staffName,'' AS staffRole,'' AS channel,'' AS channelCode,'' AS star,'' AS microChannelName,'' AS serviceProvider,NULL AS staffCount";
      var productMatch="(m.product_name=p.productName OR m.product_name=p.productId OR (p.productId='homeBroadband' AND m.product_name='手宽归档') OR (p.productId='plan119' AND m.product_name IN ('129+高套','119+套餐')))";
      blocks.push("SELECT "+columns+" FROM "+latestDimension(dimension,key)+" d CROSS JOIN ("+productQuery+") p CROSS JOIN ("+periodQuery+") v"+
        " LEFT JOIN ("+measured+") m ON m.identity=d."+key+" AND m.branch_company=d.branch AND m.grid_name=d.grid AND m.period=v.period AND "+productMatch+condition+
        " GROUP BY d.branch,d.grid,p.productName,v.period"+(detail?","+identity:""));
    }
    return blocks.length?blocks.join(" UNION ALL "):emptyCapacityQuery();
  }
