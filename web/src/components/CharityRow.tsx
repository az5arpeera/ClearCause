import { ArrowRight } from "lucide-react"

import { causes } from "@/data/causes"
import type { CharityDetail } from "@/lib/db"
import { compactUsd } from "@/lib/money"
import { cn } from "@/lib/utils"

const causeLabel = Object.fromEntries(causes.map((c) => [c.id, c.label])) as Record<string, string>

/** A compact 100-cent bar: how much of each dollar reached programs. */
export function CentsBar({ pct }: { pct: number }) {
  return (
    <div data-money className="flex items-center gap-3">
      <div role="img" aria-label={`${pct} of every 100 cents reached programs`} className="grid w-40 shrink-0 grid-cols-[repeat(25,minmax(0,1fr))] gap-[2px] sm:w-56">
        {Array.from({ length: 25 }, (_, i) => (
          <span key={i} className={i < Math.round(pct / 4) ? "aspect-square bg-money" : "aspect-square bg-admin/35"} />
        ))}
      </div>
      <span className="figures shrink-0 text-sm font-semibold">{pct}¢ of $1 to programs</span>
    </div>
  )
}

/**
 * One charity in a list (Explore, For You): name, fit, where and how big, the
 * cents-to-programs bar when the statement breaks it out, and why it's listed.
 */
export function CharityRow({
  charity,
  score,
  reasons = [],
  cautions = [],
  query,
}: {
  charity: CharityDetail
  score?: number | null
  reasons?: string[]
  cautions?: string[]
  query?: URLSearchParams
}) {
  const href = `${charity.href}${query && query.size ? `?${query}` : ""}`
  const meta = [
    charity.causes.map((c) => causeLabel[c]).join(", "),
    charity.place,
    charity.annualBudgetUsd != null ? `${compactUsd(charity.annualBudgetUsd)} a year` : null,
  ].filter(Boolean)

  return (
    <li className="border-b border-rule py-6">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-lg font-bold tracking-tight">
          <a href={href} className="no-underline hover:text-forest hover:underline">
            {charity.name}
          </a>
        </h2>
        {score != null ? (
          <span className="figures shrink-0 rounded-[2px] bg-forest-soft px-2 py-1 text-sm font-semibold text-forest-deep">{score}% fit</span>
        ) : null}
      </div>
      <p className="mt-1 text-sm text-ink-2">{meta.join(" · ")}</p>
      {charity.description ? <p className="mt-2 max-w-[62ch] font-serif text-ink-2">{charity.description}</p> : null}
      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
        {charity.directPct != null ? (
          <CentsBar pct={charity.directPct} />
        ) : (
          <span className="text-sm text-ink-3">Program share not broken out yet</span>
        )}
        <span className="figures text-sm text-ink-2">
          Transparency <span className="font-semibold text-ink">{charity.transparencyScore != null ? `${charity.transparencyScore}/100` : "not scored"}</span>
        </span>
        {charity.isPartner ? <span className="text-sm font-semibold text-forest-deep">Vetted partner</span> : null}
      </div>
      {reasons.length > 0 ? <p className="mt-3 text-sm font-medium text-forest">{reasons.join(" · ")}</p> : null}
      {cautions.length > 0 ? <p className={cn("mt-1 text-sm text-ink-2")}>{cautions.join(" · ")}</p> : null}
      <a href={href} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-forest underline decoration-forest/40 hover:decoration-forest">
        See where the money goes
        <ArrowRight className="size-3.5" aria-hidden />
      </a>
    </li>
  )
}
