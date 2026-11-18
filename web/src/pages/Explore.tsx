import { useEffect, useMemo, useState, type ReactNode } from "react"
import { SlidersHorizontal, X } from "lucide-react"

import { CharityRow } from "@/components/CharityRow"
import { SiteHeader } from "@/components/SiteHeader"
import { causes, type CauseId } from "@/data/causes"
import { fetchVettedCharityDetails, type CharityDetail } from "@/lib/db"
import { cn } from "@/lib/utils"

/* --------------------------------------------------------------- the bands */

// One ordered metric per donut, light (low) to dark (high), validated with the
// dataviz palette script: adjacent steps differ by dE >= 15 for normal and
// colour-blind vision. "Not reported" uses the neutral paper-grey.
const RAMP = ["#a9d0b0", "#68a279", "#31724d", "#0a4027"]
const NEUTRAL = "#d4cdbf"

type Band = { id: string; label: string; color: string; test: (c: CharityDetail) => boolean }
type Metric = "transparency" | "size" | "programs"

const BANDS: Record<Metric, { title: string; bands: Band[] }> = {
  transparency: {
    title: "Transparency score",
    bands: [
      { id: "90", label: "90–100", color: RAMP[3], test: (c) => (c.transparencyScore ?? -1) >= 90 },
      { id: "80", label: "80–89", color: RAMP[2], test: (c) => inRange(c.transparencyScore, 80, 90) },
      { id: "70", label: "70–79", color: RAMP[1], test: (c) => inRange(c.transparencyScore, 70, 80) },
      { id: "lt70", label: "Under 70", color: RAMP[0], test: (c) => inRange(c.transparencyScore, 0, 70) },
      { id: "none", label: "Not scored", color: NEUTRAL, test: (c) => c.transparencyScore == null },
    ],
  },
  size: {
    title: "Annual budget",
    bands: [
      { id: "xl", label: "Over $5M", color: RAMP[3], test: (c) => (c.annualBudgetUsd ?? -1) >= 5_000_000 },
      { id: "l", label: "$1M–$5M", color: RAMP[2], test: (c) => inRange(c.annualBudgetUsd, 1_000_000, 5_000_000) },
      { id: "m", label: "$250K–$1M", color: RAMP[1], test: (c) => inRange(c.annualBudgetUsd, 250_000, 1_000_000) },
      { id: "s", label: "Under $250K", color: RAMP[0], test: (c) => inRange(c.annualBudgetUsd, 0, 250_000) },
      { id: "none", label: "Not reported", color: NEUTRAL, test: (c) => c.annualBudgetUsd == null },
    ],
  },
  programs: {
    title: "Share to programs",
    bands: [
      { id: "90", label: "90¢+ per $1", color: RAMP[3], test: (c) => (c.directPct ?? -1) >= 90 },
      { id: "80", label: "80–89¢", color: RAMP[2], test: (c) => inRange(c.directPct, 80, 90) },
      { id: "70", label: "70–79¢", color: RAMP[1], test: (c) => inRange(c.directPct, 70, 80) },
      { id: "lt70", label: "Under 70¢", color: RAMP[0], test: (c) => inRange(c.directPct, 0, 70) },
      { id: "none", label: "Not broken out", color: NEUTRAL, test: (c) => c.directPct == null },
    ],
  },
}
const METRICS = Object.keys(BANDS) as Metric[]

function inRange(v: number | undefined, lo: number, hi: number) {
  return v != null && v >= lo && v < hi
}

/* ------------------------------------------------------------- the filters */

type Filters = {
  q: string
  causes: CauseId[]
  state: string
  partner: boolean
  bands: Record<Metric, string | null>
  sort: "transparency" | "programs" | "small" | "name"
}

const empty: Filters = { q: "", causes: [], state: "", partner: false, bands: { transparency: null, size: null, programs: null }, sort: "transparency" }

