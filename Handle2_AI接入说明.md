# 独立 AI 网关部署说明

## 文件及路由

- `sczs_ai_api.js`：独立 Handle2 脚本网关，运行方式与 `sczs_biz_api.js` 一致，使用 Params、JsResult、CustomizeUtil，ES5 语法。
- 前端通过 `ability_customize` 调用新网关，funCode 为 `wgsc_analyze`。
- `VITE_AI_SERVICE_CODE` 填注册这个新脚本后取得的真实 servicecode；不是模型名，不是 API Key。参考 `.env.ai.example`，填入构建使用的环境文件后重新打包。
- `vite.config.js` 已移除本地 AI 插件；网页不再请求 `/api/ai/analyze`。`server/ai.js` 仅保留作为旧实现参考，不参与运行。
- AI 请求无 mock 分支。模拟账号的 token 不具备正式权限，测试真实 AI 需正式登录，并使用数据库中的组织数据。

## 已实现

服务端验证 token、启用状态及市公司/分公司/网格权限。按授权范围读取产能及目标，重新构造日/月产能、完成率、差距、日均比较和预警分类数量，不接受浏览器提供的分析数据。仅发送汇总指标到 MoMA，不发送手机号、姓名、工号或渠道明细。用户必须勾选发送同意。输出纯文本，最多300字。

## 尚需平台适配：必须完成才可调用 MoMA

现有业务脚本只提供 abilitySql、redisGet 和 getMobile 的调用示例，未提供 Handle2 的 HTTPS 外呼及密钥读取 API。不能把 Node fetch、环境变量或猜测的 CustomizeUtil 方法直接放进平台脚本。

请技术人员在 `sczs_ai_api.js` 的 `init()` 调用前定义函数 `wgscMomaTransport(request)`，使用平台真实的服务端 HTTP 能力与密钥存储。这是本项目定义的适配函数，不是平台内置方法。

输入：

```javascript
{
  url: "https://moma.cmecloud.cn/tokenplan-personal/v1/chat/completions",
  timeoutMs: 60000,
  body: { model: "DeepSeek-V4-Flash", stream: false, messages: [] }
}
```

`body` 实际还包含 max_tokens、temperature、top_p 和服务端构造的完整 messages，适配器应原样发送 JSON。

适配器职责：从服务端密钥存储读取 MoMA Key；HTTPS POST；设置 Authorization: Bearer 密钥及 Content-Type: application/json；校验 TLS；禁止重定向；60秒超时；按登录主体限频并设置整体额度保护。不要把密钥、请求头或原始上游错误写入用户响应或日志。

返回格式（对象或 JSON 字符串均可）：

```javascript
{
  statusCode: 200,
  body: { choices: [{ message: { content: "分析结果" } }] }
}
```

平台外呼函数名称和密钥读取方法确认后才能补齐适配器。当前没有假装成功的占位响应；未配置时网关会明确返回配置错误。旧 `.env.development.local` 的 MoMA 密钥不会随静态文件进入 Handle2，需由管理员存入服务端。

## 请求示例（加密封装前）

```json
{
  "servicecode": "新AI网关实际servicecode",
  "token": "真实登录token",
  "params": {
    "funCode": "wgsc_analyze",
    "token": "真实登录token",
    "consent": "1",
    "question": "分析主要短板并给出优先行动",
    "view": "overview",
    "gridIds": "[]",
    "channelType": ""
  }
}
```

预警页使用 view=alerts，并传 productId、period（day/month）、threshold、gridIds。响应保持现有 result.retCode/retMsg/data 格式，成功 data 包含 answer、model、statDate。密钥错误、限频、缺失配置分别返回明确错误；登录失效返回00008。

## 上线顺序

1. 注册独立 AI 网关，配置表访问权限及 MoMA 域名外呼权限。
2. 完成上述服务端适配器、密钥、限频及超时配置。
3. 填 VITE_AI_SERVICE_CODE，重新构建并上传静态文件；业务网关不再承担 AI 请求。
4. 用市公司、分公司、网格真实账号联调授权范围、同意勾选、超时、额度及输出长度。

## 其他页面调整

工作台只有超级管理员看到“数据导入”，目标、话术、权限、维度和产能导入统一放入该页。页面左上角导航字体调整为16px，按钮触达高度至少44px。
