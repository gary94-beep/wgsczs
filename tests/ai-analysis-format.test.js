import test from 'node:test'
import assert from 'node:assert/strict'
import { parseAiAnalysisSections as parse } from '../src/utils/aiAnalysisFormat.js'

test('plain text headings produce exactly three sections', () => {
  assert.deepEqual(parse('总体情况：整体平稳。\n优势：手宽新增领先。\n短板：终端合约待跟进。'), { overall: '整体平稳。', advantage: '手宽新增领先。', weakness: '终端合约待跟进。' })
})
test('Markdown, numbers, inline headings and alternate colon are supported', () => {
  const numbered = parse('1. **总体情况：** 整体平稳。\n2. **优势：** 放号领先。\n3. **短板：** 终端待跟进。')
  assert.equal(numbered.overall, '整体平稳。')
  assert.equal(numbered.advantage, '放号领先。')
  assert.equal(numbered.weakness, '终端待跟进。')
  assert.deepEqual(parse('总体情况: 平稳； 优势: 放号； 短板: 终端'), { overall: '平稳；', advantage: '放号；', weakness: '终端' })
})
test('Chinese and English structured records can be displayed without markup', () => {
  assert.deepEqual(parse('{"总体情况":"平稳","优势":"放号","短板":"终端"}'), { overall: '平稳', advantage: '放号', weakness: '终端' })
  assert.deepEqual(parse('```json\n{"summary":"平稳","strengths":["放号","手宽"],"weakness":"终端"}\n```'), { overall: '平稳', advantage: '放号；手宽', weakness: '终端' })
})
test('unstructured legacy content stays intact; missing sections are never invented', () => {
  const legacy = '截至10月8日，全市整体平稳。\n请核实数据。'
  const result = parse(legacy)
  assert.equal(result.overall, legacy)
  assert.equal(result.advantage, '暂未提供优势分析。')
  assert.equal(result.weakness, '暂未提供短板分析。')
  assert.equal(parse('优势：放号领先。').overall, '暂未提供总体情况分析。')
  assert.equal(parse('1. 优势：放号领先。').overall, '暂未提供总体情况分析。')
})
test('zero, empty sections, repeated headings and HTML remain safe text', () => {
  assert.equal(parse('总体情况：产能0户。\n优势：\n短板：目标缺失。').overall, '产能0户。')
  assert.equal(parse('').overall, '暂未提供总体情况分析。')
  assert.equal(parse('优势：放号。\n优势：手宽。').advantage, '放号。\n手宽。')
  assert.equal(parse('总体情况：<img src=x onerror=alert(1)>').overall, '<img src=x onerror=alert(1)>')
})
