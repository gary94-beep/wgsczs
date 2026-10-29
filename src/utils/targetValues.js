export function targetValue(row, period, kind = 'base') {
  const prefix = period === 'day' ? 'day' : 'month'
  const keys = [`${prefix}${kind === 'base' ? 'Base' : 'Challenge'}Target`, `${prefix}_${kind}_target`]
  if (kind === 'base') keys.push(period === 'day' ? 'dailyTarget' : 'target')
  const key = keys.find(name => Object.prototype.hasOwnProperty.call(row, name))
  const value = key ? row[key] : null
  if (value === null || value === undefined || String(value).trim() === '') return null
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? number : null
}

export function targetProgress(production, baseTarget, challengeTarget) {
  const make = target => ({ target, hasTarget: target !== null,
    gap: target !== null && production !== null ? Math.max(0, target - production) : null,
    completionRate: target > 0 && production !== null ? Math.round(production / target * 1000) / 10 : null })
  const invalidChallenge = baseTarget !== null && challengeTarget !== null && challengeTarget < baseTarget
  const base = make(baseTarget), challenge = make(invalidChallenge ? null : challengeTarget)
  const scale = challenge.target > 0 ? challenge.target : base.target > 0 ? base.target : null
  return { production, ...base, baseTarget, baseGap: base.gap, baseCompletionRate: base.completionRate,
    challengeTarget: challenge.target, challengeGap: challenge.gap, challengeCompletionRate: challenge.completionRate,
    hasChallengeTarget: challenge.hasTarget, invalidChallenge,
    progressPercent: scale && production !== null ? Math.min(100, Math.max(0, production / scale * 100)) : null,
    basePosition: scale && baseTarget !== null ? Math.min(100, Math.max(0, baseTarget / scale * 100)) : null }
}
