import { AuthControl } from "@/components/AuthControl"
import { Logo } from "@/components/Logo"
import { useLiquidGlass } from "@/lib/liquid-glass"
import { cn } from "@/lib/utils"

export type NavLink = { label: string; href: string }

/** The app's own pages share these links; the landing page passes section anchors instead. */
const appLinks: NavLink[] = [
  { label: "Browse charities", href: "/matches" },
  { label: "Take the quiz", href: "/quiz" },
  { label: "For nonprofits", href: "/partners" },
]

/**
 * The one top bar: forest liquid glass, every link a nav bubble, the page's
 * main action as the solid bubble, and the account control at the end.
 * On phones the links move to a second row (`mobileRow`) or are dropped.
 */
export function SiteHeader({
  links = appLinks,
  primary = { label: "Find my matches", href: "/quiz" },
  mobileRow = true,
}: {
  links?: NavLink[]
  primary?: NavLink | null
  mobileRow?: boolean
}) {
  useLiquidGlass()
  const path = typeof window === "undefined" ? "" : window.location.pathname.replace(/\/+$/, "") || "/"
  const isCurrent = (href: string) => !href.startsWith("#") && href === path

  return (
    <header className="lg lg-forest lg-text sticky top-0 z-40" data-refract="0.8" data-refract-bezel="10">
      <div className="mx-auto flex max-w-none flex-wrap items-center gap-x-6 px-4 sm:h-16 sm:flex-nowrap sm:px-6 lg:px-10">
        <Logo className="h-16" />
        <nav
          aria-label="Primary"
          className={cn(
            mobileRow
              ? "order-last -mx-4 h-14 w-[calc(100%+2rem)] overflow-x-auto border-t border-paper/15 px-4 [scrollbar-width:none] sm:order-none sm:mx-0 sm:h-full sm:w-auto sm:overflow-visible sm:border-t-0 sm:px-0"
              : "hidden h-full md:block",
          )}
        >
          <ul className="flex h-full items-center gap-1.5">
            {links.map((l) => (
              <li key={l.href}>
                <a href={l.href} aria-current={isCurrent(l.href) ? "page" : undefined} className="nav-bubble">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="ml-auto flex items-center gap-1.5">
          {primary && !isCurrent(primary.href) ? (
            <a href={primary.href} className="nav-bubble nav-bubble-primary hidden sm:inline-flex">
              {primary.label}
            </a>
          ) : null}
          <AuthControl />
        </div>
      </div>
    </header>
  )
}
