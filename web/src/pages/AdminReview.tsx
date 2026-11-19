import { useCallback, useEffect, useState } from "react"
import { Check, ExternalLink, X } from "lucide-react"

import { CentsBar } from "@/components/CharityRow"
import { PageFrame } from "@/components/Glass"
import { causes, type CauseId } from "@/data/causes"
import { useAuth } from "@/lib/auth"
import {
  fetchCauses,
  fetchIsAdmin,
  fetchPendingCharities,
  setCharityCauses,
  setVettingStatus,
  type CauseRow,
  type CharityDetail,
} from "@/lib/db"
import { glassChip, glassPanel, solidButton } from "@/lib/glass"
import { useLiquidGlass } from "@/lib/liquid-glass"
import { whole } from "@/lib/money"
import { cn } from "@/lib/utils"

const PAGE = 25

/**
 * Admin-only: charities the weekly discovery job imported as pending. Check
 * the figures against the source, fix the causes, then approve or reject.
 */
export default function AdminReview() {
  const { user, loading } = useAuth()
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)

  useEffect(() => {
    if (loading) return
    if (!user) {
      setIsAdmin(false)
      return
    }
    let active = true
    fetchIsAdmin(user.id).then((ok) => active && setIsAdmin(ok))
    return () => {
      active = false
    }
  }, [user, loading])

  if (isAdmin === null) {
    return (
      <PageFrame title="Review new charities">
        <p className="mt-6 text-ink-2">Checking your access…</p>
      </PageFrame>
    )
  }
  if (!isAdmin) return <NotAdmin signedIn={Boolean(user)} />
  return <ReviewQueue />
}

function NotAdmin({ signedIn }: { signedIn: boolean }) {
  return (
    <PageFrame title="Review new charities" width="narrow">
      <div className={cn(glassPanel, "mt-8 p-6")} data-refract="0.4">
        <h2 className="text-lg font-bold tracking-tight">Admins only</h2>
        <p className="mt-2 text-ink-2">
          {signedIn
            ? "Your account isn't an admin. Someone with Supabase access can make you one in the SQL Editor:"
            : "Sign in with an admin account to review charities."}
        </p>
        {signedIn ? (
          <pre className="mt-3 overflow-x-auto rounded-[12px] bg-ink px-4 py-3 text-[0.8125rem] leading-relaxed text-paper">
            {"update public.profiles set role = 'admin'\nwhere id = (select id from auth.users where email = 'YOUR EMAIL');"}
          </pre>
        ) : (
          <a href="/signin" className={cn(solidButton, "mt-4")}>Sign in</a>
        )}
      </div>
    </PageFrame>
  )
}

function ReviewQueue() {
  const [items, setItems] = useState<CharityDetail[] | null>(null)
  const [total, setTotal] = useState(0)
  const [causeRows, setCauseRows] = useState<CauseRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState({ approved: 0, rejected: 0 })
  useLiquidGlass(items?.length)

  const load = useCallback(async (offset: number) => {
    try {
      const { charities, total } = await fetchPendingCharities(offset, PAGE)
      setItems((prev) => (offset === 0 || !prev ? charities : [...prev, ...charities.filter((c) => !prev.some((p) => p.id === c.id))]))
      setTotal(total)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load the queue")
    }
  }, [])

  useEffect(() => {
    void load(0)
    fetchCauses().then(setCauseRows, () => setCauseRows([]))
  }, [load])

  const settle = (id: string, outcome: "approved" | "rejected") => {
    setItems((prev) => prev?.filter((c) => c.id !== id) ?? null)
    setTotal((t) => Math.max(0, t - 1))
    setDone((d) => ({ ...d, [outcome]: d[outcome] + 1 }))
  }

  return (
    <PageFrame
      title="Review new charities"
      intro={
        items
          ? `${total} waiting. Check each figure against its source, fix the causes, then approve or reject. Approved charities appear on the site straight away.`
          : "Loading the queue…"
      }
      below={
        done.approved + done.rejected > 0 ? (
          <p role="status" className="figures text-sm font-semibold text-forest">
            This session: {done.approved} approved, {done.rejected} rejected.
          </p>
        ) : null
      }
    >
      {error ? <p role="alert" className="mt-6 text-destructive">{error}</p> : null}
      {items && items.length === 0 ? (
        <div className="mt-8 border-t-2 border-forest pt-5">
          <p className="font-semibold">Nothing waiting.</p>
          <p className="mt-1 text-ink-2">The weekly discovery job adds new charities every Monday.</p>
        </div>
      ) : null}
      <ol className="mt-8 grid gap-5">
        {items?.map((c) => (
          <ReviewCard key={c.id} charity={c} causeRows={causeRows} onDone={(outcome) => settle(c.id, outcome)} />
        ))}
      </ol>
      {items && items.length < total ? (
        <button type="button" onClick={() => load(items.length)} className={cn(glassChip, "mt-6")}>
          Load more ({total - items.length} left)
        </button>
      ) : null}
    </PageFrame>
  )
}

