import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react"
import { ArrowRight, BadgeCheck, Check, CircleDashed, MapPin, ShieldCheck, Sprout } from "lucide-react"

import { Logo } from "@/components/Logo"
import { cn } from "@/lib/utils"
import { expenses, programs } from "@/data/sample-charity"
import {
  auditChecks,
  auditGaps,
  causes,
  counters,
  donor,
  orgs,
  photos,
  photoUrl,
  type Org,
  type PhotoKey,
} from "@/data/sample-landing"

const whole = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
const exact = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 })
const orgById = Object.fromEntries(orgs.map((o) => [o.id, o])) as Record<string, Org>

const totalExpenses = expenses.programs + expenses.admin + expenses.fundraising
const cents = {
  programs: Math.round((expenses.programs / totalExpenses) * 100),
  admin: Math.round((expenses.admin / totalExpenses) * 100),
}
const centsFundraising = 100 - cents.programs - cents.admin

/* ------------------------------------------------------------------ trail */

/*
 * The trail is the page's spine: a forest line in a left track that every
 * section sits on. Each segment draws downward as the reader scrolls. It is
 * fully drawn by default, so nothing depends on the script or on motion.
 */
const track = "pl-9 sm:pl-14 lg:pl-24"

function useTrailDrawing() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const segments = Array.from(document.querySelectorAll<HTMLElement>("[data-trail]"))
    let frame = 0
    const update = () => {
      frame = 0
      const tip = window.innerHeight * 0.78
      for (const el of segments) {
        // Measure the track the line sits in, not the line (it is scaled).
        const host = el.parentElement
        if (!host) continue
        const r = host.getBoundingClientRect()
        const start = r.top + (parseFloat(el.style.top) || 0)
        const span = el.dataset.end !== undefined ? el.offsetHeight : r.bottom - start
        const p = Math.min(1, Math.max(0, (tip - start) / Math.max(1, span)))
        el.style.setProperty("--p", p.toFixed(4))
      }
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener("scroll", schedule, { passive: true })
    window.addEventListener("resize", schedule)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("scroll", schedule)
      window.removeEventListener("resize", schedule)
    }
  }, [])
}

type Tone = "paper" | "soft" | "forest" | "ink"

/** Each band sets the trail's colors so the line reads on any ground. */
const tones: Record<Tone, { cls: string; vars: Record<string, string> }> = {
  paper: { cls: "bg-paper text-ink", vars: { "--band": "var(--paper)", "--trail-c": "var(--forest)", "--stop-text": "var(--paper)", "--dash-c": "var(--ink-3)", "--sub": "var(--ink-2)" } },
  soft: { cls: "bg-forest-soft text-ink", vars: { "--band": "var(--forest-soft)", "--trail-c": "var(--forest)", "--stop-text": "var(--paper)", "--dash-c": "var(--ink-3)", "--sub": "var(--ink-2)" } },
  forest: { cls: "bg-forest-deep text-paper", vars: { "--band": "var(--forest-deep)", "--trail-c": "var(--paper)", "--stop-text": "var(--forest-deep)", "--dash-c": "color-mix(in oklch, var(--paper) 55%, transparent)", "--sub": "color-mix(in oklch, var(--paper) 80%, transparent)" } },
  ink: { cls: "bg-ink text-paper", vars: { "--band": "var(--ink)", "--trail-c": "var(--paper)", "--stop-text": "var(--ink)", "--dash-c": "color-mix(in oklch, var(--paper) 55%, transparent)", "--sub": "color-mix(in oklch, var(--paper) 80%, transparent)" } },
}

/** A section that sits on the trail. */
function OnTrail({
  children,
  className,
  lineTop = 0,
  end = false,
  id,
  labelledBy,
  trackRef,
  tone = "paper",
}: {
  tone?: Tone
  children: ReactNode
  trackRef?: RefObject<HTMLDivElement | null>
  className?: string
  lineTop?: number
  end?: boolean
  id?: string
  labelledBy?: string
}) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={cn("relative scroll-mt-6", tones[tone].cls)}
      style={tones[tone].vars as CSSProperties}
    >
      <div className="mx-auto max-w-[76rem] px-4 sm:px-6 lg:px-10">
        <div ref={trackRef} className={cn("relative", track, className)}>
          <span
            aria-hidden
            data-trail
            data-end={end ? "" : undefined}
            className={cn(
              "trail-line absolute left-[11px] w-[2px] bg-[var(--trail-c)] sm:left-[19px] lg:left-[31px]",
              end && "h-[90px] sm:h-[94px] lg:h-[126px]",
            )}
            style={{ top: lineTop, bottom: end ? undefined : 0 }}
          />
          {children}
        </div>
      </div>
    </section>
  )
}