function readFilters(): Filters {
  const p = new URLSearchParams(window.location.search)
  const valid = new Set<string>(causes.map((c) => c.id))
  const band = (m: Metric) => {
    const v = p.get(m)
    return v && BANDS[m].bands.some((b) => b.id === v) ? v : null
  }
  const sort = p.get("sort")
  return {
    q: p.get("q") ?? "",
    causes: p.getAll("cause").filter((c): c is CauseId => valid.has(c)),
    state: p.get("state") ?? "",
    partner: p.get("partner") === "1",
    bands: { transparency: band("transparency"), size: band("size"), programs: band("programs") },
    sort: sort === "programs" || sort === "small" || sort === "name" ? sort : "transparency",
  }
}

function writeFilters(f: Filters) {
  const p = new URLSearchParams()
  if (f.q) p.set("q", f.q)
  for (const c of f.causes) p.append("cause", c)
  if (f.state) p.set("state", f.state)
  if (f.partner) p.set("partner", "1")
  for (const m of METRICS) if (f.bands[m]) p.set(m, f.bands[m]!)
  if (f.sort !== "transparency") p.set("sort", f.sort)
  const next = `${window.location.pathname}${p.size ? `?${p}` : ""}`
  window.history.replaceState(null, "", next)
}

/** Every filter except `skip`, so a facet can show what choosing it would give. */
function applyFilters(list: CharityDetail[], f: Filters, skip?: Metric | "causes" | "state") {
  const q = f.q.trim().toLowerCase()
  return list.filter((c) => {
    if (q && !`${c.name} ${c.place} ${c.description}`.toLowerCase().includes(q)) return false
    if (skip !== "causes" && f.causes.length && !f.causes.some((x) => c.causes.includes(x))) return false
    if (skip !== "state" && f.state && c.region !== f.state) return false
    if (f.partner && !c.isPartner) return false
    for (const m of METRICS) {
      if (m === skip || !f.bands[m]) continue
      const band = BANDS[m].bands.find((b) => b.id === f.bands[m])
      if (band && !band.test(c)) return false
    }
    return true
  })
}

const sorters: Record<Filters["sort"], (a: CharityDetail, b: CharityDetail) => number> = {
  transparency: (a, b) => (b.transparencyScore ?? -1) - (a.transparencyScore ?? -1) || a.name.localeCompare(b.name),
  programs: (a, b) => (b.directPct ?? -1) - (a.directPct ?? -1) || a.name.localeCompare(b.name),
  small: (a, b) => (a.annualBudgetUsd ?? Infinity) - (b.annualBudgetUsd ?? Infinity) || a.name.localeCompare(b.name),
  name: (a, b) => a.name.localeCompare(b.name),
}

/* ---------------------------------------------------------------- the page */

