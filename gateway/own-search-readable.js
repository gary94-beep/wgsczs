  function ownSearch(data) {
    var q=text(Params.query).toLowerCase();
    if((!q && Params.funCode!=="wgsc_teamControl") || q.length>100)throw new Error("查询参数无效");
    var args={ownQuery:q}, managers={}, result=[], ids=[];
    var chosen=selectedGridClause(args,data,"d");
    var selector="SELECT d.* FROM "+latestDimension(tables.ownStaff,"staff_no")+" d WHERE 1=1"+
      scope("d.branch","d.grid",args)+chosen+
      (q?" AND LOCATE(#{ownQuery},LOWER(CONCAT(COALESCE(d.staff_name,''),' ',COALESCE(d.staff_no,''))))>0":"");
    var roster=pagedSql(selector,args,"staff_no");
    var ps=Params.productId?[product(Params.productId)]:products;
    function metrics(){return ps.map(function(p){return {productId:p.productId,productName:p.productName,unit:p.unit,
      day:data.dailyStatDate?0:null,month:data.statDate?0:null,previous:data.statDate?0:null};});}
    function addChild(g,code,name,role,kind,branch,grid){
      code=text(code);if(!code)return;
      var key=JSON.stringify([kind,code]);
      if(g.childMap[key])return;
      var self=kind==="staff" && code===g.code;
      var child={key:key,code:code,name:text(name)||code,role:text(role),entityType:kind,
        relation:self?"本人":kind==="staff"?"所管人员":"所管渠道",branchId:branch,gridId:gridId(branch,grid),values:metrics()};
      g.childMap[key]=child;g.children.push(child);
    }
    for(var i=0;i<roster.length;i++){
      var r=roster[i],code=text(r.staff_no);if(!code)continue;
      var g={key:"own:"+code,code:code,name:text(r.staff_name)||code,role:text(r.team),isOwn:true,
        branchId:r.branch,gridId:gridId(r.branch,r.grid),values:metrics(),children:[],childMap:{}};
      managers[code]=g;ids.push(code);result.push(g);
      addChild(g,code,g.name,g.role,"staff",r.branch,r.grid);
    }
    if(!ids.length)return result;
    var placeholders=ids.map(function(code,i){args["ownManager"+i]=code;return "#{ownManager"+i+"}";}).join(",");
    var links=pagedSql("SELECT * FROM "+tables.selfTeam+" WHERE manager_no IN ("+placeholders+")"+
      scope("branch_company","grid_name",args),args,"id");
    for(i=0;i<links.length;i++){
      r=links[i];addChild(managers[text(r.manager_no)],r.staff_no,r.staff_name,r.team_type,"staff",r.branch_company,r.grid_name);
    }
    links=pagedSql("SELECT * FROM "+tables.chnManager+" WHERE manager_no IN ("+placeholders+")",args,"id");
    // Resolve channel geography where available; an omitted zero-channel inherits its authorized manager's location.
    var channels={}, channelIds=[];
    for(i=0;i<links.length;i++)if(text(links[i].channel_code) && !channels[text(links[i].channel_code)]){
      channels[text(links[i].channel_code)]={};channelIds.push(text(links[i].channel_code));
    }
    if(channelIds.length){
      var cp=channelIds.map(function(code,i){args["ownChannel"+i]=code;return "#{ownChannel"+i+"}";}).join(",");
      var chns=pagedSql("SELECT chn_code,branch,grid FROM "+latestDimension(tables.channelInfo,"chn_code")+" d WHERE chn_code IN ("+cp+")",args,"chn_code");
      for(i=0;i<chns.length;i++)channels[text(chns[i].chn_code)]=chns[i];
      // Some contractor/tail codes exist only in capacity tables. Read distinct scoped locations, not production rows.
      var locations=[];
      var sources=data.dailyStatDate?[tables.channel,tables.channelDay]:[tables.channel];
      for(var si=0;si<sources.length;si++)locations=locations.concat(pagedSql("SELECT DISTINCT channel_code AS chn_code,branch_company AS branch,grid_name AS grid FROM "+sources[si]+" WHERE channel_code IN ("+cp+")"+scope("branch_company","grid_name",args),args,"chn_code,branch,grid"));
      for(i=0;i<locations.length;i++)if(!channels[text(locations[i].chn_code)].branch)channels[text(locations[i].chn_code)]=locations[i];
      for(i=0;i<links.length;i++){
        r=links[i];g=managers[text(r.manager_no)];var loc=channels[text(r.channel_code)]||{};
        if(user.role!=="city" && loc.branch && (loc.branch!==user.branchName || user.role==="grid" && loc.grid!==user.gridName))continue;
        addChild(g,r.channel_code,r.channel_name,r.channel_type,"channel",loc.branch||g.branchId,loc.grid||g.gridId.split("::").slice(1).join("::"));
      }
    }
    var wanted={staff:{},channel:{}}, values={staff:{},channel:{}};
    for(i=0;i<result.length;i++)for(var j=0;j<result[i].children.length;j++){
      var child=result[i].children[j];wanted[child.entityType][child.code]=true;
    }
    function readCapacity(kind,daily){
      if(daily?!data.dailyStatDate:!data.statDate)return;
      var codes=Object.keys(wanted[kind]);if(!codes.length)return;
      var key=kind==="staff"?"staff_no":"channel_code",a={ownCutoff:daily?data.dailyStamp:data.statDate};
      var fields=codes.map(function(code,i){a["ownCode"+i]=code;return "#{ownCode"+i+"}";}).join(",");
      var table=daily?(kind==="staff"?tables.staffDay:tables.channelDay):(kind==="staff"?tables.staffCapacity:tables.channel);
      var where=" WHERE "+key+" IN ("+fields+") AND "+(daily?"("+dailyStamp("stat_date")+")":"stat_date")+"=#{ownCutoff}"+
        scope("branch_company","grid_name",a)+(daily?"":" AND prod_period_type IN ('mon','last_mon')")+
        " AND product_name IN ("+ps.map(capacityProductNames).join(",")+")";
      var measured=pagedSql("SELECT "+key+" AS code,product_name,"+(daily?"'day'":"prod_period_type")+" AS period,SUM(capacity) AS capacity,"+
        "SUM(CASE WHEN capacity IS NULL OR capacity<0 THEN 1 ELSE 0 END) AS invalid_count FROM "+table+where+
        " GROUP BY "+key+",product_name"+(daily?"":",prod_period_type"),a,"code,product_name,period");
      for(var x=0;x<measured.length;x++){
        var row=measured[x];if(Number(row.invalid_count)>0)throw new Error("产能包含空值或负数，请修正源数据");
        var k=JSON.stringify([text(row.code),product(row.product_name).productId,row.period]);
        values[kind][k]=(values[kind][k]||0)+num(row.capacity);
      }
    }
    readCapacity("staff",false);readCapacity("staff",true);readCapacity("channel",false);readCapacity("channel",true);
    for(i=0;i<result.length;i++){
      g=result[i];
      for(j=0;j<g.children.length;j++){
        child=g.children[j];
        for(var m=0;m<child.values.length;m++)for(var v=0;v<3;v++){
          var field=["day","month","previous"][v],period=["day","mon","last_mon"][v];
          if(child.values[m][field]===null)continue;
          var amount=values[child.entityType][JSON.stringify([child.code,child.values[m].productId,period])]||0;
          child.values[m][field]=amount;g.values[m][field]+=amount;
        }
      }
      delete g.childMap;
      g.children.sort(function(a,b){return (a.relation==="本人"?-1:b.relation==="本人"?1:0)||a.name.localeCompare(b.name);});
    }
    return result;
  }
  function attachSearchManagers(results,data) {
    if(!results.length)return;
    var args={}, targets={}, codes=[], tailResults={}, tails=[];
    function addTarget(code,item){code=text(code);if(!code)return;if(!targets[code]){targets[code]=[];codes.push(code);}if(targets[code].indexOf(item)<0)targets[code].push(item);}
    function tailKey(branch,grid,agent,name){return JSON.stringify([branch,grid,text(agent),text(name)]);}
    for(var i=0;i<results.length;i++){
      var item=results[i];item.managers=[];
      if(Params.kind==="people" || item.role!=="末梢渠道")addTarget(item.code,item);
      else {
        var parts=parse(text(item.code).replace(/^tail:/,""));
        if(Object.prototype.toString.call(parts)!=="[object Array]")continue;
        var grid=item.gridId.split("::").slice(1).join("::"),k=tailKey(item.branchId,grid,parts[0],parts[1]);
        tailResults[k]=item;tails.push({branch:item.branchId,grid:grid,agent:parts[0],name:parts[1]});
      }
    }
    // Tail UI identities are synthetic: resolve real channel codes via staff links, never compare synthetic IDs to channel_code.
    if(tails.length){
      var conditions=tails.map(function(t,i){args["tagBranch"+i]=t.branch;args["tagGrid"+i]=t.grid;args["tagAgent"+i]=t.agent;args["tagName"+i]=t.name;
        return "(d.branch=#{tagBranch"+i+"} AND d.grid=#{tagGrid"+i+"} AND d.agent=#{tagAgent"+i+"} AND d.chn_name=#{tagName"+i+"})";}).join(" OR ");
      var source=[{table:tables.staffCapacity,date:data.statDate},{table:tables.staffDay,date:data.dailyStamp}],maps=[];
      for(var si=0;si<source.length;si++)if(source[si].date){
        args.tagDate=source[si].date;
        var query="SELECT DISTINCT d.branch,d.grid,d.agent,d.chn_name,c.channel_code FROM "+latestDimension(tables.terminal,"staff_no")+" d INNER JOIN "+source[si].table+
          " c ON c.staff_no=d.staff_no AND c.branch_company=d.branch AND c.grid_name=d.grid WHERE ("+conditions+") AND "+
          (si?"("+dailyStamp("c.stat_date")+")":"c.stat_date")+"=#{tagDate}"+(si?"":" AND c.prod_period_type='mon'")+scope("d.branch","d.grid",args);
        maps=maps.concat(pagedSql(query,args,"branch,grid,agent,chn_name,channel_code"));
      }
      for(i=0;i<maps.length;i++){
        var row=maps[i],target=tailResults[tailKey(row.branch,row.grid,row.agent,row.chn_name)];if(target)addTarget(row.channel_code,target);
      }
    }
    if(!codes.length)return;
    var parameters=codes.map(function(code,i){args["tagCode"+i]=code;return "#{tagCode"+i+"}";}).join(",");
    var people=Params.kind==="people",relation=people?tables.selfTeam:tables.chnManager,key=people?"staff_no":"channel_code";
    var rows=pagedSql("SELECT DISTINCT l."+key+" AS object_code,m.staff_no AS manager_code,m.staff_name AS manager_name,m.team AS manager_role FROM "+relation+
      " l INNER JOIN "+latestDimension(tables.ownStaff,"staff_no")+" m ON m.staff_no=l.manager_no WHERE l."+key+" IN ("+parameters+")"+
      scope("m.branch","m.grid",args)+(people?scope("l.branch_company","l.grid_name",args):""),args,"object_code,manager_code");
    for(i=0;i<rows.length;i++){
      row=rows[i];var matched=targets[text(row.object_code)]||[];
      for(var j=0;j<matched.length;j++){
        var list=matched[j].managers,exists=false;
        for(var m=0;m<list.length;m++)if(list[m].code===text(row.manager_code))exists=true;
        if(!exists)list.push({code:text(row.manager_code),name:text(row.manager_name)||"姓名未维护",role:text(row.manager_role)||"岗位未维护"});
      }
    }
  }
