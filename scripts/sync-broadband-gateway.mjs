import fs from 'node:fs/promises'
const root=new URL('../',import.meta.url)
const source=(await fs.readFile(new URL('src/utils/broadband.js',root),'utf8')).replace('export function createBroadbandEngine','function createBroadbandEngine')
const fragment=await fs.readFile(new URL('server/broadband-gateway.inc.js',root),'utf8')
const bootstrap=await fs.readFile(new URL('server/broadband-bootstrap.inc.js',root),'utf8')
const gatewayPath=new URL('sczs_biz_api.js',root)
let gateway=(await fs.readFile(gatewayPath,'utf8')).replace(/\r\n?/g,'\n')
const start='  // BROADBAND_GENERATED_START',end='  // BROADBAND_GENERATED_END'
if(gateway.includes(start)) gateway=gateway.slice(0,gateway.indexOf(start))+gateway.slice(gateway.indexOf(end)+end.length).replace(/^\r?\n\r?\n/,'')
gateway=gateway.replace(/^[ \t]*wgsc_bb(?:Overview|Regions|Details): bb(?:Overview|Regions|Details),\n/gm,'')
await fs.writeFile(gatewayPath,gateway,'utf8')
const wrapper='function createBroadbandGateway(deps) {\n  var Params=deps.params,user=deps.user,tables=deps.tables,text=deps.text,date=deps.date,formatDate=deps.formatDate,latest=deps.latest,sql=deps.sql,scope=deps.scope,latestDimension=deps.latestDimension,pagedSql=deps.pagedSql;\n'+fragment+'\n  return {overview:bbOverview,regions:bbRegions,details:bbDetails};\n}\n'
await fs.writeFile(new URL('sczs_broadband_api.js',root),'// Dedicated Handle2 broadband gateway. ES5; no imports required.\n'+source+'\n'+wrapper+'\n'+bootstrap,'utf8')
console.log('Generated independent sczs_broadband_api.js; removed broadband code from main business gateway')
