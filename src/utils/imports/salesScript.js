export function validateScriptImport(rows, products) {
  if (!Array.isArray(rows) || !rows.length) throw new Error('话术表内容为空')
  const header = rows[0].map(item => String(item || '').trim())
  const REQUIRED = ['product_id', 'content']
  const missing = REQUIRED.filter(col => !header.includes(col))
  if (missing.length) throw new Error(`话术表须包含：${missing.join('、')}`)

  const productMap = new Map(products.map(p => [p.productId, p.productName]))
  const seen = new Set()
  const result = []

  for (let i = 1; i < rows.length; i++) {
    const line = rows[i]
    if (!line || !line.some(cell => String(cell || '').trim())) continue
    const record = {}
    header.forEach((col, index) => { record[col] = String(line[index] ?? '').trim() })
    const productId = record.product_id
    const content = record.content
    if (!productId || !content) continue
    if (record.id && record.id.startsWith('必填')) continue
    if (!productMap.has(productId)) throw new Error(`第${i + 1}行产品编号无效：${productId}`)
    if (content.length > 4000) throw new Error(`第${i + 1}行话术内容超过4000字`)
    if (seen.has(productId)) throw new Error(`第${i + 1}行产品编号重复：${productId}`)
    seen.add(productId)
    result.push({ productId, content })
  }
  if (!result.length) throw new Error('话术表无有效数据行')
  return result
}

export function scriptTemplateCsv(products) {
  const header = 'id,product_id,content,updated_at,updated_by'
  const sample = '必填（导入时请删除示例行）,选填,选填,选填,选填'
  const lines = [header, sample, ...products.map(p => `,${p.productId},,,`)]
  return '\ufeff' + lines.join('\r\n')
}