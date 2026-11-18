import { causes, type CauseId } from "../data/causes.ts"

export const smallBudgetUsd = 1_000_000

// Composite-score weights from docs/matching-algorithm.md (§4). Sum = 1.0.
export const weights = {
  cause: 0.6,
  transparency: 0.2,
  efficiency: 0.15,
  partner: 0.05,
} as const

// Neutral fallback for charities we have no financials/transparency for yet, so
// un-scraped charities aren't buried (docs/matching-algorithm.md §6).
const neutralNorm = 0.5

export type LocationScope = "local" | "national" | "global" | ""

export interface Preferences {
  causes: CauseId[]
  region: string
  preferSmall: boolean
  /** Minimum % of spending that must reach programs; 0 means no minimum. */
  directPctMin: number
  /** How wide the donor wants to give; "local" filters to their region. */
  locationScope: LocationScope
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
  /** 0–100 transparency score. */
  transparencyScore?: number
  /** Vetted partner charity. */
  isPartner?: boolean
  href?: string
}

export function readScope(value: string | null): LocationScope {
  return value === "local" || value === "national" || value === "global" ? value : ""
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
    locationScope: readScope(params.get("scope")),
  }
}

/**
 * Content-based matcher from docs/matching-algorithm.md: a two-stage
 * filter → score → rank pipeline.
 *
 * Stage 1 — hard filters (eligibility): location scope and a minimum
 * program-efficiency floor.
 * Stage 2 — composite relevance (0..1): weighted cosine of the donor's causes
 * against the charity's, plus transparency, efficiency, and partner terms.
 *
 * `score` is the composite as a percentage, shown only once the donor has
 * picked causes (their primary signal); with no causes the list still ranks by
 * the remaining quality terms. `region` and `preferSmall` act as tie-breakers.
 */
export function rankCharities(charities: readonly MatchableCharity[], preferences: Preferences) {
  const selectedCauses = new Set(preferences.causes)
  const hasCauses = selectedCauses.size > 0
  const donorNorm = Math.sqrt(selectedCauses.size) // ‖d‖ with unit cause weights
  const wantsDirect = preferences.directPctMin > 0
  const localOnly = preferences.locationScope === "local" && Boolean(preferences.region)

  return charities.flatMap((charity) => {
    // ---- Stage 1: hard filters ------------------------------------------
    if (localOnly && charity.region !== preferences.region) return []
    if (wantsDirect && charity.directPct !== undefined && charity.directPct < preferences.directPctMin) return []

    const matchedCauses = causes.filter(({ id }) => selectedCauses.has(id) && charity.causes.includes(id))
    // When the donor expressed causes, hide charities that share none of them.
    if (hasCauses && matchedCauses.length === 0) return []

    // ---- Stage 2: composite relevance (0..1) ----------------------------
    const charityNorm = Math.sqrt(charity.causes.length) // ‖c‖
    const causeAlignment = hasCauses && charityNorm > 0
      ? matchedCauses.length / (donorNorm * charityNorm) // (d·c)/(‖d‖·‖c‖)
      : 0
    const transparencyNorm = charity.transparencyScore != null ? charity.transparencyScore / 100 : neutralNorm
    const efficiencyNorm = charity.directPct != null ? charity.directPct / 100 : neutralNorm
    const partnerFlag = charity.isPartner ? 1 : 0

    const relevance = weights.cause * causeAlignment
      + weights.transparency * transparencyNorm
      + weights.efficiency * efficiencyNorm
      + weights.partner * partnerFlag

    const sameRegion = Boolean(preferences.region) && charity.region === preferences.region
    const smallBudget = preferences.preferSmall && charity.annualBudgetUsd !== undefined
      && charity.annualBudgetUsd >= 0 && charity.annualBudgetUsd < smallBudgetUsd

    return [{
      charity,
      relevance,
      sameRegion,
      smallBudget,
      transparencyNorm,
      partnerFlag,
      score: hasCauses ? Math.round(100 * relevance) : null,
      reasons: [
        ...matchedCauses.map(({ label }) => label),
        ...(charity.transparencyScore != null && charity.transparencyScore >= 85 ? ["High transparency"] : []),
        ...(charity.directPct != null && charity.directPct >= 80 ? [`${charity.directPct}% reaches the cause`] : []),
        ...(charity.isPartner ? ["Vetted partner"] : []),
        ...(sameRegion ? [`Based in ${charity.region}`] : []),
      ],
    }]
  }).sort((a, b) =>
    b.relevance - a.relevance
    || Number(b.sameRegion) - Number(a.sameRegion)
    || Number(b.smallBudget) - Number(a.smallBudget)
    || b.transparencyNorm - a.transparencyNorm
    || b.partnerFlag - a.partnerFlag
    || a.charity.name.localeCompare(b.charity.name)
    || a.charity.id.localeCompare(b.charity.id))
}
