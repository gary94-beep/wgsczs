export function sumCapacity(rows) {
  const total = rows.reduce((acc, item) => {
    acc.production += Number(item.production || 0)
    acc.target += Number(item.target || 0)
    acc.orders += Number(item.orders || 0)
    acc.amount += Number(item.amount || 0)
    return acc
  }, { production: 0, target: 0, orders: 0, amount: 0 })

  return {
    ...total,
    staffCount: new Set(rows.map(item => item.staffId)).size,
    completionRate: total.target ? Math.round((total.production / total.target) * 100) : 0
  }
}

export function buildProductOverview(products, rows) {
  const totals = new Map()
  rows.forEach(item => {
    const productId = item.productId || item.product
    totals.set(productId, (totals.get(productId) || 0) + Number(item.production || 0))
  })
  return products.map(product => {
    const production = totals.get(product.productId) || 0
    const target = Number(product.target || 0)
    return {
      ...product,
      production,
      target,
      gap: Math.max(0, target - production),
      completionRate: target ? Math.round(production / target * 100) : 0
    }
  })
}

export function buildLowProducerList(rows, threshold) {
  return [...rows]
    .filter(item => Number(item.production || 0) <= threshold)
    .sort((a, b) => Number(a.production || 0) - Number(b.production || 0) || a.staffName.localeCompare(b.staffName, 'zh-CN'))
}

export function groupByChannel(rows) {
  const map = new Map()
  rows.forEach(item => {
    const key = item.channel || '未归类'
    const current = map.get(key) || { channel: key, production: 0, orders: 0, amount: 0, staffIds: new Set() }
    current.production += Number(item.production || 0)
    current.orders += Number(item.orders || 0)
    current.amount += Number(item.amount || 0)
    current.staffIds.add(item.staffId)
    map.set(key, current)
  })

  const totalProduction = rows.reduce((sum, item) => sum + Number(item.production || 0), 0)
  return [...map.values()]
    .map(item => ({
      channel: item.channel,
      production: item.production,
      orders: item.orders,
      amount: item.amount,
      staffCount: item.staffIds.size,
      share: totalProduction ? Math.round((item.production / totalProduction) * 100) : 0
    }))
    .sort((a, b) => b.production - a.production)
}

export function groupByTeam(rows) {
  const map = new Map()
  rows.forEach(item => {
    const key = item.team || '未归队伍'
    const current = map.get(key) || { team: key, production: 0, target: 0, people: 0 }
    current.production += Number(item.production || 0)
    current.target += Number(item.target || 0)
    current.people += 1
    map.set(key, current)
  })

  return [...map.values()]
    .map(item => ({
      ...item,
      completionRate: item.target ? Math.round((item.production / item.target) * 100) : 0
    }))
    .sort((a, b) => b.completionRate - a.completionRate)
}
