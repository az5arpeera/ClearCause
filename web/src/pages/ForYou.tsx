import { useEffect, useMemo, useState } from "react"
import { ArrowRight, Compass, PencilLine, SlidersHorizontal } from "lucide-react"

import { CharityRow } from "@/components/CharityRow"
import { Bone, CharityRowSkeleton } from "@/components/Skeleton"
import { PageFrame } from "@/components/Glass"
import { enterFade, glassChip, glassPanel, refract, solidButton } from "@/lib/glass"
import { causes } from "@/data/causes"
import { stateName } from "@/data/us-states"
import { useAuth } from "@/lib/auth"
import { fetchVettedCharityDetails, type CharityDetail } from "@/lib/db"
import { useLiquidGlass } from "@/lib/liquid-glass"
import { suggestCharities } from "@/lib/matching"
import { answerRows, preferencesQuery, useSavedPreferences, type SavedPreferences } from "@/lib/preferences"

const causeLabel = Object.fromEntries(causes.map((c) => [c.id, c.label])) as Record<string, string>

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
      intro="Every charity, ranked by how well it fits your answers. Nothing is hidden."
      below={
        prefs ? (
          <nav aria-label="Where to next" className="flex flex-wrap gap-2">
            {yourCauses ? (
              <a href={exploreLink(prefs)} className={glassChip} {...refract}>
                <SlidersHorizontal className="size-4" aria-hidden />
                Your causes in Explore
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
            <section className="mb-10">
              <div className="flex items-baseline justify-between gap-2 border-b border-ink pb-2">
                <Bone className="h-6 w-28" />
                <Bone className="h-4 w-56" />
              </div>
              <CharityRowSkeleton count={3} label="Ranking charities" />
            </section>
          ) : (
            <div className={enterFade}>
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
                  className={solidButton}
                >
                  Go to Explore
                  <ArrowRight className="size-4" aria-hidden />
                </a>
              </div>
            </div>
          )}
        </section>
      </div>
    </PageFrame>
  )
}

function Answers({ prefs }: { prefs: SavedPreferences }) {
  const rows = answerRows(prefs, { cause: causeLabel, state: stateName })
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
