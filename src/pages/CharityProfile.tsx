import { useId, useState, type FormEvent, type ReactNode } from "react"
import { BadgeCheck, Check, CircleDashed } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  audited,
  charity,
  disbursements,
  expenses,
  match,
  presetGifts,
  programs,
  revenue,
  selfReported,
  type ProgramId,
} from "@/data/sample-charity"

const totalExpenses = expenses.programs + expenses.admin + expenses.fundraising
const totalRevenue = revenue.reduce((sum, r) => sum + r.amount, 0)
const programName = Object.fromEntries(programs.map((p) => [p.id, p.name])) as Record<ProgramId, string>

const share = {
  programs: expenses.programs / totalExpenses,
  admin: expenses.admin / totalExpenses,
  fundraising: expenses.fundraising / totalExpenses,
}
const cents = {
  programs: Math.round(share.programs * 100),
  admin: Math.round(share.admin * 100),
  fundraising: 0,
}
cents.fundraising = 100 - cents.programs - cents.admin

const whole = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
const exact = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 })
const count = new Intl.NumberFormat("en-US")
const pct = (n: number) => `${(n * 100).toFixed(1)}%`

/** Splits a gift in whole cents so the parts always add back to the total. */
function splitGift(amount: number) {
  const total = Math.round(amount * 100)
  const admin = Math.round(total * share.admin)
  const fundraising = Math.round(total * share.fundraising)
  const toPrograms = total - admin - fundraising
  let allotted = 0
  const byProgram = programs.map((p, i) => {
    const part =
      i === programs.length - 1 ? toPrograms - allotted : Math.round((toPrograms * p.spending) / expenses.programs)
    allotted += part
    return { id: p.id, name: p.name, amount: part / 100 }
  })
  return { programs: toPrograms / 100, admin: admin / 100, fundraising: fundraising / 100, byProgram }
}

export default function CharityProfile() {
  return (
    <div className="min-h-svh bg-paper text-ink">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:bg-paper focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <Masthead />
      <SampleNotice />

      <main id="main" className="mx-auto max-w-[76rem] px-4 sm:px-6 lg:px-10">
        <ProfileHeader />

        <div className="grid gap-x-12 lg:grid-cols-[minmax(0,1fr)_21rem] xl:gap-x-16">
          <Lead />
          <aside id="give" className="mt-10 scroll-mt-6 lg:sticky lg:top-6 lg:col-start-2 lg:row-span-6 lg:row-start-1 lg:mt-0 lg:self-start">
            <GiftComposer />
          </aside>
          <WhereTheMoneyWent />
          <Audit />
          <WhyMatched />
          <Programs />
        </div>
      </main>

      <Colophon />
    </div>
  )
}

/* ------------------------------------------------------------------ frame */

