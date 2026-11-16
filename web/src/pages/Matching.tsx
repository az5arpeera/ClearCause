import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react"
import { ArrowRight } from "lucide-react"

import { AuthControl } from "@/components/AuthControl"
import { Logo } from "@/components/Logo"
import { causes, type CauseId } from "@/data/causes"
import { useAuth } from "@/lib/auth"
import {
  fetchCauses,
  fetchVettedCharities,
  loadCausePreferences,
  saveCausePreferences,
  type CauseRow,
} from "@/lib/db"
import { rankCharities, readPreferences, type MatchableCharity, type Preferences } from "@/lib/matching"

const primaryAction = "inline-flex min-h-11 items-center gap-2 rounded-sm bg-forest px-5 text-sm font-semibold text-paper no-underline hover:bg-forest-deep"
const sectionTitle = "text-lg font-bold tracking-tight"

function MatchingLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-svh bg-paper text-ink">
      <header className="sticky top-0 z-40 bg-forest-deep text-paper">
        <div className="mx-auto flex h-16 max-w-none items-center px-4 sm:px-6 lg:px-10">
          <Logo />
          <AuthControl className="ml-auto" />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
        <h1 className="border-t-2 border-forest pt-5 text-3xl leading-tight font-bold tracking-tight sm:text-4xl">{title}</h1>
        {children}
      </main>
    </div>
  )
}

