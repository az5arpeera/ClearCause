import { useEffect, useId, useMemo, useState, type FormEvent, type ReactNode } from "react"
import { ArrowRight, BadgeCheck, Check, CircleDashed, ExternalLink, Minus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { FloatingDonate } from "@/components/FloatingDonate"
import { PageBackdrop } from "@/components/Glass"
import { choiceButton, choiceOff, choiceOn, enterFade, glassChip, refract, solidButton } from "@/lib/glass"
import { Bone } from "@/components/Skeleton"
import { SiteHeader } from "@/components/SiteHeader"
import { stateName } from "@/data/us-states"
import { causes } from "@/data/causes"
import { NORTHSIDE_ID, northsideExtras, presetGifts } from "@/data/sample-charity"
import { fetchCharityDetail, type CharityDetail, type CharityFinancials } from "@/lib/db"
import { useLiquidGlass } from "@/lib/liquid-glass"
import { rankCharities, readPreferences, smallBudgetUsd } from "@/lib/matching"
import { preferencesQuery, readLocalPreferences } from "@/lib/preferences"
import { compactUsd, count, exact, spendingParts, splitAmount, whole, type SpendPart } from "@/lib/money"
import { cn } from "@/lib/utils"
import { SiteFooter } from "@/components/SiteFooter"

const causeLabel = Object.fromEntries(causes.map((c) => [c.id, c.label])) as Record<string, string>
const HIDE_DONATE_WHILE = ["#give"]

/** Seeded demo charities use example.org addresses; real ones won't. */
const isSampleCharity = (c: CharityDetail) => Boolean(c.websiteUrl?.includes(".example.org"))

/** Charity names don't shorten reliably ("River Bend Reading Corps"), so copy uses the full name. */
const shortName = (name: string) => name

export default function CharityProfile({ id }: { id: string }) {
  const [charity, setCharity] = useState<CharityDetail | null | undefined>(undefined)
  useLiquidGlass(charity)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    fetchCharityDetail(id)
      .then((c) => {
        if (!active) return
        setCharity(c)
        if (c) document.title = `${c.name} · Clear Cause`
      })
      .catch((e: unknown) => active && setError(e instanceof Error ? e.message : "Could not load this charity"))
    return () => {
      active = false
    }
  }, [id])

  return (
    <div className="relative isolate min-h-svh overflow-x-clip bg-paper text-ink">
      <PageBackdrop />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:bg-paper focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <SiteHeader />
      {error ? (
        <StatePage title="This profile didn't load">
          {error}. Check your connection and try again.
        </StatePage>
      ) : charity === undefined ? (
        <ProfileSkeleton />
      ) : charity === null ? (
        <StatePage title="We couldn't find that charity">
          It may not be vetted yet, or the link may be wrong.
        </StatePage>
      ) : (
        <Profile charity={charity} />
      )}
      {charity ? null : <SiteFooter />}
    </div>
  )
}

/** The profile's shape while it loads, so the page doesn't jump when it arrives. */
function ProfileSkeleton() {
  return (
    <main id="main" className="mx-auto max-w-[76rem] px-4 sm:px-6 lg:px-10" aria-busy>
      <span role="status" className="sr-only">Loading charity…</span>
      <div aria-hidden className="pt-6 pb-8 md:pt-8 md:pb-10 lg:pt-10">
        <Bone className="h-4 w-40" />
        <Bone className="mt-4 h-10 w-[28rem] max-w-[85%]" />
        <Bone className="mt-3 h-4 w-64 max-w-[70%]" />
        <Bone className="mt-5 h-4 w-[26rem] max-w-full" />
        <Bone className="mt-2 h-4 w-80 max-w-[75%]" />
        <div className="mt-8 flex gap-2">
          {[36, 32, 44, 24].map((w) => (
            <Bone key={w} className="h-10 rounded-[12px]" style={{ width: `${w * 0.25}rem` }} />
          ))}
        </div>
      </div>
      <div aria-hidden className="grid gap-x-12 lg:grid-cols-[minmax(0,1fr)_21rem] xl:gap-x-16">
        <div className="border-t-2 border-rule pt-4">
          <Bone className="h-8 w-[30rem] max-w-full" />
          <Bone className="mt-3 h-8 w-80 max-w-[80%]" />
          <Bone className="mt-6 h-6 w-full" />
          <Bone className="mt-6 h-4 w-full" />
          <Bone className="mt-3 h-4 w-full" />
        </div>
        <Bone className="mt-10 h-72 rounded-[12px] lg:mt-0" />
      </div>
    </main>
  )
}

