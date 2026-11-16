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
  charity_causes: { causes: { slug: string } | null }[] | null
  charity_financials: { fiscal_year: number; total_expenses: number | null }[] | null
}

/** Vetted charities, shaped for the matcher. Anon can read these under RLS. */
export async function fetchVettedCharities(): Promise<MatchableCharity[]> {
  const { data, error } = await supabase
    .from("charities")
    .select(
      "id, name, description, location_city, location_region, " +
        "charity_causes ( causes ( slug ) ), " +
        "charity_financials ( fiscal_year, total_expenses )",
    )
    .eq("vetting_status", "vetted")
  if (error) throw new Error(error.message)

  return ((data ?? []) as unknown as CharityRow[]).map((c) => {
    const causeSlugs = (c.charity_causes ?? [])
      .map((cc) => cc.causes?.slug)
      .filter((s): s is CauseId => typeof s === "string" && uiCauseIds.has(s))

    // Most recent fiscal year's expenses stand in for the annual budget.
    const latest = (c.charity_financials ?? [])
      .slice()
      .sort((a, b) => b.fiscal_year - a.fiscal_year)[0]

    const place = [c.location_city, c.location_region].filter(Boolean).join(", ")

    return {
      id: c.id,
      name: c.name,
      description: c.description ?? "",
      causes: causeSlugs,
      place: place || (c.location_region ?? ""),
      region: c.location_region ?? undefined,
      annualBudgetUsd: latest?.total_expenses != null ? Number(latest.total_expenses) : undefined,
    } satisfies MatchableCharity
  })
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