function PreferenceQuiz({
  preferences,
  regions,
  signedIn,
  onSubmit,
}: {
  preferences: Preferences
  regions: readonly string[]
  signedIn: boolean
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
}) {
  return (
    <MatchingLayout title="Find charities that fit your giving">
      <p className="mt-3 font-serif text-lg text-ink-2">
        Answer any of these questions to rank the charities, or skip them to browse.
        {signedIn
          ? " Your answers are saved to your account."
          : " Sign in to save your answers for next time."}
      </p>
      <form onSubmit={onSubmit} className="mt-8 space-y-7">
        <fieldset>
          <legend className={sectionTitle}>What causes matter to you?</legend>
          <p className="mt-1 text-sm text-ink-2">Choose as many as you like.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {causes.map(({ id, label }) => (
              <label key={id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-sm border border-input px-3 text-sm font-medium has-checked:border-forest has-checked:bg-forest-soft">
                <input type="checkbox" name="causes" value={id} defaultChecked={preferences.causes.includes(id)} className="size-4 accent-forest" />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="border-t border-rule pt-6">
          <label htmlFor="giving-region" className={sectionTitle}>Where would you like to give?</label>
          <p id="giving-region-hint" className="mt-1 text-sm text-ink-2">Options reflect where the listed charities are based.</p>
          <select id="giving-region" name="region" defaultValue={preferences.region} aria-describedby="giving-region-hint" className="mt-3 block min-h-11 w-full rounded-sm border border-input bg-paper px-3 text-sm sm:max-w-xs">
            <option value="">Any state</option>
            {regions.map((region) => <option key={region}>{region}</option>)}
          </select>
        </div>
        <fieldset className="border-t border-rule pt-6">
          <legend className="sr-only">Charity size</legend>
          <label className="flex w-fit cursor-pointer items-center gap-3 py-1 text-sm font-medium">
            <input type="checkbox" name="size" value="small" defaultChecked={preferences.preferSmall} className="size-4 accent-forest" />
            Prefer charities with annual budgets under $1 million
          </label>
        </fieldset>
        <div className="flex flex-wrap items-center gap-5 border-t border-rule pt-6">
          <button type="submit" className={primaryAction}>See my matches <ArrowRight className="size-4" aria-hidden /></button>
          <a href="/matches" className="text-sm font-medium text-forest underline">Browse charities</a>
        </div>
      </form>
    </MatchingLayout>
  )
}

function MatchResults({ preferences, charities }: { preferences: Preferences; charities: readonly MatchableCharity[] }) {
  const results = rankCharities(charities, preferences)
  const hasPreferences = preferences.causes.length > 0 || Boolean(preferences.region) || preferences.preferSmall
  const query = new URLSearchParams()
  for (const cause of preferences.causes) query.append("causes", cause)
  if (preferences.region) query.set("region", preferences.region)
  if (preferences.preferSmall) query.set("size", "small")

  return (
    <MatchingLayout title={hasPreferences ? "Your charity matches" : "Browse charities"}>
      <p className="mt-3 font-serif text-lg text-ink-2">
        {hasPreferences
          ? "Fit scores reflect your quiz answers."
          : "Take the quiz to see how these charities fit your giving preferences."}
      </p>
      <a href={hasPreferences ? `/quiz?${query}` : "/quiz"} className={`mt-5 ${primaryAction}`}>
        {hasPreferences ? "Edit my preferences" : "Take the quiz"}
      </a>
      {charities.length === 0 ? (
        <p className="mt-8 border-t border-rule pt-5 text-ink-2">No charities are listed yet. Check back soon.</p>
      ) : results.length === 0 ? (
        <p className="mt-8 border-t border-rule pt-5 text-ink-2">No charities cover the causes you selected. Try choosing another cause or browsing the full list.</p>
      ) : (
        <ol className="mt-8 border-t border-ink" aria-label="Charities">
          {results.map(({ charity, score, reasons }) => (
            <li key={charity.id} className="border-b border-rule py-5">
              <div className="flex items-start justify-between gap-4">
                <h2 className={sectionTitle}>{charity.name}</h2>
                {score !== null && <span className="figures shrink-0 rounded-sm bg-forest-soft px-2 py-1 text-sm font-semibold text-forest-deep">{score}% fit</span>}
              </div>
              <p className="mt-1 text-sm text-ink-2">{charity.place}</p>
              <p className="mt-2 font-serif text-ink-2">{charity.description}</p>
              {reasons.length > 0 && <p className="mt-3 text-sm font-medium text-forest">{reasons.join(" · ")}</p>}
              {charity.href && <a href={charity.href} className="mt-3 inline-block text-sm font-semibold text-forest underline">View profile</a>}
            </li>
          ))}
        </ol>
      )}
    </MatchingLayout>
  )
}

export default function Matching({ mode }: { mode: "quiz" | "results" }) {
  const { user } = useAuth()
  const [charities, setCharities] = useState<MatchableCharity[] | null>(null)
  const [causeRows, setCauseRows] = useState<CauseRow[]>([])
  const [savedCauses, setSavedCauses] = useState<CauseId[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Load charities + the cause id/slug map once.
  useEffect(() => {
    let active = true
    Promise.all([fetchVettedCharities(), fetchCauses()])
      .then(([loadedCharities, loadedCauses]) => {
        if (!active) return
        setCharities(loadedCharities)
        setCauseRows(loadedCauses)
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : "Failed to load charities")
      })
    return () => {
      active = false
    }
  }, [])

  // Load the signed-in donor's saved causes (to pre-fill the quiz).
  useEffect(() => {
    if (!user) return
    let active = true
    loadCausePreferences(user.id)
      .then((cs) => {
        if (active) setSavedCauses(cs)
      })
      .catch(() => {
        if (active) setSavedCauses(null)
      })
    return () => {
      active = false
    }
  }, [user])

  const regions = useMemo(
    () => [...new Set((charities ?? []).flatMap((c) => (c.region ? [c.region] : [])))].sort(),
    [charities],
  )

  if (error) {
    return (
      <MatchingLayout title="Something went wrong">
        <p className="mt-3 font-serif text-lg text-ink-2">{error}</p>
      </MatchingLayout>
    )
  }
  if (charities === null) {
    return (
      <MatchingLayout title="Loading charities…">
        <p className="mt-3 font-serif text-lg text-ink-2">One moment.</p>
      </MatchingLayout>
    )
  }

  const params = new URLSearchParams(window.location.search)
  const urlPreferences = readPreferences(params, regions)

  if (mode === "quiz") {
    // Pre-fill from the URL if present, otherwise from the saved account causes.
    const hasUrlCauses = params.getAll("causes").length > 0
    const quizCauses = !hasUrlCauses && user && savedCauses ? savedCauses : urlPreferences.causes
    const quizPreferences: Preferences = { ...urlPreferences, causes: quizCauses }

    const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      const data = new FormData(e.currentTarget)
      const selected = data.getAll("causes").map(String) as CauseId[]
      const region = String(data.get("region") ?? "")

      const next = new URLSearchParams()
      for (const cause of selected) next.append("causes", cause)
      if (region) next.set("region", region)
      if (data.get("size")) next.set("size", "small")

      if (user) {
        try {
          await saveCausePreferences(user.id, selected, causeRows)
        } catch {
          // Saving is best-effort; still show the matches.
        }
      }
      window.location.assign(`/matches?${next.toString()}`)
    }

    return <PreferenceQuiz preferences={quizPreferences} regions={regions} signedIn={Boolean(user)} onSubmit={onSubmit} />
  }

  return <MatchResults preferences={urlPreferences} charities={charities} />
}
