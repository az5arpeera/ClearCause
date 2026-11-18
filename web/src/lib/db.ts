import { causes as uiCauses, type CauseId } from "@/data/causes"
import type { MatchableCharity } from "@/lib/matching"
import { supabase } from "@/lib/supabase"

// Only causes the web app knows about are usable in matching; ignore any others.
const uiCauseIds = new Set<string>(uiCauses.map((c) => c.id))

export type CauseRow = { id: number; slug: string }

/** All causes with their numeric ids, for mapping slugs → donor_cause_preferences.cause_id. */
export async function fetchCauses(): Promise<CauseRow[]> {
  const { data, error } = await supabase.from("causes").select("id, slug")
  if (error) throw new Error(error.message)
  return (data ?? []) as CauseRow[]
}

type CharityRow = {
  id: string
  name: string
  description: string | null
  location_city: string | null
  location_region: string | null
  transparency_score: number | null
  is_partner: boolean | null
  charity_causes: { causes: { slug: string } | null }[] | null
  charity_financials:
    | { fiscal_year: number; total_expenses: number | null; program_expense_ratio: number | null }[]
    | null
}

/** One fiscal year of a charity's figures, as the scraper or an admin recorded them. */
export type CharityFinancials = {
  fiscalYear: number
  totalRevenue: number | null
  totalExpenses: number | null
  programExpenses: number | null
  adminExpenses: number | null
  fundraisingExpenses: number | null
  /** 0..1 share of spending that reached programs. */
  programRatio: number | null
  /** Where the figures came from (a statement URL, with #page=N when known). */
  sourceUrl: string | null
  scrapedAt: string | null
}

/** Everything a charity profile shows: matcher fields plus the full record. */
export type CharityDetail = MatchableCharity & {
  city: string | null
  websiteUrl: string | null
  /** Newest year first. */
  financials: CharityFinancials[]
}

type Num = number | string | null

type DetailRow = Omit<CharityRow, "charity_financials"> & {
  website_url: string | null
  charity_financials:
    | {
        fiscal_year: number
        total_revenue: Num
        total_expenses: Num
        program_expenses: Num
        admin_expenses: Num
        fundraising_expenses: Num
        program_expense_ratio: Num
        source_url: string | null
        scraped_at: string | null
      }[]
    | null
}

const detailSelect =
  "id, name, description, website_url, location_city, location_region, transparency_score, is_partner, " +
  "charity_causes ( causes ( slug ) ), " +
  "charity_financials ( fiscal_year, total_revenue, total_expenses, program_expenses, admin_expenses, " +
  "fundraising_expenses, program_expense_ratio, source_url, scraped_at )"

const num = (v: Num | undefined) => (v == null ? null : Number(v))

function toDetail(c: DetailRow): CharityDetail {
  const causeSlugs = (c.charity_causes ?? [])
    .map((cc) => cc.causes?.slug)
    .filter((s): s is CauseId => typeof s === "string" && uiCauseIds.has(s))

  const financials: CharityFinancials[] = (c.charity_financials ?? [])
    .map((f) => {
      const total = num(f.total_expenses)
      const program = num(f.program_expenses)
      const ratio = num(f.program_expense_ratio) ?? (total && program != null ? program / total : null)
      return {
        fiscalYear: f.fiscal_year,
        totalRevenue: num(f.total_revenue),
        totalExpenses: total,
        programExpenses: program,
        adminExpenses: num(f.admin_expenses),
        fundraisingExpenses: num(f.fundraising_expenses),
        programRatio: ratio,
        sourceUrl: f.source_url,
        scrapedAt: f.scraped_at,
      }
    })
    .sort((a, b) => b.fiscalYear - a.fiscalYear)

  // The most recent fiscal year stands in for the annual budget.
  const latest = financials[0]
  const place = [c.location_city, c.location_region].filter(Boolean).join(", ")

  return {
    id: c.id,
    name: c.name,
    description: c.description ?? "",
    causes: causeSlugs,
    place: place || (c.location_region ?? ""),
    region: c.location_region ?? undefined,
    annualBudgetUsd: latest?.totalExpenses ?? undefined,
    directPct: latest?.programRatio != null ? Math.round(latest.programRatio * 100) : undefined,
    transparencyScore: c.transparency_score != null ? Number(c.transparency_score) : undefined,
    isPartner: c.is_partner ?? false,
    href: `/charity/${c.id}`,
    city: c.location_city,
    websiteUrl: c.website_url,
    financials,
  }
}