function ReviewCard({
  charity,
  causeRows,
  onDone,
}: {
  charity: CharityDetail
  causeRows: CauseRow[]
  onDone: (outcome: "approved" | "rejected") => void
}) {
  const [picked, setPicked] = useState<CauseId[]>([...charity.causes])
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null)
  const [error, setError] = useState<string | null>(null)
  const latest = charity.financials[0]
  const changedCauses = picked.length !== charity.causes.length || picked.some((c) => !charity.causes.includes(c))

  const act = async (kind: "approve" | "reject") => {
    setBusy(kind)
    setError(null)
    try {
      if (kind === "approve" && changedCauses) await setCharityCauses(charity.id, picked, causeRows)
      await setVettingStatus(charity.id, kind === "approve" ? "vetted" : "rejected")
      onDone(kind === "approve" ? "approved" : "rejected")
    } catch (e) {
      setError(e instanceof Error ? e.message : "That didn't save. Try again.")
      setBusy(null)
    }
  }

  return (
    <li className="rounded-[12px] border border-rule bg-paper p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold tracking-tight">{charity.name}</h2>
          <p className="mt-0.5 text-sm text-ink-2">{charity.place || "Location not listed"}</p>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {charity.websiteUrl ? (
            <a href={charity.websiteUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-forest underline">
              Website <ExternalLink className="size-3.5" aria-hidden />
            </a>
          ) : null}
          {latest?.sourceUrl ? (
            <a href={latest.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-forest underline">
              Source for the figures <ExternalLink className="size-3.5" aria-hidden />
            </a>
          ) : null}
        </div>
      </div>

      {charity.description ? <p className="mt-3 max-w-[70ch] font-serif text-ink-2">{charity.description}</p> : null}

      <div data-money className="mt-4 grid gap-x-8 gap-y-2 border-y border-rule py-3 text-sm sm:grid-cols-[repeat(3,auto)_1fr] sm:items-center">
        {latest ? (
          <>
            <span className="text-ink-2">Year <strong className="figures text-ink">{latest.fiscalYear}</strong></span>
            <span className="text-ink-2">Took in <strong className="figures text-ink">{latest.totalRevenue != null ? whole.format(latest.totalRevenue) : "–"}</strong></span>
            <span className="text-ink-2">Spent <strong className="figures text-ink">{latest.totalExpenses != null ? whole.format(latest.totalExpenses) : "–"}</strong></span>
            {charity.directPct != null ? <CentsBar pct={charity.directPct} /> : <span className="text-ink-3">Program split not reported</span>}
          </>
        ) : (
          <span className="text-ink-3">No figures were found. Consider rejecting, or approve and add figures later.</span>
        )}
      </div>

      <fieldset className="mt-4">
        <legend className="text-sm font-semibold">Causes {picked.length === 0 ? <span className="font-normal text-destructive">(pick at least one to approve)</span> : null}</legend>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {causes.map((c) => {
            const on = picked.includes(c.id)
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={on}
                onClick={() => setPicked((p) => (on ? p.filter((x) => x !== c.id) : [...p, c.id]))}
                className={cn(glassChip, "min-h-9 px-3", on && "lg-selected")}
              >
                {on ? <Check className="size-3.5" strokeWidth={2.75} aria-hidden /> : null}
                {c.label}
              </button>
            )
          })}
        </div>
      </fieldset>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button type="button" disabled={busy !== null || picked.length === 0} onClick={() => act("approve")} className={solidButton}>
          <Check className="size-4" aria-hidden />
          {busy === "approve" ? "Approving…" : "Approve"}
        </button>
        <button type="button" disabled={busy !== null} onClick={() => act("reject")} className={glassChip}>
          <X className="size-4" aria-hidden />
          {busy === "reject" ? "Rejecting…" : "Reject"}
        </button>
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      </div>
    </li>
  )
}
