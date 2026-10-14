# 网格生产AI助手：Handle2接口对照与联调说明

## 一、交付范围

本次保留现有页面布局和mock开关，补全网关业务、前端封装、预警和搜索远程调用。代码已做本地构建与自动化验证，不代表已在移动Handle2平台部署或使用真实生产库验证。

所有业务请求均经 `postHandle2('ability_customize', ...)`。解密后的业务体：

```json
{
  "servicecode": "对应网关服务码",
  "token": "移动认证token",
  "params": { "funCode": "wgsc_fetchDashboard", "token": "同一个token" }
}
```

外层请求仍由client.js生成AES业务密文和RSA密钥密文。解密响应保留两层result，成功retCode兼容数字0和字符串0；不记录手机号、解密内容或token到控制台。

## 二、页面与接口

表中返回字段均指最终解包后的业务data。phone只用于mock或登录前权限查询；真实业务的身份必须从token解析，不能信任客户端role、phone或isSuperAdmin。

| 页面/操作 | 网关 | 接口 | 参数 | 返回字段 |
| --- | --- | --- | --- | --- |
| 登录前权限查询 | 通用 | wgsc_fetchPermission | phone | name,phone,role,branchId,branchName,gridId,gridName,cityName,isSuperAdmin，或null |
| 移动认证/本机号码 | 通用 | wgsc_getMobileByToken | token | mobile |
| 发送短信验证码 | 平台认证 | ability_acquire_send_code（2.0） | mobile（RSA加密后再放入AES请求） | 网关状态，存在业务状态时也校验 |
| 短信验证码登录 | 平台认证 | ability_acquire_valid_code（2.0） | mobile（RSA加密）、code | status,msg,token |
| 本机号码一键登录 | 平台认证 | ability_acquire_login（1.0） | SDK获取的msgidKey | 业务成功状态、token、mobile；脱敏手机号使用wgsc_getMobileByToken还原 |
| 工作台、生产总览、分公司/网格下钻、刷新 | 业务 | wgsc_fetchDashboard | token | organization,statDate,products,targets,rows,dailyRows,periodRows,regionRows,salesScripts,warnings,weekBasis,permission |
| 低产预警监控、网格预警、阈值/周期/渠道筛选 | 业务 | wgsc_fetchAlerts | token,gridIds(JSON数组),productId,period(month/day),threshold,channel(可选) | people,channels,statDate |
| 产能速查 | 业务 | wgsc_searchCapacity | token,query,kind(people/channels),gridIds(JSON数组),productId(可选),channelType(可选) | results,statDate；每项key,name,code,role,branchId,gridId,values；values含productId,productName,unit,day,month |
| 导入区域/渠道/工号产能 | 业务 | wgsc_importCapacity | token,target(region/channel/staff),rows(JSON数组，数据库字段名) | total,success,failed,errors,mode(upsert) |
| 导入渠道维度/末梢/员工/权限 | 业务 | wgsc_importRows | token,target(channelInfo/terminal/staff/permission),rows(JSON数组) | total,success,failed,errors,mode(upsert) |
| 目标值导入 | 业务 | wgsc_importTargets | token,rows(JSON数组) | imported |
| 话术文件导入 | 业务 | wgsc_importSalesScripts | token,rows(JSON数组) | imported |
| 话术单条维护封装（当前UI隐藏编辑） | 业务 | wgsc_saveSalesScript | token,script(JSON对象) | productId,content,updatedAt,status |
| 经典话术库查看 | 业务 | 复用wgsc_fetchDashboard | token | salesScripts中的productId,content,updatedAt,status,source |
| 目标/话术模板下载、复制话术 | 无 | 浏览器本地操作 | 已授权范围的网格/产品或话术 | CSV下载或剪贴板结果 |
| AI分析 | 独立AI网关 | wgsc_analyze | token,consent,question,view,gridIds,channelType；预警另传productId,period,threshold | answer,model,statDate；汇总由后端重新取数 |
| AI授权汇总（AI网关服务端调用） | 业务 | wgsc_fetchAiSummary | token,consent,view,gridIds,channelType；预警另传productId,period,threshold | statDate,scope,products等汇总，不返回人员渠道明细 |
| 校园生产管理 | 无 | 暂不实现 | 无 | 仅保留待配置入口，原需求不要求真实跳转 |

