import { useEffect, useState, type FormEvent, type ReactNode } from "react"
import { ArrowRight } from "lucide-react"

import { PageFrame } from "@/components/Glass"
import { glassPanel } from "@/lib/glass"
import { causes, type CauseId } from "@/data/causes"
import { usStates } from "@/data/us-states"
import { useAuth } from "@/lib/auth"
import { useLiquidGlass } from "@/lib/liquid-glass"
import { readPreferences } from "@/lib/matching"
import { readLocalPreferences, savePreferences, useSavedPreferences, type SavedPreferences } from "@/lib/preferences"

const primaryAction = "inline-flex min-h-11 items-center gap-2 rounded-sm bg-forest px-5 text-sm font-semibold text-paper no-underline hover:bg-forest-deep"
const sectionTitle = "text-lg font-bold tracking-tight"
const stateCodes = usStates.map((s) => s.code)

function QuizLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <PageFrame title={title} backdrop="full" width="narrow">
      {children}
    </PageFrame>
  )
}

/**
 * The one-time onboarding quiz. Answers are saved in this browser (and to the
 * account when signed in), then the donor lands on For You. Coming back here
 * later edits the saved answers.
 */
export default function Quiz() {
  const { user, loading } = useAuth()
  const { prefs, ready } = useSavedPreferences(user, loading)
  const [saving, setSaving] = useState(false)
  useLiquidGlass(ready)

  if (!ready) {
    return (
      <QuizLayout title="Your giving preferences">
        <p className="mt-3 font-serif text-lg text-ink-2">One moment.</p>
      </QuizLayout>
    )
  }

  const editing = prefs !== null
  // First visit: pre-tick anything picked on the landing page (?causes=...).
  const initial = prefs ?? { ...readPreferences(new URLSearchParams(window.location.search), stateCodes), givingBudget: null, frequency: null }

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)
    const data = new FormData(e.currentTarget)
    const number = (name: string) => {
      const raw = String(data.get(name) ?? "").trim()
      return raw !== "" && Number.isFinite(Number(raw)) ? Number(raw) : null
    }
    const direct = number("direct")
    const budget = number("budget")
    await savePreferences(user, {
      causes: data.getAll("causes").map(String) as CauseId[],
      region: String(data.get("region") ?? ""),
      preferSmall: Boolean(data.get("size")),
      directPctMin: direct != null ? Math.min(100, Math.max(0, Math.round(direct))) : 0,
      givingBudget: budget != null ? Math.max(0, budget) : null,
      frequency: String(data.get("frequency") ?? "") || null,
    })
    window.location.assign(editing ? "/for-you" : "/for-you?from=quiz")
  }

  return (
    <QuizLayout title={editing ? "Edit your giving preferences" : "Tell us what you care about"}>
      <p className="mt-3 font-serif text-lg text-ink-2">
        {editing
          ? "Change any answer and For You re-ranks every charity."
          : "Five quick questions. We use them to suggest charities on your For You page. Nothing is hidden from you; your answers only change the order."}
        {user ? " Your answers are saved to your account." : " They're kept in this browser, and move to your account if you sign up."}
      </p>
      <form onSubmit={onSubmit} className={`${glassPanel} mt-8 space-y-7 px-5 py-6 sm:px-8 sm:py-8`} data-refract="0.4" data-refract-source="#page-backdrop">
        <fieldset>
          <legend className={sectionTitle}>What causes matter to you?</legend>
          <p className="mt-1 text-sm text-ink-2">Choose as many as you like.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {causes.map(({ id, label }) => (
              <label key={id} className="lg lg-paper flex min-h-11 cursor-pointer items-center gap-3 rounded-[12px] px-3 text-sm font-medium transition-[filter] hover:brightness-[1.04] has-checked:bg-forest has-checked:text-paper">
                <input type="checkbox" name="causes" value={id} defaultChecked={initial.causes.includes(id)} className="size-4 accent-forest" />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="border-t border-ink/10 pt-6">
          <label htmlFor="giving-region" className={sectionTitle}>Where would you like to give?</label>
          <p id="giving-region-hint" className="mt-1 text-sm text-ink-2">Charities based in your state come first. Choose Anywhere for no preference.</p>
          <select id="giving-region" name="region" defaultValue={initial.region} aria-describedby="giving-region-hint" className="mt-3 block min-h-11 w-full rounded-sm border border-input bg-paper px-3 text-sm sm:max-w-xs">
            <option value="">Anywhere</option>
            {usStates.map((s) => (
              <option key={s.code} value={s.code}>{s.name}</option>
            ))}
          </select>
        </div>
        <fieldset className="border-t border-ink/10 pt-6">
          <legend className="sr-only">Charity size</legend>
          <label className="flex w-fit cursor-pointer items-center gap-3 py-1 text-sm font-medium">
            <input type="checkbox" name="size" value="small" defaultChecked={initial.preferSmall} className="size-4 accent-forest" />
            Prefer charities with annual budgets under $1 million
          </label>
        </fieldset>
        <div className="border-t border-ink/10 pt-6">
          <label htmlFor="giving-budget" className={sectionTitle}>How much do you usually give?</label>
          <p className="mt-1 text-sm text-ink-2">A typical gift amount. Optional.</p>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-sm text-ink-2" aria-hidden>$</span>
            <input id="giving-budget" name="budget" type="number" min="0" step="1" inputMode="numeric" defaultValue={initial.givingBudget ?? ""} placeholder="50" className="block min-h-11 w-full rounded-sm border border-input bg-paper px-3 text-sm sm:max-w-[10rem]" />
          </div>
        </div>
        <div className="border-t border-ink/10 pt-6">
          <label htmlFor="giving-frequency" className={sectionTitle}>How often do you plan to give?</label>
          <select id="giving-frequency" name="frequency" defaultValue={initial.frequency ?? ""} className="mt-3 block min-h-11 w-full rounded-sm border border-input bg-paper px-3 text-sm sm:max-w-xs">
            <option value="">No preference</option>
            <option value="one_time">One time</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
          </select>
        </div>
        <div className="border-t border-ink/10 pt-6">
          <label htmlFor="giving-direct" className={sectionTitle}>Minimum that should reach the cause</label>
          <p id="giving-direct-hint" className="mt-1 text-sm text-ink-2">The share of spending that goes to programs rather than overhead. Charities below it move down the list. Leave blank for no minimum.</p>
          <div className="mt-3 flex items-center gap-2">
            <input id="giving-direct" name="direct" type="number" min="0" max="100" step="1" inputMode="numeric" defaultValue={initial.directPctMin > 0 ? initial.directPctMin : ""} placeholder="80" aria-describedby="giving-direct-hint" className="block min-h-11 w-24 rounded-sm border border-input bg-paper px-3 text-sm" />
            <span className="text-sm text-ink-2" aria-hidden>%</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-5 border-t border-ink/10 pt-6">
          <button type="submit" disabled={saving} className={primaryAction}>
            {saving ? "Saving…" : editing ? "Save and see For You" : "See my suggestions"} <ArrowRight className="size-4" aria-hidden />
          </button>
          <a href={editing ? "/for-you" : "/explore"} className="text-sm font-medium text-forest underline">
            {editing ? "Cancel" : "Skip and explore all charities"}
          </a>
        </div>
      </form>
    </QuizLayout>
  )
}

/**
 * Old /matches links: keep any answers carried in the URL, then go to For You
 * (or Explore, when there's nothing to go on).
 */
export function LegacyMatches() {
  const { user, loading } = useAuth()
  useEffect(() => {
    if (loading) return
    const params = new URLSearchParams(window.location.search)
    const p = readPreferences(params, stateCodes)
    const hasAnswers = p.causes.length > 0 || p.region || p.preferSmall || p.directPctMin > 0
    const go = (to: string) => window.location.replace(to)
    if (!hasAnswers) return go(readLocalPreferences() ? "/for-you" : "/explore")
    const prev: SavedPreferences | null = readLocalPreferences()
    void savePreferences(user, { ...p, givingBudget: prev?.givingBudget ?? null, frequency: prev?.frequency ?? null }).then(() => go("/for-you"))
  }, [user, loading])
  return (
    <QuizLayout title="Taking you to For You…">
      <p className="mt-3 font-serif text-lg text-ink-2">One moment.</p>
    </QuizLayout>
  )
}
