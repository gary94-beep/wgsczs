export function monthlyDailyTarget(row, statDate, kind = 'base') {
  const month = String(row.targetMonth ?? row.target_month ?? '').replace('/', '-')
  if (month && month !== String(statDate).slice(0, 7)) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(statDate || '')) return null
  const value = targetValue(row, 'month', kind)
  const days = new Date(Date.UTC(Number(statDate.slice(0, 4)), Number(statDate.slice(5, 7)), 0)).getUTCDate()
  return value === null ? null : value / days
}

export function targetValue(row, period, kind = 'base') {
  const prefix = period === 'day' ? 'day' : 'month'
  const names = { min: 'Min', base: 'Base', challenge: 'Challenge' }
  const keys = [`${prefix}${names[kind]}Target`, `${prefix}_${kind}_target`]
  if (kind === 'base') keys.push(period === 'day' ? 'dailyTarget' : 'target')
  const key = keys.find(name => Object.prototype.hasOwnProperty.call(row, name))
  const value = key ? row[key] : null
  if (value === null || value === undefined || String(value).trim() === '') return null
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? number : null
}

export function targetProgress(production, baseTarget, challengeTarget, minTarget = null) {
  const make = target => ({ target, hasTarget: target !== null,
    gap: target !== null && production !== null ? Math.max(0, target - production) : null,
    completionRate: target > 0 && production !== null ? Math.round(production / target * 1000) / 10 : null })
  const invalidChallenge = baseTarget !== null && challengeTarget !== null && challengeTarget < baseTarget
  const base = make(baseTarget), challenge = make(invalidChallenge ? null : challengeTarget)
  const invalidMin = minTarget !== null && ((baseTarget !== null && minTarget > baseTarget) || (challengeTarget !== null && minTarget > challengeTarget))
  const minimum = make(invalidMin ? null : minTarget)
  const scale = challenge.target > 0 ? challenge.target : base.target > 0 ? base.target : minimum.target > 0 ? minimum.target : null
  return { production, ...base, baseTarget, baseGap: base.gap, baseCompletionRate: base.completionRate,
    minTarget: minimum.target, minGap: minimum.gap, minCompletionRate: minimum.completionRate, hasMinTarget: minimum.hasTarget, invalidMin,
    challengeTarget: challenge.target, challengeGap: challenge.gap, challengeCompletionRate: challenge.completionRate,
    hasChallengeTarget: challenge.hasTarget, invalidChallenge,
    progressPercent: scale && production !== null ? Math.min(100, Math.max(0, production / scale * 100)) : null,
    basePosition: scale && baseTarget !== null ? Math.min(100, Math.max(0, baseTarget / scale * 100)) : null,
    minPosition: scale && minimum.target !== null ? Math.min(100, Math.max(0, minimum.target / scale * 100)) : null }
}