### 看板字段

- `organization.branches`：branchId,branchName；`grids`：gridId,gridName,branchId。
- 真实模式branchId使用分公司名称，gridId使用`分公司::网格`，区别于mock的B01/G001。目标模板由当前接口组织自动生成，不能拿mock模板直接导入真实库。
- `regionRows`：level(city/branch/grid),branchId,gridId,productId,period,production,snapshotTime；总览读取此权威区域汇总，不把全市、分公司和网格汇总重复相加。
- `rows`：本月明细；`dailyRows`：截止日明细，额外含date；`periodRows`：四种周期明细。三星+取渠道产能，直销/末梢取工号产能，不把同一渠道的渠道表与员工表相加。
- 明细包含staffId,staffName,staffRole,channel,channelCode,channelStar,microChannelName,serviceProvider,channelType,production,productId,branchId,gridId。直销同工号多渠道先合计再预警；末梢按分公司/网格/区域服务商/小微名称合计；三星+按渠道编码合计。
- 缺产能行不是零产，不自动补0。维度缺失或归属冲突记录不进入分类预警，会给出warnings；员工与末梢维度重复工号直接报错。真实三星+渠道没有工号名单来源，staffCount为空，不据此推断人数。

### 导入目标和话术格式

目标rows：`gridId,productId,target,dailyTarget,targetDate`；target为当月目标，dailyTarget为截止日目标，可以为空，targetDate对应当前统计日；须覆盖全部网格产品。话术rows/script：`productId,content`，更新时间由服务端生成，正文1至4000字。

## 三、必须先补的数据和表

六张原表名称及字段不变。权限、目标和话术不在这六张表内，因此提供 `sql/wgsc_support_tables.sql` 三张补充表供DBA审批：

1. `app_open_api_c003_wgsc_permission_1`：按实际建表结构，role为1市公司/2分公司/3网格，管理员字段为super_admin，含updated_at。接口读取后转换成city/branch/grid供前端使用；权限表单仍使用中文等级，导入时转换数字并将is_super_admin映射到super_admin。role默认值使用3，不能使用空字符串。原`xysct_permission`只有name/phone/role且属于其他项目，无法可靠限定网格权限；不要直接复用扩大权限。
2. `app_open_api_c001_wgsc_target_1`：按网格/产品/月保存月目标，以及截止日日目标和日期。
3. `app_open_api_c001_wgsc_script_1`：产品话术、维护时间、维护人。

表名以上述当前网关配置为准；旧支持SQL若仍使用c003目标/话术表，DBA执行前需同步成c001。若平台指定其他表名或字段，需同步网关文件、补充SQL和相关测试。权限数据由管理员填写真实手机号码；不提供自动开通超级管理员的SQL。

已制作“权限表单.xlsx”，预填5个分公司、25个镇区，姓名与手机号留空。第一页列：姓名、手机号、权限等级、分公司、网格、是否超级管理员、是否启用。权限等级支持市公司/分公司/网格（也支持city/branch/grid）；标志使用1/0。只有超级管理员显示“导入权限表”，调用wgsc_importRows(target=permission)。市公司组织字段留空，分公司只填所属分公司，网格两项都填；空姓名和手机号预置行跳过。导入按手机号新增/更新，可用enabled=0撤销，不允许降级/禁用当前管理员。首位管理员必须先由技术人员入库，否则无法自行开通。当前一人只对应一个分公司或网格，多范围权限需新增关联表，不支持逗号拼接。

若尚未部署支持表，接口会明确失败，不会退回mock、伪造目标或默认授予权限。

## 四、口径/字段差异及建议

