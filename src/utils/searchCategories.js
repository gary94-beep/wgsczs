const fieldRoles = ['行销经理', '商企经理', '装维随销']

export function matchesSearchCategory(item, kind) {
  if (kind === 'own') return item.isOwn === true
  if (kind === 'people') return item.isOwn !== true && fieldRoles.includes(item.role)
  if (kind === 'halls') return item.isOwn !== true && item.role === '营业厅'
  return item.isOwn !== true && ['三星+渠道', '3星+渠道', '末梢渠道'].includes(item.role)
}
