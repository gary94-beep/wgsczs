"""Embed the ES5 SQL gateway into the imported project (no platform imports needed)."""
from pathlib import Path

root = Path(__file__).resolve().parents[1]
source = root / 'server/baseline/sczs_biz_api.js.txt'
text = source.read_text(encoding='utf-8')

def remove_function(name):
    global text
    start = text.index('  function ' + name + '(')
    # Functions in the imported gateway end at a two-space-indented brace.
    end = text.index('\n  }', start) + len('\n  }')
    text = text[:start] + text[end:]

for name in ('dashboard', 'populationTotals', 'changeAlerts', 'readTable'):
    remove_function(name)
text = text.replace('  var handlers = {',
    (root / 'server/sql-capacity-gateway.es5.txt').read_text(encoding='utf-8') +
    '\n  var handlers = {\n'
    '    wgsc_fetchSession: function () { return { permission: user }; },\n'
    '    wgsc_fetchChannelOptions: channelOptions,')
text = text.replace('    var result = handlers[Params.funCode]();', '    var result = resultPage(handlers[Params.funCode]());')
start = text.index('      var list = Params.period === "day" ? data.dailyRows : data.rows;', text.index('  function buildAiSummary('))
end = text.index('\n    }\n    return summary;', start)
text = text[:start] + '''      var alertCounts = aiAlertCounts(data);
      for (j = 0; j < alertCounts.length; j++) {
        var categoryIndex = ["直销队伍", "三星+渠道", "末梢渠道"].indexOf(alertCounts[j].channelType);
        if (categoryIndex >= 0) summary.alerts[categoryIndex].count = Number(alertCounts[j].total);
      }''' + text[end:]
(root / 'sczs_biz_api.js').write_text(text, encoding='utf-8')
print('Embedded SQL gateway')
