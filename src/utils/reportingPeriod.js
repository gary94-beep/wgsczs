function parseDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '')
  if (!match) throw new Error('统计截止日须使用 YYYY-MM-DD 格式')

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const daysInMonth = new Date(year, month, 0).getDate()
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth) {
    throw new Error('统计截止日不是有效日期')
  }
  return { year, month, day }
}

function formatDate(year, month, day) {
  return [year, month, day].map((value, index) => String(value).padStart(index ? 2 : 4, '0')).join('-')
}

/**
 * 上月同期按数据截止日对齐；若上月无对应日期，则截止到上月最后一天。
 */
export function buildMonthToDatePeriods(statDate) {
  const current = parseDate(statDate)
  const previousMonth = current.month === 1 ? 12 : current.month - 1
  const previousYear = current.month === 1 ? current.year - 1 : current.year
  const previousDay = Math.min(current.day, new Date(previousYear, previousMonth, 0).getDate())

  return {
    current: {
      startDate: formatDate(current.year, current.month, 1),
      endDate: formatDate(current.year, current.month, current.day)
    },
    previous: {
      startDate: formatDate(previousYear, previousMonth, 1),
      endDate: formatDate(previousYear, previousMonth, previousDay)
    }
  }
}
