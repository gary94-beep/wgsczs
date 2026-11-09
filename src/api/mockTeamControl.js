import {teamControlEngine} from '../utils/teamControlEngine.js'
import {mockPermissions,mockProducts} from '../data/mockData.js'
const branches=[['城区分公司',['东区','石岐区','西区','南区','五桂山','港口']],['南部分公司',['三乡','坦洲','大涌','板芙','神湾']],['北部分公司',['小榄','东升','古镇','横栏','东凤','黄圃']],['高新分公司',['火炬开发区','南朗','翠亨新区']],['东部分公司',['三角','南头','民众','阜沙','沙溪']]]
const organization={cityName:'中山市',branches:branches.map(([name])=>({branchId:name,branchName:name})),grids:branches.flatMap(([branch,names])=>names.map(name=>({branchId:branch,gridId:branch+'::'+name,gridName:name})))}
function values(seed){return mockProducts.filter(p=>p.productId!=='gigabit').map((p,i)=>{const n=(seed+i*3)%11;return {...p,month:n<4?n%2:n*3,previous:n%3===0?0:n*8+12};})}
function dataset(){
 const records=[]
 for(const [gi,grid] of organization.grids.entries()){
  const local=[]
  for(let n=0;n<6;n++){const role=['行销经理','商企经理','装维随销'][n%3],code='DEMO-S'+gi+'-'+n;local.push({key:'staff:'+code,code,name:['示例行销','示例商企','示例装维'][n%3]+(gi+1)+'-'+(n+1),role,branchId:grid.branchId,gridId:grid.gridId,values:values(gi*7+n),entityType:'staff',relation:'所管人员'});}
  for(let n=0;n<6;n++){const type=['营业厅','三星+渠道','末梢渠道'][n%3],code='DEMO-C'+gi+'-'+n;local.push({key:'channel:'+code,code,name:['示例营业厅','示例通信门店','示例手机配件店'][n%3]+(gi+1)+'-'+(n+1),role:type,branchId:grid.branchId,gridId:grid.gridId,values:values(gi*5+n+2),entityType:'channel',relation:'所管渠道'});}
  for(let n=0;n<4;n++){
   const rawRole=['店长','渠道经理','商企经理1','社区经理'][n],code='DEMO-M'+gi+'-'+n,name='示例经理'+(gi+1)+'-'+(n+1);
   const self={key:'staff:'+code,code,name,role:rawRole,isOwn:true,relation:'本人',entityType:'staff',branchId:grid.branchId,gridId:grid.gridId,values:values(gi+n+3)};
   const managed=local.filter((r,index)=>index%4===n);for(const child of managed)child.managers=[{code,name,role:rawRole==='商企经理1'?'商企经理':rawRole}];
   const children=[self,...managed],aggregate=self.values.map(p=>({...p,month:children.reduce((sum,c)=>sum+c.values.find(v=>v.productId===p.productId).month,0),previous:children.reduce((sum,c)=>sum+c.values.find(v=>v.productId===p.productId).previous,0)}));
   records.push({...self,key:'own:'+code,children,values:aggregate});
  }
  records.push(...local)
 }
 return records
}
export async function mockTeamControl(params){
 const permission=mockPermissions[params.phone];if(!permission)throw new Error('无查看权限')
 let org=organization,rows=dataset();
 if(permission.role!=='city'){
  const branch=permission.branchName==='火炬分公司'?'高新分公司':permission.branchName;
  org={...organization,branches:organization.branches.filter(b=>b.branchId===branch),grids:organization.grids.filter(g=>g.branchId===branch)};
  if(permission.role==='grid')org={...org,grids:org.grids.slice(0,1)};
  rows=rows.filter(r=>org.grids.some(g=>g.gridId===r.gridId));
 }
 if(params.branchId&&!org.branches.some(b=>b.branchId===params.branchId)||params.gridId&&!org.grids.some(g=>g.gridId===params.gridId))throw new Error('无权查看该范围')
 await new Promise(resolve=>setTimeout(resolve,120))
 if(params.exportMode==='1')return {statDate:'2026-11-05',criteria:teamControlEngine.criteria(params),low:teamControlEngine.build(rows,{...params,filter:'low'},{statDate:'2026-11-05',organization:org,exportAll:true}).items,change:teamControlEngine.build(rows,{...params,filter:'change'},{statDate:'2026-11-05',organization:org,exportAll:true}).items};
 return {...teamControlEngine.build(rows,params,{statDate:'2026-11-05',organization:org}),demo:true}
}
