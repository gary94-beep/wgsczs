// ========== 网格生产助手 H5 专属业务网关 ==========
function init() {
    /**
     * 构造接口统一返回JSON字符串
     * @param {string} code 返回码
     * @param {string} retMsg 返回信息
     * @param {any} data 返回数据
     * @returns {string} json字符串
     */
    function createRes(code, retMsg, data) {
        return JSON.stringify({
            result: {
                retCode: code,
                retMsg: retMsg,
                data: data !== undefined ? data : null
            }
        });
    }

    // 安全校验：funCode 只能包含字母、数字、下划线
    var regex = /^[a-zA-Z0-9_]{1,30}$/;
    if (!regex.test(Params.funCode)) {
        JsResult.result = createRes("99", "非法调用");
        return;
    }

    /**
     * 循环最多3次尝试解析JSON字符串，兼容嵌套json字符串
     * @param {any} value 待解析内容
     * @returns {any} 解析后对象/原值
     */
    function parseMaybeJson(value) {
        var current = value;
        for (var i = 0; i < 3; i++) {
            if (typeof current !== 'string') return current;
            var text = current.replace(/^\s+|\s+$/g, '');
            if (!text) return current;
            try {
                current = JSON.parse(text);
            } catch (e) {
                return current;
            }
        }
        return current;
    }

    /**
     * 深度遍历对象，按key名称数组优先查找取值
     * @param {any} source 数据源
     * @param {string[]} names 候选key名称数组
     * @returns {string} 匹配到的值，无则返回空串
     */
    function findValue(source, names) {
        var stack = [parseMaybeJson(source)];
        for (var i = 0; i < stack.length; i++) {
            var item = parseMaybeJson(stack[i]);
            if (!item || typeof item !== 'object') continue;
            for (var n = 0; n < names.length; n++) {
                var key = names[n];
                if (item[key] !== undefined && item[key] !== null && item[key] !== '') {
                    return item[key];
                }
            }
            for (var prop in item) {
                if (Object.prototype.hasOwnProperty.call(item, prop)) {
                    stack.push(item[prop]);
                }
            }
        }
        return '';
    }

    /**
     * 手机号标准化清洗，去除引号空格，提取11位手机号
     * @param {any} value 原始手机号文本
     * @returns {string} 清洗后手机号
     */
    function normalizeMobile(value) {
        var text = String(value || '').replace(/^\s+|\s+$/g, '').replace(/^['"]+|['"]+$/g, '').replace(/\s/g, '');
        var match = text.match(/1\d{10}/);
        return match ? match[0] : text;
    }

    /**
     * 解析redis返回结果，提取内部value数据
     * @param {any} redisRes redis原始返回值
     * @returns {any} 解析后的业务数据
     */
    function extractRedisValue(redisRes) {
        var parsed = parseMaybeJson(redisRes);
        var data = parseMaybeJson(parsed && parsed.data !== undefined ? parsed.data : parsed);
        if (data && data.value !== undefined) return parseMaybeJson(data.value);
        if (parsed && parsed.value !== undefined) return parseMaybeJson(parsed.value);
        return data;
    }

    /**
     * 通过登录token获取清洗后的手机号
     * @param {string} loginToken 登录token
     * @returns {string} 手机号
     */
    function getMobileFromToken(loginToken) {
        var raw = CustomizeUtil.getMobile(loginToken);
        return normalizeMobile(findValue(raw, ['mobile', 'phone', 'userphone', 'userPhone', 'mobileno']));
    }

    // 白名单：仅保留登录前必须免 token 的接口
    var authWhiteList = [
        'wgsc_fetchPermission',
        'wgsc_getMobileByToken',
        'wgsc_test',
        'wgsc_importCapacity'
    ];

    // 鉴权拦截器：非白名单接口必须带有效 token
    if (authWhiteList.indexOf(Params.funCode) === -1) {
        var authToken = String(Params.token || '').trim();
        if (!authToken) {
            JsResult.result = createRes('00008', 'token过期或token不能为空');
            return;
        }
        try {
            var redisRaw = CustomizeUtil.redisGet({ key: authToken });
            var redisValue = extractRedisValue(redisRaw);
            if (!redisValue) {
                JsResult.result = createRes('00008', 'token过期或token不能为空');
                return;
            }
            // 强制使用服务端从 Redis 解析出的手机号，防止前端篡改
            var authPhone = normalizeMobile(findValue(redisValue, ['userphone', 'phone', 'mobile', 'userPhone', 'mobileno']));
            if (!/^1\d{10}$/.test(authPhone)) {
                authPhone = getMobileFromToken(authToken);
            }
            if (!/^1\d{10}$/.test(authPhone)) {
                JsResult.result = createRes('00008', 'token未解析到完整手机号');
                return;
            }
            Params.phone = authPhone;
        } catch (e) {
            JsResult.result = createRes('00008', '身份校验异常: ' + e.message);
            return;
        }
    }

    /* ==================================
       网格生产助手业务方法区
       ================================== */

    /**
     * 登录前权限查询
     * 入参：Params.phone（11位手机号）
     * 出参：{ name, phone, role } 或 null（无权限）
     * 说明：白名单接口，无需 token，用于发送验证码前校验
     */
    function wgsc_fetchPermission() {
        // 强制转字符串并去除首尾空白
        var phone = String(Params.phone || '').trim();
        // 参数校验
        if (!phone) {
            JsResult.result = createRes('1', '手机号不能为空');
            return;
        }
        if (!/^1\d{10}$/.test(phone)) {
            JsResult.result = createRes('1', '手机号格式错误，收到: ' + phone);
            return;
        }
        // 查询权限表
        var sql = "SELECT name, phone, role FROM app_open_api_c007_xysct_permission_1 WHERE phone = #{phone}";
        var res = JSON.parse(CustomizeUtil.abilitySql(sql, { phone: phone }));
        // 未找到记录
        if (!res.data || !res.data.results || res.data.results.length === 0) {
            JsResult.result = createRes('0', '该手机号暂无使用权限', null);
            return;
        }
        // 找到记录
        var permission = res.data.results[0];
        JsResult.result = createRes('0', '成功', {
            name: permission.name,
            phone: permission.phone,
            role: permission.role
        });
    }

    /**
     * 通过一键登录返回的 token 换取完整手机号
     * 入参：Params.token
     * 出参：{ mobile }
     */
    function wgsc_getMobileByToken() {
        var loginToken = String(Params.token || '').trim();
        if (!loginToken) {
            JsResult.result = createRes('1', '一键登录token不能为空');
            return;
        }
        // 直接复用外层：parseMaybeJson、findValue、normalizeMobile，删除内部重复定义
        var raw = CustomizeUtil.getMobile(loginToken);
        var mobile = normalizeMobile(findValue(raw, ['mobile', 'phone', 'userphone', 'userPhone', 'mobileno']));
        if (!/^1\d{10}$/.test(mobile)) {
            JsResult.result = createRes('1', 'token未换取到完整手机号');
            return;
        }
        JsResult.result = createRes('0', '成功', {
            mobile: mobile
        });
    }

    /**
     * 测试接口，白名单方法
     */
    function wgsc_test() {
    }

    /**
     * 批量导入产能数据（区域/渠道/工号三张表通用解扩）
     * 入参：
     *   Params.target：region | channel | staff
     *   Params.rows：JSON 字符串，元素为对象
     * 出参：{ total, success, failed, errors }
     *
     * 说明：
     *   - 非白名单接口，需登录
     *   - 全量覆盖：先 TRUNCATE，再批量 INSERT
     *   - 不保留历史，只留最新一次快照
     *   - 单次上限 20000 条，分批写入
     *   - 最小条数保护：有效数据少于 MIN_ROWS 时拒绝覆盖，防止误清表
     */
    function wgsc_importCapacity() {
        // ========== 0. 可调参数 ==========
        var MAX_ROWS = 20000;      // 单次最大条数
        var BATCH_SIZE = 500;      // 每批 INSERT 条数
        var MIN_ROWS = 10;         // 最小有效条数，低于此值拒绝 TRUNCATE

        // ========== 1. 目标表配置 ==========
        var tableConfig = {
            region: {
                table: 'fact_region_capacity',
                fields: [
                    'branch_company', 'grid_name', 'prod_period_type',
                    'product_name', 'capacity', 'stat_date', 'snapshot_time'
                ],
                required: [
                    'branch_company', 'grid_name', 'prod_period_type',
                    'product_name', 'stat_date'
                ]
            },
            channel: {
                table: 'fact_channel_capacity',
                fields: [
                    'branch_company', 'grid_name', 'channel_code', 'channel_name',
                    'prod_period_type', 'product_name', 'capacity',
                    'stat_date', 'snapshot_time'
                ],
                required: [
                    'branch_company', 'grid_name', 'channel_name',
                    'prod_period_type', 'product_name', 'stat_date'
                ]
            },
            staff: {
                table: 'fact_staff_capacity',
                fields: [
                    'branch_company', 'grid_name', 'channel_code', 'channel_name',
                    'staff_no', 'prod_period_type', 'product_name', 'capacity',
                    'stat_date', 'snapshot_time'
                ],
                required: [
                    'branch_company', 'grid_name', 'channel_name',
                    'staff_no', 'prod_period_type', 'product_name', 'stat_date'
                ]
            }
        };

        var target = String(Params.target || '').trim().toLowerCase();
        var config = tableConfig[target];
        if (!config) {
            JsResult.result = createRes('1', 'target 参数错误，应为 region / channel / staff');
            return;
        }

        // ========== 2. 解析 rows ==========
        var rows = parseMaybeJson(Params.rows);
        if (Object.prototype.toString.call(rows) !== '[object Array]') {
            JsResult.result = createRes('1', 'rows 参数格式错误，应为数组');
            return;
        }
        if (!rows.length) {
            JsResult.result = createRes('1', 'rows 内容为空');
            return;
        }
        if (rows.length > MAX_ROWS) {
            JsResult.result = createRes('1', '单次导入不能超过 ' + MAX_ROWS + ' 条，当前 ' + rows.length + ' 条');
            return;
        }

        // ========== 3. 工具函数 ==========
        function isEmpty(v) {
            if (v === undefined || v === null) return true;
            return String(v).replace(/^\s+|\s+$/g, '') === '';
        }

        function trimStr(v) {
            return String(v === undefined || v === null ? '' : v).replace(/^\s+|\s+$/g, '');
        }

        function normalizeDate(v) {
            var s = trimStr(v);
            if (!s) return '';
            var m = s.match(/^(\d{4}-\d{2}-\d{2})/);
            return m ? m[1] : s;
        }

        function normalizeDateTime(v) {
            var s = trimStr(v);
            if (!s) return '';
            var m = s.match(/^(\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2})/);
            if (m) return m[1].replace('T', ' ');
            var d = s.match(/^(\d{4}-\d{2}-\d{2})$/);
            if (d) return d[1] + ' 00:00:00';
            return s;
        }

        function normalizeNumber(v) {
            if (isEmpty(v)) return '0';
            var n = Number(v);
            if (isNaN(n)) return null;
            if (n < 0) return null;   // 产能不允许为负
            return String(n);
        }

        // ========== 4. 第一阶段：逐行校验 + 标准化 ==========
        var validRecords = [];
        var failed = 0;
        var errors = [];

        for (var i = 0; i < rows.length; i++) {
            var row = rows[i] || {};
            var rowNo = i + 1;
            var record = {};
            var bad = false;

            for (var f = 0; f < config.fields.length; f++) {
                var field = config.fields[f];
                var val = row[field];

                if (field === 'stat_date') {
                    record[field] = normalizeDate(val);
                } else if (field === 'snapshot_time') {
                    record[field] = normalizeDateTime(val);
                } else if (field === 'capacity') {
                    var num = normalizeNumber(val);
                    if (num === null) {
                        failed++;
                        errors.push('第' + rowNo + '行 capacity 不是合法数字或为负数：' + val);
                        bad = true;
                        break;
                    }
                    record[field] = num;
                } else if (field === 'channel_code') {
                    record[field] = trimStr(val);
                } else {
                    record[field] = trimStr(val);
                }
            }
            if (bad) continue;

            var missing = [];
            for (var r = 0; r < config.required.length; r++) {
                var reqField = config.required[r];
                if (isEmpty(record[reqField])) missing.push(reqField);
            }
            if (missing.length) {
                failed++;
                errors.push('第' + rowNo + '行缺少必填字段：' + missing.join(', '));
                continue;
            }

            validRecords.push({ record: record, rowNo: rowNo });
        }

        if (!validRecords.length) {
            JsResult.result = createRes('0', '导入完成', {
                total: rows.length,
                success: 0,
                failed: failed,
                errors: errors
            });
            return;
        }

        // ========== 4.1 最小条数保护 ==========
        if (validRecords.length < MIN_ROWS) {
            JsResult.result = createRes('1',
                '有效数据仅 ' + validRecords.length + ' 条，低于最小阈值 ' + MIN_ROWS + ' 条，拒绝覆盖，防止误清表',
                { total: rows.length, failed: failed, errors: errors });
            return;
        }

        // ========== 5. TRUNCATE 主表 ==========
        // 说明：TRUNCATE 是 DDL，隐式提交，无法回滚。
        // 如果 abilitySql 不支持 TRUNCATE，改用 DELETE FROM table。
        try {
            CustomizeUtil.abilitySql('TRUNCATE TABLE ' + config.table, {});
        } catch (e) {
            JsResult.result = createRes('1', 'TRUNCATE 失败：' + (e.message || e));
            return;
        }

        // ========== 6. 分批 INSERT ==========
        var success = 0;

        for (var bs = 0; bs < validRecords.length; bs += BATCH_SIZE) {
            var batch = validRecords.slice(bs, bs + BATCH_SIZE);

            try {
                var insertFields = config.fields.slice();
                var valueGroups = [];
                var insertParams = {};
                for (var ii = 0; ii < batch.length; ii++) {
                    var iRec = batch[ii].record;
                    var placeholders = [];
                    for (var ifi = 0; ifi < insertFields.length; ifi++) {
                        var iField = insertFields[ifi];
                        if (iField === 'snapshot_time' && isEmpty(iRec[iField])) {
                            placeholders.push('NOW()');
                        } else {
                            var iParam = 'i' + ii + '_' + iField;
                            placeholders.push('#{' + iParam + '}');
                            insertParams[iParam] = iRec[iField];
                        }
                    }
                    valueGroups.push('(' + placeholders.join(', ') + ')');
                }
                var insertSql = 'INSERT INTO ' + config.table +
                    ' (' + insertFields.join(', ') + ') VALUES ' + valueGroups.join(', ');
                CustomizeUtil.abilitySql(insertSql, insertParams);
                success += batch.length;
            } catch (e) {
                // 整批失败则逐条重试，定位具体失败行
                for (var ir = 0; ir < batch.length; ir++) {
                    var irItem = batch[ir];
                    try {
                        var singleFields = config.fields.slice();
                        var singlePlaceholders = [];
                        var singleParams = {};
                        for (var sfi = 0; sfi < singleFields.length; sfi++) {
                            var sField = singleFields[sfi];
                            if (sField === 'snapshot_time' && isEmpty(irItem.record[sField])) {
                                singlePlaceholders.push('NOW()');
                            } else {
                                singlePlaceholders.push('#{' + sField + '}');
                                singleParams[sField] = irItem.record[sField];
                            }
                        }
                        var singleSql = 'INSERT INTO ' + config.table +
                            ' (' + singleFields.join(', ') + ') VALUES (' + singlePlaceholders.join(', ') + ')';
                        CustomizeUtil.abilitySql(singleSql, singleParams);
                        success++;
                    } catch (e2) {
                        failed++;
                        errors.push('第' + irItem.rowNo + '行插入失败：' + (e2.message || e2));
                    }
                }
            }
        }

        // ========== 7. 返回 ==========
        JsResult.result = createRes('0', '导入完成', {
            total: rows.length,
            success: success,
            failed: failed,
            errors: errors
        });
    }

    // 动态安全分发：根据funCode执行对应业务函数
    try {
        var runFunction = eval(Params.funCode);
        new runFunction();
    } catch (e) {
        JsResult.result = createRes('00500', '执行报错: ' + (e.message || e) + ' / 方法: ' + Params.funCode);
        return;
    }
}
init();