function StatePage({ title, children, busy }: { title: string; children: ReactNode; busy?: boolean }) {
  return (
    <main id="main" className="mx-auto max-w-[76rem] px-4 py-16 sm:px-6 lg:px-10 lg:py-24" aria-busy={busy || undefined}>
      <div className="max-w-[40rem] border-t-2 border-forest pt-5">
        <h1 className="text-[2rem] leading-tight font-bold tracking-[-0.02em]">{title}</h1>
        <p className="mt-3 font-serif text-[1.0625rem] leading-[1.6] text-ink-2">{children}</p>
        {!busy ? (
          <a href="/explore" className={cn(solidButton, "mt-8")}>
            Browse charities
            <ArrowRight className="size-4" aria-hidden />
          </a>
        ) : null}
      </div>
    </main>
  )
}

const prefKeys = ["causes", "region", "size", "direct"]

function Profile({ charity }: { charity: CharityDetail }) {
  const latest = charity.financials[0]
  const parts = latest ? spendingParts(latest) : null
  const extras = charity.id === NORTHSIDE_ID ? northsideExtras : null
  const sample = isSampleCharity(charity)
  // Answers in the link win; otherwise use the donor's saved quiz answers.
  const params = useMemo(() => {
    const fromUrl = new URLSearchParams(window.location.search)
    if (prefKeys.some((k) => fromUrl.has(k))) return fromUrl
    const saved = readLocalPreferences()
    return saved ? preferencesQuery(saved) : fromUrl
  }, [])
  const hasPrefs = prefKeys.some((k) => params.has(k))

  return (
    <>
      {sample ? <SampleNotice name={charity.name} /> : null}
      <main id="main" className={cn("mx-auto max-w-[76rem] px-4 sm:px-6 lg:px-10", enterFade)}>
        <ProfileHeader charity={charity} hasPrefs={hasPrefs} hasPrograms={Boolean(extras)} />

        <div className="grid gap-x-12 lg:grid-cols-[minmax(0,1fr)_21rem] xl:gap-x-16">
          {latest && parts ? <Lead charity={charity} year={latest} parts={parts} /> : <NoFigures charity={charity} year={latest} />}
          <aside id="give" className="mt-10 scroll-mt-24 lg:sticky lg:top-24 lg:col-start-2 lg:row-span-6 lg:row-start-1 lg:mt-0 lg:self-start">
            <GiftComposer charity={charity} year={latest} parts={parts} sample={sample} />
          </aside>
          {latest && parts ? <WhereTheMoneyWent charity={charity} parts={parts} /> : null}
          <WhyMatched charity={charity} params={params} hasPrefs={hasPrefs} />
          <Sources charity={charity} sample={sample} />
          {extras ? <Programs /> : null}
        </div>
      </main>
      <div className="mt-24">
        <SiteFooter
          note={
            sample
              ? `${charity.name} is seeded sample data. Its figures are illustrative and describe no real organization.`
              : undefined
          }
        />
      </div>
      <FloatingDonate href="#give" ariaLabel={`Give to ${charity.name}: jump to the gift form`} hideWhile={HIDE_DONATE_WHILE} className="lg:hidden" />
    </>
  )
}

/* ------------------------------------------------------------------ frame */

function SampleNotice({ name }: { name: string }) {
  return (
    <div className="border-b border-rule bg-paper-sunk">
      <p className="mx-auto max-w-[76rem] px-4 py-2 text-[0.8125rem] leading-snug text-ink-2 sm:px-6 lg:px-10">
        <strong className="font-semibold text-ink">Sample charity.</strong> {name} and its figures are seeded test data
        in the Clear Cause database. No real organization is shown.
      </p>
    </div>
  )
}

