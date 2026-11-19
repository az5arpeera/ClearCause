import { useEffect, useMemo, useState } from "react"
import { ArrowRight, Check, Compass, PencilLine, SlidersHorizontal } from "lucide-react"

import { CharityRow } from "@/components/CharityRow"
import { PageFrame } from "@/components/Glass"
import { glassChip, glassPanel, refract } from "@/lib/glass"
import { causes } from "@/data/causes"
import { stateName } from "@/data/us-states"
import { useAuth } from "@/lib/auth"
import { fetchVettedCharityDetails, type CharityDetail } from "@/lib/db"
import { useLiquidGlass } from "@/lib/liquid-glass"
import { suggestCharities } from "@/lib/matching"
import { whole } from "@/lib/money"
import { preferencesQuery, useSavedPreferences, type SavedPreferences } from "@/lib/preferences"

const causeLabel = Object.fromEntries(causes.map((c) => [c.id, c.label])) as Record<string, string>
const frequencyLabel: Record<string, string> = { one_time: "one time", monthly: "monthly", quarterly: "quarterly" }

/** Explore, pre-filtered to the donor's causes and state. */
function exploreLink(prefs: SavedPreferences) {
  const q = new URLSearchParams()
  for (const c of prefs.causes) q.append("cause", c)
  if (prefs.region) q.set("state", prefs.region)
  return `/explore${q.size ? `?${q}` : ""}`
}

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
  const justFinished = useMemo(() => new URLSearchParams(window.location.search).get("from") === "quiz", [])
  useLiquidGlass(list)

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
  const yourCauses = prefs && prefs.causes.length > 0

  return (
    <PageFrame
      title={justFinished ? "Your suggestions are ready" : "For you"}
      intro={
        justFinished
          ? "Every charity on Clear Cause, ranked against your answers. They change the order, never who you can see. Start here, or browse everything yourself."
          : "Every charity on Clear Cause, in the order that best fits your answers. Your answers change the order; they never hide anyone."
      }
      below={
        prefs ? (
          <nav aria-label="Where to next" className="flex flex-wrap gap-2">
            <span className={`${glassChip} lg-selected`} aria-current="page">
              <Check className="size-4" strokeWidth={2.5} aria-hidden />
              For you{suggestions ? ` · ${suggestions.fits.length + suggestions.more.length}` : ""}
            </span>
            {yourCauses ? (
              <a href={exploreLink(prefs)} className={glassChip} {...refract}>
                <SlidersHorizontal className="size-4" aria-hidden />
                Filter your causes in Explore
              </a>
            ) : null}
            <a href="/explore" className={glassChip} {...refract}>
              <Compass className="size-4" aria-hidden />
              Browse all charities
            </a>
            <a href="/quiz" className={glassChip} {...refract}>
              <PencilLine className="size-4" aria-hidden />
              Edit my answers
            </a>
          </nav>
        ) : null
      }
    >
      <div className="mt-10 grid gap-x-10 gap-y-8 lg:grid-cols-[16.5rem_minmax(0,1fr)]">
        <aside aria-label="Your answers" className="hidden lg:sticky lg:top-24 lg:block lg:self-start">
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
                title={yourCauses ? "Best fits" : "Top suggestions"}
                note={yourCauses ? "Share at least one of your causes." : "Ranked by transparency and share to programs. Pick causes for a closer fit."}
                items={suggestions.fits}
                query={query}
              />
              {suggestions.more.length > 0 ? (
                <Group title="More to explore" note="Outside your causes, ranked by the same score." items={suggestions.more} query={query} />
              ) : null}
              <div className="flex flex-wrap items-center justify-between gap-4 border-t-2 border-forest pt-5">
                <p className="max-w-[44ch] text-ink-2">
                  Want to sort and filter yourself? Explore has every charity, with filters for cause, state, size and transparency.
                </p>
                <a
                  href="/explore"
                  className="inline-flex min-h-11 items-center gap-2 rounded-sm bg-forest px-5 text-sm font-semibold text-paper no-underline hover:bg-forest-deep"
                >
                  Go to Explore
                  <ArrowRight className="size-4" aria-hidden />
                </a>
              </div>
            </>
          )}
        </section>
      </div>
    </PageFrame>
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
    <div className={`${glassPanel} px-5 pt-4 pb-5`} data-refract="0.6">
      <h2 className="text-lg font-bold tracking-tight">Your answers</h2>
      <dl className="mt-3 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex gap-3 border-b border-ink/10 py-2 last:border-b-0">
            <dt className="w-24 shrink-0 text-ink-2">{k}</dt>
            <dd className="font-medium">{v}</dd>
          </div>
        ))}
      </dl>
      <a href="/quiz" className={`${glassChip} mt-4`}>
        <PencilLine className="size-4" aria-hidden />
        Edit my answers
      </a>
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
