import { causes, type CauseId } from "../data/causes.ts"

export const smallBudgetUsd = 1_000_000

export interface Preferences {
  causes: CauseId[]
  region: string
  preferSmall: boolean
}

export interface MatchableCharity {
  id: string
  name: string
  description: string
  causes: readonly CauseId[]
  place: string
  region?: string
  annualBudgetUsd?: number
  href?: string
}

export function readPreferences(params: URLSearchParams, regions: readonly string[]): Preferences {
  const selected = new Set(params.getAll("causes").flatMap((value) => value.split(",")))
  const region = params.get("region") ?? ""
  return {
    causes: causes.filter(({ id }) => selected.has(id)).map(({ id }) => id),
    region: regions.includes(region) ? region : "",
    preferSmall: params.get("size") === "small",
  }
}

export function rankCharities(charities: readonly MatchableCharity[], preferences: Preferences) {
  const selectedCauses = new Set(preferences.causes)
  const hasCauses = selectedCauses.size > 0
  const possiblePoints = 4 * Number(hasCauses) + 2 * Number(Boolean(preferences.region))
    + Number(preferences.preferSmall)

  return charities.flatMap((charity) => {
    const matchedCauses = causes.filter(({ id }) => selectedCauses.has(id) && charity.causes.includes(id))
    if (hasCauses && matchedCauses.length === 0) return []

    const sameRegion = Boolean(preferences.region) && charity.region === preferences.region
    const smallBudget = preferences.preferSmall && charity.annualBudgetUsd !== undefined
      && charity.annualBudgetUsd >= 0 && charity.annualBudgetUsd < smallBudgetUsd
    const points = (hasCauses ? 4 * matchedCauses.length / selectedCauses.size : 0)
      + 2 * Number(sameRegion) + Number(smallBudget)

    return [{
      charity,
      points,
      score: possiblePoints ? Math.round(100 * points / possiblePoints) : null,
      reasons: [
        ...matchedCauses.map(({ label }) => label),
        ...(sameRegion ? [`Based in ${charity.region}`] : []),
        ...(smallBudget ? ["Annual budget under $1M"] : []),
      ],
    }]
  }).sort((a, b) => b.points - a.points || a.charity.name.localeCompare(b.charity.name)
    || a.charity.id.localeCompare(b.charity.id))
}
