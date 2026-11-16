import { causes, type CauseId } from "../data/causes.ts"

export const smallBudgetUsd = 1_000_000

export interface Preferences {
  causes: CauseId[]
  region: string
  preferSmall: boolean
  /** Minimum % of spending that must reach programs; 0 means no minimum. */
  directPctMin: number
}

export interface MatchableCharity {
  id: string
  name: string
  description: string
  causes: readonly CauseId[]
  place: string
  region?: string
  annualBudgetUsd?: number
  /** % of spending that reaches programs (from program_expense_ratio). */
  directPct?: number
  href?: string
}

export function readPreferences(params: URLSearchParams, regions: readonly string[]): Preferences {
  const selected = new Set(params.getAll("causes").flatMap((value) => value.split(",")))
  const region = params.get("region") ?? ""
  const direct = Number(params.get("direct"))
  return {
    causes: causes.filter(({ id }) => selected.has(id)).map(({ id }) => id),
    region: regions.includes(region) ? region : "",
    preferSmall: params.get("size") === "small",
    directPctMin: Number.isFinite(direct) ? Math.min(100, Math.max(0, Math.round(direct))) : 0,
  }
}

export function rankCharities(charities: readonly MatchableCharity[], preferences: Preferences) {
  const selectedCauses = new Set(preferences.causes)
  const hasCauses = selectedCauses.size > 0
  const wantsDirect = preferences.directPctMin > 0
  const possiblePoints = 4 * Number(hasCauses) + 2 * Number(Boolean(preferences.region))
    + Number(preferences.preferSmall) + Number(wantsDirect)

  return charities.flatMap((charity) => {
    const matchedCauses = causes.filter(({ id }) => selectedCauses.has(id) && charity.causes.includes(id))
    if (hasCauses && matchedCauses.length === 0) return []

    const sameRegion = Boolean(preferences.region) && charity.region === preferences.region
    const smallBudget = preferences.preferSmall && charity.annualBudgetUsd !== undefined
      && charity.annualBudgetUsd >= 0 && charity.annualBudgetUsd < smallBudgetUsd
    const meetsDirect = wantsDirect && charity.directPct !== undefined
      && charity.directPct >= preferences.directPctMin
    const points = (hasCauses ? 4 * matchedCauses.length / selectedCauses.size : 0)
      + 2 * Number(sameRegion) + Number(smallBudget) + Number(meetsDirect)

    return [{
      charity,
      points,
      score: possiblePoints ? Math.round(100 * points / possiblePoints) : null,
      reasons: [
        ...matchedCauses.map(({ label }) => label),
        ...(sameRegion ? [`Based in ${charity.region}`] : []),
        ...(smallBudget ? ["Annual budget under $1M"] : []),
        ...(meetsDirect ? [`${charity.directPct}% reaches the cause`] : []),
      ],
    }]
  }).sort((a, b) => b.points - a.points || a.charity.name.localeCompare(b.charity.name)
    || a.charity.id.localeCompare(b.charity.id))
}
