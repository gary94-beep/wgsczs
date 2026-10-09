// ========== 网格生产助手 - 通用接口网关 ==========
function init() {
    /**
     * 构造接口统一返回JSON字符串
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
     * 循环最多3次尝试解析JSON字符串
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
     * 手机号标准化清洗
     */
    function normalizeMobile(value) {
        var text = String(value || '').replace(/^\s+|\s+$/g, '').replace(/^['"]+|['"]+$/g, '').replace(/\s/g, '');
        var match = text.match(/1\d{10}/);
        return match ? match[0] : text;
    }

    /**
     * 解析redis返回结果
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
     */
    function getMobileFromToken(loginToken) {
        var raw = CustomizeUtil.getMobile(loginToken);
        return normalizeMobile(findValue(raw, ['mobile', 'phone', 'userphone', 'userPhone', 'mobileno']));
    }

    // 白名单：登录前必须免 token 的接口
    var authWhiteList = [
        'wgsc_fetchPermission',
        'wgsc_getMobileByToken',
        'wgsc_test'
    ];

    // 鉴权拦截器
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
       通用业务方法区
       ================================== */

    /**
     * 登录前权限查询
     */
    function wgsc_fetchPermission() {
        var phone = String(Params.phone || '').trim();
        if (!phone) {
            JsResult.result = createRes('1', '手机号不能为空');
            return;
        }
        if (!/^1\d{10}$/.test(phone)) {
            JsResult.result = createRes('1', '手机号格式错误，收到: ' + phone);
            return;
        }
        var sql = "SELECT name, phone, role FROM app_open_api_c007_xysct_permission_1 WHERE phone = #{phone}";
        var res = JSON.parse(CustomizeUtil.abilitySql(sql, { phone: phone }));
        if (!res.data || !res.data.results || res.data.results.length === 0) {
            JsResult.result = createRes('0', '该手机号暂无使用权限', null);
            return;
        }
        var permission = res.data.results[0];
        JsResult.result = createRes('0', '成功', {
            name: permission.name,
            phone: permission.phone,
            role: permission.role
        });
    }

    /**
     * 通过一键登录 token 换取完整手机号
     */
    function wgsc_getMobileByToken() {
        var loginToken = String(Params.token || '').trim();
        if (!loginToken) {
            JsResult.result = createRes('1', '一键登录token不能为空');
            return;
        }
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
     * 测试接口
     */
    function wgsc_test() {
    }

    // 动态安全分发
    try {
        var runFunction = eval(Params.funCode);
        new runFunction();
    } catch (e) {
        JsResult.result = createRes('00500',
            '执行报错: ' + (e.message || e) +
            ' | 方法: ' + Params.funCode
        );
        return;
    }
}
init();