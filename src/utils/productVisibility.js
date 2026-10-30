// Presentation-only switch. Keep stored production and targets intact for restoration.
const hiddenProducts = [{ id: 'gigabit', name: '千兆运营' }]

// Display names only: retain the existing product ID for queries and imports.
export function productDisplayText(value) {
  return typeof value === 'string' ? value.replace(/119\s*[+＋]\s*套餐|高套\s*[（(]\s*129\s*[+＋]\s*[）)]/g, '129+高套') : value
}

function displayProduct(item) {
  const result = { ...item }
  for (const field of ['productName', 'product_name', 'answer']) {
    if (typeof result[field] === 'string') result[field] = productDisplayText(result[field])
  }
  return result
}

export function isVisibleProduct(item) {
  const id = String(item?.productId ?? item?.product_id ?? '').trim()
  const name = String(item?.productName ?? item?.product_name ?? '').trim()
  return !hiddenProducts.some(product => product.id === id || product.name === name)
}

export function visibleDashboard(data) {
  const result = { ...data }
  for (const field of ['products', 'targets', 'rows', 'dailyRows', 'regionRows', 'periodRows', 'salesScripts']) {
    if (Array.isArray(data[field])) result[field] = data[field].filter(isVisibleProduct).map(displayProduct)
  }
  return result
}

export function visibleSearchResults(data) {
  return { ...data, results: (data.results || []).filter(isVisibleProduct).map(item => ({ ...displayProduct(item),
    ...(Array.isArray(item.values) ? { values: item.values.filter(isVisibleProduct).map(displayProduct) } : {})
  })).filter(item => !Array.isArray(item.values) || item.values.length > 0) }
}

export function visibleAnalysis(data) {
  // Do not remove isolated sentences: the remaining aggregate conclusion may be misleading.
  return { ...data, rows: (data.rows || []).filter(row => {
    const answer = String(row.answer || '')
    return isVisibleProduct(row) && !hiddenProducts.some(product => answer.includes(product.name) || new RegExp(`\\b${product.id}\\b`, 'i').test(answer))
  }).map(displayProduct) }
}
