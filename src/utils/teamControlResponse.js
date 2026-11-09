// Some Handle2 serializers turn null objects into {}. Empty objects are not managers.
export function normalizeTeamResponse(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('队伍盯控返回格式异常，请重试')
  const manager = value.manager
  return { ...value, manager: manager && typeof manager.code === 'string' && manager.code.trim() ? manager : null,
    teams: Array.isArray(value.teams) ? value.teams : [], roles: Array.isArray(value.roles) ? value.roles : [],
    regions: Array.isArray(value.regions) ? value.regions : [], items: Array.isArray(value.items) ? value.items : [] }
}

export function teamOverview(teams=[]){
  const rows=teams.filter(row=>row.id!=='own'),valid=v=>(typeof v==='number'||typeof v==='string'&&v.trim()!=='')&&Number.isFinite(Number(v))&&Number(v)>=0,sum=key=>rows.some(row=>!valid(row[key]))?null:rows.reduce((n,row)=>n+Number(row[key]),0)
  return {total:sum('total'),low:sum('low'),change:sum('change')}
}
