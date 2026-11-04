// The highest/lowest within each class also contain the overall extremes.
// Use the gateway's summaries of all authorized records, never a paged detail list.
export function branchGridRanking(analysis) {
  const candidates = (analysis?.grids || []).flatMap(group => [group.best, ...(group.worst || [])])
    .filter(row => row && typeof row.completionRate === 'number' && Number.isFinite(row.completionRate))
  const namedOrder = (a,b) => String(a.name).localeCompare(String(b.name)) || String(a.branch).localeCompare(String(b.branch))
  const highest = candidates.slice().sort((a,b) => b.completionRate-a.completionRate || namedOrder(a,b))
  const lowest = candidates.slice().sort((a,b) => a.completionRate-b.completionRate || namedOrder(a,b))
  return {best:highest[0] || null,worst:lowest[0] || null}
}
