// Readable source of monthly-only team control; embedded in sczs_search_api.js.
  function teamMetadata(){
    var d=metadata(true),bs=["南部分公司","北部分公司","城区分公司","高新分公司","东部分公司"],gs=["小榄","火炬开发区","古镇","坦洲","东区","东升","石岐区","三乡","沙溪","横栏","东凤","西区","黄圃","港口","南头","三角","大涌","南朗","民众","板芙","南区","阜沙","五桂山","神湾","翠亨新区"];
    d.organization.branches=d.organization.branches.filter(function(b){return bs.indexOf(b.branchId)>=0;});
    d.organization.grids=d.organization.grids.filter(function(g){return bs.indexOf(g.branchId)>=0&&gs.indexOf(g.gridName)>=0;});return d;
  }
  function teamControl(){
    var data=teamMetadata(),p={productId:Params.productId||"newNumbers",branchId:text(Params.branchId),gridId:text(Params.gridId),threshold:Params.threshold,declineRate:Params.declineRate,declineValue:Params.declineValue,team:text(Params.team),role:text(Params.role),filter:Params.filter||"all",query:Params.query,managerCode:text(Params.managerCode),relation:text(Params.relation),page:Params.page,pageSize:Params.pageSize};
    product(p.productId);createTeamControlEngine().criteria(p);
    if(p.team&&["own","people","halls","stars","tail"].indexOf(p.team)<0)throw new Error("队伍类型无效");
    if(p.branchId&&!data.organization.branches.some(function(b){return b.branchId===p.branchId;}))throw new Error("无权查看该分公司");
    if(p.gridId&&!data.organization.grids.some(function(g){return g.gridId===p.gridId&&(!p.branchId||g.branchId===p.branchId);}))throw new Error("无权查看该网格");
    var grids={},authorizedGrids={},records=[],maps={staff:{},channel:{}},totals={staff:{},channel:{}},locations={},i,j;
    data.organization.grids.forEach(function(g){authorizedGrids[g.gridId]=true;if((!p.branchId||g.branchId===p.branchId)&&(!p.gridId||g.gridId===p.gridId))grids[g.gridId]=true;});
    function allowed(b,g){return grids[gridId(b,g)]===true;}
    function authorized(b,g){return authorizedGrids[gridId(b,g)]===true;}
    function roster(table,key){var a={},q="SELECT d.* FROM "+latestDimension(table,key)+" d WHERE 1=1"+scope("d.branch","d.grid",a);return pagedSql(q,a,key).filter(function(r){return allowed(r.branch,r.grid);});}
    function measure(kind){
      if(!data.statDate)return;
      var key=kind==="staff"?"staff_no":"channel_code",a={cutoff:data.statDate},q="SELECT branch_company,grid_name,"+key+" AS code,SUM(CASE WHEN prod_period_type='mon' THEN capacity ELSE 0 END) AS month_capacity,SUM(CASE WHEN prod_period_type='last_mon' THEN capacity ELSE 0 END) AS previous_capacity,SUM(CASE WHEN capacity IS NULL OR capacity<0 THEN 1 ELSE 0 END) AS invalid_count FROM "+(kind==="staff"?tables.staffCapacity:tables.channel)+" WHERE stat_date=#{cutoff} AND prod_period_type IN ('mon','last_mon') AND product_name IN ("+capacityProductNames(product(p.productId))+")"+scope("branch_company","grid_name",a);
      if(p.branchId&&!ownNeeded){a.selectedBranch=p.branchId;q+=" AND branch_company=#{selectedBranch}";}
      if(p.gridId&&!ownNeeded){a.selectedGrid=p.gridId.split("::").slice(1).join("::");q+=" AND grid_name=#{selectedGrid}";}
      var rows=pagedSql(q+" GROUP BY branch_company,grid_name,"+key,a,"branch_company,grid_name,code");
      for(var x=0;x<rows.length;x++){
        var r=rows[x];if(!(ownNeeded?authorized:allowed)(r.branch_company,r.grid_name))continue;
        if(Number(r.invalid_count)>0)throw new Error("产能包含空值或负数，请修正源数据");
        var k=JSON.stringify([r.branch_company,r.grid_name,text(r.code)]),v=maps[kind][k]||(maps[kind][k]={month:0,previous:0}),s=totals[kind][text(r.code)]||(totals[kind][text(r.code)]={month:0,previous:0});
        v.month+=num(r.month_capacity);v.previous+=num(r.previous_capacity);s.month+=num(r.month_capacity);s.previous+=num(r.previous_capacity);locations[kind+":"+text(r.code)]={branch:r.branch_company,grid:r.grid_name};
      }
    }
    var ownNeeded=!p.team||p.team==="own";
    if(!p.team||p.team==="own"||p.team==="people"||p.team==="tail")measure("staff");
    if(!p.team||p.team==="own"||p.team==="halls"||p.team==="stars")measure("channel");
    function record(code,name,role,b,g,kind){var v=maps[kind][JSON.stringify([b,g,text(code)])]||{month:0,previous:0},prod=product(p.productId);return {key:kind+":"+code,code:text(code),name:text(name)||text(code),role:text(role),branchId:b,gridId:gridId(b,g),values:[{productId:p.productId,productName:prod.productName,unit:prod.unit,month:v.month,previous:v.previous}]};}
    var fields=(!p.team||p.team==="people"||p.team==="tail")?roster(tables.staff,"staff_no"):[],tails=(!p.team||p.team==="people"||p.team==="tail")?roster(tables.terminal,"staff_no"):[],conflict={};
    for(i=0;i<fields.length;i++)conflict[text(fields[i].staff_no)]=true;
    for(i=0;i<tails.length;i++)if(conflict[text(tails[i].staff_no)])conflict[text(tails[i].staff_no)]=2;
    if(!p.team||p.team==="people")for(i=0;i<fields.length;i++){var f=fields[i];if(conflict[text(f.staff_no)]!==2)records.push(record(f.staff_no,f.staff_name,f.team_type,f.branch,f.grid,"staff"));}
    if(!p.team||p.team==="tail"){
      var tailGroups={};for(i=0;i<tails.length;i++){var r=tails[i];if(conflict[text(r.staff_no)])continue;var k=JSON.stringify([r.branch,r.grid,text(r.agent),text(r.chn_name)]),item=tailGroups[k],v=record(r.staff_no,r.chn_name,"末梢渠道",r.branch,r.grid,"staff");if(!item){item=tailGroups[k]=v;item.key="tail:"+k;item.code="tail:"+JSON.stringify([text(r.agent),text(r.chn_name)]);item.values[0].month=0;item.values[0].previous=0;records.push(item);v=record(r.staff_no,r.chn_name,"末梢渠道",r.branch,r.grid,"staff");}item.values[0].month+=v.values[0].month;item.values[0].previous+=v.values[0].previous;}
    }
    var channels=(!p.team||ownNeeded||p.team==="stars"||p.team==="halls")?roster(tables.channelInfo,"chn_code"):[],chnLocations={};
    for(i=0;i<channels.length;i++){var c=channels[i];chnLocations[text(c.chn_code)]={branch:c.branch,grid:c.grid};if((!p.team||p.team==="halls")&&c.star_level==="营业厅")records.push(record(c.chn_code,c.chn_name,"营业厅",c.branch,c.grid,"channel"));if((!p.team||p.team==="stars")&&c.star_level==="三星+")records.push(record(c.chn_code,c.chn_name,"三星+渠道",c.branch,c.grid,"channel"));}
    if(ownNeeded){
      var own=roster(tables.ownStaff,"staff_no"),managers={},args={},ids=[];
      for(i=0;i<own.length;i++){var o=own[i],m=record(o.staff_no,o.staff_name,o.team,o.branch,o.grid,"staff");m.isOwn=true;m.key="own:"+m.code;m.values[0].month=0;m.values[0].previous=0;m.seen={};managers[m.code]=m;args["manager"+i]=m.code;ids.push("#{manager"+i+"}");records.push(m);}
      function add(m,kind,code){code=text(code);var k=kind+":"+code;if(!code||m.seen[k])return;m.seen[k]=true;var v=totals[kind][code];if(v){m.values[0].month+=v.month;m.values[0].previous+=v.previous;}}
      for(i=0;i<own.length;i++)add(managers[text(own[i].staff_no)],"staff",own[i].staff_no);
      if(ids.length){
        var links=pagedSql("SELECT manager_no,staff_no,branch_company,grid_name FROM "+tables.selfTeam+" WHERE manager_no IN ("+ids.join(",")+")"+scope("branch_company","grid_name",args),args,"manager_no,staff_no");
        for(i=0;i<links.length;i++)if(authorized(links[i].branch_company,links[i].grid_name))add(managers[text(links[i].manager_no)],"staff",links[i].staff_no);
        links=pagedSql("SELECT manager_no,channel_code FROM "+tables.chnManager+" WHERE manager_no IN ("+ids.join(",")+")",args,"manager_no,channel_code");
        for(i=0;i<links.length;i++){var loc=chnLocations[text(links[i].channel_code)]||locations["channel:"+text(links[i].channel_code)];if(!loc||authorized(loc.branch,loc.grid))add(managers[text(links[i].manager_no)],"channel",links[i].channel_code);}
      }
      for(i=0;i<own.length;i++)delete managers[text(own[i].staff_no)].seen;
    }
    if(p.managerCode){var selected=records.filter(function(r){return r.isOwn&&r.code===p.managerCode;})[0];if(!selected)throw new Error("无权查看该网格经理");var saved={query:Params.query,kind:Params.kind,gridIds:Params.gridIds,productId:Params.productId};try{Params.query=p.managerCode;Params.productId=p.productId;Params.kind="own";Params.gridIds=JSON.stringify(Object.keys(grids));var details=ownSearch(data).filter(function(r){return r.code===p.managerCode;});selected.children=details.length?details[0].children:[];}finally{Params.query=saved.query;Params.kind=saved.kind;Params.gridIds=saved.gridIds;Params.productId=saved.productId;}}
    if(text(Params.exportMode)==="1"){
      if(p.managerCode)throw new Error("请返回队伍列表导出低产与异动明细");
      var exported={statDate:data.statDate,criteria:createTeamControlEngine().criteria(p)},saveFilter=p.filter;p.page=1;p.pageSize=100;
      function exportRows(filter){p.filter=filter;return createTeamControlEngine().build(records,p,{statDate:data.statDate,organization:data.organization,exportAll:true}).items.map(function(r){return {code:r.code,name:r.name,role:r.role,team:r.team,branchId:r.branchId,gridId:r.gridId,metric:r.metric};});}
      exported.low=exportRows("low");exported.change=exportRows("change");
      return exported;
    }
    var response=createTeamControlEngine().build(records,p,{statDate:data.statDate,organization:data.organization});response.hasManager=Boolean(response.manager&&response.manager.code);
    if(p.team&&p.team!=="own"&&response.items.length){var oldKind=Params.kind;try{Params.kind=p.team==="people"?"people":"channels";attachSearchManagers(response.items,data);}finally{Params.kind=oldKind;}}
    return response;
  }