function Masthead() {
  const links = ["Matches", "Charities", "Your giving"]
  return (
    <header className="bg-forest-deep text-paper">
      <div className="mx-auto flex max-w-[76rem] flex-wrap items-center gap-x-8 px-4 sm:h-14 sm:flex-nowrap sm:px-6 lg:px-10">
        <a href="#" className="flex h-14 items-center text-[1.0625rem] font-bold tracking-[-0.01em] no-underline">
          Clear Cause
        </a>
        <nav
          aria-label="Primary"
          className="order-last -mx-4 h-11 w-[calc(100%+2rem)] border-t border-paper/15 px-4 sm:order-none sm:mx-0 sm:h-full sm:w-auto sm:border-t-0 sm:px-0"
        >
          <ul className="flex h-full items-stretch gap-6 text-sm">
            {links.map((label) => (
              <li key={label} className="flex">
                <a
                  href="#"
                  aria-current={label === "Matches" ? "page" : undefined}
                  className="flex items-center border-b-2 border-transparent pt-0.5 text-paper/80 no-underline transition-colors hover:text-paper aria-[current=page]:border-paper aria-[current=page]:text-paper"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <span
          className="ml-auto grid size-8 place-items-center rounded-full border border-paper/40 text-xs font-semibold"
          aria-label={`Signed in as ${match.donor}`}
        >
          {match.donor[0]}
        </span>
      </div>
    </header>
  )
}

function SampleNotice() {
  return (
    <div className="border-b border-rule bg-paper-sunk">
      <p className="mx-auto max-w-[76rem] px-4 py-2 text-[0.8125rem] leading-snug text-ink-2 sm:px-6 lg:px-10">
        <strong className="font-semibold text-ink">Sample profile.</strong> Northside Community Pantry, its suppliers
        and every figure on this page are illustrative. No real organization is shown.
      </p>
    </div>
  )
}

function ProfileHeader() {
  const contents = [
    ["Where the money went", "#money"],
    ["Audit", "#audit"],
    ["Why it matched you", "#match"],
    ["Programs", "#programs"],
  ]
  return (
    <header className="pt-6 pb-8 md:pt-8 md:pb-10 lg:pt-10">
      <nav aria-label="Breadcrumb" className="text-sm text-ink-2">
        <a href="#" className="underline decoration-rule hover:decoration-ink-2">
          Your matches
        </a>
        <span aria-hidden className="px-2 text-ink-3">
          /
        </span>
        <span aria-current="page">{charity.name}</span>
      </nav>

      <div className="mt-5 flex flex-col gap-5 md:flex-row md:items-end md:justify-between md:gap-10">
        <div>
          <h1 className="text-[2.125rem] leading-[1.05] font-bold tracking-[-0.025em] text-balance sm:text-[2.75rem]">
            {charity.name}
          </h1>
          <p className="mt-3 text-[0.9375rem] text-ink-2">
            {charity.kind} <Dot /> {charity.place} <Dot /> Since {charity.founded} <Dot /> {charity.people}
          </p>
        </div>
        <div className="flex shrink-0 items-start gap-2.5 border-t-2 border-forest pt-3 md:min-w-60">
          <BadgeCheck className="mt-0.5 size-5 text-forest" strokeWidth={1.75} aria-hidden />
          <div className="text-sm leading-snug">
            <p className="font-semibold text-forest-deep">{charity.partner.status}</p>
            <p className="text-ink-2">Audited {charity.partner.auditedOn}</p>
          </div>
        </div>
      </div>

      <p className="mt-6 hidden max-w-[62ch] font-serif text-[1.0625rem] leading-[1.6] text-ink-2 md:block">{charity.mission}</p>

      <nav aria-label="On this page" className="mt-8 border-y border-rule">
        <ul className="-mx-3 flex overflow-x-auto text-sm font-medium whitespace-nowrap [scrollbar-width:none]">
          {contents.map(([label, href]) => (
            <li key={href}>
              <a href={href} className="block px-3 py-2.5 text-ink-2 no-underline hover:text-forest hover:underline">
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  )
}

function Dot() {
  return (
    <span aria-hidden className="px-1 text-ink-3">
      ·
    </span>
  )
}

function SectionOpener({ id, title, children }: { id: string; title: string; children?: ReactNode }) {
  return (
    <div id={id} className="scroll-mt-6 border-t-2 border-forest pt-4">
      <h2 id={`${id}-title`} className="text-[1.5rem] leading-tight font-bold tracking-[-0.015em]">{title}</h2>
      {children ? <div className="mt-2 max-w-[62ch] font-serif text-[1.0625rem] leading-[1.6] text-ink-2">{children}</div> : null}
    </div>
  )
}

/* ------------------------------------------------------------- the dollar */

function Lead() {
  const parts = [
    { key: "programs", label: "Programs", cents: cents.programs, amount: expenses.programs, swatch: "bg-money" },
    { key: "admin", label: "Management and admin", cents: cents.admin, amount: expenses.admin, swatch: "bg-admin" },
    { key: "fundraising", label: "Fundraising", cents: cents.fundraising, amount: expenses.fundraising, swatch: "bg-fundraising" },
  ] as const

  return (
    <section aria-labelledby="lead-heading" className="lg:col-start-1">
      <h2 id="lead-heading" className="text-[1.625rem] leading-[1.2] font-semibold tracking-[-0.02em] text-balance sm:text-[2.125rem]">
        Of every $1.00 Northside spent in fiscal 2025,{" "}
        <span className="figures money-mark whitespace-nowrap">{cents.programs}¢</span> went straight to its programs.
      </h2>

      <figure className="mt-7">
        <div
          role="img"
          aria-label={`A dollar as 100 cents: ${cents.programs} to programs, ${cents.admin} to management and admin, ${cents.fundraising} to fundraising.`}
          className="grid grid-cols-[repeat(20,minmax(0,1fr))] gap-[3px] sm:grid-cols-[repeat(50,minmax(0,1fr))]"
        >
          {parts.flatMap((p) =>
            Array.from({ length: p.cents }, (_, i) => <span key={`${p.key}-${i}`} className={cn("aspect-square", p.swatch)} />),
          )}
        </div>

        <figcaption>
          <table className="figures mt-5 w-full text-[0.9375rem]">
            <caption className="sr-only">Fiscal 2025 expenses by category</caption>
            <tbody>
              {parts.map((p) => (
                <tr key={p.key} className="border-b border-rule last:border-b-0">
                  <th scope="row" className="py-2 text-left font-normal">
                    <span className="flex items-center gap-2.5">
                      <span aria-hidden className={cn("size-3 shrink-0", p.swatch)} />
                      {p.label}
                    </span>
                  </th>
                  <td className="w-16 py-2 text-right font-semibold">{p.cents}¢</td>
                  <td className="w-28 py-2 text-right text-ink-2">{whole.format(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </figcaption>
      </figure>

      <p className="mt-8 font-serif text-[1.0625rem] leading-[1.6] text-ink-2 md:hidden">{charity.mission}</p>
    </section>
  )
}

/* --------------------------------------------------------- gift composer */

function GiftComposer() {
  const [amount, setAmount] = useState(50)
  const [custom, setCustom] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const customId = useId()
  const errorId = useId()

  const split = splitGift(amount)

  function chooseCustom(value: string) {
    setCustom(value)
    setSubmitted(false)
    const cleaned = value.replace(/[$,\s]/g, "")
    if (cleaned === "") {
      setError(null)
      return
    }
    const n = Number(cleaned)
    if (!Number.isFinite(n) || n < 1) {
      setError("Enter an amount of $1 or more.")
      return
    }
    if (n > 100_000) {
      setError("For gifts over $100,000, contact Northside directly.")
      return
    }
    setError(null)
    setAmount(Math.round(n * 100) / 100)
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!error) setSubmitted(true)
  }

  return (
    <form onSubmit={onSubmit} className="border-t-2 border-forest bg-paper-sunk px-5 pt-4 pb-5" aria-labelledby="give-heading">
      <h2 id="give-heading" className="text-lg font-bold tracking-[-0.01em]">
        Give to Northside
      </h2>

      <fieldset className="mt-4">
        <legend className="text-sm text-ink-2">Gift amount</legend>
        <div className="mt-2 grid grid-cols-4 gap-1.5">
          {presetGifts.map((g) => {
            const active = custom === "" && amount === g
            return (
              <button
                key={g}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setAmount(g)
                  setCustom("")
                  setError(null)
                  setSubmitted(false)
                }}
                className={cn(
                  "figures h-10 rounded-[2px] border text-[0.9375rem] font-semibold transition-colors",
                  active
                    ? "border-forest bg-forest text-paper"
                    : "border-input bg-paper text-ink hover:border-forest hover:text-forest-deep",
                )}
              >
                ${g}
              </button>
            )
          })}
        </div>
        <label htmlFor={customId} className="mt-3 block text-sm text-ink-2">
          Or another amount
        </label>
        <div
          className={cn(
            "mt-1.5 flex h-10 items-center rounded-[2px] border bg-paper px-3 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-forest",
            error ? "border-destructive" : "border-input",
          )}
        >
          <span aria-hidden className="text-ink-3">
            $
          </span>
          <input
            id={customId}
            inputMode="decimal"
            autoComplete="off"
            placeholder="0.00"
            value={custom}
            onChange={(e) => chooseCustom(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className="figures h-full w-full bg-transparent pl-1.5 text-[0.9375rem] text-ink outline-none placeholder:text-ink-3"
          />
        </div>
        {error ? (
          <p id={errorId} className="mt-1.5 text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </fieldset>

      <div className="mt-5" aria-live="polite">
        <p className="text-sm text-ink-2">
          How <span className="figures font-semibold text-ink">{exact.format(amount)}</span> divides at fiscal 2025 ratios
        </p>
        <table className="figures mt-2 w-full text-[0.9375rem]">
          <tbody>
            <tr>
              <th scope="row" className="py-1.5 text-left font-semibold">
                Programs
              </th>
              <td className="py-1.5 text-right font-semibold">
                <span key={amount} className="money-mark money-mark-sweep">
                  {exact.format(split.programs)}
                </span>
              </td>
            </tr>
            {split.byProgram.map((p) => (
              <tr key={p.id} className="text-ink-2">
                <th scope="row" className="py-1 pl-3 text-left text-sm font-normal">
                  {p.name}
                </th>
                <td className="py-1 text-right text-sm">
                  <span key={amount} className="money-mark money-mark-sweep">
                    {exact.format(p.amount)}
                  </span>
                </td>
              </tr>
            ))}
            <tr className="border-t border-rule">
              <th scope="row" className="pt-2 pb-1 text-left font-normal">
                Management and admin
              </th>
              <td className="pt-2 pb-1 text-right">{exact.format(split.admin)}</td>
            </tr>
            <tr>
              <th scope="row" className="py-1 text-left font-normal">
                Fundraising
              </th>
              <td className="py-1 text-right">{exact.format(split.fundraising)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <Button
        type="submit"
        disabled={Boolean(error)}
        className="mt-5 h-11 w-full rounded-[2px] text-[0.9375rem] font-semibold hover:bg-forest-deep"
      >
        Continue to give {exact.format(amount).replace(".00", "")}
      </Button>
      {submitted ? (
        <p role="status" className="mt-3 text-sm text-ink-2">
          This is a sample profile, so checkout isn't connected yet.
        </p>
      ) : (
        <p className="mt-3 text-[0.8125rem] leading-snug text-ink-3">
          Illustrative split based on last year's audited spending. It shows proportions, not where a single gift is
          earmarked.
        </p>
      )}
    </form>
  )
}

/* ------------------------------------------------- where the money went */

function WhereTheMoneyWent() {
  const ledgerTotal = disbursements.reduce((s, d) => s + d.amount, 0)
  return (
    <section aria-labelledby="money-title" className="mt-16 lg:col-start-1">
      <SectionOpener id="money" title="Where the money went">
        The full fiscal 2025 statement, then the most recent payments Northside made to run its programs.
      </SectionOpener>

      <div className="mt-8 grid gap-x-10 gap-y-8 md:grid-cols-2">
        <StatementBlock
          title="Came in"
          rows={revenue.map((r) => ({ label: r.label, amount: r.amount }))}
          total={{ label: "Total income", amount: totalRevenue }}
        />
        <StatementBlock
          title="Went out"
          rows={[
            { label: "Programs", amount: expenses.programs, money: true },
            { label: "Management and admin", amount: expenses.admin },
            { label: "Fundraising", amount: expenses.fundraising },
          ]}
          total={{ label: "Total expenses", amount: totalExpenses }}
        />
      </div>
      <p className="figures mt-4 text-sm text-ink-2">
        {whole.format(totalRevenue - totalExpenses)} left over, carried into the food reserve for winter.{" "}
        <span className="text-ink-3">{charity.period}.</span>
      </p>

      <h3 className="mt-12 text-lg font-bold tracking-[-0.01em]">Recent payments</h3>
      <table className="figures mt-3 w-full text-[0.9375rem]">
        <caption className="sr-only">Payments made in June and late May 2025</caption>
        <thead>
          <tr className="border-b border-ink text-left text-[0.8125rem] text-ink-2">
            <th scope="col" className="w-16 py-2 font-medium">
              Date
            </th>
            <th scope="col" className="py-2 font-medium">
              Paid to
            </th>
            <th scope="col" className="hidden py-2 font-medium md:table-cell">
              Program
            </th>
            <th scope="col" className="py-2 text-right font-medium">
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {disbursements.map((d) => (
            <tr key={`${d.date}-${d.payee}`} className="border-b border-rule align-top">
              <td className="py-3 pr-3 whitespace-nowrap text-ink-2">{d.date}</td>
              <td className="py-3 pr-3">
                <span className="font-medium">{d.payee}</span>
                <span className="block text-sm text-ink-2">{d.purpose}</span>
                <span className="block text-sm text-ink-3 md:hidden">{programName[d.program]}</span>
              </td>
              <td className="hidden py-3 pr-3 text-ink-2 md:table-cell">{programName[d.program]}</td>
              <td className="py-3 text-right font-medium whitespace-nowrap">
                {exact.format(d.amount)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" colSpan={2} className="pt-3 text-left text-sm font-normal text-ink-2 md:hidden">
              {disbursements.length} payments
            </th>
            <th scope="row" colSpan={3} className="hidden pt-3 text-left text-sm font-normal text-ink-2 md:table-cell">
              {disbursements.length} most recent payments
            </th>
            <td className="pt-3 text-right font-semibold md:hidden">
              <span className="money-mark">{exact.format(ledgerTotal)}</span>
            </td>
            <td className="hidden pt-3 text-right font-semibold md:table-cell">
              <span className="money-mark">{exact.format(ledgerTotal)}</span>
            </td>
          </tr>
        </tfoot>
      </table>
    </section>
  )
}

function StatementBlock({
  title,
  rows,
  total,
}: {
  title: string
  rows: { label: string; amount: number; money?: boolean }[]
  total: { label: string; amount: number }
}) {
  return (
    <table className="figures w-full text-[0.9375rem]">
      <caption className="pb-2 text-left text-lg font-bold tracking-[-0.01em]">{title}</caption>
      <tbody>
        {rows.map((r) => (
          <tr key={r.label} className="border-b border-rule">
            <th scope="row" className="py-2 pr-3 text-left font-normal">
              {r.label}
            </th>
            <td className="py-2 text-right whitespace-nowrap">
              {r.money ? <span className="money-mark font-semibold">{whole.format(r.amount)}</span> : whole.format(r.amount)}
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <th scope="row" className="pt-2.5 pr-3 text-left font-semibold">
            {total.label}
          </th>
          <td className="pt-2.5 text-right font-semibold">
            <span className="border-b-[3px] border-double border-ink pb-0.5">{whole.format(total.amount)}</span>
          </td>
        </tr>
      </tfoot>
    </table>
  )
}

/* ------------------------------------------------------------------ audit */

function Audit() {
  return (
    <section aria-labelledby="audit-title" className="mt-20 lg:col-start-1">
      <SectionOpener id="audit" title="What was audited, and what wasn't">
        Northside became a vetted partner after an {charity.partner.auditor} of its fiscal 2025 books, completed{" "}
        {charity.partner.auditedOn}. The audit checks the money. The counts Northside reports about its work are its own
        and haven't been verified.
      </SectionOpener>

      <div className="mt-8 grid gap-x-10 gap-y-10 md:grid-cols-2">
        <div>
          <h3 className="flex items-center gap-2 border-b border-ink pb-2 text-[0.9375rem] font-bold">
            <Check className="size-4 text-forest" strokeWidth={2.5} aria-hidden />
            Checked by the audit
          </h3>
          <ul>
            {audited.map((c) => (
              <li key={c.label} className="border-b border-rule py-3">
                <p className="font-semibold">{c.label}</p>
                <p className="text-[0.9375rem] text-ink-2">{c.detail}</p>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="flex items-center gap-2 border-b border-dashed border-ink-3 pb-2 text-[0.9375rem] font-bold">
            <CircleDashed className="size-4 text-ink-3" strokeWidth={2} aria-hidden />
            Reported by Northside, not audited
          </h3>
          <dl className="figures">
            {selfReported.map((c) => (
              <div key={c.label} className="flex items-baseline justify-between gap-4 border-b border-dashed border-rule py-3">
                <dt className="text-ink-2">{c.label}</dt>
                <dd className="font-semibold">{c.detail}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 font-serif text-[0.9375rem] leading-[1.55] text-ink-2">
            Clear Cause shows these counts as Northside reports them. Treat them as the charity's own account.
          </p>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ match */

function WhyMatched() {
  return (
    <section aria-labelledby="match-title" className="mt-20 lg:col-start-1">
      <SectionOpener id="match" title="Why Northside is in your matches">
        It meets all {match.reasons.length} of the preferences you set, {match.donor}. You can change them at any time.
      </SectionOpener>

      <table className="mt-8 w-full text-[0.9375rem]">
        <caption className="sr-only">Your giving preferences compared with Northside</caption>
        <thead>
          <tr className="border-b border-ink text-left text-[0.8125rem] text-ink-2">
            <th scope="col" className="w-20 py-2 font-medium">
              <span className="sr-only">Preference</span>
            </th>
            <th scope="col" className="py-2 pr-3 font-medium">
              You asked for
            </th>
            <th scope="col" className="py-2 font-medium">
              Northside
            </th>
            <th scope="col" className="w-8 py-2">
              <span className="sr-only">Met</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {match.reasons.map((r) => (
            <tr key={r.preference} className="border-b border-rule align-top">
              <th scope="row" className="py-3 pr-3 text-left text-sm font-medium text-ink-2">
                {r.preference}
              </th>
              <td className="py-3 pr-3">{r.yours}</td>
              <td className="figures py-3 pr-3 font-medium">{r.theirs}</td>
              <td className="py-3 text-right">
                <Check className="ml-auto size-4 text-forest" strokeWidth={2.5} aria-label="Met" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-4 text-sm">
        <a href="#" className="font-medium text-forest underline decoration-forest/40 hover:decoration-forest">
          Edit your giving preferences
        </a>
      </p>
    </section>
  )
}

/* --------------------------------------------------------------- programs */

function Programs() {
  return (
    <section aria-labelledby="programs-title" className="mt-20 mb-24 lg:col-start-1">
      <SectionOpener id="programs" title="Programs and what they cost">
        Three programs took {whole.format(expenses.programs)} last year. Spending is audited. What each program delivered
        is Northside's own count, so each unit cost divides audited spending by a reported number.
      </SectionOpener>

      <ol className="mt-6">
        {programs.map((p) => (
          <li key={p.id} className="grid gap-x-10 gap-y-4 border-b border-rule py-7 md:grid-cols-[minmax(0,1fr)_15rem]">
            <div>
              <h3 className="text-lg font-bold tracking-[-0.01em]">{p.name}</h3>
              <p className="mt-2 max-w-[60ch] font-serif text-[1.0625rem] leading-[1.6] text-ink-2">{p.description}</p>
            </div>
            <dl className="figures grid grid-cols-2 gap-x-4 gap-y-3 self-start text-[0.9375rem] md:grid-cols-1 md:gap-y-2">
              <ProgramFigure label="Spent">
                <span className="money-mark font-semibold">{whole.format(p.spending)}</span>
                <span className="text-ink-3"> · {pct(p.spending / expenses.programs)}</span>
              </ProgramFigure>
              <ProgramFigure label="Cost" reported>
                {exact.format(p.unitCost.value)} {p.unitCost.unit}
              </ProgramFigure>
              <ProgramFigure label="Delivered" reported>
                {count.format(p.output.value)} {p.output.unit}
              </ProgramFigure>
              <ProgramFigure label="Reached" reported>
                {p.reach}
              </ProgramFigure>
            </dl>
          </li>
        ))}
      </ol>
    </section>
  )
}

function ProgramFigure({ label, reported, children }: { label: string; reported?: boolean; children: ReactNode }) {
  return (
    <div className="md:flex md:items-baseline md:justify-between md:gap-3">
      <dt className="flex items-center gap-1 text-sm text-ink-2">
        {label}
        {reported ? (
          <>
            <CircleDashed className="size-3 text-ink-3" strokeWidth={2} aria-hidden />
            <span className="sr-only">(reported by Northside, not audited)</span>
          </>
        ) : null}
      </dt>
      <dd className="font-medium md:text-right">{children}</dd>
    </div>
  )
}

/* --------------------------------------------------------------- colophon */

function Colophon() {
  return (
    <footer className="bg-forest-deep text-paper">
      <div className="mx-auto flex max-w-[76rem] flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-end md:justify-between lg:px-10">
        <div className="max-w-[56ch]">
          <p className="font-bold">Clear Cause</p>
          <p className="mt-2 text-sm leading-relaxed text-paper/80">
            Figures on this sample profile follow the layout of a partner's audited annual statement. They are
            illustrative and describe no real organization.
          </p>
        </div>
        <a
          href="#give"
          className="inline-flex h-11 items-center self-start rounded-[2px] border border-paper/50 px-5 text-[0.9375rem] font-semibold text-paper no-underline hover:border-paper hover:bg-paper hover:text-forest-deep md:self-auto"
        >
          Give to Northside
        </a>
      </div>
    </footer>
  )
}
