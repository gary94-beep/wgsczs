export function validateScriptImport(data, products) {
  if (!Array.isArray(data) || data.length < 2 || data[0].length !== 2 || data[0][0] !== '产品名称' || data[0][1] !== '话术内容') throw new Error('请使用话术模板：产品名称、话术内容')
  if (data.length - 1 > products.length) throw new Error('导入记录数量超过产品数量')
  const seen = new Set()
  return data.slice(1).map((row, index) => {
    const product = products.find(product => product.productName === row[0])
    if (row.length !== 2 || !product) throw new Error(`第${index + 2}行产品名称或列数有误`)
    if (seen.has(product.productId)) throw new Error(`第${index + 2}行产品重复`)
    if (!row[1]?.trim() || row[1].length > 4000) throw new Error(`第${index + 2}行话术须为1至4000字`)
    seen.add(product.productId)
    return { productId: product.productId, content: row[1].trim() }
  })
}

export function scriptTemplateCsv(products) {
  const escape = value => `"${String(value).replace(/"/g, '""')}"`
  return '\ufeff' + [['产品名称', '话术内容'], ...products.map(product => [product.productName, ''])].map(row => row.map(escape).join(',')).join('\r\n')
}