function ProfileHeader({
  charity,
  hasPrefs,
  hasPrograms,
}: {
  charity: CharityDetail
  hasPrefs: boolean
  hasPrograms: boolean
}) {
  const contents: [string, string][] = [
    ["Where the money went", "#money"],
    [hasPrefs ? "Why it matched you" : "How it fits you", "#match"],
    ["Where the figures come from", "#sources"],
    ...(hasPrograms ? ([["Programs", "#programs"]] as [string, string][]) : []),
  ]
  const back = hasPrefs ? "/for-you" : "/explore"
  const meta = [
    charity.causes.map((c) => causeLabel[c]).join(", "),
    charity.place,
    charity.annualBudgetUsd != null ? `${compactUsd(charity.annualBudgetUsd)} a year` : null,
  ].filter(Boolean)

  return (
    <header className="pt-6 pb-8 md:pt-8 md:pb-10 lg:pt-10">
      <nav aria-label="Breadcrumb" className="text-sm text-ink-2">
        <a href={back} className="underline decoration-rule hover:decoration-ink-2">
          {hasPrefs ? "For you" : "Explore"}
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
            {meta.map((m, i) => (
              <span key={i}>
                {i > 0 ? <Dot /> : null}
                {m}
              </span>
            ))}
          </p>
        </div>
        <dl className="flex shrink-0 flex-col gap-2 border-t-2 border-forest pt-3 text-sm leading-snug md:min-w-60">
          {charity.isPartner ? (
            <div className="flex items-center gap-2.5">
              <BadgeCheck className="size-5 text-forest" strokeWidth={1.75} aria-hidden />
              <dt className="sr-only">Status</dt>
              <dd className="font-semibold text-forest-deep">Vetted partner</dd>
            </div>
          ) : null}
          <div className="figures flex items-baseline gap-2">
            <dt className="text-ink-2">Transparency</dt>
            <dd className="font-semibold">
              {charity.transparencyScore != null ? `${charity.transparencyScore} / 100` : "Not scored yet"}
            </dd>
          </div>
        </dl>
      </div>

      {charity.description ? (
        <p className="mt-6 max-w-[62ch] font-serif text-[1.0625rem] leading-[1.6] text-ink-2">{charity.description}</p>
      ) : null}

      <nav aria-label="On this page" className="mt-8">
        <ul className="-mx-1 flex gap-2 overflow-x-auto px-1 py-1 whitespace-nowrap [scrollbar-width:none]">
          {contents.map(([label, href]) => (
            <li key={href}>
              <a href={href} className={glassChip} {...refract}>
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
    <div id={id} className="scroll-mt-24 border-t-2 border-forest pt-4">
      <h2 id={`${id}-title`} className="text-[1.5rem] leading-tight font-bold tracking-[-0.015em]">{title}</h2>
      {children ? <div className="mt-2 max-w-[62ch] font-serif text-[1.0625rem] leading-[1.6] text-ink-2">{children}</div> : null}
    </div>
  )
}

/* ------------------------------------------------------------- the dollar */

function Lead({ charity, year, parts }: { charity: CharityDetail; year: CharityFinancials; parts: SpendPart[] }) {
  const programs = parts[0]
  const description = parts.map((p) => `${p.cents} to ${p.label.toLowerCase()}`).join(", ")
  return (
    <section data-money aria-labelledby="lead-heading" className="lg:col-start-1">
      <h2 id="lead-heading" className="text-[1.625rem] leading-[1.2] font-semibold tracking-[-0.02em] text-balance sm:text-[2.125rem]">
        Of every $1.00 {shortName(charity.name)} spent in fiscal {year.fiscalYear},{" "}
        <span className="figures money-mark whitespace-nowrap">{programs.cents}¢</span> went straight to its programs.
      </h2>

      <figure className="mt-7">
        <div
          role="img"
          aria-label={`A dollar as 100 cents: ${description}.`}
          className="grid grid-cols-[repeat(20,minmax(0,1fr))] gap-[3px] sm:grid-cols-[repeat(50,minmax(0,1fr))]"
        >
          {parts.flatMap((p) =>
            Array.from({ length: p.cents }, (_, i) => <span key={`${p.key}-${i}`} className={cn("aspect-square", p.swatch)} />),
          )}
        </div>

        <figcaption>
          <table className="figures mt-5 w-full text-[0.9375rem]">
            <caption className="sr-only">Fiscal {year.fiscalYear} expenses by category</caption>
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
          {parts.some((p) => p.key === "overhead") ? (
            <p className="mt-2 text-[0.8125rem] text-ink-3">
              The statement on file gives program spending and the total, so admin and fundraising are shown together.
            </p>
          ) : null}
        </figcaption>
      </figure>
    </section>
  )
}

function NoFigures({ charity, year }: { charity: CharityDetail; year?: CharityFinancials }) {
  if (year && (year.totalExpenses != null || year.totalRevenue != null)) {
    // A filing with totals only (IRS 990 extracts): show what it does say.
    return (
      <section aria-labelledby="lead-heading" className="lg:col-start-1">
        <div className="border-t-2 border-forest pt-4">
          <h2 id="lead-heading" className="text-[1.625rem] leading-tight font-semibold tracking-[-0.02em]">
            {charity.name} in {year.fiscalYear}
          </h2>
          <dl data-money className="mt-5 grid max-w-[36rem] grid-cols-2 gap-x-8 border-y border-ink">
            {year.totalRevenue != null ? (
              <div className="py-4">
                <dt className="text-sm text-ink-2">Took in</dt>
                <dd className="figures mt-1 text-[2rem] leading-none font-bold">{whole.format(year.totalRevenue)}</dd>
              </div>
            ) : null}
            {year.totalExpenses != null ? (
              <div className="py-4">
                <dt className="text-sm text-ink-2">Spent</dt>
                <dd className="figures mt-1 text-[2rem] leading-none font-bold">{whole.format(year.totalExpenses)}</dd>
              </div>
            ) : null}
          </dl>
          <p className="mt-4 max-w-[62ch] font-serif text-[1.0625rem] leading-[1.6] text-ink-2">
            The filing we have reports totals only, not how spending split between programs, management and fundraising.
            Until we read the full return, {charity.name} ranks with a neutral efficiency score.
          </p>
          {year.sourceUrl ? (
            <p className="mt-3 text-[0.8125rem] text-ink-3">
              Source:{" "}
              <a href={year.sourceUrl} className="underline" target="_blank" rel="noreferrer">
                {sourceLabel(year.sourceUrl)}
              </a>
            </p>
          ) : null}
        </div>
      </section>
    )
  }
  return (
    <section aria-labelledby="lead-heading" className="lg:col-start-1">
      <div className="border-t-2 border-forest pt-4">
        <h2 id="lead-heading" className="text-[1.625rem] leading-tight font-semibold tracking-[-0.02em]">
          No financial statement on file yet
        </h2>
        <p className="mt-2 max-w-[62ch] font-serif text-[1.0625rem] leading-[1.6] text-ink-2">
          We haven't read a statement for {charity.name} yet, so we can't show where its money goes. Its ranking uses a
          neutral efficiency score until we do.
        </p>
      </div>
    </section>
  )
}

/* --------------------------------------------------------- gift composer */

function GiftComposer({
  charity,
  year,
  parts,
  sample,
}: {
  charity: CharityDetail
  year: CharityFinancials | undefined
  parts: SpendPart[] | null
  sample: boolean
}) {
  const [amount, setAmount] = useState(50)
  const [custom, setCustom] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const customId = useId()
  const errorId = useId()
  const name = shortName(charity.name)

  const split = parts ? splitAmount(amount, parts) : null
  const programs = charity.id === NORTHSIDE_ID ? northsideExtras.programs : null
  const programShare = split?.[0]?.amount ?? 0
  const byProgram = programs && parts
    ? (() => {
        const total = programs.reduce((s, p) => s + p.spending, 0)
        let allotted = 0
        const cents = Math.round(programShare * 100)
        return programs.map((p, i) => {
          const part = i === programs.length - 1 ? cents - allotted : Math.round((cents * p.spending) / total)
          allotted += part
          return { id: p.id, name: p.name, amount: part / 100 }
        })
      })()
    : null

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
      setError(`For gifts over $100,000, contact ${name} directly.`)
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
        Give to {name}
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
                className={cn(choiceButton, "figures px-0 text-[0.9375rem]", active ? choiceOn : choiceOff)}
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
            "mt-1.5 flex h-10 items-center rounded-[12px] border bg-paper px-3 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-forest",
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

      {split && year ? (
        <div className="mt-5" aria-live="polite">
          <p className="text-sm text-ink-2">
            How <span className="figures font-semibold text-ink">{exact.format(amount)}</span> divides at fiscal{" "}
            {year.fiscalYear} ratios
          </p>
          <table className="figures mt-2 w-full text-[0.9375rem]">
            <tbody>
              {split.map((s, i) => (
                <FragmentRows key={s.key}>
                  <tr className={cn(i === 1 && "border-t border-rule")}>
                    <th scope="row" className={cn("text-left", i === 0 ? "py-1.5 font-semibold" : i === 1 ? "pt-2 pb-1 font-normal" : "py-1 font-normal")}>
                      {s.label}
                    </th>
                    <td className={cn("text-right", i === 0 ? "py-1.5 font-semibold" : i === 1 ? "pt-2 pb-1" : "py-1")}>
                      {i === 0 ? (
                        <span key={amount} className="money-mark money-mark-sweep">
                          {exact.format(s.amount)}
                        </span>
                      ) : (
                        exact.format(s.amount)
                      )}
                    </td>
                  </tr>
                  {i === 0 && byProgram
                    ? byProgram.map((p) => (
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
                      ))
                    : null}
                </FragmentRows>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-5 text-sm text-ink-2">We'll show how a gift divides once a financial statement is on file.</p>
      )}

      <Button
        type="submit"
        disabled={Boolean(error)}
        className="mt-5 h-11 w-full rounded-[12px] text-[0.9375rem] font-semibold transition-[background-color,scale] duration-150 ease-(--ease-out) hover:bg-forest-deep active:scale-[0.97]"
      >
        Continue to give {exact.format(amount).replace(".00", "")}
      </Button>
      {submitted ? (
        <p role="status" className="mt-3 text-sm text-ink-2">
          {sample ? "This is a sample charity, so checkout isn't connected." : "Checkout isn't connected yet."}
        </p>
      ) : (
        <p className="mt-3 text-[0.8125rem] leading-snug text-ink-3">
          Illustrative split based on the latest statement on file. It shows proportions, not where a single gift is
          earmarked.
        </p>
      )}
    </form>
  )
}

/** Lets one table row be followed by optional sub-rows inside a map. */
function FragmentRows({ children }: { children: ReactNode }) {
  return <>{children}</>
}

/* ------------------------------------------------- where the money went */

function WhereTheMoneyWent({ charity, parts }: { charity: CharityDetail; parts: SpendPart[] }) {
  const latest = charity.financials[0]
  const extras = charity.id === NORTHSIDE_ID ? northsideExtras : null
  const net = latest.totalRevenue != null && latest.totalExpenses != null ? latest.totalRevenue - latest.totalExpenses : null
  const name = shortName(charity.name)

  return (
    <section aria-labelledby="money-title" className="mt-16 lg:col-start-1">
      <SectionOpener id="money" title="Where the money went">
        Fiscal {latest.fiscalYear}, from the statement on file
        {charity.financials.length > 1 ? `, with ${charity.financials.length - 1} earlier year${charity.financials.length > 2 ? "s" : ""} below` : ""}.
      </SectionOpener>

      <div className="mt-8 grid gap-x-10 gap-y-8 md:grid-cols-2">
        <StatementBlock
          title="Came in"
          rows={[]}
          total={{ label: "Total revenue", amount: latest.totalRevenue }}
        />
        <StatementBlock
          title="Went out"
          rows={parts.map((p, i) => ({ label: p.label, amount: p.amount, money: i === 0 }))}
          total={{ label: "Total expenses", amount: latest.totalExpenses }}
        />
      </div>
      {net != null ? (
        <p className="figures mt-4 text-sm text-ink-2">
          {net === 0
            ? `${name} spent what it took in.`
            : net > 0
              ? `${whole.format(net)} more came in than went out.`
              : `${whole.format(-net)} more went out than came in.`}
        </p>
      ) : null}

      {charity.financials.length > 1 ? <History financials={charity.financials} /> : null}

      {extras ? <Payments /> : null}
    </section>
  )
}

function History({ financials }: { financials: CharityFinancials[] }) {
  return (
    <>
      <h3 className="mt-12 text-lg font-bold tracking-[-0.01em]">Year by year</h3>
      <table data-money className="figures mt-3 w-full text-[0.9375rem]">
        <caption className="sr-only">Spending by fiscal year</caption>
        <thead>
          <tr className="border-b border-ink text-left text-[0.8125rem] text-ink-2">
            <th scope="col" className="py-2 font-medium">Fiscal year</th>
            <th scope="col" className="py-2 text-right font-medium">Total expenses</th>
            <th scope="col" className="py-2 text-right font-medium">To programs</th>
          </tr>
        </thead>
        <tbody>
          {financials.map((f) => (
            <tr key={f.fiscalYear} className="border-b border-rule">
              <th scope="row" className="py-2.5 text-left font-medium">{f.fiscalYear}</th>
              <td className="py-2.5 text-right">{f.totalExpenses != null ? whole.format(f.totalExpenses) : "Not reported"}</td>
              <td className="py-2.5 text-right">{f.programRatio != null ? `${Math.round(f.programRatio * 100)}¢ per $1` : "Not reported"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}

function Payments() {
  const { disbursements, programs } = northsideExtras
  const programName = Object.fromEntries(programs.map((p) => [p.id, p.name])) as Record<string, string>
  const ledgerTotal = disbursements.reduce((s, d) => s + d.amount, 0)
  return (
    <>
      <h3 className="mt-12 text-lg font-bold tracking-[-0.01em]">Recent payments</h3>
      <table data-money className="figures mt-3 w-full text-[0.9375rem]">
        <caption className="sr-only">Payments made in June and late May 2025</caption>
        <thead>
          <tr className="border-b border-ink text-left text-[0.8125rem] text-ink-2">
            <th scope="col" className="w-16 py-2 font-medium">Date</th>
            <th scope="col" className="py-2 font-medium">Paid to</th>
            <th scope="col" className="hidden py-2 font-medium md:table-cell">Program</th>
            <th scope="col" className="py-2 text-right font-medium">Amount</th>
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
              <td className="py-3 text-right font-medium whitespace-nowrap">{exact.format(d.amount)}</td>
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
            <td className="pt-3 text-right font-semibold">
              <span className="money-mark">{exact.format(ledgerTotal)}</span>
            </td>
          </tr>
        </tfoot>
      </table>
    </>
  )
}

function StatementBlock({
  title,
  rows,
  total,
}: {
  title: string
  rows: { label: string; amount: number; money?: boolean }[]
  total: { label: string; amount: number | null }
}) {
  return (
    <table data-money className="figures w-full text-[0.9375rem]">
      <caption className="pb-2 text-left text-lg font-bold tracking-[-0.01em]">{title}</caption>
      <tbody>
        {rows.map((r) => (
          <tr key={r.label} className="border-b border-rule">
            <th scope="row" className="py-2 pr-3 text-left font-normal">{r.label}</th>
            <td className="py-2 text-right whitespace-nowrap">
              {r.money ? <span className="money-mark font-semibold">{whole.format(r.amount)}</span> : whole.format(r.amount)}
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <th scope="row" className="pt-2.5 pr-3 text-left font-semibold">{total.label}</th>
          <td className="pt-2.5 text-right font-semibold">
            {total.amount != null ? (
              <span className="border-b-[3px] border-double border-ink pb-0.5">{whole.format(total.amount)}</span>
            ) : (
              <span className="font-normal text-ink-3">Not reported</span>
            )}
          </td>
        </tr>
      </tfoot>
    </table>
  )
}

/* ------------------------------------------------------------------ match */

function WhyMatched({ charity, params, hasPrefs }: { charity: CharityDetail; params: URLSearchParams; hasPrefs: boolean }) {
  const name = shortName(charity.name)
  if (!hasPrefs) {
    return (
      <section aria-labelledby="match-title" className="mt-20 lg:col-start-1">
        <SectionOpener id="match" title={`How ${name} fits you`}>
          Take the two-minute quiz and we'll score {charity.name} against the causes, place and size you care about.
        </SectionOpener>
        <a
          href="/quiz"
          className={cn(solidButton, "mt-6")}
        >
          Take the quiz
          <ArrowRight className="size-4" aria-hidden />
        </a>
      </section>
    )
  }

  const prefs = readPreferences(params, charity.region ? [charity.region, ...params.getAll("region")] : params.getAll("region"))
  const [result] = rankCharities([charity], prefs)
  const rows: { label: string; yours: string; theirs: string; met: boolean | null }[] = []
  if (prefs.causes.length) {
    const shared = prefs.causes.filter((c) => charity.causes.includes(c))
    rows.push({
      label: "Causes",
      yours: prefs.causes.map((c) => causeLabel[c]).join(", "),
      theirs: charity.causes.map((c) => causeLabel[c]).join(", ") || "None tagged",
      met: shared.length > 0,
    })
  }
  if (prefs.region) {
    rows.push({ label: "Where", yours: stateName[prefs.region] ?? prefs.region, theirs: charity.place || "Not listed", met: charity.region === prefs.region })
  }
  if (prefs.preferSmall) {
    rows.push({
      label: "Size",
      yours: "Under $1M a year",
      theirs: charity.annualBudgetUsd != null ? `${compactUsd(charity.annualBudgetUsd)} a year` : "Not reported",
      met: charity.annualBudgetUsd != null ? charity.annualBudgetUsd < smallBudgetUsd : null,
    })
  }
  if (prefs.directPctMin > 0) {
    rows.push({
      label: "To programs",
      yours: `At least ${prefs.directPctMin}%`,
      theirs: charity.directPct != null ? `${charity.directPct}%` : "Not reported",
      met: charity.directPct != null ? charity.directPct >= prefs.directPctMin : null,
    })
  }

  return (
    <section aria-labelledby="match-title" className="mt-20 lg:col-start-1">
      <SectionOpener id="match" title={`Why ${name} is in your matches`}>
        {result?.score != null
          ? `A ${result.score}% fit with your quiz answers. Causes count most, then transparency, the share reaching programs, and partner status.`
          : "Here's how it lines up with your quiz answers."}
      </SectionOpener>

      <table className="mt-8 w-full text-[0.9375rem]">
        <caption className="sr-only">Your giving preferences compared with {charity.name}</caption>
        <thead>
          <tr className="border-b border-ink text-left text-[0.8125rem] text-ink-2">
            <th scope="col" className="w-24 py-2 font-medium"><span className="sr-only">Preference</span></th>
            <th scope="col" className="py-2 pr-3 font-medium">You asked for</th>
            <th scope="col" className="py-2 font-medium">{name}</th>
            <th scope="col" className="w-8 py-2"><span className="sr-only">Met</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-b border-rule align-top">
              <th scope="row" className="py-3 pr-3 text-left text-sm font-medium text-ink-2">{r.label}</th>
              <td className="py-3 pr-3">{r.yours}</td>
              <td className="figures py-3 pr-3 font-medium">{r.theirs}</td>
              <td className="py-3 text-right">
                {r.met ? (
                  <Check className="ml-auto size-4 text-forest" strokeWidth={2.5} aria-label="Met" />
                ) : r.met === false ? (
                  <Minus className="ml-auto size-4 text-ink-3" strokeWidth={2.5} aria-label="Not met" />
                ) : (
                  <CircleDashed className="ml-auto size-4 text-ink-3" strokeWidth={2} aria-label="Unknown" />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {result?.reasons.length ? (
        <p className="mt-4 text-sm font-medium text-forest">{result.reasons.join(" · ")}</p>
      ) : null}
      <p className="mt-4 text-sm">
        <a href="/quiz" className="font-medium text-forest underline decoration-forest/40 hover:decoration-forest">
          Edit your giving preferences
        </a>
      </p>
    </section>
  )
}

/* ----------------------------------------------------------- the sources */

function Sources({ charity, sample }: { charity: CharityDetail; sample: boolean }) {
  const extras = charity.id === NORTHSIDE_ID ? northsideExtras : null
  return (
    <section aria-labelledby="sources-title" className="mt-20 lg:col-start-1">
      <SectionOpener id="sources" title="Where the figures come from">
        Every number on this page traces to a statement. The transparency score reflects how much {charity.name} publishes
        about its work and money.
      </SectionOpener>

      <dl className="mt-8">
        <div className="grid gap-1 border-b border-rule py-3 sm:grid-cols-[12rem_minmax(0,1fr)]">
          <dt className="text-sm font-medium text-ink-2">Partner status</dt>
          <dd>{charity.isPartner ? "Vetted partner: passed Clear Cause's financial audit" : "Listed charity, not yet a vetted partner"}</dd>
        </div>
        <div className="figures grid gap-1 border-b border-rule py-3 sm:grid-cols-[12rem_minmax(0,1fr)]">
          <dt className="text-sm font-medium text-ink-2">Transparency score</dt>
          <dd>{charity.transparencyScore != null ? `${charity.transparencyScore} out of 100` : "Not scored yet"}</dd>
        </div>
        {charity.financials.map((f) => (
          <div key={f.fiscalYear} className="grid gap-1 border-b border-rule py-3 sm:grid-cols-[12rem_minmax(0,1fr)]">
            <dt className="figures text-sm font-medium text-ink-2">Fiscal {f.fiscalYear} figures</dt>
            <dd>
              {f.sourceUrl ? (
                <>
                  <a href={f.sourceUrl} className="inline-flex items-center gap-1 font-medium text-forest underline decoration-forest/40 hover:decoration-forest" rel="noreferrer" target="_blank">
                    {sourceLabel(f.sourceUrl)}
                    <ExternalLink className="size-3.5" aria-hidden />
                  </a>
                  {f.scrapedAt ? <span className="text-ink-2"> · read {new Date(f.scrapedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span> : null}
                </>
              ) : sample ? (
                <span className="text-ink-2">Seeded sample figures, entered by the Clear Cause team</span>
              ) : (
                <span className="text-ink-2">Entered by the Clear Cause team</span>
              )}
            </dd>
          </div>
        ))}
        {charity.websiteUrl && !sample ? (
          <div className="grid gap-1 border-b border-rule py-3 sm:grid-cols-[12rem_minmax(0,1fr)]">
            <dt className="text-sm font-medium text-ink-2">Website</dt>
            <dd>
              <a href={charity.websiteUrl} className="font-medium text-forest underline decoration-forest/40" rel="noreferrer" target="_blank">
                {charity.websiteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}
              </a>
            </dd>
          </div>
        ) : null}
      </dl>

      {extras ? (
        <div className="mt-10 grid gap-x-10 gap-y-10 md:grid-cols-2">
          <div>
            <h3 className="flex items-center gap-2 border-b border-ink pb-2 text-[0.9375rem] font-bold">
              <Check className="size-4 text-forest" strokeWidth={2.5} aria-hidden />
              Checked in the partner audit
            </h3>
            <ul>
              {extras.audited.map((c) => (
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
              Reported by {shortName(charity.name)}, not audited
            </h3>
            <dl className="figures">
              {extras.selfReported.map((c) => (
                <div key={c.label} className="flex items-baseline justify-between gap-4 border-b border-dashed border-rule py-3">
                  <dt className="text-ink-2">{c.label}</dt>
                  <dd className="font-semibold">{c.detail}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      ) : null}
    </section>
  )
}

/** "statement.pdf, page 4" from a statement URL with an optional #page=N. */
function sourceLabel(url: string) {
  try {
    const u = new URL(url)
    if (u.hostname.endsWith("propublica.org")) return "IRS Form 990 via ProPublica Nonprofit Explorer"
    if (u.hostname === "apps.irs.gov") return "IRS Form 990 (IRS e-file data)"
    const file = decodeURIComponent(u.pathname.split("/").filter(Boolean).pop() ?? u.hostname)
    const page = u.hash.match(/page=(\d+)/)?.[1]
    return `${file}${page ? `, page ${page}` : ""}`
  } catch {
    return url
  }
}

/* --------------------------------------------------------------- programs */

function Programs() {
  const { programs } = northsideExtras
  const total = programs.reduce((s, p) => s + p.spending, 0)
  return (
    <section aria-labelledby="programs-title" className="mt-20 lg:col-start-1">
      <SectionOpener id="programs" title="Programs and what they cost">
        Three programs took {whole.format(total)} last year. What each delivered is Northside's own count, so each unit
        cost divides audited spending by a reported number.
      </SectionOpener>

      <ol className="mt-6">
        {programs.map((p) => (
          <li key={p.id} className="grid gap-x-10 gap-y-4 border-b border-rule py-7 md:grid-cols-[minmax(0,1fr)_15rem]">
            <div>
              <h3 className="text-lg font-bold tracking-[-0.01em]">{p.name}</h3>
              <p className="mt-2 max-w-[60ch] font-serif text-[1.0625rem] leading-[1.6] text-ink-2">{p.description}</p>
            </div>
            <dl data-money className="figures grid grid-cols-2 gap-x-4 gap-y-3 self-start text-[0.9375rem] md:grid-cols-1 md:gap-y-2">
              <ProgramFigure label="Spent">
                <span className="money-mark font-semibold">{whole.format(p.spending)}</span>
                <span className="text-ink-3"> · {((p.spending / total) * 100).toFixed(1)}%</span>
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
            <span className="sr-only">(reported by the charity, not audited)</span>
          </>
        ) : null}
      </dt>
      <dd className="font-medium md:text-right">{children}</dd>
    </div>
  )
}

/* --------------------------------------------------------------- colophon */

