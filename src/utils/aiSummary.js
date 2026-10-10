import { compareCapacity } from './capacityMetrics.js'

// Explicit allowlist: never send employee/channel identities or raw records.
export function buildAiSummary({ scope, product, statDate, demo, period, threshold, metric, categories, showTargets = true }) {
  const progress = item => ({ production: item.production, target: showTargets ? item.target : null, gap: showTargets ? item.gap : null, completionRate: showTargets ? item.completionRate : null })
  return { scope, product: product?.productName, unit: product?.unit, statDate, demo, period, threshold,
    day: progress(metric.daily), month: progress(metric), weekBasis: metric.weekBasis || 'calendarWeek', weeklyAverage: metric.weeklyAverage, monthAverage: metric.monthAverage, previousAverage: metric.previousAverage,
    dayComparison: compareCapacity(metric.daily.production, metric.weeklyAverage), monthComparison: compareCapacity(metric.monthAverage, metric.previousAverage),
    alerts: categories.map(({ label, count }) => ({ category: label, count })) }
}
