import type { ReactNode } from "react"

import { Logo } from "@/components/Logo"
import { photos } from "@/data/sample-landing"

const columns: [string, [string, string][]][] = [
  ["Give", [["Explore charities", "/explore"], ["For you", "/for-you"], ["Take the quiz", "/quiz"]]],
  ["Clear Cause", [["About", "/about"], ["Contact", "/contact"], ["Your profile", "/profile"]]],
  ["Nonprofits", [["Become a partner", "/partners"], ["A sample charity page", "/charity/northside"]]],
]

const photoCredits = Array.from(new Set(Object.values(photos).map((p) => p.credit))).join(", ")

/** The one footer, on every page. `note` adds a page-specific line (e.g. sample data). */
export function SiteFooter({ note }: { note?: ReactNode }) {
  return (
    <footer className="bg-forest-deep text-paper">
      <div className="mx-auto grid max-w-[76rem] gap-10 px-4 py-12 sm:px-6 md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))] lg:px-10">
        <div>
          <Logo />
          <p className="mt-4 max-w-[40ch] text-sm leading-relaxed text-paper/80">
            Matching donors with vetted charities, and showing where every dollar goes.
          </p>
        </div>
        {columns.map(([title, links]) => (
          <nav key={title} aria-label={title}>
            <p className="text-sm font-semibold">{title}</p>
            <ul className="mt-3 space-y-2 text-sm">
              {links.map(([label, href]) => (
                <li key={href}>
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
        <div className="mx-auto max-w-[76rem] space-y-1 px-4 py-5 text-[0.8125rem] leading-relaxed text-pretty text-paper/70 sm:px-6 lg:px-10 [&>p]:max-w-[78ch]">
          {note ? <p>{note}</p> : null}
          <p>
            Prototype; donations aren't live yet. Charity figures come from charities' own statements and from IRS Form 990 filings
            (from the IRS, and for some earlier entries via ProPublica's Nonprofit Explorer), cited on each charity's page. Photos are stock images from Unsplash by{" "}
            {photoCredits}.
          </p>
        </div>
      </div>
    </footer>
  )
}