/** A square stop on the trail, aligned to the element it sits beside. */
function Stop({ label, terminal = false }: { label?: string; terminal?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "absolute top-[0.35em] grid place-items-center border-[3px] border-[var(--band)] bg-[var(--trail-c)] font-sans text-[0.75rem] font-bold text-[var(--stop-text)]",
        terminal
          ? "left-[-37px] size-[26px] sm:left-[-49px] lg:left-[-77px]"
          : label
            ? "left-[-37px] size-[26px] sm:left-[-49px] lg:left-[-77px]"
            : "left-[-32px] size-[16px] sm:left-[-44px] lg:left-[-72px]",
      )}
    >
      {label}
    </span>
  )
}

/** A short rule from the trail to the content beside it. Dashed means reported, not audited. */
function Tick({ dashed = false, className }: { dashed?: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "absolute top-1/2 left-[-24px] w-[18px] border-t-2 sm:left-[-36px] sm:w-[30px] lg:left-[-64px] lg:w-[58px]",
        dashed ? "border-dashed border-[var(--dash-c)]" : "border-[var(--trail-c)]",
        className,
      )}
    />
  )
}

/* -------------------------------------------------------------- the page */

export default function Landing() {
  useTrailDrawing()
  return (
    <div className="min-h-svh overflow-x-clip bg-paper text-ink">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:bg-paper focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <Masthead />
      <main id="main">
        <Hero />
        <WhereTheMoneyGoes />
        <HowMatchingWorks />
        <VerifiedPartners />
        <SmallNonprofits />
        <StreakStrip />
        <FinalCall />
      </main>
      <Footer />
    </div>
  )
}

