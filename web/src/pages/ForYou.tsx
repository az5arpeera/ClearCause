import { useEffect, useMemo, useState } from "react"

import { CharityRow } from "@/components/CharityRow"
import { SiteHeader } from "@/components/SiteHeader"
import { causes } from "@/data/causes"
import { stateName } from "@/data/us-states"
import { useAuth } from "@/lib/auth"
import { fetchVettedCharityDetails, type CharityDetail } from "@/lib/db"
import { suggestCharities } from "@/lib/matching"
import { whole } from "@/lib/money"
import { preferencesQuery, useSavedPreferences, type SavedPreferences } from "@/lib/preferences"

const causeLabel = Object.fromEntries(causes.map((c) => [c.id, c.label])) as Record<string, string>
const frequencyLabel: Record<string, string> = { one_time: "one time", monthly: "monthly", quarterly: "quarterly" }

/**
 * For You: every vetted charity, ranked by the matcher against the donor's
 * saved quiz answers. Nothing is filtered out; charities sharing a chosen
 * cause come first, the rest follow under "More to explore".
 */
export default function ForYou() {
  const { user, loading } = useAuth()
  const { prefs, ready } = useSavedPreferences(user, loading)
  const [list, setList] = useState<CharityDetail[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (ready && !prefs) window.location.replace("/quiz")
  }, [ready, prefs])

  useEffect(() => {
    let active = true
    fetchVettedCharityDetails()
      .then((l) => active && setList(l))
      .catch((e: unknown) => active && setError(e instanceof Error ? e.message : "Could not load charities"))
    return () => {
      active = false
    }
  }, [])

  const suggestions = useMemo(() => (list && prefs ? suggestCharities(list, prefs) : null), [list, prefs])
  const query = useMemo(() => (prefs ? preferencesQuery(prefs) : undefined), [prefs])

  return (
    <div className="min-h-svh bg-paper text-ink">
      <SiteHeader />
      <main id="main" className="mx-auto max-w-[76rem] px-4 pt-10 pb-24 sm:px-6 lg:px-10">
        <h1 className="border-t-2 border-forest pt-5 text-3xl leading-tight font-bold tracking-tight sm:text-4xl">For you</h1>
        <p className="mt-3 max-w-[62ch] font-serif text-lg text-ink-2">
          Every charity on Clear Cause, in the order that best fits your answers. Your answers change the order; they never hide anyone.
        </p>

        <div className="mt-8 grid gap-x-10 gap-y-8 lg:grid-cols-[16.5rem_minmax(0,1fr)]">
          <aside aria-label="Your answers" className="lg:sticky lg:top-24 lg:self-start">
            {prefs ? <Answers prefs={prefs} /> : null}
          </aside>

          <section aria-label="Suggestions">
            {error ? (
              <p className="border-t border-rule pt-5 text-ink-2">The charity list didn't load ({error}). Refresh to try again.</p>
            ) : !suggestions ? (
              <p className="border-t border-rule pt-5 text-ink-2">Ranking charities…</p>
            ) : (
              <>
                <Group
                  title={prefs!.causes.length ? "Best fits" : "Top suggestions"}
                  note={prefs!.causes.length ? "Share at least one of your causes." : "Ranked by transparency and share to programs. Pick causes for a closer fit."}
                  items={suggestions.fits}
                  query={query}
                />
                {suggestions.more.length > 0 ? (
                  <Group title="More to explore" note="Outside your causes, ranked by the same score." items={suggestions.more} query={query} />
                ) : null}
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}

function Answers({ prefs }: { prefs: SavedPreferences }) {
  const rows: [string, string][] = [
    ["Causes", prefs.causes.length ? prefs.causes.map((c) => causeLabel[c]).join(", ") : "Any"],
    ["Where", prefs.region ? (stateName[prefs.region] ?? prefs.region) + " first" : "Anywhere"],
    ["Size", prefs.preferSmall ? "Under $1M preferred" : "Any size"],
    ["To programs", prefs.directPctMin > 0 ? `At least ${prefs.directPctMin}%` : "No minimum"],
    ["Typical gift", prefs.givingBudget != null ? `$${whole.format(prefs.givingBudget)}${prefs.frequency ? `, ${frequencyLabel[prefs.frequency] ?? prefs.frequency}` : ""}` : "Not set"],
  ]
  return (
    <div className="border-t-2 border-forest bg-paper-sunk px-5 pt-4 pb-5">
      <h2 className="text-lg font-bold tracking-tight">Your answers</h2>
      <dl className="mt-3 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex gap-3 border-b border-rule py-2 last:border-b-0">
            <dt className="w-24 shrink-0 text-ink-2">{k}</dt>
            <dd className="font-medium">{v}</dd>
          </div>
        ))}
      </dl>
      <a href="/quiz" className="mt-4 inline-flex min-h-10 items-center text-sm font-semibold text-forest underline">
        Edit my answers
      </a>
      <p className="mt-2 text-[0.8125rem] text-ink-3">
        Want to filter instead? <a href="/explore" className="underline">Explore all charities</a>.
      </p>
    </div>
  )
}

function Group({
  title,
  note,
  items,
  query,
}: {
  title: string
  note: string
  items: ReturnType<typeof suggestCharities<CharityDetail>>["fits"]
  query?: URLSearchParams
}) {
  return (
    <section className="mb-10">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-ink pb-2">
        <h2 className="text-xl font-bold tracking-tight">{title}</h2>
        <span className="figures text-sm text-ink-2">
          {items.length} {items.length === 1 ? "charity" : "charities"} · {note}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="border-b border-rule py-6 text-ink-2">None yet for these causes. More charities are being reviewed.</p>
      ) : (
        <ol>
          {items.map((s) => (
            <CharityRow key={s.charity.id} charity={s.charity} score={s.score} reasons={s.reasons} cautions={s.cautions} query={query} />
          ))}
        </ol>
      )}
    </section>
  )
}
