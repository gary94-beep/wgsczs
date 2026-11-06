export const dailyDate = data => data.dailyStatDate ?? data.statDate ?? ''
export function dailyLabel(data) {
  const date=dailyDate(data),hour=data.dailyStatHour
  return date ? `${date}${hour != null && hour !== '' ? ` ${String(hour).padStart(2,'0')}:00` : ''}` : '暂无日数据'
}
