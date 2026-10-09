import test from 'node:test'
import assert from 'node:assert/strict'
import { analyze, conciseAnswer } from '../server/ai.js'
import { buildAiSummary } from '../src/utils/aiSummary.js'

test('MoMA uses provided endpoint and server-only credentials', async () => {
  const payload = { question: '分析异常', summary: { demo: true, monthAverage: 2 } }
  const result = await analyze(payload, { key: 'test-secret', model: 'DeepSeek-V4-Flash' }, async (url, options) => {
    assert.equal(url, 'https://moma.cmecloud.cn/tokenplan-personal/v1/chat/completions')
    assert.equal(options.headers.Authorization, 'Bearer test-secret')
    const body = JSON.parse(options.body)
    assert.equal(body.model, 'DeepSeek-V4-Flash')
    assert.equal(body.max_tokens, 4096)
    assert.equal(body.temperature, 0.7)
    assert.equal(body.top_p, 0.9)
    assert.equal(body.stream, false)
    assert.match(body.messages[0].content, /不超过300字/)
    assert.match(body.messages[0].content, /仅用纯文本/)
    assert.ok(!options.body.includes('test-secret'))
    return { ok: true, json: async () => ({ choices: [{ message: { content: '演示数据分析结果' } }] }) }
  })
  assert.equal(result.answer, '演示数据分析结果')
})
test('Answers remove headings, bold and table separators and stay within 300 characters', () => {
  const answer = conciseAnswer('## 短板分析\n**产品** | **进度**\n|------|------|\n放号 | 80%\n' + '建议核实数据。'.repeat(80))
  assert.ok(Array.from(answer).length <= 300)
  assert.ok(!/[#|*`]/.test(answer))
  assert.ok(!answer.includes('------'))
  assert.ok(answer.includes('80%'))
  assert.equal(conciseAnswer('产能下降，建议核实。'), '产能下降，建议核实。')
})
test('Missing key, invalid request, upstream errors and empty results are explicit', async () => {
  const config = { key: 'test', model: 'DeepSeek-V4-Flash' }
  await assert.rejects(analyze({}, {}), /尚未配置/)
  await assert.rejects(analyze({}, config), /参数/)
  const payload = { question: '检查', summary: {} }
  await assert.rejects(analyze(payload, config, async () => ({ ok: false, status: 401 })), /鉴权未通过/)
  await assert.rejects(analyze(payload, config, async () => ({ ok: false, status: 402 })), /计费或额度校验未通过/)
  await assert.rejects(analyze(payload, config, async () => ({ ok: true, json: async () => ({}) })), /有效内容/)
})
test('Summary excludes identities and preserves unknown metrics', () => {
  const summary = buildAiSummary({ scope: '测试网格', product: { productName: '放号', unit: '户', staffId: 'secret' }, metric: { production: 10, daily: { production: null }, weeklyAverage: null, monthAverage: 2, previousAverage: 1, staffName: 'secret' }, categories: [{ label: '直销人员', count: 2, staffId: 'secret' }] })
  assert.ok(!JSON.stringify(summary).includes('secret'))
  assert.equal(summary.day.production, null)
  assert.equal(summary.dayComparison, null)
  assert.equal(summary.monthComparison.percent, 100)
})
