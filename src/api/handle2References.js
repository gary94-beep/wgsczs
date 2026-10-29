// Handle2/FastJSON can serialize shared objects as JSONPath references.
// Resolve against the complete decrypted envelope, before extracting data.
export function resolveHandle2References(root) {
  const memo = new WeakMap(), active = new WeakSet()
  function target(path) {
    if (typeof path !== 'string' || !path.startsWith('$')) throw new Error('网关返回了不支持的数据引用')
    let value = root, index = 1
    const token = /(?:\.([A-Za-z_$][\w$]*)|\[(0|[1-9]\d*)\])/y
    while (index < path.length) {
      token.lastIndex = index
      const match = token.exec(path)
      if (!match) throw new Error('网关数据引用路径无效')
      const key = match[1] ?? match[2]
      if (['__proto__', 'prototype', 'constructor'].includes(key) || value === null || typeof value !== 'object' || !Object.hasOwn(value, key)) throw new Error('网关数据引用未找到对应记录')
      value = value[key]; index = token.lastIndex
    }
    return value
  }
  function visit(value) {
    if (value === null || typeof value !== 'object') return value
    if (active.has(value)) throw new Error('网关返回循环数据引用，请更新网关后重新查询')
    if (memo.has(value)) return memo.get(value)
    active.add(value)
    let result
    if (Object.keys(value).length === 1 && typeof value.$ref === 'string') {
      result = visit(target(value.$ref))
    } else {
      result = Array.isArray(value) ? [] : {}
      for (const key of Object.keys(value)) {
        if (['__proto__', 'prototype', 'constructor'].includes(key)) throw new Error('网关返回无效字段')
        result[key] = visit(value[key])
      }
    }
    active.delete(value); memo.set(value, result)
    return result
  }
  return visit(root)
}
