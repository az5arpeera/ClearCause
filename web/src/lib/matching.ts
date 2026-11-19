import { causes, type CauseId } from "../data/causes.ts"
import { stateName } from "../data/us-states.ts"

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

// Soft ordering nudges: a chosen region and "prefer small" lift matching
// charities in the ranking without hiding others or changing the shown score.
// Sized so they can overcome a small relevance gap but not a decisive one.
const regionNudge = 0.08
const smallBudgetNudge = 0.04

export interface Preferences {
  causes: CauseId[]
  /** A chosen state restricts results to it; "" means anywhere. */
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
  /** 0–100 transparency score. */
  transparencyScore?: number
  /** Vetted partner charity. */
  isPartner?: boolean
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

/**
 * Content-based matcher from docs/matching-algorithm.md: a two-stage
 * filter → score → rank pipeline.
 *
 * Stage 1 — hard filter (eligibility): a minimum program-efficiency floor.
 * Stage 2 — composite relevance (0..1): weighted cosine of the donor's causes
 * against the charity's, plus transparency, efficiency, and partner terms.
 *
 * `score` is the composite as a percentage, shown only once the donor has
 * picked causes (their primary signal); with no causes the list still ranks by
 * the remaining quality terms. A chosen region and `preferSmall` are soft
 * ordering nudges — they lift matching charities without hiding anyone or
 * changing the shown score.
 */
export function rankCharities(charities: readonly MatchableCharity[], preferences: Preferences) {
  const selectedCauses = new Set(preferences.causes)
  const hasCauses = selectedCauses.size > 0
  const donorNorm = Math.sqrt(selectedCauses.size) // ‖d‖ with unit cause weights
  const wantsDirect = preferences.directPctMin > 0

  return charities.flatMap((charity) => {
    // ---- Stage 1: hard filter (eligibility) -----------------------------
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

    // Ordering key = displayed relevance plus the soft nudges.
    const ranking = relevance + (sameRegion ? regionNudge : 0) + (smallBudget ? smallBudgetNudge : 0)

    return [{
      charity,
      ranking,
      relevance,
      transparencyNorm,
      partnerFlag,
      score: hasCauses ? Math.round(100 * relevance) : null,
      reasons: [
        ...matchedCauses.map(({ label }) => label),
        ...(charity.transparencyScore != null && charity.transparencyScore >= 85 ? ["High transparency"] : []),
        ...(charity.directPct != null && charity.directPct >= 80 ? [`${charity.directPct}% reaches the cause`] : []),
        ...(charity.isPartner ? ["Vetted partner"] : []),
        ...(sameRegion ? [`Based in ${stateName[charity.region!] ?? charity.region}`] : []),
      ],
    }]
  }).sort((a, b) =>
    b.ranking - a.ranking
    || b.relevance - a.relevance
    || b.transparencyNorm - a.transparencyNorm
    || b.partnerFlag - a.partnerFlag
    || a.charity.name.localeCompare(b.charity.name)
    || a.charity.id.localeCompare(b.charity.id))
}

// A soft penalty for charities below the donor's minimum share to programs:
// they drop in the order instead of disappearing.
const belowDirectPenalty = 0.1

/**
 * For You suggestions: the same composite score as `rankCharities`, but
 * nothing is filtered out. Every charity is ranked; ones sharing a chosen cause
 * come first (`fits`), the rest follow as things worth a look (`more`). A
 * minimum share to programs, a region and "prefer small" all become nudges.
 */
export function suggestCharities<T extends MatchableCharity>(charities: readonly T[], preferences: Preferences) {
  const selectedCauses = new Set(preferences.causes)
  const hasCauses = selectedCauses.size > 0
  const donorNorm = Math.sqrt(selectedCauses.size)

  const ranked = charities.map((charity) => {
    const matchedCauses = causes.filter(({ id }) => selectedCauses.has(id) && charity.causes.includes(id))
    const charityNorm = Math.sqrt(charity.causes.length)
    const causeAlignment = hasCauses && charityNorm > 0 ? matchedCauses.length / (donorNorm * charityNorm) : 0
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
    const belowDirect = preferences.directPctMin > 0 && charity.directPct !== undefined
      && charity.directPct < preferences.directPctMin
    const ranking = relevance + (sameRegion ? regionNudge : 0) + (smallBudget ? smallBudgetNudge : 0)
      - (belowDirect ? belowDirectPenalty : 0)

    return {
      charity,
      ranking,
      relevance,
      sharesCause: matchedCauses.length > 0,
      score: hasCauses ? Math.round(100 * relevance) : null,
      reasons: [
        ...matchedCauses.map(({ label }) => label),
        ...(sameRegion ? [`Based in ${stateName[charity.region!] ?? charity.region}`] : []),
        ...(smallBudget ? ["Small organization"] : []),
        ...(charity.transparencyScore != null && charity.transparencyScore >= 85 ? ["High transparency"] : []),
        ...(charity.directPct != null && charity.directPct >= 80 ? [`${charity.directPct}% reaches the cause`] : []),
        ...(charity.isPartner ? ["Vetted partner"] : []),
      ],
      cautions: belowDirect ? [`Below your ${preferences.directPctMin}% minimum to programs`] : [],
    }
  }).sort((a, b) =>
    Number(b.sharesCause) - Number(a.sharesCause)
    || b.ranking - a.ranking
    || a.charity.name.localeCompare(b.charity.name))

  return {
    fits: hasCauses ? ranked.filter((r) => r.sharesCause) : ranked,
    more: hasCauses ? ranked.filter((r) => !r.sharesCause) : [],
  }
}
