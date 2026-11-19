import { ArrowRight } from "lucide-react"
import type { ReactNode } from "react"

import { PageFrame } from "@/components/Glass"
import { glassChip, refract, solidButton } from "@/lib/glass"
import { weights } from "@/lib/matching"

const sections: [string, string][] = [
  ["What we do", "#what"],
  ["Where charities come from", "#sources"],
  ["How matching works", "#matching"],
  ["What we never do", "#never"],
]

const weightRows: [string, number, string][] = [
  ["Shared causes", weights.cause, "How closely the charity's causes overlap with the ones you picked."],
  ["Transparency", weights.transparency, "How completely and clearly the charity reports its finances."],
  ["Share to programs", weights.efficiency, "How much of each dollar reaches programs rather than overhead."],
  ["Vetted partner", weights.partner, "A small lift for charities that have passed our partner review."],
]

/** About Clear Cause: what it is, where the data comes from, how ranking works. */
export default function About() {
  return (
    <PageFrame
      title="About Clear Cause"
      intro="We help you give to small charities you'd actually choose, and show where every dollar goes before you give it."
      below={
        <nav aria-label="On this page" className="flex flex-wrap gap-2">
          {sections.map(([label, href]) => (
            <a key={href} href={href} className={glassChip} {...refract}>
              {label}
            </a>
          ))}
        </nav>
      }
    >
      <div className="mt-12 max-w-[68ch] space-y-14">
        <Section id="what" title="What we do">
          <p>
            Most giving goes to the biggest names. Clear Cause is built for the small, local charities that do a lot with a little
            and rarely get noticed. Tell us what you care about, and we rank every charity we list against your answers.
          </p>
          <p>
            Every charity has its own page showing what it took in, what it spent, and, where its statements break it out, how much
            of each dollar reached its programs.
          </p>
        </Section>

        <Section id="sources" title="Where charities and figures come from">
          <p>
            Every week we look through the IRS's public records of tax-exempt organizations for small charities working on the
            causes we cover, and read the Form 990 each one files: what it took in, what it spent, and how much of that went to
            its programs. Where a charity publishes audited financial statements on its website, our scraper reads those too,
            and their figures take priority. Some earlier figures came through{" "}
            <a href="https://projects.propublica.org/nonprofits/" target="_blank" rel="noreferrer" className="font-semibold text-forest underline">
              ProPublica's Nonprofit Explorer
            </a>
            , and say so.
          </p>
          <p>
            A charity found this way isn't listed straight away. It starts as pending, someone on our team checks its figures
            against the source, and only then does it appear on the site. Every figure on a charity's page links to the document
            it came from.
          </p>
        </Section>

        <Section id="matching" title="How matching works">
          <p>
            Your quiz answers never hide a charity. They change the order. Each charity gets a score from four parts:
          </p>
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">How the match score is weighted</caption>
            <thead>
              <tr className="border-b border-ink text-left">
                <th scope="col" className="py-2 pr-4 font-semibold">Part</th>
                <th scope="col" className="py-2 pr-4 text-right font-semibold">Weight</th>
                <th scope="col" className="hidden py-2 font-semibold sm:table-cell">What it measures</th>
              </tr>
            </thead>
            <tbody>
              {weightRows.map(([part, w, what]) => (
                <tr key={part} className="border-b border-rule align-top">
                  <th scope="row" className="py-2.5 pr-4 text-left font-medium">
                    {part}
                    <span className="mt-0.5 block font-normal text-ink-2 sm:hidden">{what}</span>
                  </th>
                  <td className="figures py-2.5 pr-4 text-right font-semibold">{Math.round(w * 100)}%</td>
                  <td className="hidden py-2.5 text-ink-2 sm:table-cell">{what}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>
            Where we don't have a figure yet, that part counts as neutral, so a charity isn't buried for missing data. If you pick
            a state or prefer small charities, matching ones move up a little.
          </p>
        </Section>

        <Section id="never" title="What we never do">
          <ul className="list-disc space-y-2 pl-5">
            <li>We never hide a charity because of your answers. Explore always shows every charity we list.</li>
            <li>We never store your card number. When donations open, cards will be held by Stripe, our payment processor.</li>
            <li>We never show a figure without saying where it came from.</li>
          </ul>
        </Section>

        <div className="flex flex-wrap items-center gap-3 border-t-2 border-forest pt-6">
          <a href="/explore" className={solidButton}>
            Explore charities
            <ArrowRight className="size-4" aria-hidden />
          </a>
          <a href="/contact" className={glassChip}>Questions? Contact us</a>
        </div>
      </div>
    </PageFrame>
  )
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24">
      <h2 id={`${id}-title`} className="border-t-2 border-forest pt-4 text-2xl font-bold tracking-tight">{title}</h2>
      <div className="mt-4 space-y-4 font-serif text-[1.0625rem] leading-[1.65] text-ink-2 [&_table]:font-sans">{children}</div>
    </section>
  )
}