// One request per page load, shared by every component that needs the list.
let vettedCache: Promise<CharityDetail[]> | null = null

/** Vetted charities with their full records. Anon can read these under RLS. */
export function fetchVettedCharityDetails(): Promise<CharityDetail[]> {
  if (!vettedCache) {
    vettedCache = (async () => {
      const { data, error } = await supabase.from("charities").select(detailSelect).eq("vetting_status", "vetted")
      if (error) throw new Error(error.message)
      return ((data ?? []) as unknown as DetailRow[]).map(toDetail)
    })()
    // Let a later call retry if this one failed.
    vettedCache.catch(() => {
      vettedCache = null
    })
  }
  return vettedCache
}

/** Vetted charities, shaped for the matcher. */
export async function fetchVettedCharities(): Promise<MatchableCharity[]> {
  return fetchVettedCharityDetails()
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** A single vetted charity by id, or null if it doesn't exist or isn't vetted yet. */
export async function fetchCharityDetail(id: string): Promise<CharityDetail | null> {
  // A mistyped link is "not found", not a database error.
  if (!uuidPattern.test(id)) return null
  const { data, error } = await supabase
    .from("charities")
    .select(detailSelect)
    .eq("id", id)
    .eq("vetting_status", "vetted")
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data ? toDetail(data as unknown as DetailRow) : null
}

/** The signed-in donor's saved cause selections (slugs the app recognizes). */
export async function loadCausePreferences(profileId: string): Promise<CauseId[]> {
  const { data, error } = await supabase
    .from("donor_cause_preferences")
    .select("causes ( slug )")
    .eq("profile_id", profileId)
  if (error) throw new Error(error.message)
  return ((data ?? []) as unknown as { causes: { slug: string } | null }[])
    .map((r) => r.causes?.slug)
    .filter((s): s is CauseId => typeof s === "string" && uiCauseIds.has(s))
}

/**
 * Replace the donor's saved cause selections. The quiz has no per-cause
 * weighting yet, so every selected cause is stored with weight 1.
 */
export async function saveCausePreferences(
  profileId: string,
  selected: CauseId[],
  causeRows: CauseRow[],
): Promise<void> {
  const slugToId = new Map(causeRows.map((c) => [c.slug, c.id]))

  const { error: deleteError } = await supabase
    .from("donor_cause_preferences")
    .delete()
    .eq("profile_id", profileId)
  if (deleteError) throw new Error(deleteError.message)

  const rows = selected
    .map((slug) => slugToId.get(slug))
    .filter((id): id is number => typeof id === "number")
    .map((cause_id) => ({ profile_id: profileId, cause_id, weight: 1 }))

  if (rows.length === 0) return
  const { error: insertError } = await supabase.from("donor_cause_preferences").insert(rows)
  if (insertError) throw new Error(insertError.message)
}

/** The donor's profile preferences (one row per donor in donor_preferences). */
export type DonorPreferences = {
  giving_budget: number | null
  frequency: string | null
  location_scope: string | null
  direct_pct_min: number | null
}

/** Load the signed-in donor's saved profile preferences, or null if none yet. */
export async function loadDonorPreferences(profileId: string): Promise<DonorPreferences | null> {
  const { data, error } = await supabase
    .from("donor_preferences")
    .select("giving_budget, frequency, location_scope, direct_pct_min")
    .eq("profile_id", profileId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null

  const row = data as {
    giving_budget: number | string | null
    frequency: string | null
    location_scope: string | null
    direct_pct_min: number | null
  }
  return {
    giving_budget: row.giving_budget != null ? Number(row.giving_budget) : null,
    frequency: row.frequency ?? null,
    location_scope: row.location_scope ?? null,
    direct_pct_min: row.direct_pct_min != null ? Number(row.direct_pct_min) : null,
  }
}

/** Create or replace the donor's profile preferences (upsert on profile_id). */
export async function saveDonorPreferences(
  profileId: string,
  prefs: DonorPreferences,
): Promise<void> {
  const { error } = await supabase.from("donor_preferences").upsert(
    {
      profile_id: profileId,
      giving_budget: prefs.giving_budget,
      frequency: prefs.frequency,
      location_scope: prefs.location_scope,
      direct_pct_min: prefs.direct_pct_min,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "profile_id" },
  )
  if (error) throw new Error(error.message)
}
