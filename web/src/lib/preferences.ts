import { useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"

import { causes, type CauseId } from "@/data/causes"
import {
  fetchCauses,
  loadCausePreferences,
  loadDonorPreferences,
  saveCausePreferences,
  saveDonorPreferences,
} from "@/lib/db"
import type { Preferences } from "@/lib/matching"

/**
 * The donor's quiz answers. Everyone gets them in this browser (so guests can
 * use For You); signed-in donors also get the parts the database stores
 * (causes, typical gift, frequency, minimum to programs).
 */
export type SavedPreferences = Preferences & {
  givingBudget: number | null
  frequency: string | null
  completedAt: string
}

const KEY = "clearcause.preferences.v1"
const causeIds = new Set<string>(causes.map((c) => c.id))

export function readLocalPreferences(): SavedPreferences | null {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as Partial<SavedPreferences>
    if (!p || !p.completedAt) return null
    return {
      causes: (p.causes ?? []).filter((c): c is CauseId => causeIds.has(c)),
      region: typeof p.region === "string" ? p.region : "",
      preferSmall: Boolean(p.preferSmall),
      directPctMin: Number.isFinite(p.directPctMin) ? Math.min(100, Math.max(0, Number(p.directPctMin))) : 0,
      givingBudget: typeof p.givingBudget === "number" ? p.givingBudget : null,
      frequency: typeof p.frequency === "string" ? p.frequency : null,
      completedAt: p.completedAt,
    }
  } catch {
    return null
  }
}

function writeLocal(p: SavedPreferences) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(p))
  } catch {
    // Private mode or blocked storage: the answers still apply to this visit.
  }
}

export function hasCompletedQuiz() {
  return readLocalPreferences() !== null
}

/** Save quiz answers locally, and to the account when signed in (best effort). */
export async function savePreferences(user: User | null, p: Omit<SavedPreferences, "completedAt">) {
  const saved: SavedPreferences = { ...p, completedAt: new Date().toISOString() }
  writeLocal(saved)
  if (user) await saveToAccount(user, saved)
  return saved
}

async function saveToAccount(user: User, p: SavedPreferences) {
  try {
    await saveCausePreferences(user.id, p.causes, await fetchCauses())
  } catch {
    // Saving to the account is best effort; the local copy still works.
  }
  try {
    await saveDonorPreferences(user.id, {
      giving_budget: p.givingBudget,
      frequency: p.frequency,
      location_scope: p.region ? "local" : "national",
      direct_pct_min: p.directPctMin > 0 ? p.directPctMin : null,
    })
  } catch {
    // ignore, as above
  }
}

/** Preferences as URL params, so a profile link can carry them. */
export function preferencesQuery(p: Preferences) {
  const q = new URLSearchParams()
  for (const c of p.causes) q.append("causes", c)
  if (p.region) q.set("region", p.region)
  if (p.preferSmall) q.set("size", "small")
  if (p.directPctMin > 0) q.set("direct", String(p.directPctMin))
  return q
}

const frequencyLabel: Record<string, string> = { one_time: "one time", monthly: "monthly", quarterly: "quarterly" }

/** Saved answers as label/value rows, for For You and the profile page. */
export function answerRows(
  p: SavedPreferences,
  labels: { cause: Record<string, string>; state: Record<string, string> },
): [string, string][] {
  return [
    ["Causes", p.causes.length ? p.causes.map((c) => labels.cause[c] ?? c).join(", ") : "Any"],
    ["Where", p.region ? `${labels.state[p.region] ?? p.region} first` : "Anywhere"],
    ["Size", p.preferSmall ? "Under $1M preferred" : "Any size"],
    ["To programs", p.directPctMin > 0 ? `At least ${p.directPctMin}%` : "No minimum"],
    [
      "Typical gift",
      p.givingBudget != null
        ? `$${Math.round(p.givingBudget).toLocaleString("en-US")}${p.frequency ? `, ${frequencyLabel[p.frequency] ?? p.frequency}` : ""}`
        : "Not set",
    ],
  ]
}

/**
 * The current donor's preferences: this browser's copy first; for a signed-in
 * donor on a new device, what their account has. A guest's answers are copied
 * to their account the first time they sign in.
 */
export function useSavedPreferences(user: User | null, authLoading: boolean) {
  const [state, setState] = useState<{ prefs: SavedPreferences | null; ready: boolean }>(() => ({
    prefs: readLocalPreferences(),
    ready: false,
  }))

  useEffect(() => {
    if (authLoading) return
    let active = true
    const local = readLocalPreferences()
    if (!user) {
      setState({ prefs: local, ready: true })
      return
    }
    Promise.all([loadCausePreferences(user.id), loadDonorPreferences(user.id)])
      .then(async ([savedCauses, donor]) => {
        if (!active) return
        const accountHasAnswers = savedCauses.length > 0 || donor !== null
        if (local && !accountHasAnswers) {
          await saveToAccount(user, local) // carry a guest's answers over
          if (active) setState({ prefs: local, ready: true })
          return
        }
        if (local || !accountHasAnswers) {
          setState({ prefs: local, ready: true })
          return
        }
        const fromAccount: SavedPreferences = {
          causes: savedCauses,
          region: "",
          preferSmall: false,
          directPctMin: donor?.direct_pct_min ?? 0,
          givingBudget: donor?.giving_budget ?? null,
          frequency: donor?.frequency ?? null,
          completedAt: new Date().toISOString(),
        }
        writeLocal(fromAccount)
        setState({ prefs: fromAccount, ready: true })
      })
      .catch(() => active && setState({ prefs: local, ready: true }))
    return () => {
      active = false
    }
  }, [user, authLoading])

  return state
}