| 现状差异 | 本次处理/建议 |
| --- | --- |
| 模板高套129+，旧页面119+ | 真实产品名改为高套（129+），保留旧productId plan119避免破坏图标/目标键。119+不能自动当作129+，旧数据必须由业务确认后重取；mock示例仍是旧119+展示 |
| 数据库last_mon，模板last mon中文 | 导入归一化成last_mon；不接受其他未知周期 |
| 统计日期20261008、取数20261009 080000 | 网关和前端均可归一化；日期校验大小月，取数默认北京时间 |
| week是滚动7天，不是周一至今 | 真实页标“近7天日均”，除以7；若必须展示本周，需另提供自然周汇总字段或每日历史，不伪造每日曲线 |
| 上月同期截止日可能比本月短 | 本月mon/本月已过天数；last_mon/上月实际对齐天数（31对30、闰年等），前端已有日期工具保留 |
| 原导入先DELETE整表 | 改为按原唯一键UPSERT，保留历史，重复导入不重复累加；先验证整批再写入 |
| 原Excel读取只选第一张、把说明行当表头 | 按导入类型选择三种产能页，自动寻找表头；识别此前模拟文件的说明尾行 |
| 原末梢表仅工号关联，无小微渠道编码 | 当前按区域服务商+小微名称聚合，并生成内部展示key；建议增加稳定小微渠道编码，名称变更/同名店可能误合并，真实渠道编码速查暂不能保证 |
| 原渠道状态只在Excel、不在维度表 | 前端导入仅正常营业。UPSERT不会删除已退出渠道，需平台提供退役/停用策略或增加状态字段和批次号，不能长期当作最新有效全集 |
| 地区总览与人员/渠道总览业务口径不同 | 全部类型使用region；分类使用对应渠道/工号产能，不要求强制对账，也不借用总目标算分类完成率 |
| 所有表没有导入批次号 | 三个产能表最新日期一致才展示；同日期的半批更新仍不能靠stat_date检测，需要批次状态/发布机制解决 |

### 上线前技术限制

- 当前单次导入上限10000条，读取每表上限20000条，超限明确失败。大规模工号明细应由后端增加分页/批次，并以一致快照读取，不能简单截断。
- Handle2现有参考仅提供单条abilitySql调用，未提供事务接口。UPSERT不删表且全批预校验，但写入阶段仍可能部分成功；failed/errors可复核后重试。目标/话术写入异常也可能已经写入部分记录；正式上线需事务或staging发布，不能宣称批次原子性。
- UPSERT是增量/覆盖同键，不再是全量删除；导错数据、更换全集或注销维度，需要额外受控清理流程，当前不开放删除接口，避免不可逆误删。
- 当前日目标只保存最近维护日，不是每日目标历史；需要回看过去日期目标时补历史表。
- 当前组织范围从区域与维度表推导，没有独立组织主数据；组织更名或缺失应在主数据同步后统一处理。

## 五、配置检查

| 配置 | development | production | 说明 |
| --- | --- | --- | --- |
| VITE_USE_MOCK | false | false | `.env.mock`显式true用于独立本地调试 |
| VITE_API_BASE | /handle2-api | https://gd.10086.cn/apph5/openapi/app/handle2 | 开发Vite代理，正式站点需核准CORS/域名白名单；代理不会随dist部署 |
| VITE_APP_ID | 保留现有值 | 保留现有值 | 客户端无法确认平台登记，须在Handle2控制台核对 |
| VITE_ACTIVITY_ID | wgsczs | wgsczs | 控制台确认该活动已授权两个servicecode |
| VITE_COMMON_SERVICE_CODE | Fcfc1a504f8ca30d | 同左 | 必须指向sczs_common_api |
| VITE_BIZ_SERVICE_CODE | F7ef4926580ea087 | 同左 | 必须指向sczs_biz_api |
| VITE_AI_SERVICE_CODE | 待填真实服务码 | 待填真实服务码 | 必须指向新增独立sczs_ai_api，参考Handle2_AI接入说明.md |
| VITE_IS_TEST | 1 | 0 | 正式模式已明确为0，仍需平台确认取值约定 |
| VITE_API_VERSION | 1.0 | 1.0 | client.js已读取，而非固定忽略配置 |