export default function Explore() {
  const [list, setList] = useState<CharityDetail[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [f, setF] = useState<Filters>(readFilters)
  const [metric, setMetric] = useState<Metric>("transparency")

  useEffect(() => {
    let active = true
    fetchVettedCharityDetails()
      .then((l) => active && setList(l))
      .catch((e: unknown) => active && setError(e instanceof Error ? e.message : "Could not load charities"))
    return () => {
      active = false
    }
  }, [])

  useEffect(() => writeFilters(f), [f])

  const all = useMemo(() => list ?? [], [list])
  const results = useMemo(() => applyFilters(all, f).sort(sorters[f.sort]), [all, f])
  const states = useMemo(() => [...new Set(all.flatMap((c) => (c.region ? [c.region] : [])))].sort(), [all])
  const activeCount = f.causes.length + (f.state ? 1 : 0) + (f.partner ? 1 : 0) + METRICS.filter((m) => f.bands[m]).length + (f.q ? 1 : 0)

  const set = (patch: Partial<Filters>) => setF((prev) => ({ ...prev, ...patch }))
  const toggleBand = (m: Metric, id: string) => set({ bands: { ...f.bands, [m]: f.bands[m] === id ? null : id } })

  return (
    <div className="min-h-svh bg-paper text-ink">
      <SiteHeader />
      <main id="main" className="mx-auto max-w-[76rem] px-4 pt-10 pb-24 sm:px-6 lg:px-10">
        <h1 className="border-t-2 border-forest pt-5 text-3xl leading-tight font-bold tracking-tight sm:text-4xl">Explore charities</h1>
        <p className="mt-3 max-w-[62ch] font-serif text-lg text-ink-2">
          Every vetted charity on Clear Cause. Filter by what matters to you, or click a slice of the chart.
        </p>

        {error ? (
          <p className="mt-8 border-t border-rule pt-5 text-ink-2">The charity list didn't load ({error}). Refresh to try again.</p>
        ) : (
          <div className="mt-8 grid gap-x-10 gap-y-6 lg:grid-cols-[16.5rem_minmax(0,1fr)]">
            <FiltersPanel
              f={f}
              all={all}
              states={states}
              activeCount={activeCount}
              set={set}
              toggleBand={toggleBand}
              clear={() => setF({ ...empty, sort: f.sort })}
            />

            <section aria-labelledby="results-title">
              <Donut
                metric={metric}
                setMetric={setMetric}
                facet={applyFilters(all, f, metric)}
                selected={f.bands[metric]}
                onSelect={(id) => toggleBand(metric, id)}
                loading={!list}
              />

              <div className="mt-8 flex flex-wrap items-end justify-between gap-3 border-b border-ink pb-2">
                <h2 id="results-title" className="figures text-sm font-semibold" aria-live="polite">
                  {list ? `${results.length} of ${all.length} charities` : "Loading charities…"}
                </h2>
                <label className="flex items-center gap-2 text-sm text-ink-2">
                  Sort by
                  <select
                    value={f.sort}
                    onChange={(e) => set({ sort: e.target.value as Filters["sort"] })}
                    className="min-h-10 rounded-[2px] border border-input bg-paper px-2 text-sm text-ink"
                  >
                    <option value="transparency">Most transparent</option>
                    <option value="programs">Most to programs</option>
                    <option value="small">Smallest first</option>
                    <option value="name">Name</option>
                  </select>
                </label>
              </div>

              {list && results.length === 0 ? (
                <div className="border-b border-rule py-8">
                  <p className="text-ink-2">No charities match these filters.</p>
                  <button type="button" onClick={() => setF({ ...empty, sort: f.sort })} className="mt-3 text-sm font-semibold text-forest underline">
                    Clear all filters
                  </button>
                </div>
              ) : (
                <ol aria-label="Charities">
                  {results.map((c) => (
                    <CharityRow key={c.id} charity={c} />
                  ))}
                </ol>
              )}
              <p className="mt-6 text-[0.8125rem] text-ink-3">
                Charity figures come from the charity's own statements or from IRS Form 990 data via ProPublica's Nonprofit
                Explorer, cited on each profile.
              </p>
            </section>
          </div>
        )}
      </main>
    </div>
  )
}

/* -------------------------------------------------------------- the sidebar */

function FiltersPanel({
  f,
  all,
  states,
  activeCount,
  set,
  toggleBand,
  clear,
}: {
  f: Filters
  all: CharityDetail[]
  states: string[]
  activeCount: number
  set: (p: Partial<Filters>) => void
  toggleBand: (m: Metric, id: string) => void
  clear: () => void
}) {
  const causeFacet = applyFilters(all, f, "causes")
  const stateFacet = applyFilters(all, f, "state")
  const body = (
    <div className="space-y-7">
      <div>
        <label htmlFor="explore-q" className="text-sm font-semibold">Search</label>
        <input
          id="explore-q"
          type="search"
          value={f.q}
          onChange={(e) => set({ q: e.target.value })}
          placeholder="Name, town or keyword"
          className="mt-2 block min-h-11 w-full rounded-[2px] border border-input bg-paper px-3 text-sm placeholder:text-ink-3"
        />
      </div>

      <FilterGroup title="Causes">
        {causes.map((c) => {
          const n = causeFacet.filter((x) => x.causes.includes(c.id)).length
          const on = f.causes.includes(c.id)
          return (
            <label key={c.id} className="flex min-h-9 cursor-pointer items-center gap-2.5 text-sm">
              <input
                type="checkbox"
                checked={on}
                onChange={() => set({ causes: on ? f.causes.filter((x) => x !== c.id) : [...f.causes, c.id] })}
                className="size-4 accent-forest"
              />
              <span className="flex-1">{c.label}</span>
              <span className="figures text-ink-3">{n}</span>
            </label>
          )
        })}
      </FilterGroup>

      <div>
        <label htmlFor="explore-state" className="text-sm font-semibold">State</label>
        <select
          id="explore-state"
          value={f.state}
          onChange={(e) => set({ state: e.target.value })}
          className="mt-2 block min-h-11 w-full rounded-[2px] border border-input bg-paper px-3 text-sm"
        >
          <option value="">Anywhere ({stateFacet.length})</option>
          {states.map((s) => (
            <option key={s} value={s}>
              {s} ({stateFacet.filter((c) => c.region === s).length})
            </option>
          ))}
        </select>
      </div>

      {METRICS.map((m) => (
        <FilterGroup key={m} title={BANDS[m].title}>
          {BANDS[m].bands.map((b) => {
            const n = applyFilters(all, f, m).filter(b.test).length
            const on = f.bands[m] === b.id
            return (
              <label key={b.id} className="flex min-h-9 cursor-pointer items-center gap-2.5 text-sm">
                <input type="radio" name={`band-${m}`} checked={on} onChange={() => toggleBand(m, b.id)} onClick={() => on && toggleBand(m, b.id)} className="size-4 accent-forest" />
                <span aria-hidden className="size-3 shrink-0" style={{ background: b.color }} />
                <span className="flex-1">{b.label}</span>
                <span className="figures text-ink-3">{n}</span>
              </label>
            )
          })}
        </FilterGroup>
      ))}

      <label className="flex min-h-9 cursor-pointer items-center gap-2.5 text-sm font-semibold">
        <input type="checkbox" checked={f.partner} onChange={() => set({ partner: !f.partner })} className="size-4 accent-forest" />
        Vetted partners only
      </label>

      {activeCount > 0 ? (
        <button type="button" onClick={clear} className="inline-flex items-center gap-1.5 text-sm font-semibold text-forest underline">
          <X className="size-4" aria-hidden />
          Clear {activeCount} filter{activeCount === 1 ? "" : "s"}
        </button>
      ) : null}
    </div>
  )

  return (
    <aside aria-label="Filters" className="lg:sticky lg:top-24 lg:max-h-[calc(100svh-7rem)] lg:self-start lg:overflow-y-auto lg:pr-2">
      <details className="group border-y border-rule lg:hidden">
        <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 text-sm font-semibold">
          <SlidersHorizontal className="size-4" aria-hidden />
          Filters{activeCount ? ` (${activeCount})` : ""}
          <span className="ml-auto text-ink-3 group-open:hidden">Show</span>
          <span className="ml-auto hidden text-ink-3 group-open:inline">Hide</span>
        </summary>
        <div className="pt-2 pb-6">{body}</div>
      </details>
      <div className="hidden lg:block">{body}</div>
    </aside>
  )
}

function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold">{title}</legend>
      <div className="mt-1.5">{children}</div>
    </fieldset>
  )
}

