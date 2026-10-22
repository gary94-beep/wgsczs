const defaults = {
  overall: '暂未提供总体情况分析。',
  advantage: '暂未提供优势分析。',
  weakness: '暂未提供短板分析。'
}

function clean(value) {
  return String(value || '').split(/\r?\n/)
    .filter(line => !/^\s*(```|~~~)/.test(line) && !/^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/.test(line))
    .map(line => line.replace(/^\s*#{1,6}\s*/, '').replace(/\*\*|__/g, '').replace(/\|/g, ' ').trim())
    .join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

function textValue(value) {
  if (typeof value === 'string') return clean(value)
  if (Array.isArray(value) && value.every(item => typeof item === 'string')) return value.map(clean).filter(Boolean).join('；')
  return ''
}

// Only organize supplied text; never infer missing strengths or weaknesses.
export function parseAiAnalysisSections(answer) {
  const plain = clean(answer)
  if (!plain) return { ...defaults }
  try {
    const object = JSON.parse(plain)
    if (object && typeof object === 'object' && !Array.isArray(object)) {
      const values = {
        overall: textValue(object.overall || object.summary || object['总体情况'] || object['整体情况']),
        advantage: textValue(object.advantage || object.strengths || object['优势']),
        weakness: textValue(object.weakness || object.weaknesses || object['短板'])
      }
      if (Object.values(values).some(Boolean)) return Object.fromEntries(Object.keys(defaults).map(key => [key, values[key] || defaults[key]]))
    }
  } catch { /* Existing results are normally plain text. */ }
  const aliases = { '总体情况': 'overall', '整体情况': 'overall', '总体概况': 'overall', '总体概述': 'overall', '概况': 'overall', '优势': 'advantage', '主要优势': 'advantage', '短板': 'weakness', '主要短板': 'weakness', '不足': 'weakness' }
  const pattern = /(?:^|[\r\n \t。；;])(?:\d+[.、．)）]\s*)?(总体情况|整体情况|总体概况|总体概述|概况|主要优势|优势|主要短板|短板|不足)\s*[:：]/g
  const headings = [...plain.matchAll(pattern)].map(match => ({ key: aliases[match[1]], start: match.index + match[0].indexOf(match[1]), end: match.index + match[0].length }))
  if (!headings.length) return { ...defaults, overall: plain }
  const values = { overall: '', advantage: '', weakness: '' }
  const prefix = plain.slice(0, headings[0].start).trim().replace(/^\d+[.、．)）]\s*$/, '')
  if (prefix && !headings.some(h => h.key === 'overall')) values.overall = prefix
  headings.forEach((heading, index) => {
    const end = index + 1 < headings.length ? headings[index + 1].start : plain.length
    const content = plain.slice(heading.end, end).trim().replace(/\s+\d+[.、．)）]\s*$/, '').trim()
    if (content) values[heading.key] = [values[heading.key], content].filter(Boolean).join('\n')
  })
  return Object.fromEntries(Object.keys(defaults).map(key => [key, values[key] || defaults[key]]))
}
