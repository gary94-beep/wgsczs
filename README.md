# 网格生产AI助手 H5

手机端初版，登录后进入包含“生产总览”“低产预警监控”“校园生产管理”的工作台。校园生产管理目前仅保留菜单和占位页，不连接校园生产通。指标为收入、放号、119+套餐、终端合约、手宽新增、千兆运营。产能和目标是两种数据源：产能由业务系统返回，目标由市公司导入。每一级产能页都显示目标、差额和完成率；预警页筛选低产/零产人员和渠道，阈值可调整。

## 本地运行

```bash
npm install
npm run dev
```

开发环境默认 `VITE_USE_MOCK=true`，所有数据为演示数据。可用账号：

| 手机号 | 权限 | 起始页 |
| --- | --- | --- |
| 13800000000 | 市公司主管/领导 | 工作台；全市六项指标 → 分公司 → 网格 → 预警；监控可选分公司/网格/产品/阈值 |
| 13800000001 | 城区分公司领导 | 工作台；本公司六项指标 → 网格 → 预警；监控可选本网格/产品/阈值 |
| 13800000002 | 火炬分公司领导 | 同上，范围为火炬分公司 |
| 13800000003 | 城区一网格长 | 工作台；本网格六项指标 → 预警；监控仅可查看本网格，可选产品/阈值 |

演示环境的“目标值管理”只对市公司账号显示。下载 CSV 模板后可编辑 `target` 列再导入；必须保留全部网格×产品记录，不允许重复或负数。导入数据保存在当前浏览器的 `localStorage`，不代表真实平台已保存。

界面使用浅蓝绿城市封面：网页加载 `public/images/city-cover-bluegreen.jpg`，高清源图保存在 `design-sources/city-cover-bluegreen-original.png`。导航及产品图标来自 Lucide，许可文件见 `public/icons/LICENSE-LUCIDE.txt`。

## 平台接入

前端接口在 `src/api/production.js`，平台 `handle2` 结构在 `src/api/client.js`。`网格生产AI助手平台接口代码示例.js` 是数据库适配示意，并非可直接上线的后端。

`grid_ai_get_permission` 返回 `{ name, phone, role, cityName?, branchId?, branchName?, gridId?, gridName? }`，`role` 为 `city`、`branch` 或 `grid`。市公司主管/领导映射 `city`；分公司领导/主任映射 `branch` 并绑定所属 `branchId`；网格长映射 `grid` 并绑定所属 `branchId`、`gridId`。

`grid_ai_get_dashboard` 返回：

```json
{
  "organization": { "cityName": "中山市", "branches": [{ "branchId": "B01", "branchName": "城区分公司" }], "grids": [{ "gridId": "G001", "gridName": "城区一网格", "branchId": "B01" }] },
  "statDate": "2026-09-21",
  "products": [{ "productId": "revenue", "productName": "收入", "unit": "万元" }],
  "targets": [{ "gridId": "G001", "productId": "revenue", "target": 62 }],
  "rows": [{ "branchId": "B01", "gridId": "G001", "staffId": "S001", "staffName": "梁敏", "team": "直销一队", "channel": "社区摆摊", "productId": "revenue", "production": 15 }]
}
```

`grid_ai_import_targets` 接收 `{ rows: [{ gridId, productId, target }] }`，仅市公司权限可提交。后端应校验全量覆盖、重复项、有效组织/产品、目标数值及统计周期，按周期原子替换或事务更新；建议目标表唯一键为 `period + gridId + productId`。

**权限必须在服务端执行**：根据已认证的会话确认手机号和角色，不信任前端传入的 `phone`、`branchId`、`gridId`；市公司可看全市，分公司只返回本公司数据，网格长只返回本网格数据。产能按同一统计周期累计，目标周期与之匹配。零产分析要求在岗人员×产品的零值记录也能返回，不能只返回有订单的人。演示账号和本地导入逻辑不得作为生产权限或持久化方案。