function Masthead() {
  const links = [
    ["How matching works", "#matching"],
    ["Where money goes", "#money"],
    ["Partners", "#partners"],
  ]
  return (
    <header className="bg-forest-deep text-paper">
      <div className="mx-auto flex h-16 max-w-[76rem] items-center gap-10 px-4 sm:px-6 lg:px-10">
        <Logo />
        <nav aria-label="Primary" className="hidden h-full md:block">
          <ul className="flex h-full items-center gap-6 text-sm">
            {links.map(([label, href]) => (
              <li key={href}>
                <a href={href} className="text-paper/80 no-underline transition-colors hover:text-paper">
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="ml-auto flex items-center gap-5 text-sm">
          <a href="/partners" className="hidden text-paper/80 no-underline hover:text-paper sm:inline">
            For nonprofits
          </a>
          <a
            href="#start"
            className="inline-flex h-9 items-center rounded-[2px] bg-paper px-3.5 font-semibold text-forest-deep no-underline transition-colors hover:bg-forest-soft"
          >
            Find my matches
          </a>
        </div>
      </div>
    </header>
  )
}

/* ------------------------------------------------------------------- hero */

function Hero() {
  const trackRef = useRef<HTMLDivElement>(null)
  const rowRef = useRef<HTMLDivElement>(null)
  const [lineTop, setLineTop] = useState(0)

  useLayoutEffect(() => {
    const measure = () => {
      if (!trackRef.current || !rowRef.current) return
      const s = trackRef.current.getBoundingClientRect()
      const r = rowRef.current.getBoundingClientRect()
      setLineTop(Math.round(r.top - s.top + r.height / 2))
    }
    measure()
    const ro = new ResizeObserver(measure)
    if (trackRef.current) ro.observe(trackRef.current)
    return () => ro.disconnect()
  }, [])

  return (
    <div className="relative">
      <div className="mx-auto max-w-[76rem] px-4 pt-10 sm:px-6 lg:px-10 lg:pt-16">
        <h1 className="max-w-[17ch] text-[2.5rem] leading-[1.02] font-bold tracking-[-0.032em] text-balance sm:text-[3.25rem] lg:text-[4rem]">
          Give to the causes you'd actually choose.
        </h1>
        <p className="mt-4 flex items-center gap-2 text-[0.9375rem] font-semibold text-forest-deep">
          <BadgeCheck className="size-5 shrink-0 text-forest" strokeWidth={1.75} aria-hidden />
          Every charity here has passed an independent audit of its books.
        </p>
      </div>

      <OnTrail lineTop={lineTop} trackRef={trackRef} className="pt-10 pb-16 lg:pt-12 lg:pb-20" labelledBy="start-heading">
        <div className="grid gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,1fr)_20rem] xl:gap-x-16">
          <div className="order-2 lg:order-1">
            <span
              aria-hidden
              className="absolute left-[12px] w-[24px] border-t-2 border-forest sm:left-[20px] sm:w-[36px] lg:left-[32px] lg:w-[64px]"
              style={{ top: lineTop - 1 }}
            />
            <DashboardPreview rowRef={rowRef} />
          </div>
          <div id="start" className="order-1 scroll-mt-6 lg:order-2">
            <p className="font-serif text-[1.125rem] leading-[1.6] text-ink-2">
              Tell us what you care about. We match you with vetted charities, many of them small, and show you where
              every dollar goes.
            </p>
            <h2 id="start-heading" className="sr-only">
              Find your matches
            </h2>
            <CausePicker className="mt-6" />
            <p className="mt-5 text-sm text-ink-2">
              Run a small nonprofit?{" "}
              <a href="/partners" className="font-medium text-forest underline decoration-forest/40 hover:decoration-forest">
                Become a partner
              </a>
            </p>
          </div>
        </div>

        <dl className="figures mt-14 grid grid-cols-2 border-t border-ink md:grid-cols-4">
          {counters.map((c) => (
            <div key={c.label} className="border-b border-rule py-4 pr-4 md:border-b-0">
              <dt className="sr-only">{c.label}</dt>
              <dd className="text-[1.75rem] leading-tight font-bold tracking-[-0.02em] lg:text-[2rem]">{c.value}</dd>
              <dd aria-hidden className="mt-0.5 text-sm text-ink-2">{c.label}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-[0.8125rem] text-ink-3">
          Sample figures. Clear Cause is a prototype, and these totals are illustrative.
        </p>
      </OnTrail>
    </div>
  )
}

function CausePicker({ className }: { className?: string }) {
  const [picked, setPicked] = useState<string[]>([])
  const groupId = useId()
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  return (
    <form action="/matches" method="get" className={className}>
      <fieldset>
        <legend id={groupId} className="text-sm font-semibold">
          What do you care about?
        </legend>
        <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-labelledby={groupId}>
          {causes.map((c) => {
            const on = picked.includes(c.id)
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(c.id)}
                className={cn(
                  "inline-flex h-9 items-center gap-1.5 rounded-[2px] border px-3 text-[0.875rem] font-medium transition-colors",
                  on
                    ? "border-forest bg-forest text-paper"
                    : "border-input bg-paper text-ink hover:border-forest hover:text-forest-deep",
                )}
              >
                {on ? <Check className="size-3.5" strokeWidth={2.5} aria-hidden /> : null}
                {c.label}
              </button>
            )
          })}
        </div>
      </fieldset>
      {picked.length > 0 ? <input type="hidden" name="causes" value={picked.join(",")} /> : null}
      <button
        type="submit"
        className="mt-5 inline-flex h-12 items-center gap-2 rounded-[2px] bg-forest px-6 text-base font-semibold text-paper transition-colors hover:bg-forest-deep"
      >
        See my matches
        <ArrowRight className="size-4" aria-hidden />
      </button>
      <p className="mt-2 text-[0.8125rem] text-ink-3" aria-live="polite">
        {picked.length === 0 ? "Pick as many as you like, or none to browse." : `${picked.length} picked`}
      </p>
    </form>
  )
}

function DashboardPreview({ rowRef }: { rowRef: RefObject<HTMLDivElement | null> }) {
  const given = donor.gifts.reduce((s, g) => s + g.amount, 0)
  const toPrograms = donor.gifts.reduce((s, g) => s + (g.amount * orgById[g.org].toPrograms) / 100, 0)
  return (
    <figure>
      <div className="overflow-hidden rounded-[2px] border border-ink/25 bg-paper" role="img" aria-label="Sample dashboard for a donor named Sam: three matched charities and where $600 of gifts went this year.">
        <div className="flex h-10 items-center gap-6 bg-forest px-4 text-[0.8125rem] text-paper/75">
          <span className="font-bold text-paper">{donor.name}'s giving</span>
          <span className="border-b-2 border-paper pt-[11px] pb-[9px] font-semibold text-paper">Matches</span>
          <span className="hidden sm:inline">Gifts</span>
          <span className="hidden sm:inline">Preferences</span>
          <span className="ml-auto hidden md:inline">2026</span>
        </div>
        <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          <div className="figures px-4 pt-4 pb-3 md:border-r md:border-rule">
            <p className="text-[0.9375rem] font-bold">Where your gifts went</p>
            <p className="mt-0.5 text-[0.75rem] text-ink-2">This year, at each charity's audited ratios</p>
            <ul className="mt-2 text-[0.875rem]">
              {donor.gifts.map((g, i) => (
                <li key={g.org}>
                  <div
                    ref={i === 0 ? rowRef : undefined}
                    className={cn(
                      "-mx-4 flex items-center justify-between gap-3 border-b border-rule px-4 py-2",
                      i === 0 && "bg-forest-soft",
                    )}
                  >
                    <span className="min-w-0">{orgById[g.org].name}</span>
                    <span className="font-medium">{exact.format(g.amount)}</span>
                  </div>
                  {i === 0 ? (
                    <a href="#money" className="-mx-4 flex items-center gap-1.5 border-b border-rule bg-forest-soft px-4 pb-2 text-[0.75rem] font-semibold text-forest-deep no-underline hover:underline">
                      Follow $1.00 of it
                      <ArrowRight className="size-3.5 rotate-90" aria-hidden />
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
            <div className="mt-2 flex justify-between text-[0.875rem]">
              <span>To programs</span>
              <span className="money-mark font-semibold">{exact.format(toPrograms)}</span>
            </div>
            <div className="mt-1.5 flex justify-between text-[0.875rem]">
              <span className="font-semibold">Given</span>
              <span className="border-b-[3px] border-double border-ink pb-px font-semibold">{exact.format(given)}</span>
            </div>
          </div>
          <div className="border-t border-rule px-4 pt-4 pb-3 md:border-t-0">
            <p className="text-[0.9375rem] font-bold">Your matches</p>
            <p className="mt-0.5 text-[0.75rem] text-ink-2">{donor.preferences.join(" · ")}</p>
            <ul className="mt-2">
              {donor.matches.map((m) => {
                const o = orgById[m.org]
                const p = photos[o.photo]
                return (
                  <li key={m.org} className="grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 border-b border-rule py-2.5 last:border-b-0">
                    <img src={photoUrl(p.src, 88, 88)} alt="" width={44} height={44} className="size-11 rounded-[2px] object-cover" fetchPriority="high" />
                    <span className="min-w-0">
                      <span className="block text-[0.875rem] leading-snug font-semibold">{o.name}</span>
                      <span className="block text-[0.75rem] text-ink-2">
                        {o.kind} · audited {o.auditedOn}
                      </span>
                    </span>
                    <span className="rounded-[2px] bg-forest-soft px-1.5 py-0.5 text-[0.75rem] font-semibold whitespace-nowrap text-forest-deep">{m.fit} fit</span>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      </div>
      <figcaption className="mt-2 text-[0.8125rem] text-ink-3">
        Sample dashboard. The donor, charities and amounts are illustrative, and the thumbnails are stock photos.
      </figcaption>
    </figure>
  )
}

/* -------------------------------------------------- where the money goes */

function SectionHead({
  id,
  title,
  children,
  stopLabel,
  noStop = false,
}: {
  id: string
  title: string
  children?: ReactNode
  stopLabel?: string
  noStop?: boolean
}) {
  return (
    <div className="relative max-w-[44rem]">
      {noStop ? null : <Stop label={stopLabel} />}
      <h2 id={id} className="text-[1.875rem] leading-[1.1] font-bold tracking-[-0.025em] text-balance sm:text-[2.25rem]">
        {title}
      </h2>
      {children ? <div className="mt-3 font-serif text-[1.0625rem] leading-[1.6] text-[color:var(--sub)] sm:text-[1.125rem]">{children}</div> : null}
    </div>
  )
}

function WhereTheMoneyGoes() {
  const overhead = [
    { label: "Fundraising", cents: centsFundraising, amount: expenses.fundraising, what: "events and donor mail" },
    { label: "Management and admin", cents: cents.admin, amount: expenses.admin, what: "rent, insurance and bookkeeping" },
  ]
  const outputs = ["486,000 lb of food", "624 van stops", "21,700 weekend packs"]
  return (
    <OnTrail id="money" labelledBy="money-title" className="py-16 lg:py-24">
      <SectionHead id="money-title" title="Follow $1.00 into Northside">
        Northside Community Pantry is a small food bank in Harlow, Ohio. Its audited books for fiscal 2025 show where each
        dollar went.
      </SectionHead>

      <div className="mt-10 grid gap-x-16 gap-y-12 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="figures">
          <ul>
            {overhead.map((o) => (
              <li key={o.label} className="relative grid grid-cols-[3.5rem_minmax(0,1fr)_auto] items-baseline gap-3 border-b border-rule py-3">
                <Tick />
                <span className="text-[1.25rem] font-bold">{o.cents}¢</span>
                <span>
                  {o.label}
                  <span className="block text-sm text-ink-2">{o.what}</span>
                </span>
                <span className="text-ink-2">{whole.format(o.amount)}</span>
              </li>
            ))}
            <li className="relative grid grid-cols-[3.5rem_minmax(0,1fr)_auto] items-baseline gap-3 border-b border-ink py-3">
              <Tick />
              <span className="text-[1.25rem] font-bold">
                <span className="money-mark">{cents.programs}¢</span>
              </span>
              <span className="font-semibold">
                Programs
                <span className="block text-sm font-normal text-ink-2">carries on down the trail</span>
              </span>
              <span className="font-semibold">{whole.format(expenses.programs)}</span>
            </li>
          </ul>

          <ul className="mt-2">
            {programs.map((p, i) => (
              <li key={p.id} className="relative grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-0.5 border-b border-rule py-3 sm:grid-cols-[minmax(0,1fr)_auto_12.5rem] sm:pl-[4.25rem]">
                <Tick dashed />
                <span className="font-medium">{p.name}</span>
                <span className="text-right">
                  <span className="money-mark font-semibold">{whole.format(p.spending)}</span>
                </span>
                <span className="col-span-2 flex items-center gap-1.5 text-sm text-ink-2 sm:col-span-1 sm:justify-end">
                  <CircleDashed className="size-3.5 shrink-0 text-ink-3" strokeWidth={2} aria-hidden />
                  {outputs[i]}
                  <span className="sr-only">(reported by Northside, not audited)</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 flex items-center gap-1.5 text-[0.8125rem] text-ink-3">
            <CircleDashed className="size-3.5 text-ink-3" strokeWidth={2} aria-hidden />
            Counts reported by Northside. The audit covers the money, not the counts.
          </p>
        </div>

        <figure className="self-start">
          <img
            src={photoUrl(photos.produce.src, 760, 520)}
            alt={photos.produce.alt}
            width={380}
            height={260}
            loading="lazy"
            className="mb-1.5 aspect-[19/13] w-full rounded-[2px] object-cover"
          />
          <PhotoCredit k="produce" notOrg />
          <div
            role="img"
            aria-label={`One dollar as 100 cents: ${cents.programs} to programs, ${cents.admin} to admin, ${centsFundraising} to fundraising.`}
            className="mt-6 grid w-full max-w-[19rem] grid-cols-10 gap-[3px]"
          >
            {Array.from({ length: 100 }, (_, i) => (
              <span
                key={i}
                className={cn(
                  "aspect-square",
                  i < cents.programs ? "bg-money" : i < cents.programs + cents.admin ? "bg-admin" : "bg-fundraising",
                )}
              />
            ))}
          </div>
          <figcaption className="mt-3 text-sm text-ink-2">
            The same dollar as 100 cents.{" "}
            <a href="/charity/northside" className="inline-flex items-center gap-1 font-medium text-forest underline decoration-forest/40 hover:decoration-forest">
              Read Northside's full statement
              <ArrowRight className="size-3.5" aria-hidden />
            </a>
          </figcaption>
        </figure>
      </div>
    </OnTrail>
  )
}

/* ------------------------------------------------------ how matching works */

function PhotoCredit({ k, onDark = false, notOrg = false }: { k: PhotoKey; onDark?: boolean; notOrg?: boolean }) {
  const p = photos[k]
  return (
    <p className={cn("text-[0.75rem]", onDark ? "text-paper/65" : "text-ink-3")}>
      {notOrg ? "Stock photo, not the organization" : "Stock photo"} ·{" "}
      <a href={p.source} className="underline decoration-current/40 hover:decoration-current">
        {p.credit} / Unsplash
      </a>
    </p>
  )
}

function HowMatchingWorks() {
  const picked: string[] = ["hunger", "kids"]
  const prefs = ["Hunger", "Kids and schools", "Within 25 miles", "Small orgs", "Audited only"]
  const table: { org: string; fits: boolean[] }[] = [
    { org: "northside", fits: [true, false, true, true, true] },
    { org: "riverbend", fits: [false, true, true, true, true] },
    { org: "eastgate", fits: [false, false, true, true, true] },
  ]
  return (
    <OnTrail tone="forest" id="matching" labelledBy="matching-title" className="py-16 lg:py-24">
      <SectionHead id="matching-title" title="How matching works">
        No directory to search, and no ranking by how famous a charity is. Three steps, each one you can see.
      </SectionHead>

      <ol className="mt-12 space-y-16">
        <li className="relative">
          <Stop label="1" />
          <h3 className="text-xl font-bold">You say what matters</h3>
          <p className="mt-1 max-w-[52ch] text-[0.9375rem] text-paper/80">
            Causes first, then how close to home and how big an organization you'd like to back.
          </p>
          <ul className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Causes, with Hunger and Kids and schools picked">
            {causes.map((c) => {
              const on = picked.includes(c.id)
              const ph = photos[c.photo]
              return (
                <li
                  key={c.id}
                  className={cn("relative overflow-hidden rounded-[2px] bg-forest", on && "outline-3 outline-offset-0 outline-paper")}
                >
                  <img
                    src={photoUrl(ph.src, 420, 300)}
                    alt=""
                    width={210}
                    height={150}
                    loading="lazy"
                    className={cn("aspect-[7/5] w-full object-cover", !on && "opacity-60 grayscale-[35%]")}
                  />
                  <span
                    className={cn(
                      "flex items-center justify-between gap-2 px-2.5 py-2 text-[0.875rem] font-semibold",
                      on ? "bg-paper text-forest-deep" : "bg-forest text-paper",
                    )}
                  >
                    {c.label}
                    {on ? <Check className="size-4 shrink-0" strokeWidth={2.75} aria-label="picked" /> : null}
                  </span>
                </li>
              )
            })}
          </ul>
          <p className="mt-3 text-[0.75rem] text-paper/65">Stock photos from Unsplash. Photographers are credited at the foot of the page.</p>
        </li>

        <li className="relative">
          <Stop label="2" />
          <h3 className="text-xl font-bold">We check every partner against it</h3>
          <p className="mt-1 max-w-[52ch] text-[0.9375rem] text-paper/80">Each vetted partner is scored on how many of your preferences it meets.</p>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[34rem] max-w-[48rem] text-[0.875rem]">
              <caption className="sr-only">Sample partners checked against five preferences</caption>
              <thead>
                <tr className="border-b border-paper/60 text-left text-[0.75rem] text-paper/75">
                  <th scope="col" className="py-2 pr-3 font-medium">
                    Partner
                  </th>
                  {prefs.map((p) => (
                    <th key={p} scope="col" className="px-2 py-2 text-center font-medium">
                      {p}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.map((r) => (
                  <tr key={r.org} className="border-b border-paper/15">
                    <th scope="row" className="py-3 pr-3 text-left font-semibold">
                      {orgById[r.org].name}
                    </th>
                    {r.fits.map((f, i) => (
                      <td key={i} className="px-2 py-3 text-center">
                        {f ? (
                          <span className="mx-auto grid size-6 place-items-center rounded-[2px] bg-forest-soft text-forest-deep">
                            <Check className="size-4" strokeWidth={2.75} aria-label="Meets" />
                          </span>
                        ) : (
                          <span className="text-paper/45" aria-label="Doesn't meet">
                            –
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </li>

        <li className="relative">
          <Stop label="3" />
          <h3 className="text-xl font-bold">You see why, in plain words</h3>
          <blockquote className="mt-4 max-w-[42rem] font-serif text-[1.375rem] leading-[1.45] text-paper sm:text-[1.625rem]">
            “Northside Community Pantry fits 4 of your 5: it fights hunger, it’s 4 miles from you, it spends $398K a year,
            and its books were audited in March 2026.”
          </blockquote>
          <p className="mt-2 text-sm text-paper/65">Sample match explanation.</p>
        </li>
      </ol>
    </OnTrail>
  )
}

/* ---------------------------------------------------------- verified seal */

function Seal({ className }: { className?: string }) {
  const arcId = useId().replace(/:/g, "")
  return (
    <svg viewBox="0 0 200 200" className={className} role="img" aria-label="Clear Cause verified partner seal">
      <circle cx="100" cy="100" r="97" fill="var(--paper)" />
      <circle cx="100" cy="100" r="91" fill="none" stroke="var(--forest)" strokeWidth="1.5" />
      <circle cx="100" cy="100" r="66" fill="var(--forest)" />
      <path id={arcId} d="M100,100 m-79,0 a79,79 0 1,1 158,0 a79,79 0 1,1 -158,0" fill="none" />
      <text fill="var(--forest-deep)" fontFamily="Libre Franklin Variable, sans-serif" fontSize="11.5" fontWeight="800" letterSpacing="2.6">
        <textPath href={`#${arcId}`}>CLEAR CAUSE · VERIFIED PARTNER · AUDITED EVERY YEAR ·</textPath>
      </text>
      <path d="M77 92 l15 15 l31 -33" fill="none" stroke="var(--paper)" strokeWidth="8" strokeLinecap="square" />
      <text x="100" y="132" textAnchor="middle" fill="var(--paper)" fontFamily="Libre Franklin Variable, sans-serif" fontSize="12" fontWeight="800" letterSpacing="1.6">
        INDEPENDENT
      </text>
      <text x="100" y="146" textAnchor="middle" fill="var(--forest-soft)" fontFamily="Libre Franklin Variable, sans-serif" fontSize="10" fontWeight="600" letterSpacing="1.4">
        CPA AUDIT
      </text>
    </svg>
  )
}

function VerifiedPartners() {
  return (
    <OnTrail tone="ink" id="partners" labelledBy="partners-title" className="py-16 lg:py-24">
      <div className="grid gap-x-14 gap-y-8 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <div className="relative">
          <Tick className="top-[7rem]" />
          <Seal className="size-44 lg:size-56" />
        </div>
        <div>
          <SectionHead noStop id="partners-title" title="Every partner passes an independent audit">
            Before a charity is listed, a CPA firm audits its books. Partners that pass are listed free, so a tool library
            with a $142K budget stands on the same footing as a national charity.
          </SectionHead>

          <div className="mt-10 grid gap-x-10 gap-y-8 md:grid-cols-2">
            <div>
              <h3 className="flex items-center gap-2 border-b border-paper/60 pb-2 text-[0.9375rem] font-bold">
                <span className="grid size-5 place-items-center rounded-[2px] bg-forest-soft text-forest-deep">
                  <Check className="size-3.5" strokeWidth={3} aria-hidden />
                </span>
                The audit checks
              </h3>
              <ul>
                {auditChecks.map((c) => (
                  <li key={c} className="border-b border-paper/15 py-2.5 text-[0.9375rem]">
                    {c}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="flex items-center gap-2 border-b border-dashed border-paper/50 pb-2 text-[0.9375rem] font-bold">
                <CircleDashed className="size-5 text-paper/70" strokeWidth={2} aria-hidden />
                It doesn't check, so we label these "reported"
              </h3>
              <ul>
                {auditGaps.map((c) => (
                  <li key={c} className="border-b border-dashed border-paper/20 py-2.5 text-[0.9375rem] text-paper/80">
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </OnTrail>
  )
}

/* -------------------------------------------------------- small nonprofits */

function OrgEntry({ org, layout, tickClass }: { org: Org; layout: "wide" | "portrait" | "square"; tickClass?: string }) {
  const p = photos[org.photo]
  const size = layout === "wide" ? [1120, 700] : layout === "portrait" ? [600, 760] : [700, 700]
  return (
    <article
      className={cn(
        "relative grid gap-x-8 gap-y-5",
        layout === "wide" && "lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]",
        layout === "portrait" && "sm:grid-cols-[12rem_minmax(0,1fr)]",
        layout === "square" && "sm:grid-cols-[minmax(0,1fr)_12rem]",
      )}
      aria-labelledby={`org-${org.id}`}
    >
      <Tick className={cn("top-8", tickClass)} />
      <figure className={cn(layout === "square" && "sm:order-2")}>
        <img
          src={photoUrl(p.src, size[0], size[1])}
          alt={p.alt}
          width={size[0] / 2}
          height={size[1] / 2}
          loading="lazy"
          className={cn(
            "w-full rounded-[2px] object-cover",
            layout === "wide" ? "aspect-[16/10]" : layout === "portrait" ? "aspect-[4/5]" : "aspect-square",
          )}
        />
        <figcaption className="mt-1.5 text-[0.75rem] text-ink-3">
          Stock photo, not the organization ·{" "}
          <a href={p.source} className="underline decoration-rule hover:decoration-ink-3">
            {p.credit} / Unsplash
          </a>
        </figcaption>
      </figure>
      <div className={cn(layout === "wide" && "lg:pt-2")}>
        <h3 id={`org-${org.id}`} className={cn("font-bold tracking-[-0.015em]", layout === "wide" ? "text-[1.625rem]" : "text-xl")}>
          {org.name}
        </h3>
        <p className="mt-1 text-sm text-ink-2">
          {org.kind} · {org.place} · {org.budget}
        </p>
        <p className="mt-3 max-w-[48ch] font-serif text-[1.0625rem] leading-[1.6] text-ink-2">{org.note}</p>
        <dl className="figures mt-4 text-[0.9375rem]">
          <div className="flex items-baseline justify-between gap-4 border-t border-ink py-2">
            <dt className="text-ink-2">Spent {org.spent.on}</dt>
            <dd className="money-mark font-semibold whitespace-nowrap">{whole.format(org.spent.amount)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 border-t border-rule py-2">
            <dt className="text-ink-2">Of each $1, to programs</dt>
            <dd className="font-semibold">{org.toPrograms}¢</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 border-t border-dashed border-rule py-2">
            <dt className="flex items-center gap-1.5 text-ink-2">
              <CircleDashed className="size-3.5 text-ink-3" strokeWidth={2} aria-hidden />
              Reported<span className="sr-only">, not audited</span>
            </dt>
            <dd className="font-medium">{org.reported}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 border-t border-rule py-2">
            <dt className="text-ink-2">Audited</dt>
            <dd>{org.auditedOn}</dd>
          </div>
        </dl>
        {org.href ? (
          <a href={org.href} className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-forest underline decoration-forest/40 hover:decoration-forest">
            View {org.name.split(" ")[0]}'s profile
            <ArrowRight className="size-3.5" aria-hidden />
          </a>
        ) : null}
      </div>
    </article>
  )
}

function SmallNonprofits() {
  const [first, second, third] = [orgById.northside, orgById.eastgate, orgById.riverbend]
  return (
    <OnTrail id="small" labelledBy="small-title" className="py-16 lg:py-24">
      <SectionHead id="small-title" title="Small organizations, first-class">
        Most partners are local and modest. Here are three your dollar might reach. They are sample organizations, with
        sample figures.
      </SectionHead>
      <div className="mt-12 space-y-16">
        <OrgEntry org={first} layout="wide" />
        <div className="grid gap-x-12 gap-y-16 xl:grid-cols-2">
          <OrgEntry org={second} layout="portrait" />
          <OrgEntry org={third} layout="square" tickClass="xl:hidden" />
        </div>
      </div>
    </OnTrail>
  )
}

/* ------------------------------------------------------------ streak strip */

function StreakStrip() {
  const months = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"]
  const icons = { local: MapPin, audited: ShieldCheck, small: Sprout } as const
  return (
    <OnTrail tone="soft" labelledBy="streak-title" className="py-8">
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:gap-12">
        <Tick />
        <div>
          <h2 id="streak-title" className="text-[0.9375rem] font-bold">
            {donor.name}'s streak: {donor.streakMonths} months of giving
          </h2>
          <ol className="mt-2 flex gap-[3px]" aria-label={`Gave in ${donor.streakMonths} of 12 months`}>
            {months.map((m, i) => (
              <li
                key={i}
                className={cn(
                  "grid size-6 place-items-center text-[0.625rem] font-semibold",
                  i < donor.streakMonths ? "bg-forest text-paper" : "border border-forest/40 text-forest-deep",
                )}
                aria-hidden
              >
                {m}
              </li>
            ))}
          </ol>
        </div>
        <ul className="flex flex-wrap gap-x-7 gap-y-3 lg:ml-auto" aria-label="Badges earned">
          {donor.badges.map((b) => {
            const Icon = icons[b.id as keyof typeof icons]
            return (
              <li key={b.id} className="flex items-center gap-2.5">
                <span className="grid size-10 place-items-center rounded-[2px] bg-forest text-paper">
                  <Icon className="size-[18px]" strokeWidth={1.75} aria-hidden />
                </span>
                <span className="text-sm leading-tight">
                  <span className="block font-semibold">{b.label}</span>
                  <span className="text-[0.8125rem] text-ink-2">{b.detail}</span>
                </span>
              </li>
            )
          })}
        </ul>
      </div>
      <p className="mt-4 text-[0.8125rem] text-ink-3">A streak counts the months you gave anything at all. Sample donor.</p>
    </OnTrail>
  )
}

/* ------------------------------------------------------------- final call */

function FinalCall() {
  return (
    <OnTrail end labelledBy="final-title" className="pt-16 pb-20 lg:pt-24 lg:pb-28">
      <div className="relative grid gap-x-16 gap-y-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:items-start">
        <div className="relative">
          <Stop terminal />
          <h2 id="final-title" className="max-w-[16ch] text-[2.25rem] leading-[1.05] font-bold tracking-[-0.03em] text-balance sm:text-[3rem]">
            Where should your next dollar go?
          </h2>
          <p className="mt-4 max-w-[44ch] font-serif text-[1.125rem] leading-[1.6] text-ink-2">
            Pick what you care about and we'll show you the vetted charities that fit, with their books open.
          </p>
          <CausePicker className="mt-8" />
        </div>
        <figure>
          <img
            src={photoUrl(photos.garden.src, 1000, 1100)}
            alt={photos.garden.alt}
            width={500}
            height={550}
            loading="lazy"
            className="aspect-[10/11] w-full rounded-[2px] object-cover"
          />
          <figcaption className="mt-1.5">
            <PhotoCredit k="garden" />
          </figcaption>
        </figure>
      </div>
    </OnTrail>
  )
}

function Footer() {
  const cols: [string, [string, string][]][] = [
    ["Donors", [["How matching works", "#matching"], ["Where money goes", "#money"], ["Find my matches", "#start"]]],
    ["Nonprofits", [["Become a partner", "/partners"], ["What the audit checks", "#partners"]]],
    ["Samples", [["Northside's charity profile", "/charity/northside"]]],
  ]
  return (
    <footer className="bg-forest-deep text-paper">
      <div className="mx-auto grid max-w-[76rem] gap-10 px-4 py-12 sm:px-6 md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))] lg:px-10">
        <div>
          <Logo />
          <p className="mt-4 max-w-[40ch] text-sm leading-relaxed text-paper/80">
            Matching donors with vetted charities, and showing where every dollar goes.
          </p>
        </div>
        {cols.map(([title, links]) => (
          <nav key={title} aria-label={title}>
            <p className="text-sm font-semibold">{title}</p>
            <ul className="mt-3 space-y-2 text-sm">
              {links.map(([label, href]) => (
                <li key={label}>
                  <a href={href} className="text-paper/80 no-underline hover:text-paper hover:underline">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-paper/15">
        <p className="mx-auto max-w-[76rem] px-4 py-5 text-[0.8125rem] leading-relaxed text-paper/70 sm:px-6 lg:px-10">
          Prototype. The organizations, donor and figures on this page are illustrative, not real. Photos are stock images
          from Unsplash by {Array.from(new Set(Object.values(photos).map((p) => p.credit))).join(", ")}.
        </p>
      </div>
    </footer>
  )
}


