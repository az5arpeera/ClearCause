import type { ReactNode } from "react"
import { ArrowRight } from "lucide-react"

import { Logo } from "@/components/Logo"
import { causes } from "@/data/causes"
import { sampleCharities, sampleRegions } from "@/data/sample-matches"
import { rankCharities, readPreferences, type Preferences } from "@/lib/matching"

const primaryAction = "inline-flex min-h-11 items-center gap-2 rounded-sm bg-forest px-5 text-sm font-semibold text-paper no-underline hover:bg-forest-deep"
const sectionTitle = "text-lg font-bold tracking-tight"

function MatchingLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-svh bg-paper text-ink">
      <header className="bg-forest-deep text-paper">
        <div className="mx-auto flex h-16 max-w-[76rem] items-center px-4 sm:px-6 lg:px-10">
          <Logo />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
        <h1 className="border-t-2 border-forest pt-5 text-3xl leading-tight font-bold tracking-tight sm:text-4xl">{title}</h1>
        {children}
      </main>
    </div>
  )
}

export function PreferenceQuiz({ preferences }: { preferences: Preferences }) {
  return (
    <MatchingLayout title="Find charities that fit your giving">
      <p className="mt-3 font-serif text-lg text-ink-2">
        Answer any of these questions to rank the sample charities, or skip them to browse.
      </p>
      <form action="/matches" method="get" className="mt-8 space-y-7">
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
          <p id="giving-region-hint" className="mt-1 text-sm text-ink-2">Options reflect where the sample charities are based.</p>
          <select id="giving-region" name="region" defaultValue={preferences.region} aria-describedby="giving-region-hint" className="mt-3 block min-h-11 w-full rounded-sm border border-input bg-paper px-3 text-sm sm:max-w-xs">
            <option value="">Any state</option>
            {sampleRegions.map((region) => <option key={region}>{region}</option>)}
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
          <a href="/matches" className="text-sm font-medium text-forest underline">Browse sample charities</a>
        </div>
      </form>
    </MatchingLayout>
  )
}

export function MatchResults({ preferences }: { preferences: Preferences }) {
  const results = rankCharities(sampleCharities, preferences)
  const hasPreferences = preferences.causes.length > 0 || Boolean(preferences.region) || preferences.preferSmall
  const query = new URLSearchParams()
  for (const cause of preferences.causes) query.append("causes", cause)
  if (preferences.region) query.set("region", preferences.region)
  if (preferences.preferSmall) query.set("size", "small")

  return (
    <MatchingLayout title={hasPreferences ? "Your charity matches" : "Browse sample charities"}>
      <p className="mt-3 font-serif text-lg text-ink-2">
        {hasPreferences
          ? "These are fictional sample charities. Fit scores reflect your quiz answers."
          : "These are fictional sample charities. Take the quiz to see how they fit your giving preferences."}
      </p>
      <a href={hasPreferences ? `/quiz?${query}` : "/quiz"} className={`mt-5 ${primaryAction}`}>
        {hasPreferences ? "Edit my preferences" : "Take the quiz"}
      </a>
      {results.length === 0 ? (
        <p className="mt-8 border-t border-rule pt-5 text-ink-2">No sample charities cover the causes you selected. Try choosing another cause or browsing the sample catalog.</p>
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
              {charity.href && <a href={charity.href} className="mt-3 inline-block text-sm font-semibold text-forest underline">View sample profile</a>}
            </li>
          ))}
        </ol>
      )}
    </MatchingLayout>
  )
}

export default function Matching({ mode }: { mode: "quiz" | "results" }) {
  const preferences = readPreferences(new URLSearchParams(window.location.search), sampleRegions)
  return mode === "quiz" ? <PreferenceQuiz preferences={preferences} /> : <MatchResults preferences={preferences} />
}