`isMock`在production.js与auth.js分流；App不编写加解密。真实业务传token到外层与params层；移除test-token兜底和跳过登录。token只保存在内存，认证回跳URL中的token读取后移除。登录前权限查询不是登录认证，真实读取必须有移动认证token。短信先查权限再发码，仅成功后绑定发送手机号并倒计时60秒；修改手机号需重新发码。所有登录方式均需同意条款。登录认证与获取权限完成后再加载看板。一键登录依次加载参考文件中的jquery/acquire/easylogin组件，SDK回调超时30秒；不将msgidKey冒充业务token。刷新页面后需重新认证（不持久化token）。

## 六、暂不实现的接口

- 短信发送/校验、一键登录已按提供的校园生产通App.vue认证契约实现，token由平台签发；还需在平台确认当前APP_ID/ACTIVITY_ID开通这三个能力，正式域名与SDK授权、网络及token解析均需真实环境联调。本地测试不会发送真实短信。
- Handle2版wgsc_analyze：AI网关只负责MoMA；认证、范围校验和服务端汇总由业务网关wgsc_fetchAiSummary负责。平台服务端跨网关汇总适配器、HTTP外呼、密钥读取及限流仍需配置。前端统一走AI网关，不走本地Vite接口。详细契约见Handle2_AI接入说明.md；不能把密钥放VITE变量，不能将本地测试通过视为平台接通。
- 校园真实跳转、在线逐条权限编辑、导入历史删除、导入批次事务：暂不实现，原因是缺入口/认证管理/事务契约；权限批量新增/修改/停用已经通过权限表导入支持。
- 独立组织/产品/话术读取接口：暂不另建，原因是看板快照已包含这些数据，现有页面可以复用一次请求，避免接口重复。

## 七、联调步骤

1. 技术人员审核补充SQL，在平台部署支持表和真实权限记录，city/branch/grid各一名及独立superadmin一名；branch/grid填写与取数表完全一致的名称。
2. 将sczs_common_api.js与sczs_biz_api.js分别部署至上述两个服务码；确认Params和JsResult以及CustomizeUtil.abilitySql/redisGet/getMobile返回结构。SQL读取预期`data.results`，写入成功码预期0；若平台另有格式，先调整网关适配，不放宽为“任何返回都成功”。
3. 安装依赖后`npm test`、`npm run build`；仅mock调试用`npm run dev -- --mode mock --port 5180`，真实本地用`npm run dev -- --port 5181`。Windows如提示Rollup可选依赖缺失，请在对应Windows环境重新安装依赖，不直接沿用其他系统node_modules。
4. 分别验证短信发送、正确/错误/过期验证码、手机号更换、重复点击与倒计时、一键登录SDK失败与脱敏号码还原、URL认证回跳。分别验证普通市公司、分公司、网格长及管理员权限。手机号输入不能代替token认证。
5. 管理员依次导入渠道维度、末梢、员工；导入区域、渠道、工号同日四周期产能。三张日期不一致应明确提示；不得出现新区域数据配旧工号数据。
6. 验证全市→分公司→网格，region值与原表一致；切换三个分类，来源分别正确。已有上下级汇总绝不再重复相加。
7. 阈值0与1、当日与月度分别测试三类预警；同工号多渠道合计后再判断，末梢按服务商/小微归并。无明细行不作为零产。复核每个结果的姓名/岗位/工号/星级/编码/归属。
8. 使用姓名、工号、渠道名称/编码搜索；构造跨分公司gridIds或修改phone/role/isSuperAdmin发送请求，应仍拒绝越权。
9. 下载真实组织目标模板，填全网格/产品目标及截止日日目标后导入；普通账号既看不到入口，也不能直接调用写接口。重载后复核目标和话术更新时间。
10. 验证数值空白、负数、Infinity、重复唯一键、2月30日、非法周期、SQL写失败、失效token。验证10月31日对9月30日、3月对2月闰年同期日均。
11. 核对更新批次、数量限制、退出渠道、部分写入风险以及正式AI后端后，才进行生产发布。本地自动化不能替代真实库与认证联调。

## 八、测试记录

已新增网关VM契约测试、Handle2客户端加解密包络测试以及四角色浏览器流程脚本。最终测试结果以本次交付时的实际执行记录为准；测试数据库为内存桩，不会调用真实平台或发送经营数据。
