// last_mon already represents the comparable prior-month cumulative total.
export function compareSearchTotals(metric) {
  if (![metric.month,metric.previous].every(value=>typeof value==='number'&&Number.isFinite(value))) return {difference:null,rate:null}
  const difference=metric.month-metric.previous
  return {difference,rate:metric.previous===0?null:difference/metric.previous*100}
}