/* ---------------------------------------------------------------- the donut */

function Donut({
  metric,
  setMetric,
  facet,
  selected,
  onSelect,
  loading,
}: {
  metric: Metric
  setMetric: (m: Metric) => void
  facet: CharityDetail[]
  selected: string | null
  onSelect: (id: string) => void
  loading: boolean
}) {
  const [hover, setHover] = useState<string | null>(null)
  const slices = BANDS[metric].bands.map((b) => ({ ...b, n: facet.filter(b.test).length }))
  const total = slices.reduce((s, b) => s + b.n, 0)
  const focus = slices.find((s) => s.id === (hover ?? selected))

  // Arcs on a 200x200 canvas; a 2px paper gap separates neighbouring slices.
  const R = 88
  const r = 58
  const shown = slices.filter((s) => s.n > 0)
  const arcs = shown.map((s, i) => {
    const before = shown.slice(0, i).reduce((sum, x) => sum + x.n, 0)
    const start = -Math.PI / 2 + (before / Math.max(1, total)) * Math.PI * 2
    const sweep = (s.n / Math.max(1, total)) * Math.PI * 2
    return { ...s, d: arcPath(100, 100, R, r, start, start + sweep) }
  })

  return (
    <div className="border-t-2 border-forest bg-paper-sunk px-5 pt-4 pb-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold tracking-tight">{BANDS[metric].title}</h2>
        <div role="tablist" aria-label="Chart metric" className="flex gap-1">
          {METRICS.map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={m === metric}
              onClick={() => setMetric(m)}
              className={cn(
                "min-h-9 rounded-[2px] border px-3 text-sm font-medium",
                m === metric ? "border-forest bg-forest text-paper" : "border-input bg-paper text-ink hover:border-forest",
              )}
            >
              {m === "transparency" ? "Transparency" : m === "size" ? "Size" : "To programs"}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid items-center gap-6 sm:grid-cols-[13rem_minmax(0,1fr)]">
        <div className="relative mx-auto w-52 max-w-full">
          <svg viewBox="0 0 200 200" className="block w-full" role="img" aria-label={`${BANDS[metric].title} of ${total} charities. Use the list beside the chart to filter.`}>
            {total === 0 ? <circle cx="100" cy="100" r={(R + r) / 2} fill="none" stroke={NEUTRAL} strokeWidth={R - r} /> : null}
            {arcs.map((a) => (
              <path
                key={a.id}
                d={a.d}
                fill={a.color}
                stroke="var(--paper-sunk)"
                strokeWidth={2}
                className="cursor-pointer transition-opacity duration-150"
                opacity={selected && selected !== a.id && hover !== a.id ? 0.35 : 1}
                onMouseEnter={() => setHover(a.id)}
                onMouseLeave={() => setHover(null)}
                onClick={() => onSelect(a.id)}
              >
                <title>{`${a.label}: ${a.n} ${a.n === 1 ? "charity" : "charities"}`}</title>
              </path>
            ))}
          </svg>
          <div className="pointer-events-none absolute inset-0 grid place-items-center text-center" aria-hidden>
            <div>
              <div className="figures text-3xl leading-none font-bold">{loading ? "–" : focus ? focus.n : total}</div>
              <div className="mt-1 max-w-[7rem] text-xs text-ink-2">{focus ? focus.label : "charities"}</div>
            </div>
          </div>
        </div>

        <ul className="figures text-sm" aria-label={`${BANDS[metric].title} breakdown`}>
          {slices.map((s) => {
            const on = selected === s.id
            return (
              <li key={s.id}>
                <button
                  type="button"
                  aria-pressed={on}
                  disabled={s.n === 0 && !on}
                  onClick={() => onSelect(s.id)}
                  onMouseEnter={() => setHover(s.id)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(s.id)}
                  onBlur={() => setHover(null)}
                  className={cn(
                    "flex min-h-10 w-full items-center gap-3 border-b border-rule px-1 text-left disabled:cursor-default disabled:text-ink-3",
                    on && "font-semibold",
                  )}
                >
                  <span aria-hidden className={cn("size-3.5 shrink-0", on && "outline-2 outline-offset-2 outline-forest")} style={{ background: s.color }} />
                  <span className="flex-1">{s.label}</span>
                  <span>{s.n}</span>
                  <span className="w-12 text-right text-ink-3">{total ? `${Math.round((s.n / total) * 100)}%` : "–"}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
      <p className="mt-3 text-[0.8125rem] text-ink-3">
        {selected ? "Click the slice again to clear it." : "Click a slice or a row to filter the list."}
      </p>
    </div>
  )
}

function arcPath(cx: number, cy: number, R: number, r: number, a0: number, a1: number): string {
  // A full circle can't be one arc; split it in two.
  if (a1 - a0 >= Math.PI * 2 - 1e-6) {
    const mid = a0 + Math.PI
    return arcPath(cx, cy, R, r, a0, mid) + " " + arcPath(cx, cy, R, r, mid, a1)
  }
  const large = a1 - a0 > Math.PI ? 1 : 0
  const p = (rad: number, a: number) => `${(cx + rad * Math.cos(a)).toFixed(2)} ${(cy + rad * Math.sin(a)).toFixed(2)}`
  return `M ${p(R, a0)} A ${R} ${R} 0 ${large} 1 ${p(R, a1)} L ${p(r, a1)} A ${r} ${r} 0 ${large} 0 ${p(r, a0)} Z`
}
