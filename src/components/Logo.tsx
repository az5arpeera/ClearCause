import { cn } from "@/lib/utils"

/**
 * The Clear Cause mark: a squared "C" drawn as a stretch of the money trail,
 * with a stop at each end. It is set on the forest masthead, so it uses paper
 * and a soft forest.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("shrink-0", className)} aria-hidden>
      <rect x="0" y="0" width="32" height="32" rx="2" fill="var(--paper)" />
      <path d="M23 8.5 H10.5 V23.5 H23" fill="none" stroke="var(--forest)" strokeWidth="3.5" strokeLinecap="butt" />
      <rect x="20.5" y="5.5" width="6" height="6" fill="var(--forest-deep)" />
      <rect x="20.5" y="20.5" width="6" height="6" fill="var(--forest)" />
    </svg>
  )
}

export function Logo({ className }: { className?: string }) {
  return (
    <a href="/" className={cn("group flex items-center gap-2.5 no-underline", className)} aria-label="Clear Cause home">
      <LogoMark className="size-8 transition-transform duration-300 ease-out group-hover:-rotate-3" />
      <span className="text-[1.3125rem] leading-none font-extrabold tracking-[-0.03em] text-paper">
        Clear <span className="text-forest-soft">Cause</span>
      </span>
    </a>
  )
}
